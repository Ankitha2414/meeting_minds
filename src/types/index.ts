export const Role = {
  ORGANIZER: "ORGANIZER",
  MEMBER: "MEMBER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ActionStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;
export type ActionStatus = (typeof ActionStatus)[keyof typeof ActionStatus];

export const TranscriptSource = {
  PASTE: "PASTE",
  FILE: "FILE",
} as const;
export type TranscriptSource = (typeof TranscriptSource)[keyof typeof TranscriptSource];

export const ReminderDeliveryStatus = {
  SENT: "SENT",
  FAILED: "FAILED",
  SKIPPED_NO_TOKEN: "SKIPPED_NO_TOKEN",
} as const;
export type ReminderDeliveryStatus = (typeof ReminderDeliveryStatus)[keyof typeof ReminderDeliveryStatus];
