-- THE BOM LEARNING LAB / Supabase SQL Editor에서 실행
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null,
 role text not null default 'student' check(role in ('student','admin')),
 created_at timestamptz not null default now()
);
create table if not exists public.books (
 id uuid primary key default gen_random_uuid(),
 title text not null, category text not null default '기타', units integer not null check(units between 1 and 200),
 steps jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now()
);
create table if not exists public.materials (
 book_id uuid not null references public.books(id) on delete cascade,
 unit integer not null check(unit between 1 and 200),
 word_url text, reading_url text, classcard_url text, publisher_url text,
 primary key(book_id,unit)
);
create table if not exists public.assignments (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.profiles(id) on delete cascade,
 book_id uuid not null references public.books(id) on delete cascade,
 start_unit integer not null default 1 check(start_unit between 1 and 200),
 custom_steps jsonb,
 assigned_at timestamptz not null default now(),
 unique(student_id,book_id)
);
create table if not exists public.progress (
 assignment_id uuid not null references public.assignments(id) on delete cascade,
 unit integer not null check(unit between 1 and 200),
 checked jsonb not null default '[]'::jsonb,
 updated_at timestamptz not null default now(),
 primary key(assignment_id,unit)
);
create table if not exists public.approvals (
 assignment_id uuid not null references public.assignments(id) on delete cascade,
 unit integer not null check(unit between 1 and 200),
 approved_by uuid not null references public.profiles(id),
 approved_at timestamptz not null default now(),
 primary key(assignment_id,unit)
);
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.materials enable row level security;
alter table public.assignments enable row level security;
alter table public.progress enable row level security;
alter table public.approvals enable row level security;

create policy "profiles_read" on public.profiles for select to authenticated using(id=(select auth.uid()) or (select public.is_admin()));
create policy "profiles_admin_insert" on public.profiles for insert to authenticated with check((select public.is_admin()));
create policy "profiles_admin_update" on public.profiles for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy "profiles_admin_delete" on public.profiles for delete to authenticated using((select public.is_admin()));

create policy "books_read_assigned" on public.books for select to authenticated using(
 (select public.is_admin()) or exists(select 1 from public.assignments a where a.book_id=books.id and a.student_id=(select auth.uid())));
create policy "books_admin_insert" on public.books for insert to authenticated with check((select public.is_admin()));
create policy "books_admin_update" on public.books for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy "books_admin_delete" on public.books for delete to authenticated using((select public.is_admin()));

create policy "materials_read_assigned" on public.materials for select to authenticated using(
 (select public.is_admin()) or exists(select 1 from public.assignments a where a.book_id=materials.book_id and a.student_id=(select auth.uid())));
create policy "materials_admin_insert" on public.materials for insert to authenticated with check((select public.is_admin()));
create policy "materials_admin_update" on public.materials for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy "materials_admin_delete" on public.materials for delete to authenticated using((select public.is_admin()));

create policy "assignments_read" on public.assignments for select to authenticated using(student_id=(select auth.uid()) or (select public.is_admin()));
create policy "assignments_admin_insert" on public.assignments for insert to authenticated with check((select public.is_admin()));
create policy "assignments_admin_update" on public.assignments for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy "assignments_admin_delete" on public.assignments for delete to authenticated using((select public.is_admin()));

create policy "progress_read" on public.progress for select to authenticated using((select public.is_admin()) or exists(select 1 from public.assignments a where a.id=progress.assignment_id and a.student_id=(select auth.uid())));
create policy "progress_insert" on public.progress for insert to authenticated with check((select public.is_admin()) or exists(select 1 from public.assignments a where a.id=progress.assignment_id and a.student_id=(select auth.uid())));
create policy "progress_update" on public.progress for update to authenticated using((select public.is_admin()) or exists(select 1 from public.assignments a where a.id=progress.assignment_id and a.student_id=(select auth.uid()))) with check((select public.is_admin()) or exists(select 1 from public.assignments a where a.id=progress.assignment_id and a.student_id=(select auth.uid())));
create policy "progress_admin_delete" on public.progress for delete to authenticated using((select public.is_admin()));

create policy "approvals_read" on public.approvals for select to authenticated using((select public.is_admin()) or exists(select 1 from public.assignments a where a.id=approvals.assignment_id and a.student_id=(select auth.uid())));
create policy "approvals_admin_insert" on public.approvals for insert to authenticated with check((select public.is_admin()) and approved_by=(select auth.uid()));
create policy "approvals_admin_update" on public.approvals for update to authenticated using((select public.is_admin())) with check((select public.is_admin()) and approved_by=(select auth.uid()));
create policy "approvals_admin_delete" on public.approvals for delete to authenticated using((select public.is_admin()));
