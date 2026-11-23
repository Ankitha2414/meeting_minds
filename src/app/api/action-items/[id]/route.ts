import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { ActionStatus, Role } from "@/types";

const UpdateActionSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
  description: z.string().min(2).optional(),
  assigneeId: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const item = await prisma.actionItem.findUnique({
    where: { id },
    include: {
      meeting: {
        include: {
          team: {
            include: {
              members: {
                where: { userId: session.id },
              },
            },
          },
        },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Action item not found" }, { status: 404 });
  }

  const userMembership = item.meeting.team.members[0];
  if (!userMembership) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const isAssignee = item.assigneeId === session.id;
  const isOrganizer = userMembership.role === Role.ORGANIZER;

  if (!isAssignee && !isOrganizer) {
    return NextResponse.json(
      { error: "Only the assigned member or team organizer can update this task." },
      { status: 403 }
    );
  }

  try {
    const json = await request.json();
    const result = UpdateActionSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, description, assigneeId, deadline } = result.data;

    // Normal members can only update status
    if (!isOrganizer && (description !== undefined || assigneeId !== undefined || deadline !== undefined)) {
      return NextResponse.json(
        { error: "Only organizers can reassign, reschedule, or edit task description." },
        { status: 403 }
      );
    }

    const updateData: any = {};
    const oldStatus = item.status;
    let statusChanged = false;

    if (status && status !== oldStatus) {
      updateData.status = status as ActionStatus;
      statusChanged = true;
      if (status === "COMPLETED") {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }
    }

    if (isOrganizer) {
      if (description !== undefined) updateData.description = description.trim();
      if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
      if (deadline !== undefined) {
        updateData.deadline = deadline ? new Date(`${deadline}T00:00:00.000Z`) : null;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.actionItem.update({
        where: { id },
        data: updateData,
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          meeting: { select: { id: true, title: true } },
        },
      });

      if (statusChanged && status) {
        await tx.actionItemHistory.create({
          data: {
            actionItemId: id,
            changedById: session.id,
            oldStatus,
            newStatus: status as ActionStatus,
          },
        });
      }

      return updatedItem;
    });

    return NextResponse.json({ item: updated });
  } catch (error: any) {
    console.error("Update action item error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
