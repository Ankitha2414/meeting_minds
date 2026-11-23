import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { ActionStatus } from "@/types";

export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const assignedToMe = searchParams.get("assignedToMe") === "true";
  const teamId = searchParams.get("teamId");
  const meetingId = searchParams.get("meetingId");
  const statusParam = searchParams.get("status");
  const overdueOnly = searchParams.get("overdue") === "true";

  // Build where clause ensuring user only sees items in teams they belong to
  const whereClause: any = {
    meeting: {
      team: {
        members: {
          some: { userId: session.id },
        },
      },
    },
  };

  if (assignedToMe) {
    whereClause.assigneeId = session.id;
  }

  if (teamId) {
    whereClause.meeting.teamId = teamId;
  }

  if (meetingId) {
    whereClause.meetingId = meetingId;
  }

  if (statusParam && Object.values(ActionStatus).includes(statusParam as ActionStatus)) {
    whereClause.status = statusParam as ActionStatus;
  }

  if (overdueOnly) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    whereClause.status = { not: ActionStatus.COMPLETED };
    whereClause.deadline = { lt: today };
  }

  const items = await prisma.actionItem.findMany({
    where: whereClause,
    include: {
      assignee: {
        select: { id: true, name: true, email: true },
      },
      meeting: {
        select: {
          id: true,
          title: true,
          meetingDate: true,
          team: {
            select: { id: true, name: true },
          },
        },
      },
      history: {
        include: {
          changedBy: { select: { id: true, name: true } },
        },
        orderBy: { changedAt: "desc" },
      },
    },
    orderBy: [
      { deadline: "asc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json({ items });
}
