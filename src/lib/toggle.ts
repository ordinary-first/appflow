import type { BatchItem } from "drizzle-orm/batch";
import type { getDb } from "@/db";

type Db = Awaited<ReturnType<typeof getDb>>;

/**
 * Shared toggle pipeline for likes / saves / follows:
 *
 *   intent mutation ──▶ COUNT(*) recount ──▶ fresh count read   (one db.batch)
 *
 * Mutations are intent-based (add = insert().onConflictDoNothing(),
 * remove = delete()), never "read state then flip" — concurrent requests
 * with the same intent stay idempotent instead of racing. D1 has no
 * interactive transactions; db.batch() is the atomicity unit. Items must be
 * drizzle query BUILDERS (insert/update/delete/select) — db.run() results
 * are not batchable.
 *
 * Identity predicates and cache columns differ per route, so callers build
 * the concrete statements — only the skeleton is shared.
 */
export async function runToggleBatch(
  db: Db,
  mutation: BatchItem<"sqlite">,
  recountUpdate: BatchItem<"sqlite">,
  readCount: BatchItem<"sqlite">
): Promise<number> {
  const [, , countRows] = await db.batch([mutation, recountUpdate, readCount] as [
    BatchItem<"sqlite">,
    BatchItem<"sqlite">,
    BatchItem<"sqlite">,
  ]);
  const rows = countRows as { n: number }[];
  return rows[0]?.n ?? 0;
}

/** Escapes LIKE wildcards for user-supplied search input (E1 hardening). */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`);
}
