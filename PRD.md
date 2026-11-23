PRODUCT REQUIREMENTS DOCUMENT

MeetingMind

An AI-Powered Meeting Action Tracker

Prepared from the submitted project synopsis

Project owner: Ankita C  |  MCA 2026–27

Version 1.0  •  28 October 2026

# Document Control

| Field | Details |
| --- | --- |
| Product | MeetingMind — An AI-Powered Meeting Action Tracker |
| Document | Product Requirements Document (PRD) |
| Version / status | 1.0 / Initial specification for academic prototype |
| Primary audience | Project developer, academic guide, testers and evaluators |
| Source basis | MeetingMind synopsis supplied by the project owner |
| Requirement labels | MUST = essential for the prototype; SHOULD = valuable if time permits; OUT OF SCOPE = excluded from this version |


## How to Read This PRD

This document converts the synopsis into buildable requirements. Features explicitly present in the synopsis are treated as core requirements. Details needed to implement them—such as validation messages, access rules and acceptance tests—are implementation-level specifications. Any optional behavior is labelled as a recommendation rather than a confirmed synopsis commitment.

# 1. Executive Summary

MeetingMind is a full-stack web application for small companies and project teams that turns meeting transcripts or notes into reviewable action items and decisions, then tracks those commitments until completion. Users set up teams and meetings, paste or upload text, and request one large-language-model (LLM) extraction call. The application validates the structured response, lets a human correct it, and only then saves confirmed information. After extraction, ordinary application logic—not the LLM—handles assignment, status changes, boards, overdue detection and reminders.

The product addresses scattered notes, unclear ownership, missed deadlines, weak visibility and the risk of saving unverified AI output. It is an academic prototype, not a replacement for a full project-management suite.

## 1.1 Product Vision

Provide small teams with one reliable place to capture what was agreed in a meeting, who owns each task, when it is due, and whether it has been completed.

## 1.2 Product Goals

Reduce manual effort required to convert meeting notes into tasks.

Keep every confirmed action item associated with a meeting, owner, deadline and status.

Make AI output reviewable and correctable before it becomes persistent task data.

Give members and organisers visibility into tasks by person and by meeting.

Detect overdue tasks on a schedule and send push reminders without duplicate notifications.

Offer a hosted LLM option (OpenAI API) and a local option (Ollama) to balance convenience, cost and privacy.

## 1.3 Success Indicators

| Indicator | How it will be evaluated |
| --- | --- |
| Extraction quality | Compare extracted actions, owners, deadlines and decisions with a manually prepared reference list on sample transcripts. |
| Review safety | Verify that extracted records are not saved before explicit user confirmation. |
| Task tracking | Verify that status changes persist and appear consistently on person and meeting boards. |
| Reminder correctness | Test overdue detection, completed-task exclusion and duplicate-reminder prevention. |
| Access control | Verify that users cannot read or change records outside their permitted teams. |
| Usability | Observe whether a user can create a meeting, extract tasks, review and save them without assistance. |


Numeric performance targets are not specified in the synopsis. The project should report measured results rather than claim a target has been achieved in advance.

# 2. Problem Statement and Users

## 2.1 Problem Statement

Meeting commitments are often distributed across chat messages, notebooks and informal notes. Tasks can lose their owner or deadline, managers cannot see progress in one place, and decisions may need to be discussed again. Manually processing a long transcript is tedious. AI can help extract structured information, but its output may be wrong and therefore needs validation and human confirmation.

## 2.2 Target Users

| User type | Needs | Main permissions |
| --- | --- | --- |
| Team organiser | Create teams and meetings, add members, submit notes, review extracted data, monitor work. | Manage team/meeting setup; submit and approve extraction; view team boards. |
| Team member | See assigned work, understand deadlines, update task status and receive reminders. | View permitted team/meeting data; update assigned action items. |
| Evaluator / tester | Verify functionality, extraction quality and usability. | Use a designated test account and sample data; no special production role is required. |


The organiser/member roles are identified in the synopsis. Fine-grained administrative permissions beyond these roles are not specified and should be kept minimal for the prototype.

## 2.3 Key User Stories

As an organiser, I want to create a team and maintain its members so that extracted assignee names can be matched to known people.

