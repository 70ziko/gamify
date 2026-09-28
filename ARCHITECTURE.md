# Architecture

A native mobile app that gamifies tasks and habits Duolingo-style, where every
meaningful action resolves to **EXP** against a user-defined **goal**. Curated
courses and habits are shareable through a **public marketplace**, with
leaderboards layered on top.

## Stack

| Layer | Choice |
|---|---|
| Mobile | Expo (SDK 56) + React Native 0.85, New Architecture, TypeScript |
| Navigation | Expo Router (file-based) |
| UI | Expo UI (SwiftUI / Jetpack Compose) + Nativewind |
| Animation | Reanimated + Gesture Handler |
| Client state | Zustand (UI) + TanStack Query (server cache, optimistic writes) |
| Backend (BaaS) | Supabase — Postgres + Auth + Realtime + Storage + RLS |
| Custom service | FastAPI (Python 3.12) for AI + complex XP/marketplace logic |
| AI | Anthropic Claude API (Opus for authoring, Haiku for cheap suggestions) |
| Jobs | Supabase pg_cron + Edge Functions |
| Push | Expo Notifications |
| Payments | RevenueCat (later — subscriptions + paid marketplace listings) |
| Builds/OTA | EAS Build + EAS Update |
| Observability | Sentry + PostHog |

## Topology

```
┌─────────────────────────────┐
│   Expo / React Native app   │  iOS + Android (one codebase)
└──────┬───────────────┬──────┘
       │ supabase-js   │ HTTPS (JWT)
       │ (auth, CRUD,  ▼
       │  realtime)  ┌──────────────┐
       │             │   FastAPI    │  AI + complex XP / marketplace logic
       │             │  (Python)    │──► Anthropic Claude API
       ▼             └──────┬───────┘
┌─────────────────────────────┐
│          Supabase           │  Postgres + RLS · Auth · Realtime ·
│                             │  Storage · pg_cron · Edge Functions
└─────────────────────────────┘
```

- **Read / simple-write path:** app ↔ Supabase directly, protected by RLS.
- **Smart path:** app → FastAPI for AI generation and XP rules that need real
  logic; FastAPI writes to Postgres with the service-role key.

## Core domain — the EXP abstraction

Every action emits an XP event against a goal. Everything else composes on top.

- **`goals`** — the abstraction: any user-defined objective. May link back to a
  marketplace listing it was adopted from.
- **`activities`** — repeatable/completable units under a goal (habit / task /
  lesson), with a recurrence rule and base XP.
- **`xp_events`** — the **append-only ledger**: `(user_id, goal_id, activity_id,
  amount, multiplier, source, created_at)`. Never mutated. XP totals, levels,
  streaks, and leaderboard ranks are all **derived** from it.
- **`streaks`** — per-user and per-goal current/longest + freezes; advanced by a
  daily pg_cron rollover.
- **`levels`** — XP→level curve as config (see `xpForLevel` in `@gamify/shared`)
  so progression retunes without a release.
- **`leagues` / `league_members`** — weekly cohort leaderboards; ranking is a
  query over `xp_events` in the week window, pushed live via Realtime.

## Marketplace

Courses and habits are publicly publishable templates that other users adopt.

- **`marketplace_listings`** — `kind` (course | habit), `author_id`, `status`
  (draft | published | unlisted | removed), `is_paid` / `price_cents`, and
  denormalized `installs` / `rating_avg` / `rating_count` / `version`.
- **`listing_items`** — the template contents that instantiate `goals` +
  `activities` on install.
- **`listing_reviews`** — 1–5 ratings + text; aggregates roll up onto the listing.
- **Adoption:** installing a listing creates the user's own `goals`/`activities`
  with `source_course_id` set, so their private progress stays decoupled from the
  public template (which can version independently).
- **RLS split:** private rows (goals, activities, xp_events) are owner-only;
  **published** listings and their reviews are world-readable, writable only by
  the author. Moderation/reporting and payouts for paid listings live in FastAPI.

## Repository layout

```
gamify/
├── apps/mobile/        # Expo app (TypeScript)
├── services/api/       # FastAPI service (Python, uv)
├── packages/shared/    # Shared TS types + XP curve (@gamify/shared)
├── supabase/           # migrations, RLS policies, Edge Functions, seed
└── .github/workflows/  # EAS build + API deploy (later)
```

## Offline stance

Online-first for MVP: TanStack Query caches reads and queues optimistic writes,
so the app feels instant on flaky connections. The data model is designed so a
local SQLite mirror + background sync (e.g. PowerSync + Supabase) can be layered
in later without a rewrite — the optimistic-write path is the seam.

## Build sequence

1. Scaffold monorepo (done: pnpm workspace, Expo app, FastAPI, Supabase).
2. Schema migration + RLS + XP/level seed.
3. Auth end-to-end (email + Sign in with Apple).
4. XP vertical slice: goal → activity → complete → animated XP bar.
5. FastAPI + Claude: text prompt → generated goal + activities.
6. Streaks + pg_cron rollover.
7. Marketplace: publish, browse, install, review.
8. Leaderboards (leagues + Realtime).
9. Ops: Sentry, PostHog, EAS Build/Update, TestFlight.
```
