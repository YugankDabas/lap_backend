# Legal Agreement Portal — Backend API

REST API for the Legal Agreement Portal (GyFTR / LKP Finance Limited). Handles
authentication, role-based access control, agreement tracking, clause negotiation,
reminders, digital sign-off, and reporting.

**Stack:** Node.js · Express · Prisma ORM · PostgreSQL · JWT auth (bcrypt)

> Companion frontend repo: **lap_frontend** (React). This API must be running for it to work.

---

## Prerequisites

- Node.js 18+ (built/tested on Node 22)
- A PostgreSQL database (local, or hosted e.g. Render)

## Setup

```bash
npm install
cp .env.example .env          # then edit values (see below)
npx prisma migrate dev        # create all tables
npm run seed                  # load demo users + sample agreements
npm run dev                   # http://localhost:4000
```

### Environment variables (`.env`)

| Key | Description |
|-----|-------------|
| `DATABASE_URL` | PostgreSQL connection string. For Render, append `?sslmode=require` |
| `JWT_SECRET` | Secret for signing JWTs (use a long random string) |
| `JWT_EXPIRES_IN` | Token lifetime (default `8h`) |
| `PORT` | API port (default `4000`) |
| `CLIENT_ORIGIN` | Frontend origin for CORS (default `http://localhost:5173`) |

> `.env` is gitignored — never commit it (it holds the DB password & JWT secret).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start once (production-style) |
| `npm run seed` | Reset & load demo data |
| `npm test` | Run Jest/Supertest integration tests |
| `npm run prisma:studio` | Open Prisma Studio (DB browser) |

## Demo accounts (after `npm run seed`)

Password for all: **`password123`**

| Role | Email |
|------|-------|
| Legal | `legal@demo.gyftr.com` |
| Finance | `finance@demo.gyftr.com` |
| Business | `business@demo.gyftr.com` |
| Compliance | `compliance@demo.gyftr.com` |

---

## API overview

All routes are under `/api`. Writes require a JWT (sent as an httpOnly cookie or
`Authorization: Bearer <token>`). Team-scoped writes are additionally RBAC-guarded.

**Auth**
- `POST /auth/register` — `{ name, email, password, role }`
- `POST /auth/login` — `{ email, password }` → `{ token, user }`
- `POST /auth/logout`
- `GET /auth/me`

**Agreements**
- `GET /agreements` — filters: `?search=&type=&status=&myStatus=&isDemo=`
- `POST /agreements` — **Legal only**
- `GET /agreements/:id`
- `PATCH /agreements/:id` — **Legal only**
- `GET /agreements/export?format=csv|pdf`

**Team status** — `PATCH /agreements/:id/status/:team` — owning team only (Legal = any)

**Versions & clauses**
- `GET|POST /agreements/:id/versions` (POST = Legal)
- `GET /agreements/:id/compare?from=1&to=2` — word-level clause diff
- `GET /clauses/version/:versionId`
- `POST /clauses/version/:versionId` — add clause (**Legal**)
- `PATCH /clauses/:clauseId` — edit clause / set outcome (**Legal**)
- `POST /clauses/:clauseId/comments` · `PATCH /comments/:id/resolve`

**Remarks & history** — `GET|POST /agreements/:id/remarks` · `GET /agreements/:id/history`

**Reminders** — `POST /agreements/:id/reminders` (Legal) · `GET /reminders/pending` · `PATCH /reminders/:id/acknowledge`

**Compliance queries** — `POST /agreements/:id/compliance-queries` (Compliance) · `GET /agreements/:id/compliance-queries` (Legal + Compliance)

**Sign-off** — `POST /agreements/:id/signoff` (Legal or Business; gated on all clauses resolved)

**Dashboard** — `GET /dashboard/summary`

## Roles & permissions (server-enforced)

- **Legal:** full access — create/edit agreements, all team statuses, clause outcomes, reminders, sign.
- **Finance / Business / Compliance:** update **only their own** team status; respond to reminders.
- **Compliance:** raise compliance queries (visible to Legal + Compliance).
- **Sign-off:** Legal + Business only.
- **Remarks:** any authenticated role.

Team status values: `PENDING → UNDER_REVIEW → APPROVED`.

## Testing

```bash
npm run seed      # ensure demo users exist
npm test          # 16 tests: RBAC boundaries, sign-off gate, audit trail
```

## Project structure

```
lap_backend/
├── prisma/
│   ├── schema.prisma      # data model
│   ├── migrations/
│   └── seed.js            # demo users + sample agreements
├── src/
│   ├── config/            # env, prisma client
│   ├── constants/         # shared enums + permission constants
│   ├── controllers/       # request/response handlers
│   ├── services/          # business rules + transactions + audit logging
│   ├── middleware/        # auth, rbac, validate, errorHandler
│   ├── routes/            # per-domain routers
│   ├── validators/        # Zod request schemas
│   ├── lib/               # jwt, password, diff, ApiError, asyncHandler
│   ├── app.js             # express app wiring
│   └── index.js           # server entry
└── tests/                 # Jest + Supertest
```

## Notes

- All status changes, remarks, reminders, and sign-offs are written to an **append-only
  history log** in the same DB transaction as the change (auditable trail).
- Demo/presentation data is flagged with `is_demo`.
- The digital sign-off is an internal tracking record, not formal legal execution.
