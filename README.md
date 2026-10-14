# ONB Email Scheduler

A full-stack service for scheduling and sending email campaigns at scale. Campaigns are stored in PostgreSQL, scheduled as BullMQ delayed jobs on Redis, and sent through SMTP (Ethereal) from multiple sender accounts. Concurrency, throttling and hourly rate limits are enforced across workers. A React dashboard is used to compose, schedule and track emails.

## Features

**Scheduling and delivery**
- Delayed jobs on BullMQ and Redis, with no cron
- Multiple SMTP sender accounts (Ethereal), selectable per campaign
- File attachments sent with every email in a campaign
- Retries with exponential backoff, and a `failed` status once retries are exhausted

**Reliability**
- Scheduled emails survive API, worker and Redis restarts
- Idempotent sending: an email is never sent twice
- Graceful worker shutdown

**Throughput control**
- Configurable worker concurrency
- Minimum delay between sends, shared across all workers
- Hourly limits per sender and per campaign; emails over the limit move to the next hour instead of being dropped

**Integrations**
- Slack notification when an hourly limit is reached (OAuth "Add to Slack" flow)
- Live queue dashboard (bull-board)
- Indexed full-text search over subject, recipient and body

**Dashboard**
- Google OAuth and email/password login
- Scheduled and Sent views with search, status filter and live counts
- Compose page:
  - Recipients entered as chips, or uploaded from a CSV/TXT lead list
  - Rich-text body and file attachments
  - Delay between emails, hourly limit and send-later scheduling
- Email detail view with attachments and an Ethereal preview link

## Tech stack

| Layer | Technologies |
| --- | --- |
| Backend | Node.js, Express 5, TypeScript, zod |
| Database | PostgreSQL, Drizzle ORM |
| Queue | BullMQ, Redis (ioredis) |
| Email | Nodemailer, Ethereal SMTP |
| Search | PostgreSQL full-text search (`tsvector` + GIN, `pg_trgm`), optional Elasticsearch 8 |
| Auth | Google OAuth 2.0, JWT, bcrypt |
| Notifications | Slack OAuth v2 (incoming webhooks) |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, Zustand, TanStack Query, TipTap |

## Project structure

```
.
├── backend/
│   ├── drizzle/              SQL migrations
│   └── src/
│       ├── controllers/      request handlers and validation
│       ├── db/               schema, connection, migration runner
│       ├── lib/              Redis and Elasticsearch clients
│       ├── middleware/       auth, error handling, basic auth
│       ├── queue/            BullMQ queue and enqueue helpers
│       ├── routes/           API routes
│       ├── services/         business logic (emails, senders, rate limiting, search, Slack, auth)
│       ├── workers/          BullMQ email worker
│       ├── scripts/          load test
│       ├── server.ts         API entry point
│       └── worker.ts         worker entry point
├── frontend/
│   └── src/
│       ├── api/              API client and endpoints
│       ├── components/       UI, layout, email, compose and attachment components
│       ├── hooks/            data and UI hooks
│       ├── pages/            login, inbox, compose, email detail
│       ├── store/            Zustand stores
│       ├── types/            shared types
│       └── utils/            formatting and file helpers
├── docker-compose.yml        PostgreSQL, Redis and Elasticsearch for local development
└── render.yaml               Render blueprint for the backend
```

## Getting started

### Prerequisites

- Node.js 22+
- PostgreSQL 14+
- Redis 6.2+, with `appendonly yes` and `maxmemory-policy noeviction`
- Elasticsearch 8 (optional)

The bundled Docker Compose file starts all three services with the correct configuration:

```bash
docker compose up -d postgres redis
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev          # API on http://localhost:4000
npm run dev:worker   # email worker, in a second terminal
```

Database migrations run automatically when the API starts. Ethereal sender accounts are created on first start and saved in the database.

To run the API and worker as a single process, set `RUN_WORKER=true` and skip `dev:worker`.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev          # http://localhost:5173
```

## Configuration

### Backend (`backend/.env`)

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | API port | `4000` |
| `FRONTEND_URL` | Dashboard URL (CORS, OAuth redirects) | `http://localhost:5173` |
| `BACKEND_URL` | Public API URL (Slack OAuth callback) | `http://localhost:4000` |
| `JWT_SECRET` | Secret used to sign session tokens | required |
| `DATABASE_URL` | PostgreSQL connection string | required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `ELASTICSEARCH_URL` | Elasticsearch endpoint; leave empty to use PostgreSQL search | empty |
| `ELASTICSEARCH_API_KEY` | Elasticsearch API key | empty |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | required for Google login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | required for Google login |
| `SLACK_CLIENT_ID` | Slack app client ID | required for Slack |
| `SLACK_CLIENT_SECRET` | Slack app client secret | required for Slack |
| `ETHEREAL_SENDER_COUNT` | Number of sender accounts to create | `3` |
| `WORKER_CONCURRENCY` | Jobs processed in parallel per worker | `5` |
| `MIN_DELAY_BETWEEN_EMAILS_MS` | Minimum delay between two sends, across all workers | `2000` |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Hourly send limit per sender account | `200` |
| `JOB_ATTEMPTS` | Send attempts before an email is marked failed | `3` |
| `RUN_WORKER` | Start the worker inside the API process | `false` |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Basic auth for the queue dashboard | empty (no auth) |