As an organiser, I want to create a dated meeting and record attendees so that notes and decisions are associated with the correct meeting.

As an organiser, I want to paste notes or upload a text-based file so that I do not have to retype the transcript.

As a user, I want MeetingMind to extract actions, owners, deadlines and decisions in one LLM request so that I can prepare a task list quickly.

As a reviewer, I want to edit, add or delete extracted items before saving so that incorrect AI output is not treated as fact.

As a member, I want to see my tasks by status and due date so that I can prioritise my work.

As an organiser, I want to view all action items for a meeting so that I can follow up on commitments.

As a member, I want to receive an overdue reminder for an unfinished task so that deadlines are less likely to be missed.

# 3. Scope

## 3.1 In Scope — Must Have

User registration and login.

Team creation, member management and organiser/member roles.

Meeting creation with title, date and attendees.

Transcript/notes entry by pasted text or supported text-file upload.

Input cleaning and handling of empty, invalid and overly long text.

A single LLM request per extraction attempt, using Ollama or OpenAI API.

Structured extraction of action descriptions, assignees, deadlines and meeting decisions.

Schema validation, assignee matching and an editable review/confirmation screen.

Persistence of confirmed records in PostgreSQL using Prisma ORM.

Action statuses: Pending, In Progress and Completed.

Per-person and per-meeting status boards, with status and due-date filters.

Scheduled overdue checking and Firebase Cloud Messaging push notifications.

Reminder history or records to prevent duplicate reminders.

Functional testing and an extraction-quality evaluation using sample transcripts.

## 3.2 Explicitly Out of Scope

Audio recording and speech-to-text transcription.

Automatic import from Zoom, Microsoft Teams or Google Meet.

Direct integration with WhatsApp, Slack, email or calendars.

A native mobile application.

Replacing full project-management suites.

Automatic saving of unreviewed LLM results.

Using the LLM for routine status tracking, overdue checks or reminders after extraction.

## 3.3 Future Enhancements (Not MVP Requirements)

Audio transcription; calendar and chat integration; meeting-platform imports; email reminders; recurring-meeting carry-forward; analytics dashboards; larger labelled extraction benchmarks; multilingual support; and a mobile application.

# 4. Functional Requirements

