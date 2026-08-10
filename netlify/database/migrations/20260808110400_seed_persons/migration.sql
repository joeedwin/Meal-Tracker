INSERT INTO "persons" ("name", "sort_order") VALUES
  ('Ragul', 1),
  ('Arun', 2),
  ('Joe', 3),
  ('Vishakan', 4)
ON CONFLICT ("name") DO NOTHING;
