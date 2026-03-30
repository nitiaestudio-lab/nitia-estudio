-- Nitia Estudio Seed Data
-- Initial data for the management system

-- ======================
-- USERS
-- ======================
insert into public.users (name, role, pin, avatar) values
  ('Paula', 'paula', '1234', null),
  ('Cami', 'cami', '5678', null),
  ('Empleada', 'empleada', '9999', null)
on conflict do nothing;

-- ======================
-- ACCOUNTS
-- ======================
insert into public.accounts (name, type, owner, balance) values
  ('Caja Chica', 'efectivo', 'nitia', 125000),
  ('Santander Nitia', 'banco', 'nitia', 890000),
  ('Mercado Pago Paula', 'digital', 'paula', 45000),
  ('Galicia Cami', 'banco', 'cami', 320000)
on conflict do nothing;

-- ======================
-- PROVIDERS
-- ======================
insert into public.providers (name, category, contact, phone, email, notes) values
  ('Corralon San Martin', 'Materiales', 'Roberto', '11-5555-1234', 'ventas@corralonsm.com', 'Entrega gratis zona norte'),
  ('Ferreteria Industrial', 'Ferreteria', 'Miguel', '11-5555-2345', null, 'Horario extendido sabados'),
  ('Carpinteria Lopez', 'Muebles', 'Carlos Lopez', '11-5555-3456', 'carlos@carpinlopez.com', 'Especialista en roble'),
  ('Muebles Palermo', 'Muebles', 'Ana', '11-5555-4567', 'contacto@mueblespalermo.com', 'Showroom en Palermo'),
  ('Textileria Recoleta', 'Textiles', 'Laura', '11-5555-5678', 'laura@textileria.com', 'Telas importadas'),
  ('Electricidad Total', 'Electricidad', 'Pedro', '11-5555-6789', null, 'Matriculado'),
  ('Sanitarios Express', 'Plomeria', 'Jorge', '11-5555-7890', 'jorge@sanitarios.com', 'Urgencias 24hs')
on conflict do nothing;

-- ======================
-- PROJECTS
-- ======================
insert into public.projects (name, client, address, type, status, start_date, budget) values
  ('Casa Moreno', 'Familia Moreno', 'Av. Libertador 1234, CABA', 'interiorismo', 'en_curso', '2026-01-15', 2500000),
  ('Depto Victoria', 'Juan Victoria', 'Callao 567, Piso 8, CABA', 'interiorismo', 'en_curso', '2026-02-01', 1800000),
  ('Local Comercial Palermo', 'Cafe Aroma', 'Honduras 4500, Palermo', 'ambos', 'pausado', '2025-11-01', 3200000),
  ('Casa Martinez', 'Sra. Martinez', 'Los Aromos 890, Martinez', 'arquitectura', 'completado', '2025-06-01', 4500000)
on conflict do nothing;

-- ======================
-- FIXED COSTS
-- ======================
insert into public.fixed_costs (description, amount, category, active) values
  ('Sueldo empleada', 250000, 'Personal', true),
  ('Adobe Creative Cloud', 28000, 'Software', true),
  ('AutoCAD LT', 45000, 'Software', true),
  ('Dominio nitiaestudio.com', 3500, 'Web', true),
  ('Hosting Vercel', 8000, 'Web', true),
  ('Telefono oficina', 12000, 'Servicios', true)
on conflict do nothing;

-- ======================
-- SETTINGS
-- ======================
insert into public.settings (key, value) values
  ('partner_count', '2'),
  ('default_markup', '{"x14": 1.4, "x16": 1.6}')
on conflict do nothing;
