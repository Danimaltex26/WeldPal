-- 006_cert_prep.sql
-- AWS certification exam prep — question bank + per-user progress tracking.

create table cert_prep_questions (
  id uuid primary key default gen_random_uuid(),
  cert_level text, -- 'CW' | 'CAWI' | 'CWI' | 'CWS' | 'CRAW'
  category text,   -- 'visual_inspection' | 'codes_standards' | 'weld_symbols' | 'metallurgy' | 'processes' | 'safety' | 'ndt'
  question text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_answer text, -- 'A' | 'B' | 'C' | 'D'
  explanation text,
  code_reference text,
  difficulty text, -- 'easy' | 'medium' | 'hard'
  created_at timestamptz default now()
);

alter table cert_prep_questions enable row level security;

create policy "Authenticated users can read cert questions"
  on cert_prep_questions for select
  to authenticated
  using (true);

-- inserts/updates are service-role only

create table cert_prep_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  cert_level text,
  questions_attempted integer default 0,
  questions_correct integer default 0,
  weak_categories text[] default '{}',
  strong_categories text[] default '{}',
  bookmarked_question_ids uuid[] default '{}',
  last_session_at timestamptz,
  created_at timestamptz default now()
);

alter table cert_prep_progress enable row level security;

create policy "Users can read own cert progress"
  on cert_prep_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own cert progress"
  on cert_prep_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cert progress"
  on cert_prep_progress for update
  using (auth.uid() = user_id);
