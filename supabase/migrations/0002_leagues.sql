-- Weekly leagues. A user joins a cohort in their tier the first time they earn
-- XP in a week (weeks start Monday 00:00 UTC). The API closes a cohort lazily,
-- the first time one of its members is seen after the week ends, and records
-- each member's outcome. Weekly XP and rank stay derived from xp_events.
-- Tier names and promotion rules live in app/progress/leagues.py.

create table public.leagues (
  id         uuid primary key default gen_random_uuid(),
  week_start date not null,
  tier       smallint not null check (tier >= 0),
  closed_at  timestamptz,
  created_at timestamptz not null default now(),
  unique (id, week_start)
);
create index leagues_open_idx on public.leagues (week_start, tier) where closed_at is null;

create table public.league_members (
  league_id  uuid not null,
  week_start date not null,
  user_id    uuid not null references auth.users (id) on delete cascade,
  outcome    text check (outcome in ('promoted', 'stayed', 'demoted')),
  joined_at  timestamptz not null default now(),
  primary key (league_id, user_id),
  unique (user_id, week_start),
  foreign key (league_id, week_start) references public.leagues (id, week_start) on delete cascade
);

alter table public.profiles add column league_opt_in boolean not null default true;

alter table public.leagues        enable row level security;
alter table public.league_members enable row level security;

-- 0001's revoke covered only the tables that existed then. Default privileges
-- grant every new public table to anon and authenticated.
revoke all on public.leagues, public.league_members from anon, authenticated;
