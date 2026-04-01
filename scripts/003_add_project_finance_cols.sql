-- Migration: Add project finance columns and quote comparison type
-- Run via Supabase SQL Editor on project vtjtiiavrpndssqnzdpq

-- Projects: finance config
DO $$ BEGIN
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS margin DECIMAL(5,2) DEFAULT 1.4;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS honorarios_cost DECIMAL(15,2) DEFAULT 0;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS honorarios_client_price DECIMAL(15,2) DEFAULT 0;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_email TEXT;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_phone TEXT;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_contact TEXT;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS iva_cliente_pct DECIMAL(5,2) DEFAULT 21;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS iva_ganancia_pct DECIMAL(5,2) DEFAULT 10.5;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS sena_proveedor_pct DECIMAL(5,2) DEFAULT 60;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS sena_cliente_pct DECIMAL(5,2) DEFAULT 50;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS partner_count INTEGER DEFAULT 2;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Quote comparisons: add type and selected_multiplier
DO $$ BEGIN
  ALTER TABLE quote_comparisons ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'mobiliario' CHECK (type IN ('mano_de_obra','material','mobiliario'));
  ALTER TABLE quote_comparisons ADD COLUMN IF NOT EXISTS selected_multiplier DECIMAL(5,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Project items table (may already exist)
CREATE TABLE IF NOT EXISTS project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mano_de_obra','material','mobiliario')),
  description TEXT NOT NULL,
  cost DECIMAL(15,2) NOT NULL DEFAULT 0,
  client_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.4,
  category TEXT,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  paid BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Project files table (may already exist)
CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'otro',
  description TEXT,
  storage_path TEXT,
  url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories table (may already exist)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Movements: add missing columns
DO $$ BEGIN
  ALTER TABLE movements ADD COLUMN IF NOT EXISTS medio_pago TEXT;
  ALTER TABLE movements ADD COLUMN IF NOT EXISTS concepto TEXT;
  ALTER TABLE movements ADD COLUMN IF NOT EXISTS fixed_cost_id UUID;
  ALTER TABLE movements ADD COLUMN IF NOT EXISTS auto_split BOOLEAN DEFAULT false;
  ALTER TABLE movements ADD COLUMN IF NOT EXISTS split_percentage DECIMAL(5,2);
  ALTER TABLE movements ADD COLUMN IF NOT EXISTS created_by TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Fixed cost payments (may already exist)
CREATE TABLE IF NOT EXISTS fixed_cost_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_cost_id UUID NOT NULL,
  movement_id UUID,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  paid BOOLEAN DEFAULT false,
  paid_date DATE,
  paid_amount DECIMAL(15,2)
);

-- Provider documents (may already exist)
CREATE TABLE IF NOT EXISTS provider_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'otro',
  description TEXT,
  storage_path TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Providers: add missing columns
DO $$ BEGIN
  ALTER TABLE providers ADD COLUMN IF NOT EXISTS subcategory TEXT;
  ALTER TABLE providers ADD COLUMN IF NOT EXISTS zone TEXT;
  ALTER TABLE providers ADD COLUMN IF NOT EXISTS contact TEXT;
  ALTER TABLE providers ADD COLUMN IF NOT EXISTS website TEXT;
  ALTER TABLE providers ADD COLUMN IF NOT EXISTS cbu TEXT;
  ALTER TABLE providers ADD COLUMN IF NOT EXISTS alias TEXT;
  ALTER TABLE providers ADD COLUMN IF NOT EXISTS advance_percent DECIMAL(5,2);
  ALTER TABLE providers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- RLS policies for new tables (allow all, since PIN-based auth)
DO $$ BEGIN
  ALTER TABLE project_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
  ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
  ALTER TABLE fixed_cost_payments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE provider_documents ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY IF NOT EXISTS "Allow all on project_items" ON project_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all on project_files" ON project_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all on fixed_cost_payments" ON fixed_cost_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all on provider_documents" ON provider_documents FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_items_project ON project_items(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_quote_comparisons_project ON quote_comparisons(project_id);
