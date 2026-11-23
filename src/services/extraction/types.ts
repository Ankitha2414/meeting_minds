import { z } from "zod";

export const RawExtractionSchema = z.object({
  actions: z.array(
    z.object({
      action: z.string().min(2, "Action description must be at least 2 characters"),
      assignee: z.string().nullable().describe("Name of assignee or null if unmentioned"),
      deadline: z.string().nullable().describe("ISO YYYY-MM-DD or relative date expression, or null"),
    })
  ),
  decisions: z.array(
    z.string().min(2, "Decision description must be at least 2 characters")
  ),
});

export type RawExtractionResult = z.infer<typeof RawExtractionSchema>;

export interface ExtractionContext {
  meetingTitle: string;
  meetingDate: string; // YYYY-MM-DD
  transcript: string;
  teamMembers: Array<{ id: string; name: string }>;
}

export interface ResolvedActionItem {
  tempId: string;
  description: string;
  rawAssignee: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  rawDeadline: string | null;
  deadline: string | null; // ISO YYYY-MM-DD or null
  isAssigneeUnresolved: boolean;
  isDeadlineAmbiguous: boolean;
  warningNote?: string;
}

export interface StagedExtractionReview {
  actions: ResolvedActionItem[];
  decisions: string[];
}

export interface ExtractionProvider {
  name?: string;
  extract(context: ExtractionContext): Promise<RawExtractionResult>;
}
