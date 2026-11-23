import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, assertTeamMembership } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { meetingId } = await params;

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      team: {
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
      attendees: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      transcripts: {
        orderBy: { createdAt: "desc" },
      },
      actionItems: {
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          history: {
            include: {
              changedBy: {
                select: { id: true, name: true },
              },
            },
            orderBy: { changedAt: "desc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      decisions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  try {
    const membership = await assertTeamMembership(session.id, meeting.teamId);
    return NextResponse.json({ meeting, currentUserRole: membership.role });
  } catch {
    return NextResponse.json({ error: "Access denied to this meeting" }, { status: 403 });
  }
}
