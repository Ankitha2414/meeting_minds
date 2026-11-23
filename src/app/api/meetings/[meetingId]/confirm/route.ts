import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser, assertTeamMembership } from "@/lib/auth";
import { Role, ActionStatus } from "@/types";

const ConfirmReviewSchema = z.object({
  actions: z.array(
    z.object({
      description: z.string().min(2, "Task description is required"),
      assigneeId: z.string().nullable().optional(),
      deadline: z.string().nullable().optional(),
    })
  ),
  decisions: z.array(
    z.string().min(2, "Decision text is required")
  ),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { meetingId } = await params;

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { id: true, teamId: true },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  try {
    // Only ORGANIZER can approve and save confirmed extraction results
    await assertTeamMembership(session.id, meeting.teamId, Role.ORGANIZER);

    const json = await request.json();
    const result = ConfirmReviewSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { actions, decisions } = result.data;

    // Reject saving if any action has an unresolved assignee or deadline
    for (const [idx, act] of actions.entries()) {
      if (!act.assigneeId || act.assigneeId.trim() === "") {
        return NextResponse.json(
          {
            error: `Task #${idx + 1} ("${act.description.slice(0, 40)}") has an unresolved assignee. Please select a team member from the roster before confirming.`,
          },
          { status: 400 }
        );
      }
      if (!act.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(act.deadline.trim())) {
        return NextResponse.json(
          {
            error: `Task #${idx + 1} ("${act.description.slice(0, 40)}") has an unresolved or invalid deadline. Please set a valid date (YYYY-MM-DD) before confirming.`,
          },
          { status: 400 }
        );
      }
    }

    // Persist confirmed records atomically
    const outcome = await prisma.$transaction(async (tx) => {
      // 1. Create Decisions
      const createdDecisions = await Promise.all(
        decisions.map((text) =>
          tx.decision.create({
            data: {
              meetingId,
              decisionText: text.trim(),
            },
          })
        )
      );

      // 2. Create Action Items and initial history records
      const createdActions = await Promise.all(
        actions.map(async (act) => {
          const [year, month, day] = act.deadline!.trim().split("-").map(Number);
          const parsedDeadline = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

          const action = await tx.actionItem.create({
            data: {
              meetingId,
              description: act.description.trim(),
              assigneeId: act.assigneeId || null,
              deadline: parsedDeadline,
              status: ActionStatus.PENDING,
            },
          });

          await tx.actionItemHistory.create({
            data: {
              actionItemId: action.id,
              changedById: session.id,
              oldStatus: ActionStatus.PENDING,
              newStatus: ActionStatus.PENDING,
            },
          });

          return action;
        })
      );

      return {
        actionCount: createdActions.length,
        decisionCount: createdDecisions.length,
      };
    });

    return NextResponse.json({
      message: "Confirmed meeting commitments successfully saved.",
      ...outcome,
    });
  } catch (error: any) {
    if (error.message.startsWith("FORBIDDEN")) {
      return NextResponse.json(
        { error: "Only team organizers can approve and save extraction results." },
        { status: 403 }
      );
    }
    console.error("Confirmation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
