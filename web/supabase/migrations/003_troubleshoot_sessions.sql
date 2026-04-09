-- 003_troubleshoot_sessions.sql
-- Welder troubleshooting sessions with conversation history.

create table troubleshoot_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  weld_process text,
  base_material text,
  filler_metal text,
  position text, -- 1F, 2F, 3F, 4F, 1G, 2G, 3G, 4G, 5G, 6G
  symptom text,
  environment text,
  already_tried text[] default '{}',
  current_parameters text,
  conversation_json jsonb[] default '{}',
  resolved boolean default false
);

alter table troubleshoot_sessions enable row level security;

create policy "Users can read own troubleshoot sessions"
  on troubleshoot_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own troubleshoot sessions"
  on troubleshoot_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own troubleshoot sessions"
  on troubleshoot_sessions for update
  using (auth.uid() = user_id);
