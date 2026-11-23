import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { Role } from "@/types";

const CreateTeamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters"),
});

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teams = await prisma.team.findMany({
    where: {
      members: {
        some: { userId: session.id },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: {
          meetings: true,
          members: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ teams });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const result = CreateTeamSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name } = result.data;

    // Create team and assign creator as ORGANIZER within a transaction
    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: {
          name,
          createdById: session.id,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: session.id,
          role: Role.ORGANIZER,
        },
      });

      return newTeam;
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error: any) {
    console.error("Create team error:", error);
    return NextResponse.json(
      { error: "Internal server error creating team" },
      { status: 500 }
    );
  }
}
