-- Gamify schema. The app reaches data only through the API, which connects as
-- the table owner. The Data API roles get no grants, so RLS stays deny-all.
-- XP totals, levels, progress and leaderboards are derived from xp_events.

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  handle        text unique,
  display_name  text,
  avatar_url    text,
  interests     text[] not null default '{}',
  daily_xp_goal integer not null default 30 check (daily_xp_goal > 0),
  reminder_time time,
  timezone      text not null default 'UTC',
  plan          text not null default 'free' check (plan in ('free', 'plus')),
  created_at    timestamptz not null default now()
);

create table public.streaks (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  current        integer not null default 0,
  longest        integer not null default 0,
  freezes        integer not null default 2 check (freezes >= 0),
  last_active_on date
);

create table public.roadmaps (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  kind              text not null check (kind in ('course', 'habit')),
  title             text not null,
  summary           text not null default '',
  category          text not null default 'custom',
  level             text not null default 'beginner' check (level in ('beginner', 'some', 'solid')),
  source_listing_id uuid,
  source_version    integer,
  archived          boolean not null default false,
  created_at        timestamptz not null default now()
);
create index roadmaps_user_idx on public.roadmaps (user_id, created_at desc);
create index roadmaps_source_idx on public.roadmaps (source_listing_id, created_at);

create table public.units (
  id         uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps (id) on delete cascade,
  position   integer not null,
  title      text not null,
  summary    text not null default '',
  unique (roadmap_id, position)
);

create table public.steps (
  id         uuid primary key default gen_random_uuid(),
  unit_id    uuid not null references public.units (id) on delete cascade,
  position   integer not null,
  title      text not null,
  summary    text not null default '',
  minutes    integer not null check (minutes > 0),
  xp         integer not null check (xp >= 0),
  exercises  jsonb not null default '[]',
  unique (unit_id, position)
);

create table public.xp_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  roadmap_id      uuid references public.roadmaps (id) on delete set null,
  step_id         uuid references public.steps (id) on delete set null,
  amount          integer not null,
  source          text not null check (source in ('step_complete', 'quest', 'streak_bonus', 'adjustment')),
  idempotency_key text not null,
  created_at      timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index xp_events_user_time_idx on public.xp_events (user_id, created_at desc);
create index xp_events_roadmap_idx on public.xp_events (roadmap_id, user_id);

create table public.marketplace_listings (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references auth.users (id) on delete cascade,
  roadmap_id     uuid references public.roadmaps (id) on delete set null,
  kind           text not null check (kind in ('course', 'habit')),
  title          text not null,
  summary        text not null default '',
  category       text not null default 'custom',
  status         text not null default 'published'
                 check (status in ('draft', 'published', 'unlisted', 'removed')),
  is_official    boolean not null default false,
  latest_version integer not null default 1,
  installs       integer not null default 0,
  rating_avg     numeric(3, 2) not null default 0,
  rating_count   integer not null default 0,
  search         tsvector generated always as (to_tsvector('simple', title || ' ' || summary)) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index listings_browse_idx on public.marketplace_listings (status, category);
create index listings_search_idx on public.marketplace_listings using gin (search);

alter table public.roadmaps
  add constraint roadmaps_source_listing_fk
  foreign key (source_listing_id) references public.marketplace_listings (id) on delete set null;

create table public.listing_versions (
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  version    integer not null,
  content    jsonb not null,
  created_at timestamptz not null default now(),
  primary key (listing_id, version)
);

create table public.listing_reviews (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  rating     integer not null check (rating between 1 and 5),
  body       text,
  created_at timestamptz not null default now(),
  unique (listing_id, user_id)
);

create table public.ai_runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  flow          text not null,
  status        text not null default 'running'
                check (status in ('running', 'succeeded', 'failed', 'cancelled')),
  stage         text,
  input         jsonb not null,
  output        jsonb,
  error         text,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index ai_runs_user_time_idx on public.ai_runs (user_id, created_at desc);

alter table public.profiles             enable row level security;
alter table public.streaks              enable row level security;
alter table public.roadmaps             enable row level security;
alter table public.units                enable row level security;
alter table public.steps                enable row level security;
alter table public.xp_events            enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.listing_versions     enable row level security;
alter table public.listing_reviews      enable row level security;
alter table public.ai_runs              enable row level security;

revoke all on all tables in schema public from anon, authenticated;

create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  insert into public.streaks (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
