import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendOverduePushNotification } from "@/lib/fcm";
import { format } from "date-fns";

export async function POST(request: Request) {
  const session = await getSessionUser();
  const userId = session?.id;

  // Find a sample overdue or open task to demonstrate
  let sampleTask = null;
  if (userId) {
    sampleTask = await prisma.actionItem.findFirst({
      where: {
        assigneeId: userId,
        status: { not: "COMPLETED" },
        deadline: { not: null },
      },
      include: { assignee: true, meeting: true },
    });
  }

  if (!sampleTask) {
    sampleTask = await prisma.actionItem.findFirst({
      where: {
        status: { not: "COMPLETED" },
        deadline: { not: null },
      },
      include: { assignee: true, meeting: true },
    });
  }

  const taskTitle = sampleTask?.description || "Complete the updated dashboard UI design";
  const deadlineStr = sampleTask?.deadline ? format(sampleTask.deadline, "yyyy-MM-dd") : "2026-11-18";

  // Notification payload
  const notificationPayload = {
    title: "MeetingMind: Task Overdue",
    body: `"${taskTitle}" was due on ${deadlineStr}. Please update your progress.`,
    icon: "/favicon.ico",
    data: {
      url: "/my-tasks",
      taskId: sampleTask?.id || "demo-task-1",
      deadline: deadlineStr,
    },
  };

  // Check if target user has registered an FCM device token
  let tokenRecord = null;
  if (userId) {
    tokenRecord = await prisma.deviceToken.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  if (!tokenRecord) {
    tokenRecord = await prisma.deviceToken.findFirst({
      orderBy: { updatedAt: "desc" },
    });
  }

  let fcmResult = null;
  if (tokenRecord?.token) {
    fcmResult = await sendOverduePushNotification(tokenRecord.token, {
      taskTitle,
      deadlineStr,
    });
  }

  return NextResponse.json({
    success: true,
    notification: notificationPayload,
    fcmSent: fcmResult?.success ?? false,
    fcmError: fcmResult?.error,
    hasRegisteredToken: !!tokenRecord,
    recipient: sampleTask?.assignee?.name || session?.name || "Team Member",
  });
}
