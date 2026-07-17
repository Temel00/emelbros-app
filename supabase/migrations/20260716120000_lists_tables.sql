-- Lists module: data model & RLS (M3, #34, docs/modules/lists.md §2/§4).
-- Single `public` schema, `lists_`-prefixed tables (ADR-0006).
--
-- `public.scope` is not created here — it's a platform-wide type
-- (ADR-0007) first created by 20260716080000_darts_tables.sql, and every
-- member-chosen or fixed-scope module table since reuses that one type.

-- === tables ==========================================================
-- Both tables are created before any RLS policy: lists_list's policies
-- reference lists_participant (below), so lists_participant must already
-- exist by the time those policies are created.

-- === lists_list ===================================================
-- One row per list: title, kind (a code-side registry key, free string and
-- forgiving — lists.md §1), and a member-chosen Scope.

create table public.lists_list (
  id uuid primary key default gen_random_uuid(),
  owner_member_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  kind text not null,
  scope public.scope not null default 'private',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === lists_item ====================================================
-- Minimal item: text, checked, manual position (lists.md §3). Item writes
-- ride entirely on parent-list visibility — "see it -> edit its items" — so
-- all four policies share the same visibility check against `lists_list`.

create table public.lists_item (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists_list (id) on delete cascade,
  text text not null,
  checked boolean not null default false,
  position integer not null,
  created_at timestamptz not null default now()
);

create index lists_item_list_id_idx on public.lists_item (list_id, position);

-- === lists_participant =============================================
-- The Participants-scope join table (ADR-0007 pattern). Rows exist only for
-- participants-scope lists; the owner manages them, SELECT follows parent-
-- list visibility (lists.md §2/§4).

create table public.lists_participant (
  list_id uuid not null references public.lists_list (id) on delete cascade,
  member_id uuid not null references auth.users (id) on delete cascade,
  primary key (list_id, member_id)
);

-- === RLS: lists_list =================================================

alter table public.lists_list enable row level security;

-- SELECT: owner, OR family-scope, OR participants-scope with a participant
-- row (ADR-0007 canonical templates; lists.md §2).
create policy "lists_list_select" on public.lists_list
  for select
  using (
    auth.uid() = owner_member_id
    or scope = 'family'
    or (
      scope = 'participants'
      and exists (
        select 1 from public.lists_participant
        where list_id = lists_list.id and member_id = auth.uid()
      )
    )
  );

create policy "lists_list_insert_own" on public.lists_list
  for insert
  with check (auth.uid() = owner_member_id);

-- UPDATE/DELETE: owner only — renames, scope changes, archive, delete are
-- all owner-only operations (lists.md §2).
create policy "lists_list_update_own" on public.lists_list
  for update
  using (auth.uid() = owner_member_id)
  with check (auth.uid() = owner_member_id);

create policy "lists_list_delete_own" on public.lists_list
  for delete
  using (auth.uid() = owner_member_id);

-- === RLS: lists_item ==================================================

alter table public.lists_item enable row level security;

create policy "lists_item_select" on public.lists_item
  for select
  using (
    exists (
      select 1 from public.lists_list
      where id = lists_item.list_id
      and (
        auth.uid() = owner_member_id
        or scope = 'family'
        or (
          scope = 'participants'
          and exists (
            select 1 from public.lists_participant
            where list_id = lists_list.id and member_id = auth.uid()
          )
        )
      )
    )
  );

create policy "lists_item_insert" on public.lists_item
  for insert
  with check (
    exists (
      select 1 from public.lists_list
      where id = lists_item.list_id
      and (
        auth.uid() = owner_member_id
        or scope = 'family'
        or (
          scope = 'participants'
          and exists (
            select 1 from public.lists_participant
            where list_id = lists_list.id and member_id = auth.uid()
          )
        )
      )
    )
  );

create policy "lists_item_update" on public.lists_item
  for update
  using (
    exists (
      select 1 from public.lists_list
      where id = lists_item.list_id
      and (
        auth.uid() = owner_member_id
        or scope = 'family'
        or (
          scope = 'participants'
          and exists (
            select 1 from public.lists_participant
            where list_id = lists_list.id and member_id = auth.uid()
          )
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.lists_list
      where id = lists_item.list_id
      and (
        auth.uid() = owner_member_id
        or scope = 'family'
        or (
          scope = 'participants'
          and exists (
            select 1 from public.lists_participant
            where list_id = lists_list.id and member_id = auth.uid()
          )
        )
      )
    )
  );

create policy "lists_item_delete" on public.lists_item
  for delete
  using (
    exists (
      select 1 from public.lists_list
      where id = lists_item.list_id
      and (
        auth.uid() = owner_member_id
        or scope = 'family'
        or (
          scope = 'participants'
          and exists (
            select 1 from public.lists_participant
            where list_id = lists_list.id and member_id = auth.uid()
          )
        )
      )
    )
  );

-- === RLS: lists_participant ===========================================

alter table public.lists_participant enable row level security;

create policy "lists_participant_select" on public.lists_participant
  for select
  using (
    exists (
      select 1 from public.lists_list
      where id = lists_participant.list_id
      and (
        auth.uid() = owner_member_id
        or scope = 'family'
        or exists (
          select 1 from public.lists_participant as p
          where p.list_id = lists_list.id and p.member_id = auth.uid()
        )
      )
    )
  );

create policy "lists_participant_insert_owner" on public.lists_participant
  for insert
  with check (
    exists (
      select 1 from public.lists_list
      where id = lists_participant.list_id and owner_member_id = auth.uid()
    )
  );

create policy "lists_participant_delete_owner" on public.lists_participant
  for delete
  using (
    exists (
      select 1 from public.lists_list
      where id = lists_participant.list_id and owner_member_id = auth.uid()
    )
  );
