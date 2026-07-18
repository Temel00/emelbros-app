-- Lists: item activity bumps the parent list's updated_at (#36, lists.md §6).
--
-- The "My Lists" widget and the lists home order "most-recently-active first".
-- Without this, `lists_list.updated_at` only moves on owner-only metadata edits
-- (rename / scope / kind, set in the query layer) — so a list the family
-- actively shopped never resurfaces. Item activity IS list activity: adding,
-- checking/unchecking, editing, reordering, or deleting an item touches the
-- parent list.
--
-- security definer + `set search_path = ''`: item writes are open to any member
-- who can see the list (lists.md §2), but `lists_list` UPDATE is owner-only. A
-- non-owner collaborator checking an item must still touch the owner's list
-- row, so this runs as the function owner and bypasses that owner-only RLS for
-- the timestamp bump alone. Mirrors the auth allowlist hook's definer style
-- (20260716063016_auth_allowlist_hook.sql).

create or replace function public.lists_touch_list()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.lists_list
    set updated_at = now()
    where id = coalesce(new.list_id, old.list_id);
  return null;
end;
$$;

create trigger lists_item_touch_list
  after insert or update or delete on public.lists_item
  for each row execute function public.lists_touch_list();