| ID | Feature | Priority | Requirement | Acceptance criteria |
| --- | --- | --- | --- | --- |
| FR-01 | Authentication | MUST | The system shall allow a user to register, log in and log out. Passwords must be stored as secure hashes, never as plain text. | A registered user can sign in with valid credentials; invalid credentials are rejected with a safe message. |
| FR-02 | Team management | MUST | An organiser shall be able to create a team and manage its members. Team membership shall define the scope of access to team data. | A created team is visible to authorised members only. |
| FR-03 | Roles | MUST | The system shall distinguish organiser and member permissions. Members shall be able to update their assigned tasks; only authorised users can approve/save extraction results. | A member cannot perform organiser-only actions unless granted that role. |
| FR-04 | Meeting management | MUST | An organiser shall create a meeting under a team with title, date and attendees, and view the team's meeting list. | Meeting details persist and the meeting appears in the correct team. |
| FR-05 | Transcript input | MUST | A user shall paste transcript/notes text or upload a supported text-based file and associate it with a meeting. | Accepted input is stored against the selected meeting with its source recorded. |
| FR-06 | Input checks | MUST | The system shall trim text, normalise encoding where possible, reject empty input and check model context limits before extraction. | Empty or oversized input produces a clear message and does not trigger an invalid request. |
| FR-07 | LLM provider | MUST | The extraction service shall support either a configured Ollama model or OpenAI API behind a common provider interface. | A configuration switch changes the provider without changing the review/tracking workflow. |
| FR-08 | Single-call extraction | MUST | For each extraction attempt, the server shall send the transcript, meeting date and valid team-member names in one LLM request. | The application makes one extraction request for a normal attempt; it does not call the LLM during routine task tracking. |
| FR-09 | Extraction schema | MUST | The response shall contain a list of actions with action description, assignee and deadline, plus a separate list of decisions. | A valid response can be parsed into the defined schema. |
| FR-10 | Relative dates | MUST | The extraction prompt shall resolve expressions such as 'next Friday' against the meeting date where possible. Unclear dates shall be flagged for review rather than silently guessed. | A test transcript with an unambiguous relative date yields the expected calendar date; ambiguous dates require user review. |
| FR-11 | Schema validation | MUST | The server shall validate the LLM response using a schema such as Zod before displaying it as structured data. | Malformed or incomplete output is rejected or clearly flagged and is never saved as confirmed data. |
| FR-12 | Assignee matching | MUST | The system shall match extracted names to team members using case-insensitive/partial matching. Ambiguous or unmatched names shall remain unresolved for user selection. | An unmatched name is not silently assigned to the wrong member. |
| FR-13 | Review and correction | MUST | The review screen shall let the organiser edit, add, delete and approve action items, and correct decisions before saving. | No extracted action or decision is persisted as confirmed until the user explicitly confirms. |
| FR-14 | Action item persistence | MUST | Confirmed action items shall be stored with meeting, description, assignee, deadline, status and timestamps. | Saved records can be retrieved after page refresh and are linked to the correct meeting. |
| FR-15 | Decision persistence | MUST | Confirmed decisions shall be stored against the relevant meeting. | Decisions appear on the meeting detail/board. |
| FR-16 | Status workflow | MUST | Action items shall support Pending, In Progress and Completed states. Status changes shall be persisted and a change history retained. | A status change is reflected consistently across the relevant boards. |
| FR-17 | Person board | MUST | The system shall display tasks assigned to a selected member, grouped by status. | Only permitted team data is displayed and filters work as expected. |
| FR-18 | Meeting board | MUST | The system shall display all action items and decisions for a selected meeting, grouped by status where applicable. | Every confirmed item for the meeting appears once. |
| FR-19 | Board filters | MUST | Boards shall provide status and due-date filters, including upcoming and overdue items. | Applying and clearing filters returns the expected records. |
| FR-20 | Overdue detection | MUST | A scheduled job shall identify action items whose deadline is earlier than the current date and whose status is not Completed. | A past-due open item is flagged; a completed item is excluded. |
| FR-21 | Push notification | MUST | The system shall send overdue push reminders to the assignee through Firebase Cloud Messaging where a valid device token is available. | A valid registered test device receives a reminder, subject to platform permission and delivery. |
| FR-22 | Duplicate prevention | MUST | The system shall record reminders and avoid repeatedly sending the same reminder under the same reminder policy. | Repeated scheduled runs do not create duplicate sends for the same item and reminder window. |
| FR-23 | Device tokens | MUST | The system shall associate FCM device tokens with users and allow invalid/obsolete tokens to be handled safely. | A token can be registered and an invalid token does not crash the scheduled job. |
| FR-24 | Error handling | MUST | The system shall provide understandable messages for provider failure, invalid output, database failure and notification failure without exposing secrets. | Failures are logged appropriately and users see a safe actionable message. |
| FR-25 | Testing and evaluation | MUST | The project shall include functional tests and compare extraction output against manually prepared reference annotations on sample transcripts. | A report records test cases, observed results and extraction metrics. |


# 5. User Workflow and Screen Requirements

## 5.1 End-to-End Workflow

User signs in and selects or creates a team.

Organiser creates a meeting with title, date and attendees.

Organiser pastes notes or uploads a text-based transcript.

Application validates the input and stores it against the meeting.

Server sends one extraction request to the configured LLM provider.

Application validates the structured response and resolves assignee names where possible.

Review screen shows actions, owners, deadlines and decisions; unresolved fields are highlighted.

Organiser edits, adds or removes records, then confirms the final set.

Application saves confirmed items and decisions to PostgreSQL.

Members update task statuses; person and meeting boards reflect the changes.

Scheduled job checks for overdue open items and sends eligible push reminders.

## 5.2 Recommended Screens

