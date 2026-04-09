-- 002_weld_analyses.sql
-- AI weld photo analysis results.

create table weld_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  image_urls text[],
  weld_process text,
  base_material text,
  code_standard text,
  defects_identified jsonb[] default '{}',
  overall_assessment text, -- 'accept' | 'reject' | 'repair' | 'further_inspection_required'
  code_reference text,
  confidence text, -- 'high' | 'medium' | 'low'
  full_response_json jsonb,
  saved boolean default false,
  job_reference text
);

alter table weld_analyses enable row level security;

create policy "Users can read own weld analyses"
  on weld_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert own weld analyses"
  on weld_analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own weld analyses"
  on weld_analyses for update
  using (auth.uid() = user_id);
