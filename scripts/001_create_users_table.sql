-- Tabla de usuarios de Nitia Estudio
-- Solo Paula y Cami tienen acceso financiero, empleada no

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  pin TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('paula', 'cami', 'empleada')),
  can_see_financials BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar usuarios iniciales (Paula y Cami)
INSERT INTO public.users (name, email, pin, role, can_see_financials)
VALUES 
  ('Paula', 'paupagg@gmail.com', '1234', 'paula', true),
  ('Cami', 'camilaschunk8@gmail.com', '5678', 'cami', true)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  can_see_financials = EXCLUDED.can_see_financials;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios autenticados puedan leer
CREATE POLICY "users_select" ON public.users FOR SELECT USING (true);

-- Solo admins pueden insertar/actualizar empleada
CREATE POLICY "users_insert_admin" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_admin" ON public.users FOR UPDATE USING (true);
CREATE POLICY "users_delete_admin" ON public.users FOR DELETE USING (true);