| Screen | Key elements | Primary actions |
| --- | --- | --- |
| Sign in / Register | Email, password, validation messages | Register, sign in, sign out |
| Team dashboard | Teams, upcoming meetings, high-level task counts (counts are a useful UI recommendation) | Create/select team |
| Team details | Member list, roles, meeting list | Manage members, create meeting |
| Create/Edit meeting | Title, meeting date, attendees | Save meeting |
| Transcript input | Paste area, supported file picker, selected meeting, size/empty validation | Upload/store transcript, start extraction |
| Extraction review | Editable action table, assignee selector, date field, decisions list, validation warnings | Edit, add, delete, confirm/save |
| Action item detail | Description, meeting, assignee, deadline, status and change history | Update permitted fields/status |
| My tasks / Person board | Tasks grouped by Pending, In Progress and Completed; due-date/status filters | Open task, update status |
| Meeting board | Meeting metadata, decisions, all action items and filters | Review progress |
| Notification setup | Push permission status and device registration feedback | Enable/register notifications |


## 5.3 Review Screen Rules

Clearly distinguish extracted suggestions from saved/confirmed tasks.

Show unresolved assignees and uncertain or missing deadlines as review warnings.

Allow a missing deadline to remain blank when the transcript does not provide one; do not invent a date.

Require explicit confirmation before committing the reviewed set.

If extraction fails, preserve the source transcript and allow the user to retry.

Prevent accidental double submission while a save request is in progress.

# 6. Data Requirements and Proposed Database Model

The synopsis names the core entities below. The exact fields and relations should be finalised in the Prisma schema during implementation. The proposed model keeps the synopsis's relational structure and adds only implementation-supporting fields where useful.

| Entity | Core fields | Relationship / notes |
| --- | --- | --- |
| User | id, name, email, passwordHash, createdAt | One user may belong to multiple teams and may have multiple device tokens. |
| Team | id, name, createdAt, createdById | Owns meetings and team memberships. |
| TeamMember | id, teamId, userId, role, joinedAt | Join entity linking users to teams; role is organiser/member. |
| Meeting | id, teamId, title, meetingDate, createdAt | Belongs to a team; has attendees, transcripts, actions and decisions. |
| MeetingAttendee | meetingId, userId | Recommended join table if attendees are registered users; alternatively store a structured attendee list for a simpler prototype. |
| Transcript | id, meetingId, rawText, source, createdAt | Source is paste or file; store the original text needed for traceability. |
| ActionItem | id, meetingId, description, assigneeId nullable, deadline nullable, status, createdAt, updatedAt, completedAt nullable | Assignee can be null until resolved; status limited to Pending/In Progress/Completed. |
| ActionItemHistory | id, actionItemId, changedById, oldStatus, newStatus, changedAt | Recommended to implement the synopsis's change-history requirement. |
| Decision | id, meetingId, decisionText, createdAt | Stores confirmed decisions from the meeting. |
| DeviceToken | id, userId, token, createdAt, updatedAt | Token should be unique where appropriate and must not be exposed to other users. |
| Reminder | id, actionItemId, userId, sentAt, type, deduplicationKey, deliveryStatus | Supports reminder history and duplicate prevention. |


## 6.1 Data Integrity Rules

Every meeting must belong to a team.

Every transcript, action item and decision must belong to a meeting.

An assignee must be a member of the meeting's team, unless the application explicitly supports an unresolved/null assignee.

Action status must be one of the three defined states.

A deadline may be null when no deadline is stated or the user leaves it unresolved.

A reminder must reference a valid action item and recipient.

Deleting or deactivating users must not accidentally orphan historical meeting records; define a safe deletion policy.

Database access must be scoped by authenticated user and team membership.

# 7. AI Extraction Requirements

## 7.1 Input to the Model

One request should contain: (1) the meeting transcript/notes, (2) the meeting date, (3) the list of team-member names, and (4) clear instructions and the required JSON schema. The model should be asked to extract only information supported by the source text.

## 7.2 Required Output Structure

Illustrative JSON contract (field names can be adjusted consistently during implementation):

{  "actions": [    {      "action": "Prepare API documentation",      "assignee": "Eshwari",      "deadline": "2026-09-28"    }  ],  "decisions": [    "The team will use PostgreSQL for persistence."  ]}

## 7.3 Extraction Rules

Do not infer a task merely because a topic was discussed; require a clear commitment or action.

Keep action descriptions concise and specific while preserving the original intent.

Use a known team member as assignee only when the transcript supports that mapping.

