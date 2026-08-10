# AGENTS.md

## Purpose

A meal-attendance and cost-splitting tracker for a 4-person room (Ragul, Arun, Joe, Vishakan).
Each day, each person is marked present/absent for breakfast, lunch, and dinner. Costs are fixed
per meal (bf ₹70, lunch ₹100, dinner ₹70) and charged per person who attended.

## Architecture

- `public/` — static frontend, no build step. `index.html` + `app.js` (vanilla JS) + `styles.css`.
  - "Day" tab: checkbox grid per meal per person for a selected date, autosaves (debounced) via
    the API on every toggle.
  - "Summary" tab: date-range totals per person plus a room grand total.
- `netlify/functions/meals.ts` — single Netlify Function serving `/api/meals`:
  - `GET ?action=day&date=YYYY-MM-DD` — returns the attendance grid for a date, falling back to
    default attendance for any (person, meal) pair with no saved row yet.
  - `POST ?action=day` — upserts the full grid for a date.
  - `GET ?action=summary&start=YYYY-MM-DD&end=YYYY-MM-DD` — aggregates cost totals over a range.
- `db/schema.ts` — Drizzle schema: `persons` (fixed 4 rows, seeded via migration) and
  `meal_entries` (one row per date/person/meal-type, unique constraint enforces upsert semantics).
- `netlify/database/migrations/` — auto-applied Postgres migrations (schema + seed data). Never
  hand-edit an applied migration; add a new one instead.

## Conventions

- Meal type keys are always `bf`, `lunch`, `dinner` (matching `MEAL_TYPES` in `meals.ts`).
- Default attendance logic lives only in `defaultAttended()` in `meals.ts` — it's a fallback for
  unsaved dates, not stored as a separate "template" table.
- Costs are defined once in `MEAL_COST` in `meals.ts`; the frontend reads costs from the API
  response rather than hardcoding them.
- No auth: the room is small and trusted, so the API is open. Do not add user accounts unless
  asked.

## Local development

`npx netlify dev` emulates the Function and provisions a local/branch database automatically.
