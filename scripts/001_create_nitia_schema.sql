-- Nitia Estudio Database Schema
-- This script creates all tables needed for the Nitia management system

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ======================
-- USERS / PROFILES TABLE
-- ======================
-- We use simple PIN-based auth, not Supabase Auth
-- This stores the team members (Paula, Cami, Empleada)
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text not null check (role in ('paula', 'cami', 'empleada')),
  pin text not null,
  avatar text,
  created_at timestamptz default now()
);

-- ======================
-- ACCOUNTS TABLE
-- ======================
create table if not exists public.accounts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('banco', 'efectivo', 'digital')),
  owner text check (owner in ('nitia', 'paula', 'cami')),
  balance numeric default 0,
  created_at timestamptz default now()
);

-- ======================
-- PROVIDERS TABLE
-- ======================
create table if not exists public.providers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,
  contact text,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now()
);

-- ======================
-- PROJECTS TABLE
-- ======================
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  client text not null,
  address text,
  type text check (type in ('arquitectura', 'interiorismo', 'ambos')),
  status text default 'en_curso' check (status in ('en_curso', 'pausado', 'completado', 'cancelado')),
  start_date date,
  end_date date,
  budget numeric default 0,
  notes text,
  created_at timestamptz default now()
);

-- ======================
-- PROJECT STAGES TABLE
-- ======================
create table if not exists public.project_stages (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  status text default 'pendiente' check (status in ('pendiente', 'en_curso', 'completado')),
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ======================
-- MOVEMENTS TABLE (Global - links everything)
-- ======================
create table if not exists public.movements (
  id uuid primary key default uuid_generate_v4(),
  date date not null default current_date,
  description text not null,
  amount numeric not null,
  type text not null check (type in ('ingreso', 'egreso')),
  category text,
  project_id uuid references public.projects(id) on delete set null,
  provider_id uuid references public.providers(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz default now()
);

-- ======================
-- TASKS TABLE
-- ======================
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  project_id uuid references public.projects(id) on delete cascade,
  assigned_to uuid references public.users(id) on delete set null,
  status text default 'pendiente' check (status in ('pendiente', 'en_curso', 'completado')),
  priority text default 'media' check (priority in ('baja', 'media', 'alta', 'urgente')),
  due_date date,
  created_at timestamptz default now()
);

-- ======================
-- QUOTE COMPARISONS TABLE
-- ======================
create table if not exists public.quote_comparisons (
  id uuid primary key default uuid_generate_v4(),
  date date not null default current_date,
  category text not null,
  item text not null,
  provider_id uuid references public.providers(id) on delete set null,
  cost numeric not null,
  price_x14 numeric generated always as (cost * 1.4) stored,
  price_x16 numeric generated always as (cost * 1.6) stored,
  ganancia_x14 numeric generated always as (cost * 0.4) stored,
  ganancia_x16 numeric generated always as (cost * 0.6) stored,
  selected boolean default false,
  created_at timestamptz default now()
);

-- ======================
-- FIXED COSTS TABLE (Nitia monthly expenses)
-- ======================
create table if not exists public.fixed_costs (
  id uuid primary key default uuid_generate_v4(),
  description text not null,
  amount numeric not null,
  category text,
  active boolean default true,
  created_at timestamptz default now()
);

-- ======================
-- PERSONAL FINANCE ITEMS (Paula/Cami individual tracking)
-- ======================
create table if not exists public.personal_finance (
  id uuid primary key default uuid_generate_v4(),
  owner text not null check (owner in ('paula', 'cami')),
  description text not null,
  amount numeric not null,
  type text not null check (type in ('ingreso', 'egreso')),
  category text,
  date date default current_date,
  created_at timestamptz default now()
);

-- ======================
-- SETTINGS TABLE
-- ======================
create table if not exists public.settings (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  value jsonb,
  created_at timestamptz default now()
);

-- ======================
-- ROW LEVEL SECURITY
-- ======================
-- For this app we use simple PIN auth, not Supabase Auth
-- So we enable RLS but allow all operations (security is handled at app level)

alter table public.users enable row level security;
alter table public.accounts enable row level security;
alter table public.providers enable row level security;
alter table public.projects enable row level security;
alter table public.project_stages enable row level security;
alter table public.movements enable row level security;
alter table public.tasks enable row level security;
alter table public.quote_comparisons enable row level security;
alter table public.fixed_costs enable row level security;
alter table public.personal_finance enable row level security;
alter table public.settings enable row level security;

-- Create policies that allow all operations (anon key access)
-- In production you might want stricter policies

create policy "Allow all on users" on public.users for all using (true) with check (true);
create policy "Allow all on accounts" on public.accounts for all using (true) with check (true);
create policy "Allow all on providers" on public.providers for all using (true) with check (true);
create policy "Allow all on projects" on public.projects for all using (true) with check (true);
create policy "Allow all on project_stages" on public.project_stages for all using (true) with check (true);
create policy "Allow all on movements" on public.movements for all using (true) with check (true);
create policy "Allow all on tasks" on public.tasks for all using (true) with check (true);
create policy "Allow all on quote_comparisons" on public.quote_comparisons for all using (true) with check (true);
create policy "Allow all on fixed_costs" on public.fixed_costs for all using (true) with check (true);
create policy "Allow all on personal_finance" on public.personal_finance for all using (true) with check (true);
create policy "Allow all on settings" on public.settings for all using (true) with check (true);