Represent an unknown assignee as unresolved rather than selecting someone arbitrarily.

Resolve relative deadlines against the meeting date only when unambiguous.

Return a null/empty deadline when no deadline is stated; never fabricate one.

Keep decisions separate from action items.

Use a low temperature and structured output/schema mode where supported.

Treat transcript text as data, not as instructions that override the extraction rules.

## 7.4 Provider Interface

Implement a shared extraction interface so the application workflow does not depend on which provider is configured. A provider adapter should accept the prepared prompt/schema and return raw structured output or a typed provider error. The application then validates output identically for both Ollama and OpenAI.

## 7.5 Failure Handling

| Failure | Expected behavior |
| --- | --- |
| Provider unavailable / timeout | Show retry option; preserve transcript; do not save partial output. |
| Malformed JSON or schema mismatch | Reject or flag response; log technical details safely; do not persist as confirmed. |
| Unknown assignee | Leave assignment unresolved and request user selection. |
| Ambiguous date | Flag for manual correction; do not guess silently. |
| Transcript too long | Explain the limit and ask user to shorten it; chunking is not part of the single-call MVP unless explicitly approved. |
| Empty extraction result | Show that no actions/decisions were detected and allow review or retry. |


# 8. Status, Deadline and Reminder Logic

## 8.1 Status Workflow

Allowed statuses are Pending → In Progress → Completed. For the prototype, a user may move an item between these states as permitted by role. A status change must update the record and create a history entry. Reopening completed items may be allowed if needed, but should be a deliberate implementation decision.

## 8.2 Overdue Definition

An action item is overdue when its deadline is earlier than the current date in the application's configured timezone and its status is not Completed. Items without a deadline are not overdue. The system should use one consistent timezone policy and document it.

## 8.3 Scheduled Job

Run at a configurable fixed interval (daily is the synopsis example).

Query open action items whose deadlines are before the current date.

Check reminder history/deduplication key before sending.

Send an FCM notification only when the assignee has a registered usable token.

Record success/failure and timestamp for auditing and duplicate prevention.

Continue processing other items if one notification fails.

## 8.4 Example Notification

Title: MeetingMind task overdue

Body: “Prepare API documentation” is overdue. Open MeetingMind to review the task.

Notification content should avoid including confidential transcript text. Push delivery depends on browser/device support and user permission; the application should communicate when notifications are unavailable.

# 9. Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-01 Security | Passwords are hashed; API keys and database credentials are stored in server-side environment variables; secrets are never sent to the browser. |
| NFR-02 Authorisation | All protected server operations verify identity, team membership and role. Hiding a button in the UI is not sufficient access control. |
| NFR-03 Privacy | Users are informed whether the hosted OpenAI provider or local Ollama provider is configured. Confidential content should be sent only to the selected provider. |
| NFR-04 Data minimisation | Send only the transcript and context required for extraction. Do not log full transcripts or credentials by default. |
| NFR-05 Reliability | Database writes use validated data. Failed extraction or notification operations must not corrupt confirmed records. |
| NFR-06 Maintainability | Separate UI, business logic, database access, LLM adapters and reminder scheduling. |
| NFR-07 Validation | Validate all client input on the server; use Zod or an equivalent schema for LLM output and API payloads. |
| NFR-08 Usability | Use clear labels, loading indicators, inline validation, empty states and error messages. |
| NFR-09 Accessibility | Forms and tables should be keyboard accessible, have labels, and use readable contrast. |
| NFR-10 Performance | Common list and detail pages should feel responsive for a small-team dataset. Measure actual performance rather than claiming untested guarantees. |
| NFR-11 Observability | Record application errors, extraction failures and reminder outcomes without exposing secrets or unnecessary personal data. |
| NFR-12 Portability | Use environment-based configuration and documented setup so the app can run locally and on a compatible hosting platform. |


# 10. Technical Architecture

