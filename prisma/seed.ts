import { PrismaClient } from "@prisma/client";
import { Role, ActionStatus, TranscriptSource } from "../src/types";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding MeetingMind database...");

  // Clean existing demo data
  await prisma.reminder.deleteMany();
  await prisma.actionItemHistory.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.transcript.deleteMany();
  await prisma.meetingAttendee.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.deviceToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Users
  const ankita = await prisma.user.create({
    data: {
      name: "Ankita C",
      email: "ankita@team.com",
      passwordHash,
    },
  });

  const eshwari = await prisma.user.create({
    data: {
      name: "Eshwari Rao",
      email: "eshwari@team.com",
      passwordHash,
    },
  });

  const dev = await prisma.user.create({
    data: {
      name: "Dev Sharma",
      email: "dev@team.com",
      passwordHash,
    },
  });

  console.log("Created users:", ankita.name, eshwari.name, dev.name);

  // 2. Create Team
  const team = await prisma.team.create({
    data: {
      name: "MeetingMind Core Team",
      createdById: ankita.id,
      members: {
        create: [
          { userId: ankita.id, role: Role.ORGANIZER },
          { userId: eshwari.id, role: Role.MEMBER },
          { userId: dev.id, role: Role.MEMBER },
        ],
      },
    },
  });

  console.log("Created team:", team.name);

  // 3. Create Sample Meeting
  const meetingDate = new Date("2026-10-25T00:00:00.000Z");
  const meeting = await prisma.meeting.create({
    data: {
      teamId: team.id,
      title: "Sprint Kickoff & Architecture Alignment",
      meetingDate,
      attendees: {
        create: [
          { userId: ankita.id },
          { userId: eshwari.id },
          { userId: dev.id },
        ],
      },
      transcripts: {
        create: {
          source: TranscriptSource.PASTE,
          rawText: `Meeting Minutes - Sprint Kickoff (25 Oct 2026)
Attendees: Ankita C, Eshwari Rao, Dev Sharma

Discussion summary:
The team convened to review architecture for the action tracker prototype.
Decision: The team will adopt PostgreSQL with Prisma ORM for relational persistence.
Decision: Single-call structured extraction will be used with Zod validation.

Tasks agreed:
1. Ankita will implement the authentication system and team role checks by 2026-10-27.
2. Eshwari to build the dual extraction provider interface supporting Ollama and OpenAI by 2026-10-29.
3. Dev Sharma will construct the interactive review canvas and staging controls by 2026-10-31.
4. Dev to verify FCM web push notification service worker by tomorrow.`,
        },
      },
      decisions: {
        create: [
          { decisionText: "Adopt PostgreSQL with Prisma ORM for relational persistence." },
          { decisionText: "Enforce single-call structured extraction with Zod validation." },
        ],
      },
    },
  });

  console.log("Created meeting:", meeting.title);

  // 4. Create Confirmed Action Items (including an overdue task to demonstrate scheduler)
  const taskPastDue = await prisma.actionItem.create({
    data: {
      meetingId: meeting.id,
      assigneeId: ankita.id,
      description: "Implement authentication system and team role checks",
      deadline: new Date("2026-10-26T00:00:00.000Z"), // Past due relative to Oct 28
      status: ActionStatus.IN_PROGRESS,
    },
  });

  await prisma.actionItemHistory.create({
    data: {
      actionItemId: taskPastDue.id,
      changedById: ankita.id,
      oldStatus: ActionStatus.PENDING,
      newStatus: ActionStatus.IN_PROGRESS,
    },
  });

  const task2 = await prisma.actionItem.create({
    data: {
      meetingId: meeting.id,
      assigneeId: eshwari.id,
      description: "Build dual extraction provider interface supporting Ollama and OpenAI",
      deadline: new Date("2026-10-29T00:00:00.000Z"),
      status: ActionStatus.PENDING,
    },
  });

  const task3 = await prisma.actionItem.create({
    data: {
      meetingId: meeting.id,
      assigneeId: dev.id,
      description: "Construct interactive review canvas and staging controls",
      deadline: new Date("2026-10-31T00:00:00.000Z"),
      status: ActionStatus.PENDING,
    },
  });

  // 5. Create Technova Solutions Team and Roster
  const david = await prisma.user.create({
    data: { name: "David Wilson", email: "david@technova.com", passwordHash },
  });
  const sarah = await prisma.user.create({
    data: { name: "Sarah Johnson", email: "sarah@technova.com", passwordHash },
  });
  const michael = await prisma.user.create({
    data: { name: "Michael Brown", email: "michael@technova.com", passwordHash },
  });
  const emily = await prisma.user.create({
    data: { name: "Emily Davis", email: "emily@technova.com", passwordHash },
  });
  const robert = await prisma.user.create({
    data: { name: "Robert Smith", email: "robert@technova.com", passwordHash },
  });
  const jessica = await prisma.user.create({
    data: { name: "Jessica Taylor", email: "jessica@technova.com", passwordHash },
  });

  const technovaTeam = await prisma.team.create({
    data: {
      name: "Technova Solutions",
      createdById: david.id,
      members: {
        create: [
          { userId: david.id, role: Role.ORGANIZER },
          { userId: sarah.id, role: Role.MEMBER },
          { userId: michael.id, role: Role.MEMBER },
          { userId: emily.id, role: Role.MEMBER },
          { userId: robert.id, role: Role.MEMBER },
          { userId: jessica.id, role: Role.MEMBER },
          { userId: ankita.id, role: Role.ORGANIZER },
        ],
      },
    },
  });

  console.log("Seeded sample tasks and Technova team successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
