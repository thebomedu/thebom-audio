-- DRAFT ONLY: review against live Supabase policies before applying.
-- Per-book Unit-specific learning steps; no changes to existing progress or book steps.
create table if not exists public.book_unit_steps (
  book_id uuid not null references public.books(id) on delete restrict,
  unit integer not null check (unit between 1 and 200),
  steps jsonb not null check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) > 0),
  updated_at timestamptz not null default now(),
  primary key (book_id, unit)
);
alter table public.book_unit_steps enable row level security;
-- Existing installation may have teacher access policies beyond schema.sql.
-- SELECT is limited to admins and students with this book assigned;
-- teacher access must be aligned with the live teacher_students RLS before rollout.
create policy "book_unit_steps_read" on public.book_unit_steps
for select to authenticated using (
  (select public.is_admin()) or exists (
    select 1 from public.assignments a
    where a.book_id = book_unit_steps.book_id and a.student_id = (select auth.uid())
  )
);
create policy "book_unit_steps_admin_insert" on public.book_unit_steps
for insert to authenticated with check ((select public.is_admin()));
create policy "book_unit_steps_admin_update" on public.book_unit_steps
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "book_unit_steps_admin_delete" on public.book_unit_steps
for delete to authenticated using ((select public.is_admin()));
-- Before rollout: add teacher SELECT policy matching verified production teacher scope.
-- No migration is executed by committing this file.
