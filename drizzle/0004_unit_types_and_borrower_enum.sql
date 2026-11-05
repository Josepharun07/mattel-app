CREATE TYPE "public"."asset_borrower_type" AS ENUM('REGISTERED_CLIENT', 'UNREGISTERED');--> statement-breakpoint
ALTER TABLE "asset_rentals" ALTER COLUMN "borrower_type" SET DATA TYPE "public"."asset_borrower_type" USING "borrower_type"::"public"."asset_borrower_type";--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."jsonb_to_text_array"(value jsonb) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(array_agg(item), '{}'::text[]) FROM jsonb_array_elements_text(value) AS item;
$$;--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "unit_types" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "unit_types" SET DATA TYPE text[] USING "public"."jsonb_to_text_array"("unit_types");--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "unit_types" SET DEFAULT ARRAY['Loads', 'Bags', 'CFT', 'Tons', 'Hours', 'Days', 'Trips']::text[];--> statement-breakpoint
DROP FUNCTION "public"."jsonb_to_text_array"(jsonb);