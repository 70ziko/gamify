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

- Node 22.13 or newer (Expo SDK 57's minimum), with Corepack enabled: `corepack enable`.
  Corepack runs the pnpm version pinned in `package.json` (`pnpm@10.17.1`).
- Python 3.12 via [uv](https://docs.astral.sh/uv/) (uv installs the toolchain)
- Docker Desktop, only for the local Supabase stack
- Expo Go on your phone and an [Expo account](https://expo.dev/signup), to run the app on a device
- Xcode, only for the iOS Simulator. The browser and Expo Go don't need it.

## See the app

The mobile app is a UI prototype: every screen renders hardcoded data, and nothing
calls Supabase or the API yet. You don't need the backend to look at it.

```bash
corepack enable   # once per machine
pnpm install
pnpm mobile       # Expo dev server
```

In the Expo terminal, press `w` to open the app in your browser, or scan the QR code
with your phone (see below). `i` opens the iOS Simulator and needs Xcode.

## Run on your phone

1. Install Expo Go from the App Store or Google Play.
2. Log in to the same Expo account in the Expo Go app and in the CLI:
   `pnpm --filter mobile exec expo login`. Expo Go for iOS refuses to open a
   dev server otherwise.
3. Connect the phone to the same Wi-Fi as your Mac, run `pnpm mobile`, and scan the
   QR code it prints.

If the phone can't reach your Mac (guest Wi-Fi, client isolation, VPN), start Expo
with a tunnel instead: `pnpm --filter mobile start --tunnel`.

## Local backend

Optional until the app gets a Supabase client.

### Supabase

Start Docker Desktop first. The first start downloads about 2 GB of images.

```bash
pnpm db:start                 # Postgres, Auth, Storage, Realtime, Studio; applies supabase/migrations
pnpm exec supabase status     # prints the URLs and keys again
```

| What | URL |
|---|---|
| API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Captured auth emails | http://127.0.0.1:54324 |
| Postgres | `127.0.0.1:54322` (connection string in `supabase status`) |

Low on disk? `pnpm db:start -x edge-runtime,logflare,vector,imgproxy` skips the
services this project doesn't use yet.

### API

```bash
cp services/api/.env.example services/api/.env   # service-role key from `supabase status`
pnpm api                                          # http://127.0.0.1:8000, docs at /docs
curl http://127.0.0.1:8000/health                 # {"status":"ok","env":"development"}
```

### Mobile env

```bash
cp apps/mobile/.env.example apps/mobile/.env      # anon key from `supabase status`
```

Expo reads `.env` without a restart. Reload the app (`r` in the Expo terminal) to
pick up changes.

### Backend from a phone

On the phone, `127.0.0.1` means the phone itself. Point the app at your Mac instead:

1. Get your Mac's Wi-Fi IP: `ipconfig getifaddr en0`
2. In `apps/mobile/.env`, replace `127.0.0.1` with that IP in
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_API_URL`.
3. Start the API on all interfaces: `pnpm api --host 0.0.0.0`
4. If macOS asks whether to accept incoming connections, allow them.

## Handy scripts (root `package.json`)

| Script | What |
|---|---|
| `pnpm mobile` | Expo dev server |
| `pnpm mobile:ios` / `mobile:android` | Expo dev server, then opens the iOS Simulator (needs Xcode) / a connected Android device |
| `pnpm --filter mobile web` | Expo dev server, then opens the browser |
| `pnpm api` | FastAPI dev server on :8000 |
| `pnpm db:start` / `db:stop` | local Supabase up/down |
| `pnpm db:reset` | re-apply all migrations from scratch (wipes local data) |
| `pnpm db:diff` | generate a migration from schema changes |
| `pnpm --filter mobile lint` | ESLint |
| `pnpm --filter mobile exec tsc --noEmit` | type-check the app |

## Environment

Secrets live in untracked `.env` files (`.env.example` templates are committed):

- `apps/mobile/.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
  `EXPO_PUBLIC_API_URL`. Everything `EXPO_PUBLIC_*` ships inside the app bundle, so
  never put a secret here.
- `services/api/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
  `ENVIRONMENT`

## Troubleshooting

**`Cannot find module '…/corepack/v1/pnpm/12.x/bin/pnpm.cjs'`** — the
`packageManager` field in `package.json` was changed to pnpm 11 or newer, usually by
running the `corepack use pnpm@…` command from pnpm's "Update available" banner.
Corepack older than 0.34.5 can't start pnpm 11+ (check yours with
`corepack --version`). Restore the pin with `git checkout package.json`, and ignore
the banner: upgrading pnpm is a deliberate change that needs a newer Corepack and a
lockfile update.

**Expo Go can't find the dev server** — check the phone and Mac share a network,
then try `--tunnel` (see [Run on your phone](#run-on-your-phone)).

## Next steps

See the build sequence in [ARCHITECTURE.md](./ARCHITECTURE.md#build-sequence).
Next up: auth end-to-end, then the XP vertical slice (goal → activity → complete
→ animated XP bar).
