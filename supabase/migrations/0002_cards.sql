-- The bingo cards generated for a game, so the director can show a live
-- leaderboard (hits per card) computed from games.state.drawn. Cards never
-- change after a game starts, so no realtime subscription is needed for them.
create table if not exists public.cards (
  game_code text not null references public.games (code) on delete cascade,
  card_id text not null,
  rows jsonb not null,
  created_at timestamptz not null default now(),
  primary key (game_code, card_id)
);

alter table public.cards enable row level security;

create policy "public rw cards" on public.cards
  for all using (true) with check (true);
