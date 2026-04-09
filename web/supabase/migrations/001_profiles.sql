-- 001_profiles.sql
-- WeldPal user profiles, RLS, and auto-create trigger.

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  subscription_tier text default 'free', -- 'free' | 'pro'
  welding_processes text[] default '{}',  -- MIG, TIG, Stick, Flux-Core, SAW, etc.
  certifications text[] default '{}',     -- CW, CAWI, CWI, CWS, CRAW, CWEng
  primary_industry text,                  -- structural, pipeline, shipbuilding, manufacturing, maintenance, aerospace
  experience_level text,                  -- apprentice, journeyman, certified, inspector
  display_name text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
