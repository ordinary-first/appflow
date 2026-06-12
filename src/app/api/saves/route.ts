import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { resolveAnonIdentity, withAnonCookie } from "@/lib/anon-server";
import { checkWriteRate, tooManyRequests } from "@/lib/rate-limit";
import { runToggleBatch } from "@/lib/toggle";

/**
 * POST /api/saves — intent-based app save toggle. Body: { appId, action: 'add'|'remove' }.
 * Saves are app-level and allow anonymous identity (the HMAC-signed cookie) —
 * the deliberate asymmetry with likes. `saves` is the authority,
 * apps.save_count is the cached display value, recounted in the same batch.
 * Dedupe relies on the two partial unique indexes (user XOR anon).
 */
export async function POST(req: Request) {
  let body: { appId?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const appId = String(body.appId ?? "").trim();
  const action = body.action;
  if (!appId || (action !== "add" && action !== "remove")) {
    return NextResponse.json(
      { error: "appId and action ('add'|'remove') are required" },
      { status: 400 }
    );
  }

  const user = await getSessionUser();
  const anon = await resolveAnonIdentity(req);

  const rate = await checkWriteRate(req, anon.anonId);
  if (!rate.allowed) return withAnonCookie(tooManyRequests(), anon);

  const db = await getDb();
  const [app] = await db
    .select({ id: schema.apps.id, status: schema.apps.status })
    .from(schema.apps)
    .where(eq(schema.apps.id, appId))
    .limit(1);
  if (!app || app.status === "hidden") {
    return withAnonCookie(
      NextResponse.json({ error: "app not found" }, { status: 404 }),
      anon
    );
  }

  const identityWhere = user
    ? sql`${schema.saves.appId} = ${appId} AND ${schema.saves.userId} = ${user.id}`
    : sql`${schema.saves.appId} = ${appId} AND ${schema.saves.anonymousId} = ${anon.anonId}`;
  const mutation =
    action === "add"
      ? db
          .insert(schema.saves)
          .values({
            id: crypto.randomUUID(),
            userId: user?.id ?? null,
            anonymousId: user ? null : anon.anonId,
            appId,
            createdAt: new Date(),
          })
          .onConflictDoNothing()
      : db.delete(schema.saves).where(identityWhere);

  const saveCount = await runToggleBatch(
    db,
    mutation,
    db
      .update(schema.apps)
      .set({
        saveCount: sql`(SELECT COUNT(*) FROM saves WHERE app_id = ${appId})`,
      })
      .where(eq(schema.apps.id, appId)),
    db
      .select({ n: schema.apps.saveCount })
      .from(schema.apps)
      .where(eq(schema.apps.id, appId))
  );

  return withAnonCookie(
    NextResponse.json({ ok: true, saved: action === "add", saveCount }),
    anon
  );
}