### Frontend (`frontend/.env`)

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base URL, e.g. `http://localhost:4000/api` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |

### Ethereal Email

No setup is needed. On first start the backend creates `ETHEREAL_SENDER_COUNT` test accounts with `nodemailer.createTestAccount()` and saves them in the `senders` table. Every sent email stores its Ethereal preview URL, which is linked from the email detail page. Sender credentials in the `senders` table can be used to sign in at [ethereal.email](https://ethereal.email/login).

### Google OAuth

1. In Google Cloud Console, create an OAuth client ID of type **Web application**.
2. Add the dashboard URL (e.g. `http://localhost:5173`) under **Authorized JavaScript origins**. No redirect URI is needed.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the backend, and `VITE_GOOGLE_CLIENT_ID` in the frontend.

### Slack

1. Create an app at [api.slack.com/apps](https://api.slack.com/apps) and enable **Incoming Webhooks**.
2. Under **OAuth & Permissions**, add the redirect URL `<BACKEND_URL>/api/slack/callback`. Slack requires HTTPS; for local development, expose the API with a tunnel such as `ngrok http 4000` and set `BACKEND_URL` to the tunnel URL.
3. Set `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET`.

Users connect Slack from the account menu in the dashboard. The menu also has options to send a test message and to disconnect.

## Architecture

```
 Dashboard ──HTTP──▶ Express API ──▶ PostgreSQL (emails, senders, attachments, users)
                         │
                         └──delayed jobs──▶ Redis / BullMQ
                                                │
                      Worker(s) ◀───────────────┘
                        ├─ Redis rate-limit counters
                        ├─ SMTP (one transporter per sender)
                        ├─ PostgreSQL status updates
                        └─ Slack webhook on rate-limit hits
```

### Scheduling

1. `POST /api/emails/schedule` validates the request, removes duplicate recipients and creates one row per recipient. The rows are grouped in a batch, with `scheduledAt = startTime + index × delay`.
2. The rows and attachments are written in a single transaction. Each email is then added to BullMQ with `delay = scheduledAt − now` and `jobId = email-<id>`.
3. When a job is due, the worker checks the rate limits, sends the email and updates its status (`sent` with timestamp, message ID and preview URL, or `failed` with the error).

Timing relies only on BullMQ's delayed job set in Redis. No cron or polling scheduler is used.

### Persistence and restarts

- **Jobs live in Redis**, not in process memory, so stopping the API or the worker does not affect them. Redis runs with AOF persistence and `noeviction`, so jobs also survive a Redis restart.
- **Recovery on startup:** the API re-enqueues every `scheduled` or `sending` email from PostgreSQL with its original `jobId` and `scheduledAt`. BullMQ ignores job IDs that already exist, so only missing jobs are recreated, and nothing is restarted from the beginning.
- **Graceful shutdown:** the worker closes on `SIGINT`/`SIGTERM`, letting in-flight jobs finish. Interrupted jobs are recovered by BullMQ's stalled-job detection.

### Idempotency

- Each email has a deterministic job ID (`email-<id>`), so it can only be queued once.
- The worker reloads the email before sending and skips it if it is already `sent` or `failed`.
- Each message has a deterministic `Message-ID`, so downstream systems can detect duplicate deliveries.

### Concurrency and throttling

- `WORKER_CONCURRENCY` sets parallel jobs per worker, and any number of worker processes can run. All shared state (limiter, rate counters, job locks) is in Redis.
- The minimum delay between sends (`MIN_DELAY_BETWEEN_EMAILS_MS`, 2 seconds by default) uses BullMQ's Redis-backed limiter (`{ max: 1, duration }`). It applies globally across all workers and instances.
- The per-campaign "delay between emails" sets how far apart emails in a batch are scheduled.

### Rate limiting

Every send has to pass two hourly limits, each tracked as a Redis counter:

| Key | Limit |
| --- | --- |
| `rate:sender:<senderId>:<hourWindow>` | `MAX_EMAILS_PER_HOUR_PER_SENDER` |
| `rate:batch:<batchId>:<hourWindow>` | Hourly limit set on the campaign |

`hourWindow` is `floor(now / 1 hour)`. A Lua script increments the counter, sets its expiry and rolls back if the limit is exceeded, all atomically. This makes the limits safe across any number of workers and instances.

When a limit is reached, the email is moved, not dropped:

1. The next slot is the start of the next hour window plus the email's offset within the current hour, which keeps the original order.
2. `scheduledAt` is updated in PostgreSQL, and the job is moved back to the delayed set (`moveToDelayed` + `DelayedError`). This does not use up a retry attempt.
3. A Slack message goes to the campaign owner, once per sender or campaign per hour window. Users without Slack connected are skipped. The webhook is read when the limit is hit, so connecting or disconnecting takes effect immediately.

### Behaviour under load

When thousands of emails are due at the same time:
- Rows are inserted in chunks of 1000 and jobs are enqueued in chunks of 500.
- The limiter releases at most one send per `MIN_DELAY_BETWEEN_EMAILS_MS`, across all workers.
- Once a window's limit is used up, the remaining emails move to the next window in order, and each following window sends up to the limit until the campaign is finished.

`npm run load-test -- <user-email> [count] [hourlyLimit]` schedules a large campaign for an existing user, e.g. `npm run load-test -- user@example.com 1000 50`.

### Search

- `emails.search_vector` is a generated `tsvector` column. It combines the subject (weight A), the recipient (weight B) and the body with HTML stripped (weight C), and PostgreSQL keeps it up to date on every write.
- A GIN index on `search_vector` handles full-text matching. Each search term is a prefix match, so results update while typing.
- A trigram (`pg_trgm`) GIN index on `to_email` handles partial address matches.
- When `ELASTICSEARCH_URL` is set, emails are also indexed in Elasticsearch, and search uses a fuzzy `multi_match` query there instead.

### Queue dashboard

bull-board is available at `/admin/queues`, protected by `ADMIN_USER`/`ADMIN_PASSWORD`. It shows delayed, active, completed and failed jobs in real time.

## API

All endpoints except authentication and the Slack callback require an `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/google` | Log in with a Google authorization code |
| POST | `/api/auth/login` | Log in or sign up with email and password |
| GET | `/api/auth/me` | Current user and Slack connection status |
| GET | `/api/senders` | Available sender accounts |
| POST | `/api/emails/schedule` | Schedule a campaign |
| GET | `/api/emails` | List emails (`tab`, `status`, `q`, `page`, `limit`) |
| GET | `/api/emails/stats` | Scheduled and sent counts |
| GET | `/api/emails/:id` | Email details with attachments |
| PATCH | `/api/emails/:id/star` | Toggle star |
| GET | `/api/attachments/:id` | Download an attachment |
| GET | `/api/slack/connect-url` | Slack authorization URL |
| GET | `/api/slack/callback` | Slack OAuth callback |
| POST | `/api/slack/test` | Send a test Slack message |
| DELETE | `/api/slack` | Disconnect Slack |

Example schedule request:

```json
{
  "senderId": 1,
  "subject": "Quick question",
  "body": "<p>Hi there,</p>",
  "recipients": ["lead1@example.com", "lead2@example.com"],
  "startTime": "2026-10-15T09:00:00.000Z",
  "delaySeconds": 30,
  "hourlyLimit": 50,
  "attachments": [{ "filename": "deck.pdf", "contentType": "application/pdf", "content": "<base64>" }]
}
```

## Scripts

### Backend

| Script | Description |
| --- | --- |
| `npm run dev` | Start the API in watch mode |
| `npm run dev:worker` | Start the worker in watch mode |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start the compiled API |
| `npm run start:worker` | Start the compiled worker |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run load-test` | Schedule a large test campaign |

### Frontend

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint with oxlint |

## Deployment

The worker is a long-running process, so the backend needs a host that keeps processes alive (Render, Railway, Fly.io). The frontend is a static build and can be hosted on Vercel or any static host.

### Backend (Render)

1. Create a new **Blueprint** from the repository. `render.yaml` defines a web service with `rootDir: backend`, the build and start commands, a `/health` health check and `RUN_WORKER=true`.
2. Set the environment variables listed in [Configuration](#configuration). `JWT_SECRET` is generated automatically.
3. After the first deploy, set `BACKEND_URL` to the service URL and add `<BACKEND_URL>/api/slack/callback` to the Slack app's redirect URLs.

Use an instance type that does not sleep when idle, so that delayed jobs are processed on time.

### Frontend (Vercel)

1. Import the repository and set the root directory to `frontend` (Vite preset).
2. Set `VITE_API_URL` to `<BACKEND_URL>/api` and set `VITE_GOOGLE_CLIENT_ID`.
3. Set `FRONTEND_URL` on the backend to the Vercel URL, and add the Vercel URL to the Google OAuth authorized JavaScript origins.

`frontend/vercel.json` rewrites all routes to `index.html` for client-side routing.

### Managed services

| Service | Options |
| --- | --- |
| PostgreSQL | Neon, Supabase, Render PostgreSQL |
| Redis | Upstash, Redis Cloud, Railway (with eviction disabled) |
| Elasticsearch (optional) | Elastic Cloud |
