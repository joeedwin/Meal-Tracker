import { pgTable, serial, text, date, boolean, integer, unique } from "drizzle-orm/pg-core";

export const persons = pgTable("persons", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const mealDays = pgTable("meal_days", {
  entryDate: date("entry_date").primaryKey(),
  closed: boolean("closed").notNull().default(false),
});

export const mealEntries = pgTable(
  "meal_entries",
  {
    id: serial().primaryKey(),
    entryDate: date("entry_date").notNull(),
    personId: integer("person_id").notNull().references(() => persons.id),
    mealType: text("meal_type").notNull(),
    attended: boolean().notNull().default(false),
  },
  (table) => [unique().on(table.entryDate, table.personId, table.mealType)],
);