## 10.1 Proposed Components

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Presentation | Next.js + TypeScript | Pages, forms, review table, boards and client interactions. |
| Application/server | Next.js server actions/API routes + Node.js | Authentication checks, business rules, extraction orchestration, validation and task operations. |
| AI provider adapter | Ollama or OpenAI API | One structured extraction call per attempt; provider switch controlled by server configuration. |
| Validation | Zod | Validate incoming data and LLM response against known schemas. |
| Data access | Prisma ORM | Typed queries, relations, migrations and persistence. |
| Database | PostgreSQL | Users, teams, meetings, transcripts, tasks, decisions and reminders. |
| Scheduled work | Cron/scheduled job | Find overdue tasks and initiate eligible reminders. |
| Notifications | Firebase Cloud Messaging | Push notification delivery to supported clients. |
| Development / source control | VS Code, Git/GitHub, npm/pnpm/yarn | Development, package management and version history. |


## 10.2 Architecture Flow

Browser → Next.js application/server → input validation → LLM provider adapter (one extraction call) → Zod validation and assignee/date resolution → human review → Prisma ORM → PostgreSQL. In parallel after tasks are saved: scheduled job → overdue query → reminder deduplication check → Firebase Cloud Messaging → user device.

## 10.3 Engineering Principles

The LLM is used for transcript understanding only; routine task operations use deterministic application logic.

Never trust model output or client input without validation.

Do not save proposed extraction results until the user confirms them.

Use server-side access checks for every read/write operation.

Keep provider credentials and database secrets server-side.

Make scheduled reminder logic idempotent so repeated job runs are safe.

# 11. API / Server Action Requirements

The synopsis does not prescribe exact endpoint URLs. The following is a suggested API surface; it can be implemented with Next.js Route Handlers or Server Actions.

| Operation | Purpose | Key checks |
| --- | --- | --- |
| POST /api/teams | Create a team | Authenticated user; valid name. |
| POST /api/teams/:teamId/members | Add/invite a member | Caller is organiser; valid member and role. |
| POST /api/meetings | Create a meeting | Caller belongs to team; valid date/title/attendees. |
| POST /api/meetings/:meetingId/transcripts | Save pasted/uploaded text | Team access; accepted file type/size; non-empty text. |
| POST /api/meetings/:meetingId/extract | Run single-call extraction | Team access; valid transcript; provider configured; rate/size limits. |
| POST /api/meetings/:meetingId/confirm-extraction | Save reviewed actions and decisions | Organiser permission; schema validation; valid assignees. |
| GET /api/action-items | List tasks by person/meeting/status/due date | Team-scoped query; validated filters. |
| PATCH /api/action-items/:id | Update permitted task fields/status | Authorisation; valid status; write history. |
| GET /api/meetings/:meetingId | Read meeting, decisions and actions | Team access. |
| POST /api/device-tokens | Register FCM token | Authenticated user; validate token payload. |
| POST /api/jobs/overdue-reminders | Scheduled overdue check | Protected scheduler secret or platform-level job authentication. |


All responses should use consistent success/error shapes. The scheduled-job endpoint must not be publicly callable without protection. Exact payloads and authentication strategy are implementation decisions.

# 12. UX and Content Guidelines

Use plain language: “Action item”, “Assigned to”, “Deadline”, “Status”, and “Decision”.

Show a visible loading state while extraction runs; prevent repeated accidental clicks.

Use explicit warning text for unresolved names, missing dates and invalid output.

Distinguish “Review draft” from “Saved task” to avoid confusing model suggestions with confirmed records.

Provide useful empty states such as “No action items for this meeting yet.”

Show task status and deadline consistently on person and meeting boards.

Make overdue tasks visually identifiable without relying on colour alone.

Explain that push reminders require browser/device support and notification permission.

# 13. Security, Privacy and Risk Controls

| Risk | Mitigation |
| --- | --- |
| LLM invents or misattributes an action | Schema validation, explicit review, editable fields, unresolved assignee handling and manual evaluation. |
| Transcript contains sensitive data | Offer local Ollama option; clearly identify provider configuration; minimise logging; restrict access to team members. |
| Cross-team data exposure | Enforce team membership and role checks on every server-side query and mutation. |
| Prompt injection in transcript | Treat transcript as untrusted content; extraction instructions and output schema are fixed by the application. |
| Leaked API keys | Use server-only environment variables; never commit secrets; redact them from logs. |
| Duplicate reminders | Persist reminder records and use a stable deduplication key/policy. |
| Notification unavailable | Show permission/support state; retain in-app task visibility; email fallback remains future scope. |
| Oversized or malicious upload | Allow only supported text-based formats, enforce size limits, validate content and reject empty/invalid files. |
| Lost status history | Write status changes and history records together where practical. |


