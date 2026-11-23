# MeetingMind: AI-Powered Meeting Action Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6-indigo)](https://www.prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

MeetingMind is a full-stack, AI-powered meeting action item and commitment tracking system. Designed with a strict **Human-in-the-Loop** philosophy, it extracts actionable tasks, owners, calendar deadlines, and key architectural decisions from raw meeting transcripts in a single LLM request. Zero unverified AI predictions are persisted until human review and approval.

---

## 🌟 Key Features

1. **Deterministic Single-Call Extraction**
   - Transcripts are parsed in one structured request using a standardized JSON schema.
   - Extract action descriptions, assignees, relative deadlines, and meeting decisions.
   - Never hallucinates dates or silent assignments.

2. **Multi-LLM Provider Engine**
   - **OpenAI API**: Hosted `gpt-4o-mini` with JSON mode.
   - **Ollama**: Local models (e.g., `llama3.1:8b`) for complete data privacy.
   - **LM Studio**: Local OpenAI-compatible server on `localhost:1234` with auto-model discovery.

3. **Intelligent AI Extraction Review Canvas**
   - Staging interface: review, edit, add, or discard suggestions before writing to the database.
   - **Name Matching**: Matches mentioned names with team members using exact, cleaned, first-name, and substring algorithms.
   - **Roster Safety**: If an employee is not found in the roster, the task is marked as unresolved and prompts manual assignment. Tasks are **never** silently misassigned.
   - **Relative Date Resolver**: Converts relative expressions (*"Thursday"*, *"by Friday"*, *"tomorrow"*, *"in 3 days"*) into exact `YYYY-MM-DD` calendar dates using the meeting date as reference.
   - **Open-Ended Date Flagging**: Phrases like *"Before next meeting"* or *"ASAP"* are flagged for explicit manual selection.
   - **Strict Validation Guard**: Confirmed savings are blocked if any task lacks a confirmed assignee or a calendar date.

4. **Team & Personal Boards**
   - **Meeting Board**: Track commitments specific to each meeting.
   - **Person Board (`/my-tasks`)**: View assigned work categorized into *Pending*, *In Progress*, and *Completed* with instant status updates.

5. **Automated Overdue Tracking & FCM Push Notifications**
   - Scheduled cron worker scans for past-due open tasks based on the application timezone.
   - Firebase Cloud Messaging (FCM) sends web push notifications directly to user devices.
   - Daily deduplication ensures no duplicate notifications are sent for the same task on the same day.

---

## 🏗️ Architecture & Tech Stack

- **Framework**: Next.js 16 (App Router, Server Route Handlers)
- **Language**: TypeScript
- **Database & ORM**: SQLite (`dev.db`) for rapid local development; PostgreSQL schema ready for production via Prisma ORM (`prisma/schema.postgres.prisma`).
- **Validation**: Zod schema enforcement for incoming payloads, LLM responses, and staging submissions.
- **Authentication**: JWT session tokens stored in secure, `httpOnly` cookies with bcrypt password hashing.
- **Push Reminders**: Firebase Admin SDK (server-side dispatch) & Web Client Service Worker (`firebase-messaging-sw.js`).
- **Time & Dates**: `date-fns` for timezone-neutral arithmetic and calendar resolution.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm, yarn, or pnpm
- (Optional) Local LLM instance via **Ollama** (`http://127.0.0.1:11434`) or **LM Studio** (`http://127.0.0.1:1234`), or an **OpenAI API Key**.

### 1. Clone & Install
```bash
git clone https://github.com/Ankitha2414/meeting_minds.git
cd meeting_minds
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your LLM provider and credentials in `.env`:
```env
# Database
DATABASE_URL="file:./dev.db"

# Authentication & Session Security
AUTH_SECRET="meetingmind-super-secure-auth-secret-key-32chars"
NEXTAUTH_URL="http://localhost:3000"

# Scheduled Worker Secret
SCHEDULER_SECRET="meetingmind-scheduler-cron-secret-token"

# LLM Extraction Provider ("openai", "ollama", or "lmstudio")
LLM_PROVIDER="ollama"

# OpenAI Configuration (when LLM_PROVIDER=openai)
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"

# Ollama Configuration (when LLM_PROVIDER=ollama)
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="llama3.1:8b"

# LM Studio Configuration (when LLM_PROVIDER=lmstudio)
LMSTUDIO_BASE_URL="http://127.0.0.1:1234/v1"
LMSTUDIO_MODEL=""

# Firebase Cloud Messaging (Server Admin SDK)
FIREBASE_PROJECT_ID=""
FIREBASE_CLIENT_EMAIL=""
FIREBASE_PRIVATE_KEY=""

# Application Timezone
APP_TIMEZONE="Asia/Kolkata"
```

### 3. Initialize Database
Push schema and seed initial test accounts:
```bash
npx prisma db push
npm run seed
```

Default demo accounts created:
- Organizer: `ankita@team.com` / `password123`
- Member: `eshwari@team.com` / `password123`
- Member: `dev@team.com` / `password123`

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Evaluation

### Automated Functional Test Suite
Runs comprehensive unit and functional assertions verifying PRD test cases (TC-01 through TC-18), including security, Zod schema validation, name resolution, and date calculation:
```bash
npx tsx scripts/test-runner.ts
```

### AI Extraction Benchmark Suite
Evaluates precision, recall, F1 score, assignee accuracy, and deadline accuracy against reference ground truth datasets:
```bash
npx tsx scripts/evaluate-extraction.ts
```

---

## 📁 Project Structure

```
meeting_minds/
├── prisma/
│   ├── schema.prisma           # SQLite schema for development
│   ├── schema.postgres.prisma  # PostgreSQL schema for production
│   ├── seed.ts                 # Database seeder
│   └── benchmark_eval.json     # Ground-truth extraction test cases
├── public/
│   └── firebase-messaging-sw.js# Web Push Service Worker
├── scripts/
│   ├── test-runner.ts          # Automated functional test runner
│   └── evaluate-extraction.ts  # Extraction benchmark evaluation
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/           # Login, register, logout, session
│   │   │   ├── meetings/       # Transcript, extract, and confirm endpoints
│   │   │   ├── action-items/   # Task status update PATCH endpoints
│   │   │   └── jobs/           # Scheduled overdue notification runner
│   │   ├── login/              # Sign-in page
│   │   ├── register/           # Registration page
│   │   ├── teams/              # Team dashboards & meeting views
│   │   └── my-tasks/           # Personal task board
│   ├── components/             # Reusable UI components & layouts
│   ├── lib/
│   │   ├── auth.ts             # Password hashing & JWT session management
│   │   ├── fcm.ts              # Firebase Admin SDK & push dispatcher
│   │   └── prisma.ts           # Prisma client singleton
│   ├── services/
│   │   └── extraction/
│   │       ├── factory.ts      # LLM provider factory
│   │       ├── openai-provider.ts
│   │       ├── ollama-provider.ts
│   │       ├── lmstudio-provider.ts
│   │       ├── prompt-builder.ts
│   │       ├── resolver.ts     # Assignee & deadline post-processing
│   │       └── types.ts        # Zod extraction schema & interfaces
│   └── types/                  # Shared enums and type definitions
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 🔒 Security & Privacy

- All sensitive credentials (`.env`, Firebase Service Account JSON, SQLite DB files) are strictly ignored in `.gitignore`.
- Password hashes are stored using salted `bcrypt` hashes.
- Route handlers enforce role-based access checks (`ORGANIZER` vs `MEMBER`).
- Scheduled cron endpoints are protected by `SCHEDULER_SECRET`.

---

## 📄 License
This project is licensed under the MIT License.
