-- 0006: drizzle meta catch-up (NO-OP by design).
-- meta/ snapshots were missing for hand-written migrations 0001-0004, which
-- made `db:generate` regenerate all their DDL. This migration adopts the
-- snapshot ONLY — the DDL it originally generated was verified identical to
-- the already-applied 0001-0004 schema and then emptied. Applying this file
-- just records the row in d1_migrations. From here on, db:generate diffs
-- against an accurate snapshot (empty diff when schema.ts is unchanged).
SELECT 1;
