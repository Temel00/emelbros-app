-- Habits module data model (#37): habits_trackable, habits_log,
-- habits_participant, and the shared `scope` enum (ADR-0007) — first
-- consumer, so it's created here rather than as a habits-local type.
-- RLS per docs/modules/habits.md §2 and the member-chosen templates
-- (ADR-0007), with the key departure from lists: log writes are
-- owner-only regardless of who can see the trackable.

-- === shared scope enum ===========================================
-- Platform-wide (ADR-0007), not habits-prefixed: every member-chosen
-- Scope Policy table across modules reuses this one type.

create type public.scope as enum ('private', 'participants', 'family');

-- === updated_at helper ============================================
-- First table in the schema that needs an updated_at column; a small
-- shared trigger function rather than per-table plpgsql.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- === habits_trackable ==============================================
-- One generic trackable per habit/metric (docs/modules/habits.md §1, §5).
-- Member-chosen Scope, defaulting to Private (health data is private by
-- default). Cadence lives in plain columns, null for unscheduled kinds.

create table public.habits_trackable (
  id uuid primary key default gen_random_uuid(),
  owner_member_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  kind text not null,
  scope public.scope not null default 'private',
  cadence_type text check (cadence_type in ('daily', 'weekly', 'weekdays')),
  cadence_target integer,
  cadence_weekdays smallint[],
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger habits_trackable_set_updated_at
  before update on public.habits_trackable
  for each row execute function public.set_updated_at();

alter table public.habits_trackable enable row level security;

-- SELECT: owner, or Family scope, or a participant on a Participants-scope
-- trackable. Private is owner-only, covered by the owner clause.
create policy "habits_trackable_select_visible" on public.habits_trackable
  for select
  using (
    owner_member_id = auth.uid()
    or scope = 'family'
    or (
      scope = 'participants'
      and exists (
        select 1 from public.habits_participant p
        where p.trackable_id = habits_trackable.id
          and p.member_id = auth.uid()
      )
    )
  );

-- INSERT / UPDATE / DELETE: owner only (create, rename, cadence/scope
-- changes, participant management, archive, delete all route through
-- this one table's row).
create policy "habits_trackable_insert_own" on public.habits_trackable
  for insert
  with check (owner_member_id = auth.uid());

create policy "habits_trackable_update_own" on public.habits_trackable
  for update
  using (owner_member_id = auth.uid())
  with check (owner_member_id = auth.uid());

create policy "habits_trackable_delete_own" on public.habits_trackable
  for delete
  using (owner_member_id = auth.uid());

-- === habits_log =====================================================
-- One dated entry per trackable per day (docs/modules/habits.md §4, §5).

create table public.habits_log (
  id uuid primary key default gen_random_uuid(),
  trackable_id uuid not null references public.habits_trackable (id) on delete cascade,
  log_date date not null,
  done boolean not null default false,
  value numeric,
  note text,
  created_at timestamptz not null default now(),
  unique (trackable_id, log_date)
);

alter table public.habits_log enable row level security;

-- SELECT rides parent visibility, so a viewer sees the streak.
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
            and exists (
              select 1 from public.habits_participant p
              where p.trackable_id = t.id
                and p.member_id = auth.uid()
            )
          )
        )
    )
  );

-- INSERT / UPDATE / DELETE: owner of the parent trackable only — the key
-- departure from lists_item, whose writes ride entirely on visibility.
create policy "habits_log_insert_owner" on public.habits_log
  for insert
  with check (
    exists (
      select 1 from public.habits_trackable t
      where t.id = habits_log.trackable_id
        and t.owner_member_id = auth.uid()
    )
  );

create policy "habits_log_update_owner" on public.habits_log
  for update
  using (
    exists (
      select 1 from public.habits_trackable t
      where t.id = habits_log.trackable_id
        and t.owner_member_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.habits_trackable t
      where t.id = habits_log.trackable_id
        and t.owner_member_id = auth.uid()
    )
  );

create policy "habits_log_delete_owner" on public.habits_log
  for delete
  using (
    exists (
      select 1 from public.habits_trackable t
      where t.id = habits_log.trackable_id
        and t.owner_member_id = auth.uid()
    )
  );

-- === habits_participant =============================================
-- The Participants-scope join table (ADR-0007 pattern). Rows exist only
-- for participants-scope trackables; a participant is a viewer, not a
-- co-logger (docs/modules/habits.md §2).

create table public.habits_participant (
  trackable_id uuid not null references public.habits_trackable (id) on delete cascade,
  member_id uuid not null references auth.users (id) on delete cascade,
  primary key (trackable_id, member_id)
);

alter table public.habits_participant enable row level security;

-- SELECT follows parent-trackable visibility.
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
            and exists (
              select 1 from public.habits_participant p
              where p.trackable_id = t.id
                and p.member_id = auth.uid()
            )
          )
        )
    )
  );

-- INSERT / UPDATE / DELETE: managed by the owner of the referenced trackable.
create policy "habits_participant_insert_owner" on public.habits_participant
  for insert
  with check (
    exists (
      select 1 from public.habits_trackable t
      where t.id = habits_participant.trackable_id
        and t.owner_member_id = auth.uid()
    )
  );

create policy "habits_participant_update_owner" on public.habits_participant
  for update
  using (
    exists (
      select 1 from public.habits_trackable t
      where t.id = habits_participant.trackable_id
        and t.owner_member_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.habits_trackable t
      where t.id = habits_participant.trackable_id
        and t.owner_member_id = auth.uid()
    )
  );

create policy "habits_participant_delete_owner" on public.habits_participant
  for delete
  using (
    exists (
      select 1 from public.habits_trackable t
      where t.id = habits_participant.trackable_id
        and t.owner_member_id = auth.uid()
    )
  );
