import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { resolveAnonIdentity, withAnonCookie } from "@/lib/anon-server";

/**
 * Merges anonymous activity into the logged-in account.
 * Ownership proof: the anonymousId is read from the caller's own HMAC-signed
 * cookie — never from the body, so a logged-in attacker can't claim another
 * visitor's anonymous activity by guessing/observing their id.
 * Only rows that are still unclaimed (user_id IS NULL) are adopted.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  const anon = await resolveAnonIdentity(req);
  if (anon.setCookie) {
    // No valid signed cookie → nothing trustworthy to merge. Issue the fresh
    // identity and report a no-op (legacy unsigned ids are deliberately not
    // honored — they were client-mintable).
    return withAnonCookie(NextResponse.json({ ok: true, merged: false }), anon);
  }
  const anonymousId = anon.anonId;

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

  // saves: adopt anon saves. The partial unique index (user_id, app_id) would
  // reject the UPDATE where the user already saved the same app — drop those
  // anon duplicates first, then re-own the rest and refresh saveCount caches.
  const affected = await db
    .select({ appId: schema.saves.appId })
    .from(schema.saves)
    .where(eq(schema.saves.anonymousId, anonymousId));
  if (affected.length > 0) {
    await db.run(sql`
      DELETE FROM saves WHERE anonymous_id = ${anonymousId}
        AND app_id IN (SELECT app_id FROM saves WHERE user_id = ${user.id})
    `);
    await db.run(sql`
      UPDATE saves SET user_id = ${user.id}, anonymous_id = NULL
      WHERE anonymous_id = ${anonymousId}
    `);
    const appIds = [...new Set(affected.map((r) => r.appId))];
    for (const appId of appIds) {
      await db.run(sql`
        UPDATE apps SET save_count =
          (SELECT COUNT(*) FROM saves WHERE app_id = ${appId})
        WHERE id = ${appId}
      `);
    }
  }

  return NextResponse.json({ ok: true, merged: true });
}
