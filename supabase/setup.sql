-- ============================================================
-- NutriScan Pro: Clean & Robust Database Setup
-- Run this in Supabase -> SQL Editor -> New Query -> Run
-- ============================================================

-- 1. Ensure public.app_role enum exists
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null;
end $$;

-- 2. Clean up any existing trigger on auth.users first
drop trigger if exists on_auth_user_created on auth.users;

-- 3. PROFILES Table (Strictly 1 profile per user)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  age integer,
  gender text,
  height_cm numeric,
  weight_kg numeric,
  activity_level text,
  diet_goal text,
  dietary_preference text default 'veg',
  daily_calorie_target integer default 2000,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_user_id_key unique (user_id)
);
alter table public.profiles enable row level security;
do $$ begin
  create policy "Users can view own profile" on public.profiles for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Users can update own profile" on public.profiles for update using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 4. USER ROLES Table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  constraint user_roles_user_id_key unique (user_id)
);
alter table public.user_roles enable row level security;
do $$ begin
  create policy "Users can view own role" on public.user_roles for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 5. MEALS Table (Only saved when user clicks Save)
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_name text not null,
  description text,
  calories numeric not null,
  protein numeric,
  carbs numeric,
  fat numeric,
  fiber numeric,
  sugar numeric,
  sodium numeric,
  serving_size text,
  meal_type text not null default 'lunch',
  image_url text,
  health_score numeric,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.meals enable row level security;
do $$ begin
  create policy "Users can manage own meals" on public.meals for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 6. MEAL PLANS Table (Only created when AI plan is requested)
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_name text not null,
  description text,
  calories numeric not null,
  protein numeric,
  carbs numeric,
  fat numeric,
  meal_type text not null,
  plan_date date not null,
  is_completed boolean default false,
  created_at timestamptz not null default now()
);
alter table public.meal_plans enable row level security;
do $$ begin
  create policy "Users can manage own meal plans" on public.meal_plans for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 7. WEIGHT LOGS Table
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric not null,
  notes text,
  logged_at timestamptz not null default now()
);
alter table public.weight_logs enable row level security;
do $$ begin
  create policy "Users can manage own weight logs" on public.weight_logs for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 8. USER SETTINGS Table
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email_notifications boolean default true,
  meal_reminders boolean default true,
  hydration_reminders boolean default false,
  calorie_alerts boolean default true,
  reminder_times jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_settings_user_id_key unique (user_id)
);
alter table public.user_settings enable row level security;
do $$ begin
  create policy "Users can manage own settings" on public.user_settings for all using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- 9. SAFE USER CREATION TRIGGER
-- Handles Google OAuth and Email signups without ever failing auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (user_id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  on conflict (user_id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;

  return new;
exception when others then
  -- Even if custom profile logic hits an issue, never abort user creation
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
