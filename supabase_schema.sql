-- ============================================
-- PPM·IT — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── ORGANIZATION ───────────────────────────
create table if not exists organization (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'VEJA Project Management',
  logo text,
  created_at timestamptz default now()
);
insert into organization (name) values ('VEJA Project Management') on conflict do nothing;

-- ─── SPACES (Espaces) ───────────────────────
create table if not exists spaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  color text default '#6366f1',
  icon text default '◉',
  active boolean default true,
  created_at timestamptz default now()
);
insert into spaces (name, description, color, icon) values
  ('IT Capacity Planning', 'Gestion de la capacité IT', '#6366f1', '◈'),
  ('Retail', 'Projets ouverture boutiques', '#10b981', '🏪')
on conflict do nothing;

-- ─── USERS ──────────────────────────────────
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  first_name text not null,
  last_name text not null,
  role text not null check (role in ('superadmin', 'admin', 'global', 'member')) default 'member',
  active boolean default true,
  last_login timestamptz,
  created_at timestamptz default now()
);

-- ─── USER SPACES (membership) ───────────────
create table if not exists user_spaces (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  space_id uuid references spaces(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, space_id)
);

-- ─── SESSIONS ───────────────────────────────
create table if not exists sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- ─── APP DATA (per space) ───────────────────
create table if not exists space_data (
  id uuid primary key default uuid_generate_v4(),
  space_id uuid references spaces(id) on delete cascade unique,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- ─── APP SETTINGS ───────────────────────────
create table if not exists app_settings (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  value jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Default app settings
insert into app_settings (key, value) values
  ('general', '{"appName": "VEJA Project Management", "locale": "fr", "colorTheme": "indigo", "logo": null}'),
  ('lists', '{"domains": ["APPLI","INFRA","INNOV","DATA"], "profiles": ["PM","FUNC","DEV","INFRA","DATA","QA","DESIGN"], "statuses": ["1-To arbitrate","2-Validated","3-In progress","4-Frozen","5-Completed","6-Aborted"], "departments": ["DIRECTION","WHOLESALE","WEB","RETAIL","OMNICHANNEL","STUDIO","FINANCE","SUPPLY CHAIN","HR","IT"], "countries": ["FR","BR","DE","DK","ES","PT","SK","UK","US"], "requestTypes": ["IT Project","Digital project","Infrastructure project","Security project","Data project","AI / Automation initiative","Support","Maintenance"], "sponsors": ["Damien LABRY","Grégoire CHEVALIER","Anne-Sophie DROIT","François Ghislain MORILLION","Sebastien KOPP"]}')
on conflict (key) do nothing;

-- ─── INDEXES ────────────────────────────────
create index if not exists idx_sessions_token on sessions(token_hash);
create index if not exists idx_sessions_user on sessions(user_id);
create index if not exists idx_user_spaces_user on user_spaces(user_id);
create index if not exists idx_user_spaces_space on user_spaces(space_id);

-- ─── RLS (Row Level Security) ───────────────
alter table users enable row level security;
alter table spaces enable row level security;
alter table user_spaces enable row level security;
alter table sessions enable row level security;
alter table space_data enable row level security;
alter table app_settings enable row level security;
alter table organization enable row level security;

-- Allow service_role full access (used by our API)
create policy "service_role_all_users" on users for all using (true);
create policy "service_role_all_spaces" on spaces for all using (true);
create policy "service_role_all_user_spaces" on user_spaces for all using (true);
create policy "service_role_all_sessions" on sessions for all using (true);
create policy "service_role_all_space_data" on space_data for all using (true);
create policy "service_role_all_settings" on app_settings for all using (true);
create policy "service_role_all_org" on organization for all using (true);
