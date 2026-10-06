# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

`AGENTS.md` (imported above, shared with other agents) covers layout, commands, style, and commit/PR rules. This file adds what it doesn't. Product and domain design live in `ARCHITECTURE.md`.

## ARCHITECTURE.md is the target, not the current state

- **Mobile is a UI prototype.** No Supabase client, no API calls, no persistence: every screen renders hardcoded data. Nativewind, Zustand, TanStack Query, and supabase-js are not installed yet. `@expo/ui` is installed but unused.
- **Versions.** `apps/mobile/package.json` pins Expo SDK 57, React Native 0.86, React 19.2, and TypeScript ~6.0. SDK 57 may postdate your training data, so check https://docs.expo.dev/versions/v57.0.0/ before using Expo APIs.
- **API is built; the app doesn't call it yet.** Leagues, follows, achievements, gems, and payments are not built.
- **`@gamify/shared`** holds only the XP curve. Nothing imports it yet. It ships raw TS (`main: src/index.ts`, no build step). The app should take API types from `/openapi.json`.

## Commands beyond AGENTS.md

- Type-check mobile: `pnpm --filter mobile exec tsc --noEmit`
- Run mobile in a browser: `pnpm --filter mobile web`
- API tests (from `services/api`): `uv run --env-file .env pytest`. One test: `uv run --env-file .env pytest tests/test_api.py::test_streak_freeze`. Tests marked `db` skip when Postgres on `DATABASE_URL` is unreachable, and each runs inside a rolled-back transaction.
- The mobile app has no test runner.
- Local Supabase: Studio at http://127.0.0.1:54323, captured auth emails at http://127.0.0.1:54324, API on `:54321`, Postgres on `:54322`.

## Mobile app

- `src/app/_layout.tsx` is a single `Stack`. It loads the five Plus Jakarta Sans weights with `useFonts` and holds the splash screen until they load.
- `src/app/index.tsx` renders `GamifyApp` (`src/components/gamify-app.tsx`). That one file holds all 19 screens and navigates with a `useState<ScreenName>` switch, not Expo Router. To add a screen, extend `ScreenName`, add a `case`, and pass navigation callbacks as props.
- `src/components/gamify-ui.tsx` is the design system: `palette` (dark/light), `GText`, `ScreenFrame`, `MainScaffold` + `BottomNav`, `Card`, `PrimaryButton`, and the rest. Components receive the palette as a `p` prop.
  - Use `GText`, not `Text`. Its `weight` prop (400–800) maps to the Jakarta font names, so a new weight must be added there and in `_layout.tsx`.
  - Use `Icon` (or `IconTile icon=…`), not unicode glyphs like `◷` or `▣`. It wraps `expo-symbols`: SF Symbols on iOS, Material Symbols on Android and web. A new icon needs an entry with both names in the `icons` map.
  - `MascotPlaceholder` holds the mascot's slot on Home's today card until the artwork exists.
  - Color roles: peach `accent` is for actions (`PrimaryButton`, `SectionLink`) and the warm today card; purple is for level and progress (`LevelCard` in `gamify-app.tsx`); gold `streak` is for streaks and XP amounts; green `success` is for finished items and league rank.
  - Home is sized to fit one screen above the bottom nav. Tune it through the `homeSizes` table, and check a 375×667 viewport still shows the roadmap cards.
  - Theme is `mode` state in `GamifyApp` (default `dark`, switched in Settings), not the system color scheme. Screens that don't receive `mode` hardcode `palette.dark`.
- `Gamified Habit Tracker App/Gamify App.dc.html` is the design canvas these screens were ported from. Use it as the visual reference.
- Expo template leftovers that the Gamify UI does not use: `src/app/explore.tsx` (still a live `/explore` route), `app-tabs*`, `themed-*`, `hint-row`, `web-badge`, `external-link`, `animated-icon*`, `ui/collapsible`, `hooks/use-theme.ts`, and `constants/theme.ts`. Despite what AGENTS.md says, `constants/theme.ts` is not the app palette. It is, however, the only importer of `src/global.css` (web background and font variables), so move that import before deleting it.
- `app.json` enables the React Compiler and typed routes.

## API service (`services/api/app`)

- One package per domain: `profiles`, `progress`, `roadmaps`, `marketplace`, `ai`. Each has only the files it needs: `models.py` (SQLAlchemy, mapped onto the SQL schema), `schemas.py` (Pydantic I/O), `service.py` (logic), `router.py` (thin endpoints). Register new routers in `main.py`.
- Dependencies point one way: `profiles ← progress ← roadmaps ← marketplace`, and `ai → roadmaps.schemas`. Cross-domain calls go through `service` functions.
- Services take an `AsyncSession` and never commit. `db.Session` wraps each request in one transaction that commits before the response is sent (`Depends(..., scope="function")`). Raise `errors.NotFound` / `Forbidden` / `Conflict` / `QuotaExceeded`, not `HTTPException`.
- Python-side column defaults (`default=uuid4`, `default=1`) apply only at flush. Set values explicitly when code reads them before flushing.
- AI: a flow is `async def flow(data, ctx: FlowContext) -> BaseModel`. Call models through `ctx.ask(agent, prompt, ModelRole.X)`. Agents are declared without a model, so tests swap in `FunctionModel` with `agent.override(model=...)`. `tests/conftest.py` sets `ALLOW_MODEL_REQUESTS = False`.
- Tests override `db.get_sessionmaker` with a savepoint-joined factory and `auth.current_user` with a fixed user (`act_as`). Background tasks share that factory.

## Data model invariants

- `xp_events` is the ledger, written only by the API through `progress.service.award` with a per-user unique `idempotency_key`. XP totals, levels, step completion, quest progress, and leaderboards are derived from it and never stored. The stored exceptions are `streaks` (advanced on completion, evaluated lazily) and the listing aggregates (`installs`, `rating_avg`, `rating_count`).
- Step XP comes from `progress.xp.step_xp(minutes)`. `StepDraft.xp` is a computed field, so client- or AI-supplied XP is ignored.
- The level curve is `xpForLevel` / `levelFromXp` in `packages/shared/src/index.ts`, mirrored by hand in `app/progress/levels.py`.
- Installing a listing materializes its latest `listing_versions.content` (a `RoadmapDraft`) into the user's own roadmap with `source_listing_id` set. Private progress never touches the template.
- The ORM models are hand-mapped onto `supabase/migrations/0001_init.sql`. Change both together.

## Gotchas

- **No Data API access, on purpose.** `0001_init.sql` enables RLS with no policies and revokes all table privileges from `anon` / `authenticated`. supabase-js can only sign in. Data goes through the API, which connects as the table owner. Realtime for leagues will need explicit `select` grants and policies.
- **Local signing key.** `supabase/config.toml` sets `signing_keys_path = "./signing_keys.json"`, which is gitignored and must exist before `pnpm db:start`. Create it with `echo '[]' > supabase/signing_keys.json && pnpm exec supabase gen signing-key --algorithm ES256 --yes`.
- **Migration names.** `supabase migration new <name>` creates `<timestamp>_<name>.sql`, and `pnpm db:diff -f <name>` also writes a new migration file. Rename CLI-created files to the next `000N_` prefix to keep the numbered order. `config.toml` also seeds from `supabase/seed.sql`, which doesn't exist yet.
- **API env loading.** `Settings` reads only the process environment. `pnpm api` loads `services/api/.env` through `uv run --env-file .env`. Run other commands the same way, or the defaults (local Supabase) apply and no AI key is set.
