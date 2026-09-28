-- Gamify initial schema.
-- Core idea: every action emits an append-only xp_event against a goal.
-- Totals, levels, streaks, and ranks are DERIVED from xp_events, never stored.
-- Private data is owner-only via RLS; published marketplace content is public-read.

-- ── Profiles (public identity, mirrors auth.users) ──────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  handle      text unique,
  display_name text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ── Core EXP abstraction ────────────────────────────────────────────────────
create table public.goals (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null,
  category         text not null default 'custom',
  source_course_id uuid,            -- marketplace listing this was adopted from
  archived         boolean not null default false,
  created_at       timestamptz not null default now()
);
create index goals_user_idx on public.goals (user_id);

create table public.activities (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.goals (id) on delete cascade,
  title      text not null,
  recurrence text,                  -- iCal RRULE, or null for a one-off task
  base_xp    integer not null default 10,
  created_at timestamptz not null default now()
);
create index activities_goal_idx on public.activities (goal_id);

-- Append-only ledger — the single source of truth for all progress.
create table public.xp_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  goal_id     uuid references public.goals (id) on delete set null,
  activity_id uuid references public.activities (id) on delete set null,
  amount      integer not null,
  multiplier  numeric not null default 1,
  source      text not null default 'activity_complete',
  created_at  timestamptz not null default now()
);
create index xp_events_user_time_idx on public.xp_events (user_id, created_at desc);

create table public.streaks (
  user_id        uuid not null references auth.users (id) on delete cascade,
  goal_id        uuid references public.goals (id) on delete cascade,
  current        integer not null default 0,
  longest        integer not null default 0,
  freezes        integer not null default 0,
  last_active_on date,
  primary key (user_id, goal_id)
);

-- ── Marketplace (courses & habits are publicly publishable templates) ───────
create table public.marketplace_listings (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references auth.users (id) on delete cascade,
  kind         text not null check (kind in ('course', 'habit')),
  title        text not null,
  summary      text not null default '',
  category     text not null default 'custom',
  status       text not null default 'draft'
               check (status in ('draft', 'published', 'unlisted', 'removed')),
  is_paid      boolean not null default false,
  price_cents  integer,
  installs     integer not null default 0,
  rating_avg   numeric not null default 0,
  rating_count integer not null default 0,
  version      integer not null default 1,
  created_at   timestamptz not null default now()
);
create index listings_public_idx on public.marketplace_listings (status, category);

-- Template contents that instantiate goals + activities on install.
create table public.listing_items (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  title      text not null,
  recurrence text,
  base_xp    integer not null default 10,
  position   integer not null default 0
);
create index listing_items_listing_idx on public.listing_items (listing_id);

create table public.listing_reviews (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  rating     integer not null check (rating between 1 and 5),
  body       text,
  created_at timestamptz not null default now(),
  unique (listing_id, user_id)
);
create index listing_reviews_listing_idx on public.listing_reviews (listing_id);

-- goals.source_course_id references a listing (added after the table exists).
alter table public.goals
  add constraint goals_source_course_fk
  foreign key (source_course_id) references public.marketplace_listings (id) on delete set null;

-- ── Row-Level Security ──────────────────────────────────────────────────────
alter table public.profiles             enable row level security;
alter table public.goals                enable row level security;
alter table public.activities           enable row level security;
alter table public.xp_events            enable row level security;
alter table public.streaks              enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.listing_items        enable row level security;
alter table public.listing_reviews      enable row level security;

-- Profiles: world-readable (needed for marketplace authorship), owner-writable.
create policy profiles_read   on public.profiles for select using (true);
create policy profiles_write  on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update on public.profiles for update using (auth.uid() = id);

-- Private data: owner-only.
create policy goals_owner on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy activities_owner on public.activities
  for all using (
    exists (select 1 from public.goals g where g.id = activities.goal_id and g.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.goals g where g.id = activities.goal_id and g.user_id = auth.uid())
  );

create policy xp_events_owner on public.xp_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy streaks_owner on public.streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Marketplace: published listings are world-readable; authors manage their own.
create policy listings_read on public.marketplace_listings
  for select using (status = 'published' or auth.uid() = author_id);
create policy listings_write on public.marketplace_listings
  for insert with check (auth.uid() = author_id);
create policy listings_update on public.marketplace_listings
  for update using (auth.uid() = author_id);
create policy listings_delete on public.marketplace_listings
  for delete using (auth.uid() = author_id);

create policy listing_items_read on public.listing_items
  for select using (
    exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_items.listing_id
        and (l.status = 'published' or l.author_id = auth.uid())
    )
  );
create policy listing_items_write on public.listing_items
  for all using (
    exists (select 1 from public.marketplace_listings l
            where l.id = listing_items.listing_id and l.author_id = auth.uid())
  ) with check (
    exists (select 1 from public.marketplace_listings l
            where l.id = listing_items.listing_id and l.author_id = auth.uid())
  );

-- Reviews: readable by anyone who can see the listing; users manage their own.
create policy reviews_read on public.listing_reviews
  for select using (true);
create policy reviews_insert on public.listing_reviews
  for insert with check (auth.uid() = user_id);
create policy reviews_update on public.listing_reviews
  for update using (auth.uid() = user_id);
create policy reviews_delete on public.listing_reviews
  for delete using (auth.uid() = user_id);

-- ── Auto-create a profile row when a user signs up ──────────────────────────
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
