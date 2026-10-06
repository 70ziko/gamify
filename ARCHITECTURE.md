# Architecture

A native mobile app that gamifies tasks and habits Duolingo-style, where every
meaningful action resolves to **EXP** against a user-defined **roadmap**.
Curated courses and habits are shareable through a **public marketplace**, with
leaderboards layered on top.

## Stack

| Layer | Choice |
|---|---|
| Mobile | Expo (SDK 57) + React Native 0.86, New Architecture, TypeScript |
| Navigation | Expo Router (file-based) |
| UI | Expo UI (SwiftUI / Jetpack Compose) + Nativewind |
| Animation | Reanimated + Gesture Handler |
| Client state | Zustand (UI) + TanStack Query (server cache, optimistic writes) |
| Auth + database | Supabase: Auth (JWTs signed with ES256) and Postgres |
| API | FastAPI (Python 3.12), SQLAlchemy 2 async + asyncpg: the app's only data API |
| AI | Vendor-neutral through Pydantic AI; models are `<provider>:<model>` config strings |
| Jobs | pg_cron (weekly league rollover, later) |
| Push | Expo Notifications |
| Payments | RevenueCat (later — subscriptions + paid marketplace listings) |
| Builds/OTA | EAS Build + EAS Update |
| Observability | Sentry + PostHog |

## Topology

```
┌─────────────────────────────┐
│   Expo / React Native app   │  iOS + Android (one codebase)
└──────┬───────────────┬──────┘
       │ supabase-js   │ HTTPS, Bearer <Supabase access token>
       │ (sign-in      ▼
       │  only)      ┌──────────────┐  verifies JWTs against Supabase JWKS
       │             │   FastAPI    │──► LLM vendor (Anthropic, OpenAI, Google, …)
       │             └──────┬───────┘
       ▼                    ▼ asyncpg, table owner
┌─────────────────────────────┐
│          Supabase           │  Auth · Postgres (RLS on, no Data API grants)
└─────────────────────────────┘
```

- **API-first.** The app signs in with supabase-js and sends the access token to
  FastAPI for every read and write. The Data API roles (`anon`, `authenticated`)
  have no grants, so clients can't reach tables directly and can't forge XP.
- **Auth.** `app/auth.py` verifies ES256/RS256 tokens against
  `<SUPABASE_URL>/auth/v1/.well-known/jwks.json` (audience `authenticated`, issuer
  `<SUPABASE_URL>/auth/v1`). Staff users carry `app_metadata.staff = true`, which
  only the service role can set.
- **Realtime** comes back for leagues, with scoped `select` grants.

## Core domain — the EXP abstraction

Every completed step emits an XP event. Everything else composes on top.

- **`roadmaps` → `units` → `steps`.** A roadmap is a `course` (one-off steps) or
  a `habit` (steps repeat daily). Steps hold `minutes`, `xp`, and `exercises`
  (JSONB: `quiz`, `check`, `timer`). The API computes XP from minutes
  (`app/progress/xp.py`), so neither clients nor AI pick XP.
- **`RoadmapDraft`** (`app/roadmaps/schemas.py`) is the one tree shape for manual
  creation, AI output, marketplace snapshots, and installs.
- **`xp_events`** — the append-only ledger, written only by the API. Each row has
  an `idempotency_key` unique per user (`step:<id>`, `step:<id>:<date>` for habits,
  `quest:<code>:<date>`), so retries never double-award. Totals, levels, step
  completion, roadmap progress, quest progress, and leaderboards are derived from it.
- **`streaks`** — one per user, evaluated lazily in the user's timezone: completing
  a step advances it; missing exactly yesterday marks it at risk; a freeze
  (`POST /me/streak/freeze`) repairs it. No cron job.
- **Daily quests** — a code catalog (`app/progress/quests.py`) granted in the same
  transaction as the step that completes them.
- **Levels** — `xpForLevel` in `@gamify/shared`, mirrored in `app/progress/levels.py`.

## Marketplace

Courses and habits are publishable templates that other users install.

- **`marketplace_listings`** — `kind`, `author_id`, source `roadmap_id`, `status`
  (draft | published | unlisted | removed), `is_official`, and denormalized
  `installs` / `rating_avg` / `rating_count`. A generated `search` tsvector backs
  full-text search.
- **`listing_versions`** — immutable JSONB `RoadmapDraft` snapshots. Publishing a
  new version snapshots the author's current roadmap.
- **Install** materializes the latest snapshot into the user's own roadmap with
  `source_listing_id` / `source_version`, so private progress never touches the
  template. The listing leaderboard sums XP earned in installed copies.
- **`listing_reviews`** — one 1–5 rating per installer; aggregates recompute in
  the same transaction. Only staff can set `is_official` or `removed`.

## AI

- **Models** are config: `AI_MODEL_AUTHORING` and `AI_MODEL_FAST` take any Pydantic
  AI `<provider>:<model>` string. Switching vendor means changing the string and
  setting that vendor's key env var.
- **Flows** are async functions `(input, FlowContext) -> BaseModel`
  (`app/ai/flow.py`). `FlowContext` reports stages and accumulates token usage. A
  flow from another engine (for example `odyss_ai_flows`) plugs in as another
  function with the same signature.
- **Runner** (`app/ai/runner.py`) records every run in `ai_runs` (status, stage,
  input, output, tokens) and enforces free-plan daily quotas. Long flows run as
  background tasks the app polls; short ones run inline.
- **Flows today:** `roadmap_draft` (outline, then each unit in parallel) and
  `step_suggestions` (fast model).

## Repository layout

```
gamify/
├── apps/mobile/        # Expo app (TypeScript)
├── services/api/       # FastAPI service (Python, uv): one package per domain
├── packages/shared/    # XP curve shared with the app (@gamify/shared)
├── supabase/           # migrations, config
└── .github/workflows/  # EAS build + API deploy (later)
```

## Offline stance

Online-first for MVP: TanStack Query caches reads and queues optimistic writes,
so the app feels instant on flaky connections. Idempotent step completion makes
queued writes safe to retry.

## Build sequence

1. Scaffold monorepo (done).
2. Schema + XP ledger (done, API side).
3. Auth end-to-end (done).
4. XP vertical slice in the app: roadmap → step → complete → XP bar (done; animation pending).
5. AI roadmap drafts and step suggestions (wired in the app; prompts to be designed).
6. Streaks and daily quests (done).
7. Marketplace: publish, browse, install, review (done).
8. Leaderboards: weekly XP board done; leagues, weekly pg_cron rollover, Realtime pending.
9. Ops: Sentry, PostHog, EAS Build/Update, TestFlight, API hosting.
