CREATE TABLE IF NOT EXISTS "project_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "entered_at" timestamptz DEFAULT now() NOT NULL,
  "item" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "quantity" numeric(14, 2) DEFAULT 0.00 NOT NULL,
  "unit_price" numeric(14, 2) DEFAULT 0.00 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
