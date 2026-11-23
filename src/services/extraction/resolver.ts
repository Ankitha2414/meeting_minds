import { addDays, nextDay, parseISO, isValid, format } from "date-fns";
import { RawExtractionResult, ResolvedActionItem, StagedExtractionReview } from "./types";

interface TeamMemberRef {
  id: string;
  name: string;
}

/**
 * Matches an extracted assignee string to a known team member using:
 * 1. Exact case-insensitive match (including trimmed and normalized)
 * 2. Cleaned name match (stripping role annotations like " - Software Developer")
 * 3. First name exact match (if unique in roster)
 * 4. Substring / Word match (if unique in roster)
 *
 * If not found in the roster, leaves assigneeId as null and isAssigneeUnresolved as true.
 * NEVER silently assigns to another employee.
 */
export function resolveAssignee(
  rawAssignee: string | null,
  teamMembers: TeamMemberRef[]
): {
  assigneeId: string | null;
  assigneeName: string | null;
  isAssigneeUnresolved: boolean;
  warningNote?: string;
} {
  if (!rawAssignee || rawAssignee.trim() === "") {
    return {
      assigneeId: null,
      assigneeName: null,
      isAssigneeUnresolved: true,
      warningNote: "No assignee detected in transcript. Please assign a team member.",
    };
  }

  const trimmed = rawAssignee.trim();
  const query = trimmed.toLowerCase();

  // Normalize query: remove prefixes (Dr., Mr., Ms., etc.) and role annotations (e.g. " - Software Developer", " (UI/UX)")
  const cleanQuery = query
    .replace(/^(dr\.|mr\.|mrs\.|ms\.)\s+/i, "")
    .replace(/\s*[-–—:]\s*.*$/, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .trim();

  // 1. Exact case-insensitive match on original query or cleanQuery
  const exactMatch = teamMembers.find((m) => {
    const memberName = m.name.toLowerCase().trim();
    return memberName === query || memberName === cleanQuery;
  });

  if (exactMatch) {
    return {
      assigneeId: exactMatch.id,
      assigneeName: exactMatch.name,
      isAssigneeUnresolved: false,
    };
  }

  // 2. Full Name without extra punctuation/spaces match
  const normalizedMemberMatch = teamMembers.find((m) => {
    const memberClean = m.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const qClean = cleanQuery.replace(/[^a-z0-9]/g, "");
    return memberClean === qClean;
  });

  if (normalizedMemberMatch) {
    return {
      assigneeId: normalizedMemberMatch.id,
      assigneeName: normalizedMemberMatch.name,
      isAssigneeUnresolved: false,
    };
  }

  // 3. First name exact match (only if unique)
  const targetFirstName = cleanQuery.split(/\s+/)[0];
  const firstNameMatches = teamMembers.filter((m) => {
    const memberFirstName = m.name.toLowerCase().trim().split(/\s+/)[0];
    return memberFirstName === targetFirstName || cleanQuery.startsWith(memberFirstName);
  });

  if (firstNameMatches.length === 1) {
    return {
      assigneeId: firstNameMatches[0].id,
      assigneeName: firstNameMatches[0].name,
      isAssigneeUnresolved: false,
    };
  }

  // 4. Substring / Word match (only if unique)
  const substringMatches = teamMembers.filter((m) => {
    const mName = m.name.toLowerCase();
    return mName.includes(cleanQuery) || cleanQuery.includes(mName);
  });

  if (substringMatches.length === 1) {
    return {
      assigneeId: substringMatches[0].id,
      assigneeName: substringMatches[0].name,
      isAssigneeUnresolved: false,
    };
  }

  // Ambiguous (multiple potential matches)
  if (firstNameMatches.length > 1 || substringMatches.length > 1) {
    return {
      assigneeId: null,
      assigneeName: trimmed,
      isAssigneeUnresolved: true,
      warningNote: `Multiple team members match "${trimmed}". Please select manually.`,
    };
  }

  // Not found in team roster - NEVER silently assign to someone else
  return {
    assigneeId: null,
    assigneeName: trimmed,
    isAssigneeUnresolved: true,
    warningNote: `"${trimmed}" was not found in the team roster. Please add or select a team member.`,
  };
}

/**
 * Resolves relative date expressions relative to meetingDate (YYYY-MM-DD).
 * For vague expressions like "Before next meeting", leaves unresolved for manual confirmation.
 */
export function resolveDeadline(
  rawDeadline: string | null,
  meetingDateStr: string
): {
  deadline: string | null;
  isDeadlineAmbiguous: boolean;
  warningNote?: string;
} {
  if (!rawDeadline || rawDeadline.trim() === "") {
    return {
      deadline: null,
      isDeadlineAmbiguous: true,
      warningNote: "No deadline specified. Please select a calendar date.",
    };
  }

  const trimmed = rawDeadline.trim();
  const lower = trimmed.toLowerCase();

  // 1. Ambiguous / open-ended expressions (e.g. "before next meeting", "asap", "soon", "tbd", "next sprint")
  if (
    lower.includes("before next meeting") ||
    lower.includes("before the next meeting") ||
    lower.includes("next meeting") ||
    lower.includes("asap") ||
    lower.includes("soon") ||
    lower.includes("tbd") ||
    lower.includes("future") ||
    lower.includes("ongoing") ||
    lower.includes("next sprint")
  ) {
    return {
      deadline: null,
      isDeadlineAmbiguous: true,
      warningNote: `Deadline "${trimmed}" is open-ended. Please select an exact calendar date.`,
    };
  }

  // 2. If already valid YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = parseISO(trimmed);
    if (isValid(parsed)) {
      return {
        deadline: trimmed,
        isDeadlineAmbiguous: false,
      };
    }
  }

  // 3. Base date parsing (timezone-neutral)
  const baseMatch = meetingDateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  const cleanBaseStr = baseMatch ? baseMatch[1] : meetingDateStr;
  const baseDate = parseISO(cleanBaseStr);
  if (!isValid(baseDate)) {
    return {
      deadline: null,
      isDeadlineAmbiguous: true,
      warningNote: `Invalid meeting date reference: ${meetingDateStr}`,
    };
  }

  // 4. "Day after tomorrow" must be checked BEFORE "tomorrow"
  if (lower.includes("day after tomorrow")) {
    return {
      deadline: format(addDays(baseDate, 2), "yyyy-MM-dd"),
      isDeadlineAmbiguous: false,
    };
  }

  if (lower.includes("tomorrow")) {
    return {
      deadline: format(addDays(baseDate, 1), "yyyy-MM-dd"),
      isDeadlineAmbiguous: false,
    };
  }

  // 5. "in X days" / "X days" / number words
  const inDaysMatch = lower.match(/(?:in\s+)?(\d+)\s+days?/);
  if (inDaysMatch) {
    const daysCount = parseInt(inDaysMatch[1], 10);
    if (!isNaN(daysCount)) {
      return {
        deadline: format(addDays(baseDate, daysCount), "yyyy-MM-dd"),
        isDeadlineAmbiguous: false,
      };
    }
  }

  const wordDaysMap: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
  };
  for (const [w, count] of Object.entries(wordDaysMap)) {
    if (lower.includes(`${w} day`) || lower.includes(`${w} days`)) {
      return {
        deadline: format(addDays(baseDate, count), "yyyy-MM-dd"),
        isDeadlineAmbiguous: false,
      };
    }
  }

  // 6. End of week / EOW / By Friday
  if (lower.includes("end of week") || lower.includes("eow") || lower.includes("by friday") || lower.includes("friday")) {
    const friday = nextDay(baseDate, 5);
    return {
      deadline: format(friday, "yyyy-MM-dd"),
      isDeadlineAmbiguous: false,
    };
  }

  // 7. Specific weekdays relative to baseDate
  const dayMap: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  for (const [dayName, dayIndex] of Object.entries(dayMap)) {
    if (lower.includes(dayName)) {
      const calculated = nextDay(baseDate, dayIndex);
      return {
        deadline: format(calculated, "yyyy-MM-dd"),
        isDeadlineAmbiguous: false,
      };
    }
  }

  // 8. Natural calendar date formats like "19 November 2026", "Nov 19, 2026"
  const naturalParsed = new Date(trimmed);
  if (!isNaN(naturalParsed.getTime()) && trimmed.match(/\d{4}/)) {
    const yyyy = naturalParsed.getFullYear();
    const mm = String(naturalParsed.getMonth() + 1).padStart(2, "0");
    const dd = String(naturalParsed.getDate()).padStart(2, "0");
    return {
      deadline: `${yyyy}-${mm}-${dd}`,
      isDeadlineAmbiguous: false,
    };
  }

  // Ambiguous fallback
  return {
    deadline: null,
    isDeadlineAmbiguous: true,
    warningNote: `Ambiguous deadline expression "${trimmed}". Please select a calendar date manually.`,
  };
}

