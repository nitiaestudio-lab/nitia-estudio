-- Nitia Estudio Database Schema
-- This migration creates all tables needed for the management system

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS quote_comparisons CASCADE;
DROP TABLE IF EXISTS global_movements CASCADE;
DROP TABLE IF EXISTS nitia_fixed_costs CASCADE;
DROP TABLE IF EXISTS personal_finance_movements CASCADE;
DROP TABLE IF EXISTS account_movements CASCADE;
DROP TABLE IF EXISTS task_items CASCADE;
DROP TABLE IF EXISTS project_movements CASCADE;
DROP TABLE IF EXISTS project_stages CASCADE;
DROP TABLE IF EXISTS provider_payments CASCADE;
DROP TABLE IF EXISTS providers CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (for PIN authentication)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('paula', 'cami', 'empleada')),
  pin TEXT NOT NULL,
  can_see_financials BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  address TEXT,
  type TEXT CHECK (type IN ('arquitectura', 'interiorismo', 'ambos')),
  status TEXT CHECK (status IN ('activo', 'pausado', 'finalizado', 'cancelado')) DEFAULT 'activo',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(15, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Project stages
CREATE TABLE project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('pendiente', 'en_progreso', 'completada')) DEFAULT 'pendiente',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Providers table
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  cbu TEXT,
  alias TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Accounts table (bank accounts, cash, etc.)
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('banco', 'efectivo', 'mercadopago', 'otro')) DEFAULT 'banco',
  balance DECIMAL(15, 2) DEFAULT 0,
  owner TEXT CHECK (owner IN ('nitia', 'paula', 'cami')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Project movements (ingresos/egresos de proyectos)
CREATE TABLE project_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type TEXT CHECK (type IN ('ingreso', 'egreso')) NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Provider payments
CREATE TABLE provider_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Task items
CREATE TABLE task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('pendiente', 'en_progreso', 'completada')) DEFAULT 'pendiente',
  priority TEXT CHECK (priority IN ('baja', 'media', 'alta')) DEFAULT 'media',
  due_date DATE,
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Account movements
CREATE TABLE account_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type TEXT CHECK (type IN ('ingreso', 'egreso')) NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Personal finance movements (Paula & Cami)
CREATE TABLE personal_finance_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner TEXT NOT NULL CHECK (owner IN ('paula', 'cami')),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type TEXT CHECK (type IN ('ingreso', 'egreso')) NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Nitia fixed costs
CREATE TABLE nitia_fixed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  category TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Global movements (unified view)
CREATE TABLE global_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  type TEXT CHECK (type IN ('ingreso', 'egreso')) NOT NULL,
  category TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  quote_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quote comparisons
CREATE TABLE quote_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  category TEXT NOT NULL,
  item TEXT NOT NULL,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  provider_name TEXT NOT NULL,
  cost DECIMAL(15, 2) NOT NULL,
  price_x14 DECIMAL(15, 2) NOT NULL,
  price_x16 DECIMAL(15, 2) NOT NULL,
  ganancia_x14 DECIMAL(15, 2) NOT NULL,
  ganancia_x16 DECIMAL(15, 2) NOT NULL,
  selected BOOLEAN DEFAULT false,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Settings table (for app-wide settings like partner count)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES ('partner_count', '2');

-- Insert default users
INSERT INTO users (name, role, pin, can_see_financials) VALUES
  ('Paula', 'paula', '1234', true),
  ('Cami', 'cami', '5678', true),
  ('Empleada', 'empleada', '9999', false);

-- Insert default accounts
INSERT INTO accounts (name, type, balance, owner) VALUES
  ('Caja Chica', 'efectivo', 50000, 'nitia'),
  ('Cuenta Santander', 'banco', 850000, 'nitia'),
  ('Mercado Pago', 'mercadopago', 125000, 'nitia');

-- Create indexes for better query performance
CREATE INDEX idx_project_movements_project ON project_movements(project_id);
CREATE INDEX idx_project_movements_provider ON project_movements(provider_id);
CREATE INDEX idx_provider_payments_provider ON provider_payments(provider_id);
CREATE INDEX idx_task_items_project ON task_items(project_id);
CREATE INDEX idx_account_movements_account ON account_movements(account_id);
CREATE INDEX idx_global_movements_project ON global_movements(project_id);
CREATE INDEX idx_global_movements_provider ON global_movements(provider_id);
CREATE INDEX idx_global_movements_account ON global_movements(account_id);
CREATE INDEX idx_quote_comparisons_provider ON quote_comparisons(provider_id);

-- Enable Row Level Security (but allow all for now since auth is PIN-based)
-- In production, you'd add proper RLS policies based on user roles
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE nitia_fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since app uses PIN auth, not Supabase Auth)
-- These policies allow access using the service role key
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on project_stages" ON project_stages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on providers" ON providers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on accounts" ON accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on project_movements" ON project_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on provider_payments" ON provider_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on task_items" ON task_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on account_movements" ON account_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on personal_finance_movements" ON personal_finance_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on nitia_fixed_costs" ON nitia_fixed_costs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on global_movements" ON global_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on quote_comparisons" ON quote_comparisons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);
