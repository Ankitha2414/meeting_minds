import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser, assertTeamMembership } from "@/lib/auth";
import { Role } from "@/types";

const CreateMeetingSchema = z.object({
  title: z.string().min(2, "Meeting title must be at least 2 characters"),
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Meeting date must be in YYYY-MM-DD format"),
  attendeeIds: z.array(z.string()).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await params;

  try {
    await assertTeamMembership(session.id, teamId, Role.ORGANIZER);

    const json = await request.json();
    const result = CreateMeetingSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, meetingDate, attendeeIds = [] } = result.data;
    const parsedDate = new Date(`${meetingDate}T00:00:00.000Z`);

    const meeting = await prisma.$transaction(async (tx) => {
      const newMeeting = await tx.meeting.create({
        data: {
          teamId,
          title,
          meetingDate: parsedDate,
        },
      });

      if (attendeeIds.length > 0) {
        const uniqueAttendeeIds = Array.from(new Set(attendeeIds));
        await tx.meetingAttendee.createMany({
          data: uniqueAttendeeIds.map((userId) => ({
            meetingId: newMeeting.id,
            userId,
          })),
        });
      }

      return newMeeting;
    });

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error: any) {
    if (error.message.startsWith("FORBIDDEN")) {
      return NextResponse.json({ error: "Only team organizers can create meetings" }, { status: 403 });
    }
    console.error("Create meeting error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
