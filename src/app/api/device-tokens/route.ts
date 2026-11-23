import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const TokenSchema = z.object({
  token: z.string().min(10, "Valid device token required"),
  userAgent: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const result = TokenSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token, userAgent } = result.data;

    const deviceToken = await prisma.deviceToken.upsert({
      where: { token },
      update: {
        userId: session.id,
        userAgent: userAgent || null,
        updatedAt: new Date(),
      },
      create: {
        userId: session.id,
        token,
        userAgent: userAgent || null,
      },
    });

    return NextResponse.json({ message: "Device token registered successfully", id: deviceToken.id });
  } catch (error: any) {
    console.error("Register device token error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
