import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { sendOverduePushNotification } from "@/lib/fcm";
import { ActionStatus, ReminderDeliveryStatus } from "@/types";

export async function POST(request: Request) {
  // Validate scheduler secret
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.SCHEDULER_SECRET || "meetingmind-scheduler-cron-secret-token";

  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized scheduler invocation" }, { status: 401 });
  }

  try {
    // Current date reference in configured timezone (default UTC / system)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = format(today, "yyyy-MM-dd");

    // Query open tasks with a past deadline
    const overdueTasks = await prisma.actionItem.findMany({
      where: {
        status: { not: ActionStatus.COMPLETED },
        deadline: {
          not: null,
          lt: today,
        },
      },
      include: {
        assignee: {
          include: {
            deviceTokens: {
              orderBy: { updatedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    let sentCount = 0;
    let skippedDuplicateCount = 0;
    let skippedNoTokenCount = 0;
    let failedCount = 0;

    for (const task of overdueTasks) {
      if (!task.assigneeId || !task.assignee) {
        continue;
      }

      const deduplicationKey = `overdue:${task.id}:${dateKey}`;

      // Check if reminder was already created today
      const existingReminder = await prisma.reminder.findUnique({
        where: { deduplicationKey },
      });

      if (existingReminder) {
        skippedDuplicateCount++;
        continue;
      }

      const deadlineStr = task.deadline ? format(task.deadline, "yyyy-MM-dd") : "Unknown";
      const deviceToken = task.assignee.deviceTokens[0]?.token;

      if (!deviceToken) {
        // Record as skipped no token to avoid spamming the log
        await prisma.reminder.create({
          data: {
            actionItemId: task.id,
            userId: task.assigneeId,
            deduplicationKey,
            deliveryStatus: ReminderDeliveryStatus.SKIPPED_NO_TOKEN,
            errorMessage: "No registered device token for assignee.",
          },
        });
        skippedNoTokenCount++;
        continue;
      }

      const sendResult = await sendOverduePushNotification(deviceToken, {
        taskTitle: task.description,
        deadlineStr,
      });

      if (sendResult.success) {
        await prisma.reminder.create({
          data: {
            actionItemId: task.id,
            userId: task.assigneeId,
            deduplicationKey,
            deliveryStatus: ReminderDeliveryStatus.SENT,
          },
        });
        sentCount++;
      } else {
        await prisma.reminder.create({
          data: {
            actionItemId: task.id,
            userId: task.assigneeId,
            deduplicationKey,
            deliveryStatus: ReminderDeliveryStatus.FAILED,
            errorMessage: sendResult.error,
          },
        });
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      executionDate: dateKey,
      totalOverdueEvaluated: overdueTasks.length,
      sentCount,
      skippedDuplicateCount,
      skippedNoTokenCount,
      failedCount,
    });
  } catch (error: any) {
    console.error("Scheduled overdue reminder job failed:", error);
    return NextResponse.json({ error: "Internal scheduler execution error" }, { status: 500 });
  }
}
