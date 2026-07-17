-- Darts module: darts_game, darts_participant, darts_turn, darts_dart.
-- Hand-written migration (ADR-0008), single `public` schema, slug-prefixed
-- tables (ADR-0006). Shallow hierarchy: game -> turn -> dart, plus a
-- participant row per player (docs/modules/darts.md §4).

-- === shared platform enum ========================================
-- First module needing Scope Policy enforcement (ADR-0007); scope enum
-- lives here as its first consumer and is reused by every future
-- member-chosen or fixed-scope module table.

create type public.scope as enum ('private', 'participants', 'family');

-- === darts_game ===================================================
-- `starting_participant_id` / `winner_participant_id` reference
-- darts_participant, which in turn references darts_game — the FK to
-- darts_participant is added below (after that table exists) to break the
-- circular dependency at creation time.

create table public.darts_game (
  id uuid primary key default gen_random_uuid(),
  owner_member_id uuid not null references auth.users (id) on delete cascade,
  variant smallint not null,
  starting_participant_id uuid,
  winner_participant_id uuid,
  status text not null default 'in_progress',
  scope public.scope not null default 'family',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint darts_game_variant_check check (variant in (301, 501)),
  constraint darts_game_status_check check (status in ('in_progress', 'completed')),
  -- Fixed Scope Policy (ADR-0004/0007): every game is Family. The column is
  -- kept (rather than omitted, as ADR-0007's general fixed-policy guidance
  -- suggests) per the darts spec (§4/§7), so callers can query/order by it
  -- uniformly with future member-chosen module tables.
  constraint darts_game_scope_check check (scope = 'family'),
  -- Mirrors §4/§6: completed <=> has a winner and a completion time.
  constraint darts_game_completion_check check (
    (status = 'completed' and completed_at is not null and winner_participant_id is not null)
    or (status = 'in_progress' and completed_at is null and winner_participant_id is null)
  )
);

-- === darts_participant =============================================
-- The two players of a game. Exactly one of member_id / guest_name is set
-- (a member gets a career record; a guest is a logged name only, §4).

create table public.darts_participant (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.darts_game (id) on delete cascade,
  member_id uuid references auth.users (id) on delete cascade,
  guest_name text,
  slot smallint not null,
  constraint darts_participant_slot_check check (slot in (1, 2)),
  constraint darts_participant_member_xor_guest_check check (
    (member_id is not null) <> (guest_name is not null)
  ),
  constraint darts_participant_game_slot_unique unique (game_id, slot)
);

create index darts_participant_game_id_idx on public.darts_participant (game_id);
create index darts_participant_member_id_idx on public.darts_participant (member_id);

-- Now that darts_participant exists, wire up the game's forward references.
alter table public.darts_game
  add constraint darts_game_starting_participant_id_fkey
    foreign key (starting_participant_id) references public.darts_participant (id),
  add constraint darts_game_winner_participant_id_fkey
    foreign key (winner_participant_id) references public.darts_participant (id);

-- === darts_turn =====================================================
-- One visit (up to three darts) by one participant.

create table public.darts_turn (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.darts_game (id) on delete cascade,
  participant_id uuid not null references public.darts_participant (id) on delete cascade,
  turn_number integer not null,
  busted boolean not null default false,
  constraint darts_turn_turn_number_check check (turn_number > 0),
  constraint darts_turn_game_turn_number_unique unique (game_id, turn_number)
);

create index darts_turn_game_id_idx on public.darts_turn (game_id);
create index darts_turn_participant_id_idx on public.darts_turn (participant_id);

-- === darts_dart ======================================================
-- One thrown dart, the atomic stored unit (§4). `segment 0` is a miss;
-- 25/50 (bull) always carry `multiple = 1`; `multiple = 3` (treble) only
-- applies to 1-20.

create table public.darts_dart (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null references public.darts_turn (id) on delete cascade,
  dart_number smallint not null,
  segment smallint not null,
  multiple smallint not null,
  constraint darts_dart_dart_number_check check (dart_number between 1 and 3),
  constraint darts_dart_segment_check check (
    segment = 0 or segment between 1 and 20 or segment in (25, 50)
  ),
  constraint darts_dart_multiple_check check (multiple in (1, 2, 3)),
  constraint darts_dart_treble_range_check check (
    multiple <> 3 or segment between 1 and 20
  ),
  constraint darts_dart_bull_miss_multiple_check check (
    segment not in (0, 25, 50) or multiple = 1
  ),
  constraint darts_dart_turn_dart_number_unique unique (turn_id, dart_number)
);

create index darts_dart_turn_id_idx on public.darts_dart (turn_id);