# 14. Testing and Acceptance Plan

## 14.1 Functional Test Cases

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| TC-01 | Register with valid details | Account is created and can sign in. |
| TC-02 | Sign in with invalid credentials | Access is denied with a safe error. |
| TC-03 | Member accesses another team's meeting | Request is denied. |
| TC-04 | Create team and meeting | Team and meeting persist with correct relationships. |
| TC-05 | Submit empty transcript | Validation error; no LLM call. |
| TC-06 | Upload supported text file | Text is read, cleaned and associated with meeting. |
| TC-07 | Submit normal transcript for extraction | One provider call returns structured actions and decisions. |
| TC-08 | LLM returns malformed output | Output is flagged/rejected; no confirmed data is saved. |
| TC-09 | Transcript names unknown assignee | Assignee remains unresolved for manual selection. |
| TC-10 | Transcript includes relative deadline | Date is resolved using meeting date or flagged if ambiguous. |
| TC-11 | Edit and confirm extraction | Only final reviewed records are saved. |
| TC-12 | Change task status | Status and history persist; boards update. |
| TC-13 | Filter person/meeting board | Results match selected filters. |
| TC-14 | Open task has past deadline | Scheduled job identifies it as overdue. |
| TC-15 | Completed task has past deadline | No overdue reminder is sent for that item. |
| TC-16 | Run reminder job twice | Deduplication prevents repeat notification under the configured policy. |
| TC-17 | FCM token missing/invalid | Job handles it safely and records appropriate outcome. |
| TC-18 | LLM provider unavailable | User sees a retryable error; transcript remains available. |


## 14.2 Extraction Evaluation

Prepare a small labelled evaluation set of meeting transcripts and manually annotate the correct action items, assignees, deadlines and decisions. Compare the model output before human edits against these annotations. Report precision, recall and F1 for action-item detection where labels permit; report exact-match or field-level accuracy for assignees and deadlines; separately report decision extraction quality. Describe the dataset size, annotation method, provider/model, prompt version and known limitations. Do not present illustrative or unmeasured figures as experimental results.

## 14.3 Definition of Done

All MUST requirements have an implementation and at least one test or documented manual verification.

No unreviewed LLM output is saved as confirmed action/decision data.

Team access checks are verified for both reads and writes.

Status boards use persisted database state rather than temporary client-only state.

Overdue job handles completed items, missing deadlines, absent tokens and duplicate runs.

Setup instructions and environment variables are documented.

A test report records actual outcomes and unresolved defects.

# 15. Deployment and Configuration

The synopsis anticipates a hosting platform that supports Next.js and a reachable PostgreSQL database. Deployment details should be selected during implementation.

| Configuration item | Purpose / handling |
| --- | --- |
| DATABASE_URL | PostgreSQL connection string; secret, server-side only. |
| AUTH_SECRET or equivalent | Secret used by the chosen authentication/session implementation. |
| LLM_PROVIDER | Server-side switch such as ollama or openai. |
| OPENAI_API_KEY | Required only when hosted provider is selected; secret, never committed. |
| OLLAMA_BASE_URL / model | Local or reachable Ollama endpoint and selected compatible model. |
| Firebase server credentials | Secure server-side credentials/configuration for FCM sending. |
| Public Firebase web config | Client configuration only where required; never confuse it with server credentials. |
| SCHEDULER_SECRET | Protects the overdue-job endpoint if called by an external scheduler. |
| APP_TIMEZONE | Defines consistent deadline and overdue comparison behavior. |


Use separate development and deployment environment settings.

Run Prisma migrations as part of a controlled deployment step.

Verify database connectivity, provider connectivity and FCM configuration independently.

Use HTTPS in deployed environments.

Document how to run the scheduled job in the chosen hosting environment.

Do not rely on an in-process timer if the hosting platform may suspend server processes; use a supported scheduled-job mechanism.

# 16. Dependencies and Assumptions

## 16.1 Dependencies

A compatible local Ollama model or a valid OpenAI API configuration.

