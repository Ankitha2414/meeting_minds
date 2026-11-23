import { ExtractionContext } from "./types";

export function buildExtractionPrompt(context: ExtractionContext) {
  const memberListFormatted = context.teamMembers.length > 0
    ? context.teamMembers.map((m) => `- ${m.name}`).join("\n")
    : "No roster provided.";

  const systemPrompt = `You are MeetingMind's AI Task and Decision Extraction Engine.
Your goal is to accurately extract action items (tasks with assignees and deadlines) and key decisions from meeting transcripts.

Extraction Guidelines:
1. ONLY extract clear commitments or agreed tasks. Do not invent tasks from general discussion.
2. For each action item, extract:
   - "action": Concise, specific summary of the task.
   - "assignee": The person responsible for the task. Use their full name as identified in the transcript or roster. Never assign tasks to someone not mentioned. If unassigned or unclear, return null.
   - "deadline": The target deadline mentioned in the transcript. Preserve relative expressions (e.g. "Thursday", "Wednesday", "by Friday", "tomorrow", "in 3 days") or open-ended phrases (e.g. "Before next meeting", "asap"). If no deadline was mentioned, return null. NEVER invent a deadline.
3. For "decisions": Extract distinct agreements, strategic choices, or technical decisions reached in the meeting.
4. Output MUST be strictly valid JSON conforming to this JSON schema:
{
  "actions": [
    {
      "action": "string",
      "assignee": "string or null",
      "deadline": "string or null"
    }
  ],
  "decisions": [
    "string"
  ]
}
Do not include any conversational preamble or markdown backticks outside of the JSON.`;

  const userPrompt = `Meeting Title: ${context.meetingTitle}
Meeting Date: ${context.meetingDate}

Known Team Members:
${memberListFormatted}

--- TRANSCRIPT BEGIN ---
${context.transcript}
--- TRANSCRIPT END ---

Extract the actions and decisions now in the required JSON format.`;

  return { systemPrompt, userPrompt };
}
