import type { Config } from "@netlify/functions";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { persons, mealEntries, mealDays } from "../../db/schema.js";

const MEAL_TYPES = ["bf", "lunch", "dinner"] as const;
const MEAL_COST: Record<string, number> = { bf: 70, lunch: 100, dinner: 70 };

// Default attendance when a date has no saved entries yet.
// bf/dinner default on for Ragul, Arun, Joe (Vishakan off by default).
// lunch defaults on for Ragul, Arun only.
function defaultAttended(personName: string, mealType: string): boolean {
  if (mealType === "lunch") return personName === "Ragul" || personName === "Arun";
  return personName === "Ragul" || personName === "Arun" || personName === "Joe";
}

async function getPersons() {
  return db.select().from(persons).orderBy(persons.sortOrder);
}

async function getDay(dateStr: string) {
  const allPersons = await getPersons();
  const [existing, day] = await Promise.all([
    db.select().from(mealEntries).where(eq(mealEntries.entryDate, dateStr)),
    db.select().from(mealDays).where(eq(mealDays.entryDate, dateStr)).limit(1),
  ]);

  const closed = day.length > 0 ? day[0].closed : false;
  const existingMap = new Map(
    existing.map((e) => [`${e.personId}:${e.mealType}`, e.attended]),
  );

  const grid = allPersons.map((p) => ({
    personId: p.id,
    name: p.name,
    meals: Object.fromEntries(
      MEAL_TYPES.map((m) => [
        m,
        existingMap.has(`${p.id}:${m}`)
          ? (existingMap.get(`${p.id}:${m}`) as boolean)
          : defaultAttended(p.name, m),
      ]),
    ),
  }));

  return { date: dateStr, mealCost: MEAL_COST, grid, closed };
}

async function saveDay(dateStr: string, grid: Array<{ personId: number; meals: Record<string, boolean> }>) {
  const day = await db.select().from(mealDays).where(eq(mealDays.entryDate, dateStr)).limit(1);
  if (day.length && day[0].closed) {
    throw new Error("closed");
  }

  for (const row of grid) {
    for (const mealType of MEAL_TYPES) {
      const attended = !!row.meals[mealType];
      await db
        .insert(mealEntries)
        .values({ entryDate: dateStr, personId: row.personId, mealType, attended })
        .onConflictDoUpdate({
          target: [mealEntries.entryDate, mealEntries.personId, mealEntries.mealType],
          set: { attended },
        });
    }
  }
  return getDay(dateStr);
}

async function setDayClosed(dateStr: string, closed: boolean) {
  await db
    .insert(mealDays)
    .values({ entryDate: dateStr, closed })
    .onConflictDoUpdate({
      target: mealDays.entryDate,
      set: { closed },
    });
  return getDay(dateStr);
}

async function getSummary(start: string, end: string) {
  const allPersons = await getPersons();
  const [rows, dayRows] = await Promise.all([
    db.select().from(mealEntries).where(and(gte(mealEntries.entryDate, start), lte(mealEntries.entryDate, end))),
    db.select().from(mealDays).where(and(gte(mealDays.entryDate, start), lte(mealDays.entryDate, end))),
  ]);

  const closedMap = new Map(dayRows.map((d) => [d.entryDate.toISOString().slice(0, 10), d.closed]));
  const totals = new Map<number, number>(allPersons.map((p) => [p.id, 0]));
  const counts = new Map<number, Record<string, number>>(
    allPersons.map((p) => [p.id, { bf: 0, lunch: 0, dinner: 0 }]),
  );
  const unbilled = new Map<number, { bf: number; lunch: number; dinner: number; count: number; amount: number }>(
    allPersons.map((p) => [p.id, { bf: 0, lunch: 0, dinner: 0, count: 0, amount: 0 }]),
  );

  for (const r of rows) {
    if (!r.attended) continue;
    const dateKey = r.entryDate instanceof Date ? r.entryDate.toISOString().slice(0, 10) : String(r.entryDate);
    const isClosed = closedMap.get(dateKey) ?? false;

    totals.set(r.personId, (totals.get(r.personId) ?? 0) + MEAL_COST[r.mealType]);
    const c = counts.get(r.personId);
    if (c) c[r.mealType] = (c[r.mealType] ?? 0) + 1;
    if (!isClosed) {
      const u = unbilled.get(r.personId);
      if (u) {
        u[r.mealType] = (u[r.mealType] ?? 0) + 1;
        u.count += 1;
        u.amount += MEAL_COST[r.mealType];
      }
    }
  }

  return {
    start,
    end,
    mealCost: MEAL_COST,
    people: allPersons.map((p) => ({
      personId: p.id,
      name: p.name,
      total: totals.get(p.id) ?? 0,
      counts: counts.get(p.id),
    })),
    unbilled: allPersons.map((p) => ({
      personId: p.id,
      name: p.name,
      total: unbilled.get(p.id)?.amount ?? 0,
      count: unbilled.get(p.id)?.count ?? 0,
      counts: unbilled.get(p.id),
    })),
    grandTotal: [...totals.values()].reduce((a, b) => a + b, 0),
  };
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    if (req.method === "GET" && action === "day") {
      const date = url.searchParams.get("date");
      if (!date) return Response.json({ error: "date is required" }, { status: 400 });
      return Response.json(await getDay(date));
    }

    if (req.method === "GET" && action === "summary") {
      const start = url.searchParams.get("start");
      const end = url.searchParams.get("end");
      if (!start || !end) return Response.json({ error: "start and end are required" }, { status: 400 });
      return Response.json(await getSummary(start, end));
    }

    if (req.method === "POST" && action === "day") {
      const body = await req.json();
      if (!body.date || !Array.isArray(body.grid)) {
        return Response.json({ error: "date and grid are required" }, { status: 400 });
      }
      try {
        return Response.json(await saveDay(body.date, body.grid));
      } catch (err) {
        if (err instanceof Error && err.message === "closed") {
          return Response.json({ error: "date closed" }, { status: 409 });
        }
        throw err;
      }
    }

    if (req.method === "POST" && action === "close") {
      const body = await req.json();
      if (!body.date || typeof body.closed !== "boolean") {
        return Response.json({ error: "date and closed are required" }, { status: 400 });
      }
      return Response.json(await setDayClosed(body.date, body.closed));
    }

    return Response.json({ error: "not found" }, { status: 404 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/meals",
};
