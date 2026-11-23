import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser, assertTeamMembership } from "@/lib/auth";
import { getExtractionProvider } from "@/services/extraction/factory";
import { postProcessExtraction } from "@/services/extraction/resolver";
import { format } from "date-fns";

export async function POST(
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
      transcripts: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  try {
    await assertTeamMembership(session.id, meeting.teamId);

    const latestTranscript = meeting.transcripts[0];
    if (!latestTranscript || !latestTranscript.rawText.trim()) {
      return NextResponse.json(
        { error: "No transcript found for this meeting. Please paste or upload notes first." },
        { status: 400 }
      );
    }

    const teamMembers = meeting.team.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
    }));

    // Format meeting date strictly as YYYY-MM-DD from ISO string to ensure timezone neutrality
    const meetingDateStr = meeting.meetingDate.toISOString().slice(0, 10);

    const provider = getExtractionProvider();
    const rawResult = await provider.extract({
      meetingTitle: meeting.title,
      meetingDate: meetingDateStr,
      transcript: latestTranscript.rawText,
      teamMembers,
    });

    const stagedReview = postProcessExtraction(rawResult, meetingDateStr, teamMembers);

    return NextResponse.json({
      stagedReview,
      providerUsed: provider.name || process.env.LLM_PROVIDER || (process.env.OPENAI_API_KEY ? "openai" : "ollama"),
      transcriptSnippet: latestTranscript.rawText.slice(0, 150) + "...",
    });
  } catch (error: any) {
    if (error.message.startsWith("FORBIDDEN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Extraction error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to extract action items from transcript.",
        retryable: true,
      },
      { status: 502 }
    );
  }
}