-- === RLS ==============================================================
-- Fixed-scope template (ADR-0004/0007, darts.md §7): darts_game is always
-- Family (any signed-in member reads); write rights follow the tracker
-- (owner) and, for delete, any participant. Child tables ride the game's
-- Family visibility for SELECT and follow the parent game's write/delete
-- right for their own writes.

alter table public.darts_game enable row level security;

create policy "darts_game_select_family" on public.darts_game
  for select
  using (auth.uid() is not null);

create policy "darts_game_insert_owner" on public.darts_game
  for insert
  with check (auth.uid() = owner_member_id);

create policy "darts_game_update_owner" on public.darts_game
  for update
  using (auth.uid() = owner_member_id)
  with check (auth.uid() = owner_member_id);

-- Delete: owner, or any member who is a participant (§6/§7) — the loser of
-- a bogus game can wipe it without hunting down the tracker.
create policy "darts_game_delete_owner_or_participant" on public.darts_game
  for delete
  using (
    auth.uid() = owner_member_id
    or exists (
      select 1
      from public.darts_participant p
      where p.game_id = darts_game.id
        and p.member_id = auth.uid()
    )
  );

alter table public.darts_participant enable row level security;

create policy "darts_participant_select_family" on public.darts_participant
  for select
  using (auth.uid() is not null);

create policy "darts_participant_insert_game_owner" on public.darts_participant
  for insert
  with check (
    exists (
      select 1
      from public.darts_game g
      where g.id = game_id
        and g.owner_member_id = auth.uid()
    )
  );

create policy "darts_participant_update_game_owner" on public.darts_participant
  for update
  using (
    exists (
      select 1
      from public.darts_game g
      where g.id = game_id
        and g.owner_member_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.darts_game g
      where g.id = game_id
        and g.owner_member_id = auth.uid()
    )
  );

create policy "darts_participant_delete_game_owner_or_participant" on public.darts_participant
  for delete
  using (
    exists (
      select 1
      from public.darts_game g
      where g.id = game_id
        and (
          g.owner_member_id = auth.uid()
          or exists (
            select 1
            from public.darts_participant p2
            where p2.game_id = g.id
              and p2.member_id = auth.uid()
          )
        )
    )
  );

alter table public.darts_turn enable row level security;

create policy "darts_turn_select_family" on public.darts_turn
  for select
  using (auth.uid() is not null);

create policy "darts_turn_insert_game_owner" on public.darts_turn
  for insert
  with check (
    exists (
      select 1
      from public.darts_game g
      where g.id = game_id
        and g.owner_member_id = auth.uid()
    )
  );

create policy "darts_turn_update_game_owner" on public.darts_turn
  for update
  using (
    exists (
      select 1
      from public.darts_game g
      where g.id = game_id
        and g.owner_member_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.darts_game g
      where g.id = game_id
        and g.owner_member_id = auth.uid()
    )
  );

create policy "darts_turn_delete_game_owner_or_participant" on public.darts_turn
  for delete
  using (
    exists (
      select 1
      from public.darts_game g
      where g.id = game_id
        and (
          g.owner_member_id = auth.uid()
          or exists (
            select 1
            from public.darts_participant p2
            where p2.game_id = g.id
              and p2.member_id = auth.uid()
          )
        )
    )
  );

alter table public.darts_dart enable row level security;

create policy "darts_dart_select_family" on public.darts_dart
  for select
  using (auth.uid() is not null);

create policy "darts_dart_insert_game_owner" on public.darts_dart
  for insert
  with check (
    exists (
      select 1
      from public.darts_turn t
      join public.darts_game g on g.id = t.game_id
      where t.id = turn_id
        and g.owner_member_id = auth.uid()
    )
  );

create policy "darts_dart_update_game_owner" on public.darts_dart
  for update
  using (
    exists (
      select 1
      from public.darts_turn t
      join public.darts_game g on g.id = t.game_id
      where t.id = turn_id
        and g.owner_member_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.darts_turn t
      join public.darts_game g on g.id = t.game_id
      where t.id = turn_id
        and g.owner_member_id = auth.uid()
    )
  );

create policy "darts_dart_delete_game_owner_or_participant" on public.darts_dart
  for delete
  using (
    exists (
      select 1
      from public.darts_turn t
      join public.darts_game g on g.id = t.game_id
      where t.id = turn_id
        and (
          g.owner_member_id = auth.uid()
          or exists (
            select 1
            from public.darts_participant p2
            where p2.game_id = g.id
              and p2.member_id = auth.uid()
          )
        )
    )
  );
