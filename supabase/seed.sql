-- Official marketplace listings for local development, authored by a "gamify team"
-- user that cannot sign in. Safe to run more than once.

insert into auth.users (id, email, aud, role)
values ('00000000-0000-4000-8000-000000000001', 'team@gamify.local', 'authenticated', 'authenticated')
on conflict (id) do nothing;

update public.profiles
set handle = 'gamify', display_name = 'gamify team'
where id = '00000000-0000-4000-8000-000000000001';

insert into public.marketplace_listings (id, author_id, kind, title, summary, category, is_official)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'course',
   'Couch to 5k', 'Walk-run intervals that build up to a steady 5k in eight weeks.', 'fitness', true),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'habit',
   'Calm mornings', 'Three small moves that start the day on purpose.', 'mindfulness', true),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 'habit',
   'Read every day', 'Ten pages a day adds up to a book a month.', 'reading', true)
on conflict (id) do nothing;

insert into public.listing_versions (listing_id, version, content)
values
  ('00000000-0000-4000-8000-000000000101', 1, '{
    "kind": "course", "title": "Couch to 5k", "category": "fitness", "level": "beginner",
    "summary": "Walk-run intervals that build up to a steady 5k in eight weeks.",
    "units": [
      {"title": "Find your feet", "summary": "Short intervals and easy walking.", "steps": [
        {"title": "Gear check", "summary": "Shoes, route and a watch.", "minutes": 5, "exercises": [
          {"kind": "check", "prompt": "Pick a flat 20-minute route and lay out your shoes."},
          {"kind": "quiz", "prompt": "How fast should an easy run feel?", "options": ["You can hold a conversation", "You are out of breath", "As fast as you can go"], "answer": 0}
        ]},
        {"title": "First intervals", "summary": "Run 1 minute, walk 90 seconds, eight times.", "minutes": 25, "exercises": [
          {"kind": "timer", "prompt": "Warm up with a brisk walk.", "minutes": 5},
          {"kind": "check", "prompt": "Finish eight rounds of run 1 min, walk 90 s."}
        ]},
        {"title": "Repeat and recover", "summary": "Same session, a little smoother.", "minutes": 25, "exercises": [
          {"kind": "check", "prompt": "Repeat the eight intervals and stretch your calves after."}
        ]}
      ]},
      {"title": "Build the base", "summary": "Longer runs, shorter walks.", "steps": [
        {"title": "Three-minute runs", "summary": "Run 3 minutes, walk 90 seconds, five times.", "minutes": 30, "exercises": [
          {"kind": "check", "prompt": "Finish five rounds of run 3 min, walk 90 s."}
        ]},
        {"title": "Twenty minutes non-stop", "summary": "Your first continuous run.", "minutes": 30, "exercises": [
          {"kind": "timer", "prompt": "Run easy for 20 minutes without stopping.", "minutes": 20}
        ]},
        {"title": "Race day", "summary": "Run the full 5k at an easy pace.", "minutes": 40, "exercises": [
          {"kind": "check", "prompt": "Run 5 km. Walk breaks are allowed."}
        ]}
      ]}
    ]
  }'),
  ('00000000-0000-4000-8000-000000000102', 1, '{
    "kind": "habit", "title": "Calm mornings", "category": "mindfulness", "level": "beginner",
    "summary": "Three small moves that start the day on purpose.",
    "units": [
      {"title": "Every morning", "summary": "", "steps": [
        {"title": "Glass of water", "summary": "Before coffee or your phone.", "minutes": 1, "exercises": [
          {"kind": "check", "prompt": "Drink a full glass of water."}
        ]},
        {"title": "Breathe", "summary": "Slow breaths, eyes closed.", "minutes": 5, "exercises": [
          {"kind": "timer", "prompt": "Breathe in for 4, out for 6.", "minutes": 5}
        ]},
        {"title": "One intention", "summary": "What would make today good?", "minutes": 2, "exercises": [
          {"kind": "check", "prompt": "Write down one thing you will do today."}
        ]}
      ]}
    ]
  }'),
  ('00000000-0000-4000-8000-000000000103', 1, '{
    "kind": "habit", "title": "Read every day", "category": "reading", "level": "beginner",
    "summary": "Ten pages a day adds up to a book a month.",
    "units": [
      {"title": "Every day", "summary": "", "steps": [
        {"title": "Ten pages", "summary": "Any book counts.", "minutes": 15, "exercises": [
          {"kind": "timer", "prompt": "Read until the timer ends or you hit ten pages.", "minutes": 15}
        ]},
        {"title": "One line to remember", "summary": "Keep what stuck.", "minutes": 2, "exercises": [
          {"kind": "check", "prompt": "Note one sentence or idea from today''s pages."}
        ]}
      ]}
    ]
  }')
on conflict (listing_id, version) do nothing;
