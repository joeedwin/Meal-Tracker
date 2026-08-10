CREATE TABLE "meal_entries" (
	"id" serial PRIMARY KEY,
	"entry_date" date NOT NULL,
	"person_id" integer NOT NULL,
	"meal_type" text NOT NULL,
	"attended" boolean DEFAULT false NOT NULL,
	CONSTRAINT "meal_entries_entry_date_person_id_meal_type_unique" UNIQUE("entry_date","person_id","meal_type")
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_person_id_persons_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id");