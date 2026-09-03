CREATE TABLE IF NOT EXISTS "bill_settlements" (
	"id" serial PRIMARY KEY,
	"settled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_amount" integer NOT NULL,
	"notes" text,
	"settled_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bill_settlement_items" (
	"id" serial PRIMARY KEY,
	"settlement_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"person_name" text NOT NULL,
	"amount" integer NOT NULL,
	"bf_count" integer DEFAULT 0 NOT NULL,
	"lunch_count" integer DEFAULT 0 NOT NULL,
	"dinner_count" integer DEFAULT 0 NOT NULL,
	"total_meals" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "bill_settlement_items" ADD CONSTRAINT "bill_settlement_items_settlement_id_bill_settlements_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "bill_settlements"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "bill_settlement_items" ADD CONSTRAINT "bill_settlement_items_person_id_persons_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
