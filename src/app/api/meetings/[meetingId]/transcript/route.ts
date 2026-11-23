import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser, assertTeamMembership } from "@/lib/auth";
import { TranscriptSource } from "@/types";

const IngestTranscriptSchema = z.object({
  rawText: z.string().min(10, "Transcript text must be at least 10 characters"),
  source: z.enum(["PASTE", "FILE"]).default("PASTE"),
  fileName: z.string().optional(),
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
    await assertTeamMembership(session.id, meeting.teamId);

    const json = await request.json();
    const result = IngestTranscriptSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    let { rawText, source, fileName } = result.data;

    // Sanitize and normalize input text
    rawText = rawText.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");

    // Enforce model context safety limit
    const MAX_CHARS = 50000;
    if (rawText.length > MAX_CHARS) {
      return NextResponse.json(
        {
          error: `Transcript is too long (${rawText.length.toLocaleString()} characters). Please keep under ${MAX_CHARS.toLocaleString()} characters.`,
        },
        { status: 413 }
      );
    }

    const transcript = await prisma.transcript.create({
      data: {
        meetingId,
        rawText,
        source: source as TranscriptSource,
        fileName: fileName || null,
      },
    });

    return NextResponse.json({ transcript }, { status: 201 });
  } catch (error: any) {
    if (error.message.startsWith("FORBIDDEN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Transcript ingestion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
