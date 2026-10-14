# Email Job Scheduler (ReachInbox assignment)

A full-stack email scheduler. You compose an email, upload a list of leads, and choose a start time, a delay between emails and an hourly limit. The backend stores everything in Postgres, schedules each email as a **BullMQ delayed job** (no cron), sends through **Ethereal SMTP** from several sender accounts, enforces **Redis-backed hourly rate limits**, sends a **Slack** message when a limit is hit, and indexes every email in **Elasticsearch** for search.

```
email-scheduler/
├── backend/    Express + TypeScript + Drizzle (Postgres) + BullMQ + Elasticsearch
├── frontend/   React (Vite) + TypeScript + Tailwind + Zustand + TanStack Query
└── docker-compose.yml   Postgres, Redis, Elasticsearch for local dev
```

---

## Tech stack

| Area | Choice |
| --- | --- |
| API | Express 5, TypeScript, zod validation |
| DB | PostgreSQL + Drizzle ORM (migrations in `backend/drizzle`) |
| Queue | BullMQ on Redis (delayed jobs, limiter, concurrency) |
| Mail | Nodemailer + Ethereal (accounts created automatically) |
| Search | Elasticsearch 8 (falls back to Postgres `ILIKE` if not configured) |
| Queue UI | bull-board at `/admin/queues` |
| Auth | Google OAuth (auth-code flow) + email/password, JWT sessions |
| Notifications | Slack OAuth v2 (`incoming-webhook` scope) |
| Frontend | React 19, Vite, Tailwind v4, Zustand, TanStack Query, TipTap, react-hot-toast |

---

## Running locally

### 1. Infra

You need Postgres, Redis and (optionally) Elasticsearch.

```bash
docker compose up -d            # all three
# or only some of them, e.g. if Postgres is already installed:
docker compose up -d redis elasticsearch
```

