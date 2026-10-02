# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

`AGENTS.md` (imported above, shared with other agents) covers layout, commands, style, and commit/PR rules. This file adds what it doesn't. Product and domain design live in `ARCHITECTURE.md`.

## ARCHITECTURE.md is the target, not the current state

- **Mobile is a UI prototype.** No Supabase client, no API calls, no persistence: every screen renders hardcoded data. Nativewind, Zustand, TanStack Query, and supabase-js are not installed yet. `@expo/ui` is installed but unused.
- **Versions.** `apps/mobile/package.json` pins Expo SDK 57, React Native 0.86, React 19.2, and TypeScript ~6.0. The "SDK 56 / RN 0.85" in ARCHITECTURE.md is stale. SDK 57 may postdate your training data, so check https://docs.expo.dev/versions/v57.0.0/ before using Expo APIs.
- **API.** Only `GET /health` and a stubbed `POST /goals/from-prompt` that returns canned data: no Claude call, no DB write, no JWT verification. Model IDs are `Settings.model_authoring` / `model_fast` in `services/api/app/config.py`.
- **`@gamify/shared`** is not a dependency of any package yet, and nothing imports it. It ships raw TS (`main: src/index.ts`, no build step).

## Commands beyond AGENTS.md

- Type-check mobile: `pnpm --filter mobile exec tsc --noEmit`
- Run mobile in a browser: `pnpm --filter mobile web`
- No test runner exists in any package, so there is no single-test command yet.
- Local Supabase: Studio at http://127.0.0.1:54323, captured auth emails at http://127.0.0.1:54324, API on `:54321`, Postgres on `:54322`.

## Mobile app

- `src/app/_layout.tsx` is a single `Stack`. It loads the five Plus Jakarta Sans weights with `useFonts` and holds the splash screen until they load.
- `src/app/index.tsx` renders `GamifyApp` (`src/components/gamify-app.tsx`). That one file holds all 19 screens and navigates with a `useState<ScreenName>` switch, not Expo Router. To add a screen, extend `ScreenName`, add a `case`, and pass navigation callbacks as props.
- `src/components/gamify-ui.tsx` is the design system: `palette` (dark/light), `GText`, `ScreenFrame`, `MainScaffold` + `BottomNav`, `Card`, `PrimaryButton`, and the rest. Components receive the palette as a `p` prop.
  - Use `GText`, not `Text`. Its `weight` prop (400–800) maps to the Jakarta font names, so a new weight must be added there and in `_layout.tsx`.
  - Theme is `mode` state in `GamifyApp` (default `dark`, switched in Settings), not the system color scheme. Screens that don't receive `mode` hardcode `palette.dark`.
- `Gamified Habit Tracker App/Gamify App.dc.html` is the design canvas these screens were ported from. Use it as the visual reference.
- Expo template leftovers that the Gamify UI does not use: `src/app/explore.tsx` (still a live `/explore` route), `app-tabs*`, `themed-*`, `hint-row`, `web-badge`, `external-link`, `animated-icon*`, `ui/collapsible`, `hooks/use-theme.ts`, and `constants/theme.ts`. Despite what AGENTS.md says, `constants/theme.ts` is not the app palette. It is, however, the only importer of `src/global.css` (web background and font variables), so move that import before deleting it.
- `app.json` enables the React Compiler and typed routes.

## Data model invariants

- `xp_events` is the ledger. XP totals, levels, and league ranks are derived from it and never stored. The stored exceptions are `streaks` (to be advanced by a pg_cron rollover) and the denormalized listing aggregates (`installs`, `rating_avg`, `rating_count`).
- The level curve is `xpForLevel` / `levelFromXp` in `packages/shared/src/index.ts`. The API is Python and cannot import it, so mirror any change there by hand.
- Installing a marketplace listing copies its `listing_items` into the user's own `goals` / `activities` (with `goals.source_course_id` set). Private progress never touches the public template.
- The TS types in `packages/shared` are hand-mirrored from `supabase/migrations/0001_init.sql`. Change both together, or switch to `supabase gen types typescript` as that file's header suggests.

## Gotchas

- **Missing grants.** `supabase/config.toml` leaves `auto_expose_new_tables` unset. Its inline comment says that new `public` tables are then not reachable by `anon`, `authenticated`, or `service_role` without explicit `GRANT`s, and that the legacy setting is removed on 2026-10-30. `0001_init.sql` has no grants, so expect permission errors from supabase-js / supabase-py until a migration adds them.
- **Ledger immutability isn't enforced.** The `xp_events_owner` RLS policy is `for all`, so it lets an owner insert any amount and update or delete their rows. "Append-only" is a convention until a policy or trigger enforces it.
- **Migration names.** `supabase migration new <name>` creates `<timestamp>_<name>.sql`, and `pnpm db:diff -f <name>` also writes a new migration file. Rename CLI-created files to the next `000N_` prefix to keep the numbered order. `config.toml` also seeds from `supabase/seed.sql`, which doesn't exist yet.
- **API env loading.** `Settings` reads `.env` from the current working directory, and every field defaults to `""`. Started from any other directory, the API boots silently with empty keys. `pnpm api` is safe because it runs `uv --directory services/api`.
