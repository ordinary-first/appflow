import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";

/**
 * Merges anonymous activity into the logged-in account.
 * Ownership proof: the anonymousId comes from the caller's own cookie/localStorage —
 * only rows that are still unclaimed (user_id IS NULL) are adopted.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  let body: { anonymousId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const anonymousId = body.anonymousId;
  if (!anonymousId) {
    return NextResponse.json({ error: "anonymousId required" }, { status: 400 });
  }

  const db = await getDb();
  await db
    .update(schema.interactions)
    .set({ userId: user.id })
    .where(
      and(
        eq(schema.interactions.anonymousId, anonymousId),
        isNull(schema.interactions.userId)
      )
    );
  await db
    .update(schema.feedback)
    .set({ userId: user.id })
    .where(
      and(
        eq(schema.feedback.anonymousId, anonymousId),
        isNull(schema.feedback.userId)
      )
    );

  return NextResponse.json({ ok: true });
}
