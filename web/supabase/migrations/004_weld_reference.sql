-- 004_weld_reference.sql
-- Self-growing reference DB: filler metals, WPS, code requirements, defects.

create table weld_reference (
  id uuid primary key default gen_random_uuid(),
  category text, -- 'filler_metal' | 'wps' | 'preheat' | 'defect_guide' | 'code_requirement' | 'weld_symbol' | 'safety'
  title text,
  process text, -- MIG, TIG, Stick, FCAW, SAW
  base_material text,
  specification text, -- AWS D1.1, API 1104, ASME IX, AWS D1.2
  content_json jsonb,
  source text default 'verified', -- 'verified' | 'ai_generated'
  query_count integer default 1,
  created_at timestamptz default now()
);

alter table weld_reference enable row level security;

-- All authenticated users can read
create policy "Authenticated users can read weld reference"
  on weld_reference for select
  to authenticated
  using (true);

-- Inserts/updates are service-role only (no policy needed; service role bypasses RLS)
