CREATE TABLE IF NOT EXISTS access_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  pages text[] DEFAULT '{}'::text[] NOT NULL,
  built_in boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

ALTER TABLE staff ADD COLUMN IF NOT EXISTS access_role_id uuid REFERENCES access_roles(id) ON DELETE SET NULL;

INSERT INTO access_roles (name, slug, pages, built_in)
VALUES
  ('Super admin', 'super-admin', ARRAY['dashboard','invoices','projects','clients','inventory','rentals','attendance','payroll','subcontracts','resort','equipment','employees','roles','approvals','recycle','settings.profile','settings.bank','settings.branding','settings.units','settings.defaults','settings.appearance','settings.database'], true),
  ('Admin', 'admin', ARRAY['dashboard','invoices','projects','clients','inventory','rentals','attendance','payroll','subcontracts','resort','equipment','employees','roles','approvals','settings.profile','settings.bank','settings.branding','settings.units','settings.defaults','settings.appearance'], true),
  ('Owner', 'owner', ARRAY['dashboard','invoices','projects','clients','inventory','rentals','attendance','payroll','subcontracts','resort','equipment','employees','roles','approvals','recycle','settings.profile','settings.bank','settings.branding','settings.units','settings.defaults','settings.appearance','settings.database'], true),
  ('Driver', 'driver', ARRAY['dashboard','attendance','equipment'], true),
  ('Construction employee', 'construction', ARRAY['dashboard','attendance','projects','equipment'], true),
  ('Agriculture employee', 'agriculture', ARRAY['dashboard','attendance'], true)
ON CONFLICT (slug) DO NOTHING;

UPDATE staff AS person
SET access_role_id = role.id,
    role = role.name
FROM access_roles AS role
WHERE person.access_role_id IS NULL
  AND role.slug = CASE person.account_role
    WHEN 'OWNER' THEN 'owner'
    WHEN 'SUPER_USER' THEN 'super-admin'
    WHEN 'MANAGER' THEN 'admin'
    WHEN 'DRIVER' THEN 'driver'
    ELSE 'construction'
  END;
