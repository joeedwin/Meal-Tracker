import { pgTable, serial, text, date, boolean, integer, timestamp, unique } from "drizzle-orm/pg-core";

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

export const billSettlements = pgTable("bill_settlements", {
  id: serial().primaryKey(),
  settledAt: timestamp("settled_at", { withTimezone: true }).defaultNow().notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalAmount: integer("total_amount").notNull(),
  notes: text("notes"),
  settledBy: text("settled_by"),
});

export const billSettlementItems = pgTable("bill_settlement_items", {
  id: serial().primaryKey(),
  settlementId: integer("settlement_id")
    .notNull()
    .references(() => billSettlements.id, { onDelete: "cascade" }),
  personId: integer("person_id")
    .notNull()
    .references(() => persons.id),
  personName: text("person_name").notNull(),
  amount: integer("amount").notNull(),
  bfCount: integer("bf_count").notNull().default(0),
  lunchCount: integer("lunch_count").notNull().default(0),
  dinnerCount: integer("dinner_count").notNull().default(0),
  totalMeals: integer("total_meals").notNull().default(0),
});