No Docker? On Windows use [Memurai](https://www.memurai.com/) or Redis inside WSL, then run Redis with `appendonly yes` so delayed jobs survive a Redis restart. Elasticsearch is optional: leave `ELASTICSEARCH_URL` empty and search falls back to the database.

### 2. Backend

```bash
cd backend
cp .env.example .env     # fill in the values (see below)
npm install
npm run dev              # API on :4000, runs DB migrations + creates Ethereal senders on boot
npm run dev:worker       # BullMQ worker (separate terminal)
```

Set `RUN_WORKER=true` to run the worker inside the API process instead (handy for single-service deploys).

Production: `npm run build && npm start` and `npm run start:worker`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env     # VITE_API_URL, VITE_GOOGLE_CLIENT_ID
npm install
npm run dev              # http://localhost:5173
```

---

## Environment variables

### `backend/.env`

| Variable | Description |
| --- | --- |
| `PORT` | API port (default 4000) |
| `FRONTEND_URL` / `BACKEND_URL` | Used for CORS and OAuth redirects |
| `JWT_SECRET` | Secret for session tokens |
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string |
| `ELASTICSEARCH_URL` / `ELASTICSEARCH_API_KEY` | Leave the URL empty to disable ES |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | Slack app credentials |
| `ETHEREAL_SENDER_COUNT` | Number of Ethereal sender accounts to create (default 3) |
| `WORKER_CONCURRENCY` | BullMQ worker concurrency (default 5) |
| `MIN_DELAY_BETWEEN_EMAILS_MS` | Minimum gap between two sends (default **2000 ms**) |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Hourly cap per sender account (default 200) |
| `JOB_ATTEMPTS` | Retries for SMTP failures, with exponential backoff (default 3) |
| `RUN_WORKER` | `true` = start the worker inside the API process |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Basic auth for `/admin/queues` (empty = no auth) |

### `frontend/.env`

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | e.g. `http://localhost:4000/api` |
| `VITE_GOOGLE_CLIENT_ID` | Same client id as the backend |

### Ethereal Email

You don't need to do anything here. On first boot the backend calls `nodemailer.createTestAccount()` `ETHEREAL_SENDER_COUNT` times and saves the accounts in the `senders` table, so they stay the same across restarts. Every sent email stores its Ethereal **preview URL**, and the email detail page links to it ("View on Ethereal"). To log in to an inbox, use the credentials in the `senders` table at https://ethereal.email/login.

### Google OAuth

1. In Google Cloud Console, go to **APIs & Services → Credentials → Create OAuth client ID (Web application)**.
2. Under **Authorized JavaScript origins**, add `http://localhost:5173` and your Vercel URL.
3. Put the client id and secret in `backend/.env`, and the client id in `frontend/.env`.

The frontend uses the popup **auth-code** flow. The backend exchanges the code with Google, verifies the ID token, creates or updates the user and returns a JWT.

### Slack

1. Create an app at https://api.slack.com/apps and enable **Incoming Webhooks**.
2. Under **OAuth & Permissions**, add the redirect URL `${BACKEND_URL}/api/slack/callback`. Slack requires **https**, so for local dev expose the backend with `ngrok http 4000` and set `BACKEND_URL` to the ngrok URL.
3. Put the client id and secret in `backend/.env`.

In the dashboard, open the user card dropdown and choose **Connect Slack**. That runs the real Slack OAuth flow, and the backend saves the webhook URL, channel and team on the user row. The dropdown also has **Send test to Slack** and **Disconnect Slack**.

---

## Architecture

```
 React (Vite) ──HTTP──▶ Express API ──insert──▶ Postgres (source of truth)
                           │  └──bulk index──▶ Elasticsearch
                           └──addBulk(delayed jobs)──▶ Redis / BullMQ
                                                         │
                     BullMQ Worker(s) ◀──────────────────┘
                       ├─ Redis rate-limit counters
                       ├─ Ethereal SMTP (per-sender transporter)
                       ├─ Postgres status updates + ES re-index
                       └─ Slack webhook when a limit is hit
```

### How scheduling works

1. `POST /api/emails/schedule` validates the payload, removes duplicate recipients and creates one row per recipient in a single **batch**: `scheduledAt = startTime + index × delaySeconds`.
2. Rows are inserted **first**, because the DB is the source of truth. Then each row becomes a BullMQ job with `delay = scheduledAt − now` and **`jobId = email-<id>`**.
3. The worker picks up the job when it is due, checks the rate limits, sends through the chosen sender's SMTP transporter, and updates the row (`sent` with `sentAt`, `messageId` and `previewUrl`, or `failed` with the error). Each change is re-indexed in Elasticsearch.

There is no cron anywhere: timing is handled entirely by BullMQ's delayed sorted set in Redis.

### Persistence across restarts

- **Jobs live in Redis**, not in process memory. Stopping the API or the worker doesn't touch them, and when the worker comes back it picks up whatever is due. Redis runs with AOF (`appendonly yes`) and `noeviction`, so a Redis restart doesn't lose jobs either.
- **Recovery on boot:** the API reads every `scheduled`/`sending` row from Postgres and re-adds it with the same `jobId`. BullMQ ignores a jobId that already exists, so this only re-creates jobs that went missing (for example if Redis was wiped). Each email keeps its original `scheduledAt`, so nothing starts over.
- **Graceful shutdown:** the worker calls `worker.close()` on SIGINT/SIGTERM. In-flight jobs finish, and anything interrupted is moved back to waiting by BullMQ's stalled-job check.

### Idempotency (no double sends)

- `jobId = email-<id>`, so the same email can't be in the queue twice.
- Before sending, the worker reloads the row and **skips it if it's already `sent` or `failed`**. A retried or recovered job therefore can't send again.
- Every email gets a deterministic `Message-ID` (`<email-<id>@email-scheduler.local>`), so even a duplicate SMTP delivery would be recognised as the same message downstream.

### Concurrency and the delay between sends

- `WORKER_CONCURRENCY` sets how many jobs one worker processes in parallel. You can also run several worker processes. All shared state (rate counters, limiter, job locks) lives in Redis, so parallel jobs are safe.
- **Min delay between sends: 2 seconds** by default (`MIN_DELAY_BETWEEN_EMAILS_MS=2000`), enforced with BullMQ's limiter `{ max: 1, duration: 2000 }`. The limiter is stored in Redis, so the gap holds **across every worker and instance**, not just one process.
- The compose screen's **"Delay between 2 emails"** controls how far apart emails in a batch are *scheduled*. The env setting is the global floor.

### Hourly rate limiting

Two fixed one-hour windows are checked for every send, both as **Redis counters**:

| Counter key | Limit |
| --- | --- |
| `rate:sender:<senderId>:<hourWindow>` | `MAX_EMAILS_PER_HOUR_PER_SENDER` (env) |
| `rate:batch:<batchId>:<hourWindow>` | the "Hourly Limit" entered in the compose screen |

`hourWindow = floor(now / 1h)`. A small Lua script does `INCR` + `EXPIRE` and rolls back if the count goes over the limit, all **atomically**. This makes it safe with many workers and instances, and nothing is counted only in memory. If the batch slot is taken but the sender limit is hit, the batch slot is released.

When a limit is reached, the job is **not dropped or failed**:

1. The worker works out the next slot: the start of the next hour plus the email's original offset within the current hour, which keeps emails that were spaced out in the same order.
2. It updates `scheduledAt` in Postgres (the dashboard shows the new time), calls `job.moveToDelayed(nextSlot)` and throws `DelayedError`. This **doesn't use up a retry attempt**.
3. It sends a Slack message, **once per sender (or batch) per hour window** (Redis `SET NX` key), to the user who owns the email. If that user hasn't connected Slack, the call is skipped without an error. The webhook is read from the DB at send time, so connecting Slack later works immediately without a redeploy.

### Behaviour under load (1000+ emails at the same time)

- Scheduling inserts rows in chunks of 1000 and enqueues them with `addBulk` in chunks of 500, so the API stays fast.
- When the jobs fall due, the limiter releases at most one every 2 s, across all workers.
- After `hourlyLimit` sends in a window, the remaining jobs are moved to the next hour (keeping their order) and a Slack alert goes out. The next hour sends the next `hourlyLimit`, and so on until the batch is done.
- Trade-off: a job that bounces off the hourly limit still takes one limiter slot, so pushing 1000 jobs back takes about `1000 × 2 s`. A per-batch "pause until next window" would be more efficient, but the current approach is simpler and still correct.

Try it: `npm run load-test -- you@example.com 1000 50` schedules 1000 emails with an hourly limit of 50 for an existing user.

### Search

Every email is bulk-indexed in Elasticsearch (`emails` index) when it's created and again whenever its status changes. The dashboard search box calls `GET /api/emails?q=`, which runs a fuzzy `multi_match` over subject, recipient and body, filtered by user and tab. ES returns ids, and the rows come from Postgres so the list is always current. If ES isn't configured, the same endpoint uses `ILIKE`.

### Queue dashboard

bull-board runs at **`http://localhost:4000/admin/queues`** (basic auth from `ADMIN_USER`/`ADMIN_PASSWORD`). It shows delayed, active, completed and failed jobs live.

---

## API

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/google` | `{ code }` → `{ token, user }` |
| POST | `/api/auth/login` | `{ email, password }` → log in, or sign up if the email is new |
| GET | `/api/auth/me` | Current user, including Slack status |
| GET | `/api/senders` | Ethereal sender accounts |
| POST | `/api/emails/schedule` | `{ senderId, subject, body, recipients[], startTime?, delaySeconds, hourlyLimit }` |
| GET | `/api/emails` | `?tab=scheduled\|sent&status=&q=&page=&limit=` |
| GET | `/api/emails/stats` | Counts for the sidebar |
| GET | `/api/emails/:id` | Email detail |
| PATCH | `/api/emails/:id/star` | Toggle star |
| GET | `/api/slack/connect-url` | Slack authorize URL (signed `state`) |
| GET | `/api/slack/callback` | Slack OAuth redirect |
| POST | `/api/slack/test` | Send a test Slack message |
| DELETE | `/api/slack` | Disconnect Slack |

---

## Features implemented

### Backend

- [x] Express + TypeScript, layered as routes → controllers → services
- [x] Postgres + Drizzle schema and migrations (applied automatically on boot)
- [x] BullMQ delayed jobs, no cron
- [x] Multiple Ethereal senders, picked per email in the "From" dropdown
- [x] Survives restarts: Redis persistence, recovery from the DB on boot, graceful shutdown
- [x] Idempotency: deterministic jobId, status check before sending, fixed Message-ID
- [x] Configurable worker concurrency
- [x] Minimum delay between sends (BullMQ limiter, shared through Redis)
- [x] Hourly limits per sender and per batch using atomic Redis counters; over-limit emails are pushed to the next window, never dropped
- [x] Slack OAuth plus a live notification when a limit is hit, with connect/disconnect/test
- [x] Elasticsearch indexing and search
- [x] bull-board queue dashboard
- [x] Retries with exponential backoff, and a `failed` status once retries run out

### Frontend

- [x] Real Google OAuth login, plus email/password (as in the Figma)
- [x] Sidebar user card (avatar, name, email) with a dropdown for Slack and Logout
- [x] Scheduled and Sent tabs with live counts; the scheduled tab refreshes every 10 s
- [x] Search (debounced, runs on Elasticsearch), status filter, refresh
- [x] Compose page: sender, recipients as chips with a CSV/TXT upload that shows how many emails were detected, subject, rich-text body (TipTap), delay, hourly limit, Send Later popover with presets
- [x] Email detail page with an Ethereal preview link
- [x] Loading, empty and error states, toasts
- [x] Zustand for client state (auth session, inbox filters), TanStack Query for server state, custom hooks, reusable UI components

---

## Deployment

**Vercel can host the frontend, but not the worker.** Vercel functions are serverless and short-lived, while a BullMQ worker has to run continuously.

| Part | Where |
| --- | --- |
| Frontend | **Vercel**: root directory `frontend`, framework Vite, env `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`. `vercel.json` already rewrites all routes to the SPA. |
| API + worker | **Render / Railway / Fly.io**: root `backend`, build `npm install && npm run build`, start `npm start`. Either set `RUN_WORKER=true` (one service) or add a second service running `npm run start:worker`. |
| Postgres | Neon / Supabase / Render Postgres |
| Redis | Upstash / Redis Cloud / Railway Redis |
| Elasticsearch | Elastic Cloud (or leave empty to use the DB fallback) |

After deploying, update `FRONTEND_URL` and `BACKEND_URL`, the Google JS origins and the Slack redirect URL.

---

## Assumptions and trade-offs

- **Fixed hourly windows** (clock hours) rather than a sliding window. They're simpler and easy to see in Redis; the cost is that a burst can happen around the hour boundary.
- **Sender accounts are shared** between users, so the per-sender limit is global. The per-batch limit from the compose screen is separate and applies per campaign.
- **No attachments.** The paperclip in the Figma opens the leads-file upload, and its badge shows how many files were uploaded.
- Email/password login signs you up automatically on first use, to match the "or sign up through email" design.
- Rate-limited bounces take limiter slots (see "Behaviour under load").
- The Slack webhook URL is stored in plain text. In production it should be encrypted at rest.
