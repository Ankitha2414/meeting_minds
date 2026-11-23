import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let isInitialized = false;

export function initFirebaseAdmin(): boolean {
  if (isInitialized) return true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return false;
  }

  // Handle escaped newlines in environment variable
  privateKey = privateKey.replace(/\\n/g, "\n");

  try {
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    isInitialized = true;
    return true;
  } catch (error) {
    console.error("Firebase admin initialization failed:", error);
    return false;
  }
}

export async function sendOverduePushNotification(
  token: string,
  payload: { taskTitle: string; deadlineStr: string }
): Promise<{ success: boolean; error?: string }> {
  const ready = initFirebaseAdmin();
  if (!ready) {
    return {
      success: false,
      error: "Firebase Admin is not configured on this environment.",
    };
  }

  try {
    const messaging = getMessaging();
    await messaging.send({
      token,
      notification: {
        title: "MeetingMind: Task Overdue",
        body: `"${payload.taskTitle}" was due on ${payload.deadlineStr}. Please update your progress.`,
      },
      data: {
        url: "/my-tasks",
      },
    });
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to deliver push notification",
    };
  }
}
