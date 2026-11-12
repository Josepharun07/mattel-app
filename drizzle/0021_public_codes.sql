ALTER TABLE "clients" ADD COLUMN "public_code" text;
ALTER TABLE "projects" ADD COLUMN "public_code" text;
ALTER TABLE "staff" ADD COLUMN "public_code" text;

WITH numbered AS (
  SELECT id,
    (left(coalesce(nullif(upper(substring(regexp_replace(name, '[^A-Za-z]', '', 'g') from 1 for 3)), ''), 'XXX') || 'XXX', 3)) AS stem,
    row_number() OVER (
      PARTITION BY left(coalesce(nullif(upper(substring(regexp_replace(name, '[^A-Za-z]', '', 'g') from 1 for 3)), ''), 'XXX') || 'XXX', 3)
      ORDER BY created_at, id
    ) AS n
  FROM clients
)
UPDATE clients AS row SET public_code = numbered.stem || numbered.n::text FROM numbered WHERE row.id = numbered.id;

WITH numbered AS (
  SELECT id,
    (left(coalesce(nullif(upper(substring(regexp_replace(coalesce(nullif(name, ''), title), '[^A-Za-z]', '', 'g') from 1 for 3)), ''), 'XXX') || 'XXX', 3)) AS stem,
    row_number() OVER (
      PARTITION BY left(coalesce(nullif(upper(substring(regexp_replace(coalesce(nullif(name, ''), title), '[^A-Za-z]', '', 'g') from 1 for 3)), ''), 'XXX') || 'XXX', 3)
      ORDER BY created_at, id
    ) AS n
  FROM projects
)
UPDATE projects AS row SET public_code = numbered.stem || numbered.n::text FROM numbered WHERE row.id = numbered.id;

WITH numbered AS (
  SELECT id,
    (left(coalesce(nullif(upper(substring(regexp_replace(full_name, '[^A-Za-z]', '', 'g') from 1 for 3)), ''), 'XXX') || 'XXX', 3)) AS stem,
    row_number() OVER (
      PARTITION BY left(coalesce(nullif(upper(substring(regexp_replace(full_name, '[^A-Za-z]', '', 'g') from 1 for 3)), ''), 'XXX') || 'XXX', 3)
      ORDER BY created_at, id
    ) AS n
  FROM staff
)
UPDATE staff AS row SET public_code = numbered.stem || numbered.n::text FROM numbered WHERE row.id = numbered.id;

ALTER TABLE "clients" ALTER COLUMN "public_code" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "public_code" SET NOT NULL;
ALTER TABLE "staff" ALTER COLUMN "public_code" SET NOT NULL;
ALTER TABLE "clients" ADD CONSTRAINT "clients_public_code_unique" UNIQUE ("public_code");
ALTER TABLE "projects" ADD CONSTRAINT "projects_public_code_unique" UNIQUE ("public_code");
ALTER TABLE "staff" ADD CONSTRAINT "staff_public_code_unique" UNIQUE ("public_code");
