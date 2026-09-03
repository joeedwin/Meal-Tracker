import type { Config } from "@netlify/functions";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { persons, mealEntries, mealDays, billSettlements, billSettlementItems } from "../../db/schema.js";

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

  const grid = allPersons.map((p) => {
    const meals = Object.fromEntries(
      MEAL_TYPES.map((m) => [
        m,
        existingMap.has(`${p.id}:${m}`)
          ? (existingMap.get(`${p.id}:${m}`) as boolean)
          : defaultAttended(p.name, m),
      ]),
    );
    let personDayTotal = 0;
    for (const m of MEAL_TYPES) {
      if (meals[m]) personDayTotal += MEAL_COST[m];
    }
    return {
      personId: p.id,
      name: p.name,
      meals,
      personDayTotal,
    };
  });

  const dayTotal = grid.reduce((sum, item) => sum + item.personDayTotal, 0);

  return { date: dateStr, mealCost: MEAL_COST, grid, closed, dayTotal };
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

async function getLastSettlement() {
  try {
    const settlements = await db
      .select()
      .from(billSettlements)
      .orderBy(desc(billSettlements.id))
      .limit(1);

    if (!settlements.length) return null;
    const s = settlements[0];

    const items = await db
      .select()
      .from(billSettlementItems)
      .where(eq(billSettlementItems.settlementId, s.id));

    return {
      id: s.id,
      settledAt: s.settledAt,
      startDate: s.startDate,
      endDate: s.endDate,
      totalAmount: s.totalAmount,
      notes: s.notes,
      settledBy: s.settledBy,
      items: items.map((it) => ({
        personId: it.personId,
        personName: it.personName,
        amount: it.amount,
        bfCount: it.bfCount,
        lunchCount: it.lunchCount,
        dinnerCount: it.dinnerCount,
        totalMeals: it.totalMeals,
      })),
    };
  } catch (err) {
    console.error("getLastSettlement error:", err);
    return null;
  }
}

async function getAllSettlements(limit = 10) {
  try {
    const settlements = await db
      .select()
      .from(billSettlements)
      .orderBy(desc(billSettlements.id))
      .limit(limit);

    const result = [];
    for (const s of settlements) {
      const items = await db
        .select()
        .from(billSettlementItems)
        .where(eq(billSettlementItems.settlementId, s.id));
      result.push({
        ...s,
        items,
      });
    }
    return result;
  } catch (err) {
    console.error("getAllSettlements error:", err);
    return [];
  }
}

async function getSummary(start: string, end: string) {
  const allPersons = await getPersons();
  const [rows, dayRows, lastSettlement] = await Promise.all([
    db.select().from(mealEntries).where(and(gte(mealEntries.entryDate, start), lte(mealEntries.entryDate, end))),
    db.select().from(mealDays).where(and(gte(mealDays.entryDate, start), lte(mealDays.entryDate, end))),
    getLastSettlement(),
  ]);

  const closedMap = new Map(dayRows.map((d) => [String(d.entryDate).slice(0, 10), d.closed]));
  const totals = new Map<number, number>(allPersons.map((p) => [p.id, 0]));
  const counts = new Map<number, Record<string, number>>(
    allPersons.map((p) => [p.id, { bf: 0, lunch: 0, dinner: 0 }]),
  );
  const unbilled = new Map<number, { bf: number; lunch: number; dinner: number; count: number; amount: number }>(
    allPersons.map((p) => [p.id, { bf: 0, lunch: 0, dinner: 0, count: 0, amount: 0 }]),
  );

  let totalMealsCount = 0;
  for (const r of rows) {
    if (!r.attended) continue;
    const dateKey = String(r.entryDate).slice(0, 10);
    const isClosed = closedMap.get(dateKey) ?? false;
    const mType = r.mealType as "bf" | "lunch" | "dinner";

    totalMealsCount++;
    totals.set(r.personId, (totals.get(r.personId) ?? 0) + (MEAL_COST[mType] ?? 0));
    const c = counts.get(r.personId);
    if (c && mType in c) c[mType] = (c[mType] ?? 0) + 1;

    if (!isClosed) {
      const u = unbilled.get(r.personId);
      if (u && mType in u) {
        u[mType] = (u[mType] ?? 0) + 1;
        u.count += 1;
        u.amount += MEAL_COST[mType] ?? 0;
      }
    }
  }

  const grandTotal = [...totals.values()].reduce((a, b) => a + b, 0);
  const unbilledGrandTotal = [...unbilled.values()].reduce((a, b) => a + b.amount, 0);

  const people = allPersons.map((p) => {
    const total = totals.get(p.id) ?? 0;
    const c = counts.get(p.id) || { bf: 0, lunch: 0, dinner: 0 };
    const personMeals = (c.bf || 0) + (c.lunch || 0) + (c.dinner || 0);
    const percentage = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
    return {
      personId: p.id,
      name: p.name,
      total,
      counts: c,
      totalMeals: personMeals,
      percentage,
    };
  });

  return {
    start,
    end,
    mealCost: MEAL_COST,
    people,
    totalMealsCount,
    unbilled: allPersons.map((p) => ({
      personId: p.id,
      name: p.name,
      total: unbilled.get(p.id)?.amount ?? 0,
      count: unbilled.get(p.id)?.count ?? 0,
      counts: unbilled.get(p.id),
    })),
    unbilledGrandTotal,
    grandTotal,
    lastSettlement,
  };
}

async function settleBill(startDate: string, endDate: string, notes?: string, settledBy?: string) {
  const summary = await getSummary(startDate, endDate);
  const totalAmount = summary.grandTotal;

  const [settlement] = await db
    .insert(billSettlements)
    .values({
      startDate,
      endDate,
      totalAmount,
      notes: notes || null,
      settledBy: settledBy || null,
    })
    .returning();

  const itemsToInsert = summary.people.map((p) => ({
    settlementId: settlement.id,
    personId: p.personId,
    personName: p.name,
    amount: p.total,
    bfCount: p.counts.bf || 0,
    lunchCount: p.counts.lunch || 0,
    dinnerCount: p.counts.dinner || 0,
    totalMeals: p.totalMeals || 0,
  }));

  if (itemsToInsert.length > 0) {
    await db.insert(billSettlementItems).values(itemsToInsert);
  }

  // Mark all days in the range as closed in mealDays
  const cur = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  while (cur <= end) {
    const dStr = cur.toISOString().slice(0, 10);
    await db
      .insert(mealDays)
      .values({ entryDate: dStr, closed: true })
      .onConflictDoUpdate({
        target: mealDays.entryDate,
        set: { closed: true },
      });
    cur.setDate(cur.getDate() + 1);
  }

  return {
    settlement: {
      ...settlement,
      items: itemsToInsert,
    },
    summary: await getSummary(startDate, endDate),
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

    if (req.method === "GET" && action === "last_settlement") {
      const last = await getLastSettlement();
      return Response.json({ lastSettlement: last });
    }

    if (req.method === "GET" && action === "settlements") {
      const list = await getAllSettlements();
      return Response.json({ settlements: list });
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

    if (req.method === "POST" && action === "settle") {
      const body = await req.json();
      if (!body.startDate || !body.endDate) {
        return Response.json({ error: "startDate and endDate are required" }, { status: 400 });
      }
      const result = await settleBill(body.startDate, body.endDate, body.notes, body.settledBy);
      return Response.json(result);
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
