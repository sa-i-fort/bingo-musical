-- Stores each live game: the number/song mapping, what's been drawn, and the
-- currently announced number. One row per game, keyed by its share code.
create table if not exists public.games (
  code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.games enable row level security;

-- ponytail: no auth system for the game (party-game codes act as the
-- "password"); tighten with per-user policies if this stops being a
-- single-host-shares-a-code use case.
create policy "public rw games" on public.games
  for all using (true) with check (true);

-- Required for the spectator view to receive live updates.
alter publication supabase_realtime add table public.games;
