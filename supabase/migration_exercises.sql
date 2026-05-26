-- ═════════════════════════════════════════════════════════════════════════════
-- CITSA School — Tables exercices / questions / soumissions + RLS
--
-- À exécuter dans le SQL Editor du dashboard Supabase
-- (https://supabase.com/dashboard/project/qaudfykhzhpthwhynewz/sql)
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── 1. Tables (création si absentes) ────────────────────────────────────────

create table if not exists public.exercises (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  exercise_type   text not null check (exercise_type in ('qcm', 'quiz', 'pdf')),
  class_id        uuid not null references public.classes(id) on delete cascade,
  professor_id    uuid not null references public.profiles(id) on delete cascade,
  file_url        text,
  is_published    boolean not null default false,
  due_at          timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists exercises_class_idx     on public.exercises(class_id);
create index if not exists exercises_professor_idx on public.exercises(professor_id);

create table if not exists public.exercise_questions (
  id              uuid primary key default gen_random_uuid(),
  exercise_id     uuid not null references public.exercises(id) on delete cascade,
  question_text   text not null,
  question_order  integer not null,
  question_type   text not null check (question_type in ('single_choice', 'multiple_choice', 'open')),
  options         jsonb,            -- liste de choix possibles pour QCM
  correct_answer  jsonb,            -- nombre ou tableau de nombres (index des bonnes réponses)
  points          numeric(5,2) not null default 1
);

create index if not exists exercise_questions_exercise_idx on public.exercise_questions(exercise_id);

create table if not exists public.exercise_submissions (
  id              uuid primary key default gen_random_uuid(),
  exercise_id     uuid not null references public.exercises(id) on delete cascade,
  student_id      uuid not null references public.profiles(id) on delete cascade,
  answers         jsonb not null,   -- { question_id: answer_value, ... }
  score           numeric(5,2),
  max_score       numeric(5,2),
  is_graded       boolean not null default false,
  submitted_at    timestamptz not null default now(),
  unique (exercise_id, student_id)
);

create index if not exists submissions_exercise_idx on public.exercise_submissions(exercise_id);
create index if not exists submissions_student_idx  on public.exercise_submissions(student_id);

-- ─── 1bis. Migrations en place (si la table existait déjà sans ces colonnes) ──

alter table public.exercises             add column if not exists is_published boolean not null default false;
alter table public.exercises             add column if not exists due_at       timestamptz;
alter table public.exercise_submissions  add column if not exists max_score    numeric(5,2);

-- Si la contrainte unique (exercise_id, student_id) n'existait pas, l'ajouter
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'exercise_submissions_exercise_id_student_id_key'
  ) then
    alter table public.exercise_submissions
      add constraint exercise_submissions_exercise_id_student_id_key
      unique (exercise_id, student_id);
  end if;
end $$;

-- ─── 2. Helper: rôle de l'utilisateur courant (utilise la fonction existante)
-- On suppose que la fonction current_role() existe déjà (créée pour les autres RLS).
-- Sinon, décommentez le bloc ci-dessous :
--
-- create or replace function public.current_role() returns text
--   language sql stable security definer set search_path = public as
-- $$ select role from public.profiles where id = auth.uid() $$;

-- ─── 3. RLS — exercises ──────────────────────────────────────────────────────

alter table public.exercises enable row level security;

drop policy if exists exercises_admin_all     on public.exercises;
drop policy if exists exercises_prof_own      on public.exercises;
drop policy if exists exercises_student_view  on public.exercises;

-- Admins : tout faire
create policy exercises_admin_all on public.exercises
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- Profs : gèrent uniquement les exercices de leurs classes
create policy exercises_prof_own on public.exercises
  for all to authenticated
  using (
    public.current_role() = 'professor'
    and exists (
      select 1 from public.class_members
      where class_id = exercises.class_id
        and user_id  = auth.uid()
        and role     = 'professor'
    )
  )
  with check (
    public.current_role() = 'professor'
    and exists (
      select 1 from public.class_members
      where class_id = exercises.class_id
        and user_id  = auth.uid()
        and role     = 'professor'
    )
  );

-- Étudiants : voient les exercices publiés de leurs classes
create policy exercises_student_view on public.exercises
  for select to authenticated
  using (
    public.current_role() = 'student'
    and is_published = true
    and exists (
      select 1 from public.class_members
      where class_id = exercises.class_id
        and user_id  = auth.uid()
        and role     = 'student'
    )
  );

-- ─── 4. RLS — exercise_questions ─────────────────────────────────────────────

alter table public.exercise_questions enable row level security;

drop policy if exists questions_admin_all      on public.exercise_questions;
drop policy if exists questions_prof_own       on public.exercise_questions;
drop policy if exists questions_student_view   on public.exercise_questions;

create policy questions_admin_all on public.exercise_questions
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy questions_prof_own on public.exercise_questions
  for all to authenticated
  using (
    public.current_role() = 'professor'
    and exists (
      select 1 from public.exercises e
      join public.class_members cm on cm.class_id = e.class_id and cm.user_id = auth.uid() and cm.role = 'professor'
      where e.id = exercise_questions.exercise_id
    )
  )
  with check (
    public.current_role() = 'professor'
    and exists (
      select 1 from public.exercises e
      join public.class_members cm on cm.class_id = e.class_id and cm.user_id = auth.uid() and cm.role = 'professor'
      where e.id = exercise_questions.exercise_id
    )
  );

-- Étudiants : voient les questions des exercices publiés de leurs classes.
-- ATTENTION: la colonne `correct_answer` reste lisible côté SQL. Les API/services
-- doivent omettre ce champ quand ils renvoient les questions à un étudiant.
create policy questions_student_view on public.exercise_questions
  for select to authenticated
  using (
    public.current_role() = 'student'
    and exists (
      select 1 from public.exercises e
      join public.class_members cm on cm.class_id = e.class_id and cm.user_id = auth.uid() and cm.role = 'student'
      where e.id = exercise_questions.exercise_id
        and e.is_published = true
    )
  );

-- ─── 5. RLS — exercise_submissions ───────────────────────────────────────────

alter table public.exercise_submissions enable row level security;

drop policy if exists submissions_admin_all     on public.exercise_submissions;
drop policy if exists submissions_prof_view     on public.exercise_submissions;
drop policy if exists submissions_student_own   on public.exercise_submissions;

create policy submissions_admin_all on public.exercise_submissions
  for all to authenticated
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- Profs : voient + notent les soumissions de leurs exercices
create policy submissions_prof_view on public.exercise_submissions
  for all to authenticated
  using (
    public.current_role() = 'professor'
    and exists (
      select 1 from public.exercises e
      join public.class_members cm on cm.class_id = e.class_id and cm.user_id = auth.uid() and cm.role = 'professor'
      where e.id = exercise_submissions.exercise_id
    )
  )
  with check (
    public.current_role() = 'professor'
    and exists (
      select 1 from public.exercises e
      join public.class_members cm on cm.class_id = e.class_id and cm.user_id = auth.uid() and cm.role = 'professor'
      where e.id = exercise_submissions.exercise_id
    )
  );

-- Étudiants : créent / lisent uniquement leurs propres soumissions
create policy submissions_student_own on public.exercise_submissions
  for all to authenticated
  using (
    public.current_role() = 'student'
    and student_id = auth.uid()
  )
  with check (
    public.current_role() = 'student'
    and student_id = auth.uid()
  );
