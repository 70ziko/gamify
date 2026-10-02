# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm monorepo. The Expo/React Native client lives in `apps/mobile`; routes are in `src/app`, reusable UI in `src/components`, hooks in `src/hooks`, theme constants in `src/constants`, and static files in `assets`. The FastAPI service is under `services/api/app`: shared plumbing (`config.py`, `db.py`, `auth.py`, `errors.py`, `main.py`) plus one package per domain, and tests in `services/api/tests`. The shared XP curve lives in `packages/shared/src`. Supabase configuration and ordered SQL migrations live in `supabase/`; add schema changes as new numbered files rather than editing an applied migration. See `ARCHITECTURE.md` for domain boundaries and data flow.

## Build, Test, and Development Commands

- `pnpm install` installs all workspace and CLI dependencies.
- `pnpm mobile`, `pnpm mobile:ios`, or `pnpm mobile:android` starts Expo for the selected target.
- `pnpm api` runs FastAPI in development mode on port 8000.
- `pnpm db:start` starts the local Supabase stack; `pnpm db:stop` stops it.
- `pnpm db:reset` reapplies migrations locally. Treat it as destructive to local data.
- `pnpm --filter mobile lint` runs Expo's lint checks.

Copy each committed `.env.example` to `.env` before local development. Never commit service-role or API keys.

## Coding Style & Naming Conventions

TypeScript is strict. Match the existing two-space indentation, single quotes, semicolons, and trailing commas. Use PascalCase for React components and exported types, `useX` for hooks, camelCase for functions, and kebab-case filenames such as `themed-text.tsx`. Prefer the `@/` alias for mobile imports. Python uses four spaces, type annotations, snake_case functions, and PascalCase models. SQL uses lowercase keywords and snake_case identifiers. No repository-wide formatter is configured, so preserve nearby style and keep lint clean. Before changing Expo code, follow `apps/mobile/AGENTS.md` and consult the pinned SDK documentation.

## Testing Guidelines

The API uses pytest: `cd services/api && uv run --env-file .env pytest`. Put API tests in `services/api/tests/test_*.py`; tests that need Postgres run against the local Supabase database inside a rolled-back transaction. The mobile app has no test runner yet: when adding its first tests, add the tooling and a script, and colocate them as `*.test.ts(x)`. Until then, run mobile lint. Use `pnpm db:reset` to validate migrations.

## Commit & Pull Request Guidelines

The repository has no commits from which to infer a convention. Use short, imperative Conventional Commit-style subjects, for example `feat(mobile): add goal card`. Keep commits focused. Pull requests should explain the change and motivation, list verification commands, link relevant issues, call out environment or migration changes, and include screenshots or recordings for visible mobile UI changes.
