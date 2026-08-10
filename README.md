# Room Meal Tracker

A simple, mobile-friendly meal tracker for a shared room of four: Ragul, Arun, Joe, and Vishakan.
It tracks who eats breakfast, lunch, and dinner each day and automatically totals the cost
per person, so the group can split the mess bill fairly without a spreadsheet.

## Pricing

- Breakfast: ₹70 per person
- Lunch: ₹100 per person
- Dinner: ₹70 per person

## Default attendance

Each new day starts pre-filled with the usual pattern (still editable per day):

- Breakfast & dinner: Ragul, Arun, Joe (Vishakan off by default)
- Lunch: Ragul, Arun only

## Tech stack

- Static HTML/CSS/JS frontend (`public/`)
- Netlify Function API (`netlify/functions/meals.ts`)
- Netlify Database (managed Postgres) via Drizzle ORM (`db/`)

Because attendance is stored in a shared database, everyone opening the site (on any phone or
laptop) sees and edits the same live data — there's nothing to manually sync.

## Running locally

```bash
npm install
npx netlify dev
```

This starts the site with local emulation of the Netlify Function and database.

## Deploying

Push to the connected Netlify site. Database migrations in `netlify/database/migrations/`
are applied automatically before each deploy.
