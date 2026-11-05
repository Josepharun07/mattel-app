CREATE TABLE IF NOT EXISTS "project_clients" (
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  CONSTRAINT "project_clients_pk" PRIMARY KEY ("project_id", "client_id")
);

INSERT INTO "project_clients" ("project_id", "client_id")
SELECT "id", "client_id" FROM "projects"
ON CONFLICT DO NOTHING;
