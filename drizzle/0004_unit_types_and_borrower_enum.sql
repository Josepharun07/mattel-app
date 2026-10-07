CREATE TYPE "public"."asset_borrower_type" AS ENUM('REGISTERED_CLIENT', 'UNREGISTERED');--> statement-breakpoint
ALTER TABLE "asset_rentals" ALTER COLUMN "borrower_type" SET DATA TYPE "public"."asset_borrower_type" USING "borrower_type"::"public"."asset_borrower_type";--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "unit_types" SET DATA TYPE text[] USING ARRAY(SELECT jsonb_array_elements_text("unit_types"));--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "unit_types" SET DEFAULT ARRAY['Loads', 'Bags', 'CFT', 'Tons', 'Hours', 'Days', 'Trips']::text[];