/**
 * Transforms raw LLM extraction into a resolved review staging structure
 */
export function postProcessExtraction(
  raw: RawExtractionResult,
  meetingDateStr: string,
  teamMembers: TeamMemberRef[]
): StagedExtractionReview {
  let counter = 1;

  const actions: ResolvedActionItem[] = raw.actions.map((item) => {
    const assigneeRes = resolveAssignee(item.assignee, teamMembers);
    const deadlineRes = resolveDeadline(item.deadline, meetingDateStr);

    const warnings: string[] = [];
    if (assigneeRes.warningNote) warnings.push(assigneeRes.warningNote);
    if (deadlineRes.warningNote) warnings.push(deadlineRes.warningNote);

    return {
      tempId: `draft-action-${counter++}`,
      description: item.action,
      rawAssignee: item.assignee,
      assigneeId: assigneeRes.assigneeId,
      assigneeName: assigneeRes.assigneeName,
      rawDeadline: item.deadline,
      deadline: deadlineRes.deadline,
      isAssigneeUnresolved: assigneeRes.isAssigneeUnresolved,
      isDeadlineAmbiguous: deadlineRes.isDeadlineAmbiguous,
      warningNote: warnings.join(" • ") || undefined,
    };
  });

  return {
    actions,
    decisions: raw.decisions || [],
  };
}