A PostgreSQL database accessible to the application.

Firebase Cloud Messaging project configuration and supported client notification setup.

A deployment environment that supports Next.js and the chosen scheduler.

User permission for browser/device push notifications.

## 16.2 Assumptions

Users have text transcripts or notes; audio is not processed in this release.

Meeting attendees and assignees can be mapped to team members when names are known.

The organiser reviews extracted information before saving.

The application uses a consistent timezone policy for deadlines.

The initial release is sized for small teams and academic demonstration rather than high-scale enterprise workloads.

## 16.3 Decisions to Confirm During Implementation

Which authentication/session library will be used?

Which text file formats and maximum upload size will be supported?

Will team membership be added directly by an organiser or through invitation links?

What is the exact reminder policy: once per overdue task, once per day, or another interval?

Which timezone will be the default, and can users choose their own?

Will deletion be supported for meetings/tasks, and what retention policy applies to transcripts?

Which browser/device combinations will be used to demonstrate FCM push notifications?

# 17. Proposed Development Milestones

| Phase | Work | Target from synopsis | Status |
| :---: | --- | --- | :---: |
| 1 | Problem identification and topic finalisation | Week 1 | ✅ Completed |
| 2 | Literature survey and requirements analysis | Weeks 2–3 | ✅ Completed |
| 3 | Database design and Next.js/Prisma/PostgreSQL setup | Week 4 | ✅ Completed |
| 4 | Authentication, teams and meeting setup | Weeks 5–6 | ✅ Completed |
| 5 | Transcript upload and LLM extraction | Weeks 7–8 | ✅ Completed |
| 6 | Schema validation and review screen | Week 9 | ✅ Completed |
| 7 | Assignment, deadline tracking and boards | Weeks 10–11 | ✅ Completed |
| 8 | Overdue job and FCM reminders | Week 12 | ✅ Completed |
| 9 | Integration and testing | Week 13 | ✅ Completed |
| 10 | Deployment, results analysis and documentation | Week 14 | ✅ Completed |
| 11 | Final report and presentation preparation | Weeks 15–16 | ✅ Completed |


This sequence follows the schedule in the synopsis. Adjust it if provider setup, authentication or notification delivery takes longer than expected.

# 18. MVP Release Checklist

- [x] ☑ Authentication and team-scoped permissions work.

- [x] ☑ Organiser can create meetings and attach transcripts.

- [x] ☑ Provider switch supports Ollama, OpenAI, and LM Studio through a common interface.

- [x] ☑ One-call extraction returns validated actions and decisions.

- [x] ☑ Review screen supports edit/add/delete, exact name matching, relative date parsing, and explicit confirmation.

- [x] ☑ Confirmed data persists in database via Prisma.

- [x] ☑ Person and meeting boards display correct status and deadline data.

- [x] ☑ Scheduled overdue check excludes completed tasks and items without deadlines.

- [x] ☑ FCM reminders and duplicate prevention are demonstrated on a supported test client.

- [x] ☑ Test report (26/26 passing), extraction evaluation (100% metrics), setup guide, and project documentation are complete.

# 19. Glossary

| Term | Meaning |
| --- | --- |
| Action item | A specific task agreed during a meeting. |
| Assignee | The team member responsible for completing an action item. |
| LLM | Large Language Model, used here to extract structured information from meeting text. |
| Structured output | Model output formatted according to a predefined data schema. |
| Schema validation | Checking that returned data has the required fields and types. |
| Ollama | Tooling for running compatible language models locally. |
| OpenAI API | Hosted model interface used as an alternative extraction provider. |
| Prisma ORM | Typed database access and schema/migration tooling. |
| FCM | Firebase Cloud Messaging, used for push notifications. |
| Overdue task | An unfinished action item whose deadline is earlier than the current date under the configured timezone policy. |


# 20. Source Alignment Note

This PRD is based on the submitted MeetingMind synopsis. Core product behavior, scope boundaries, technology stack, entity names, workflow, and project timeline follow that source. API paths, acceptance criteria, additional history/deduplication fields, security controls and UX guidance are implementation recommendations added to make the requirements actionable. They should be reviewed with the project guide before being treated as final commitments.
