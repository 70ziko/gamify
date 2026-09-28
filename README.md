# Gamify

A native mobile app that gamifies tasks and habits Duolingo-style — every action
resolves to **EXP** against a user-defined goal. Curated courses and habits are
shareable through a public **marketplace**, with leaderboards on top.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

## Monorepo layout

```
apps/mobile/       Expo (SDK 57) + React Native app — TypeScript
services/api/      FastAPI service (Python 3.12, uv) — AI + complex XP logic
packages/shared/   Shared TS types + XP curve (@gamify/shared)
supabase/          Postgres migrations, RLS policies, config
```

## Prerequisites

- Node 22 + pnpm 10
- Python 3.12 via uv (`uv` handles the toolchain)
- Docker Desktop (for local Supabase)
- Xcode (iOS Simulator) / Android Studio (later)

## Getting started

```bash
pnpm install                 # install app + shared + Supabase CLI

# 1) Local backend
pnpm db:start                # boots Postgres/Auth/Realtime/Storage, applies migrations
#   → prints API URL + anon key; put them in apps/mobile/.env and services/api/.env

# 2) Mobile app
pnpm mobile                  # Expo dev server (press i for iOS simulator)

# 3) API service
cp services/api/.env.example services/api/.env   # fill in keys
pnpm api                     # FastAPI dev server on :8000  (GET /health)
```

## Handy scripts (root `package.json`)

| Script | What |
|---|---|
| `pnpm mobile` / `mobile:ios` | Expo dev server |
| `pnpm api` | FastAPI dev server |
| `pnpm db:start` / `db:stop` | local Supabase up/down |
| `pnpm db:reset` | re-apply all migrations from scratch |
| `pnpm db:diff` | generate a migration from schema changes |

## Environment

Secrets live in untracked `.env` files (`.env.example` templates are committed):

- `apps/mobile/.env` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `services/api/.env` — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`

## Next steps

See the build sequence in [ARCHITECTURE.md](./ARCHITECTURE.md#build-sequence).
Next up: auth end-to-end, then the XP vertical slice (goal → activity → complete
→ animated XP bar).
