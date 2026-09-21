-- Fix RLS infinite recursion (Postgres 42P17) on the Participants-scope join
-- tables in the Lists (#34) and Habits (#37) modules.
--
-- Symptom: every read of lists_list / lists_item / lists_participant and
-- habits_trackable / habits_log / habits_participant failed in production with
--   "infinite recursion detected in policy for relation \"lists_participant\""
--   "infinite recursion detected in policy for relation \"habits_participant\""
--
-- Root cause: the participant-membership check was written as an inline
-- `exists (select 1 from <module>_participant ...)` *inside* the RLS policies of
-- the participant table itself (and of the parent table it points back at). A
-- subquery against a table re-applies that table's RLS, so the participant
-- policy evaluated the participant policy, which evaluated it again — an
-- unbounded loop. lists_participant_select even self-referenced
-- `from public.lists_participant as p`.
--
-- Fix (canonical Supabase pattern): move the membership test into a
-- SECURITY DEFINER function. A definer function runs as its owner and does NOT
-- re-trigger the caller's RLS, so the recursion is broken. The surrounding
-- owner / family / scope logic is preserved verbatim; only the recursive
-- `exists(... from *_participant ...)` sub-selects are swapped for the function
-- call. Read semantics are unchanged. `set search_path = ''` matches the
-- definer style already used by lists_touch_list / set_updated_at, and forces
-- the fully-qualified table names below.

-- ===================================================================
-- Lists
-- ===================================================================

create or replace function public.lists_is_participant(p_list_id uuid, p_member_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.lists_participant
    where list_id = p_list_id and member_id = p_member_id
  );
$$;

-- lists_list: SELECT (owner / family / participant)
drop policy if exists "lists_list_select" on public.lists_list;
create policy "lists_list_select" on public.lists_list
  for select
  using (
    auth.uid() = owner_member_id
    or scope = 'family'
    or (
      scope = 'participants'
      and public.lists_is_participant(lists_list.id, auth.uid())
    )
  );

-- lists_item: all four policies ride the same parent-list visibility check.
drop policy if exists "lists_item_select" on public.lists_item;
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
          and public.lists_is_participant(lists_list.id, auth.uid())
        )
      )
    )
  );

drop policy if exists "lists_item_insert" on public.lists_item;
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
          and public.lists_is_participant(lists_list.id, auth.uid())
        )
      )
    )
  );

drop policy if exists "lists_item_update" on public.lists_item;
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
          and public.lists_is_participant(lists_list.id, auth.uid())
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
          and public.lists_is_participant(lists_list.id, auth.uid())
        )
      )
    )
  );

drop policy if exists "lists_item_delete" on public.lists_item;
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
          and public.lists_is_participant(lists_list.id, auth.uid())
        )
      )
    )
  );

-- lists_participant: SELECT follows parent-list visibility. The previous
-- version self-referenced lists_participant (the recursion); the membership
-- leg now goes through the definer function.
drop policy if exists "lists_participant_select" on public.lists_participant;
create policy "lists_participant_select" on public.lists_participant
  for select
  using (
    exists (
      select 1 from public.lists_list
      where id = lists_participant.list_id
      and (
        auth.uid() = owner_member_id
        or scope = 'family'
        or public.lists_is_participant(lists_list.id, auth.uid())
      )
    )
  );

-- ===================================================================
-- Habits
-- ===================================================================

create or replace function public.habits_is_participant(p_trackable_id uuid, p_member_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.habits_participant
    where trackable_id = p_trackable_id and member_id = p_member_id
  );
$$;

-- habits_trackable: SELECT (owner / family / participant)
drop policy if exists "habits_trackable_select_visible" on public.habits_trackable;
create policy "habits_trackable_select_visible" on public.habits_trackable
  for select
  using (
    owner_member_id = auth.uid()
    or scope = 'family'
    or (
      scope = 'participants'
      and public.habits_is_participant(habits_trackable.id, auth.uid())
    )
  );

-- habits_log: SELECT rides parent-trackable visibility (writes stay owner-only
-- and never referenced the participant table, so they are untouched).
drop policy if exists "habits_log_select_visible" on public.habits_log;
create policy "habits_log_select_visible" on public.habits_log
  for select
  using (
    exists (
      select 1 from public.habits_trackable t
      where t.id = habits_log.trackable_id
        and (
          t.owner_member_id = auth.uid()
          or t.scope = 'family'
          or (
            t.scope = 'participants'
            and public.habits_is_participant(t.id, auth.uid())
          )
        )
    )
  );

-- habits_participant: SELECT follows parent-trackable visibility. Previous
-- version self-referenced habits_participant (the recursion).
drop policy if exists "habits_participant_select_visible" on public.habits_participant;
create policy "habits_participant_select_visible" on public.habits_participant
  for select
  using (
    exists (
      select 1 from public.habits_trackable t
      where t.id = habits_participant.trackable_id
        and (
          t.owner_member_id = auth.uid()
          or t.scope = 'family'
          or (
            t.scope = 'participants'
            and public.habits_is_participant(t.id, auth.uid())
          )
        )
    )
  );
