import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { resolveAnonIdentity, withAnonCookie } from "@/lib/anon-server";
import { checkWriteRate, tooManyRequests } from "@/lib/rate-limit";
import { INTERACTION_TYPES, type InteractionType } from "@/db/schema";

/**
 * Records a single interaction event (anonymous or logged-in).
 * Insert-only: events are immutable. Identity is server-determined —
 * user_id from the verified session, anonymous_id from the HMAC-signed
 * cookie. The body's anonymousId (legacy clients) is ignored entirely,
 * so feed-ranking inputs can't be forged by minting ids client-side.
 */
export async function POST(req: Request) {
  let body: {
    appId?: string;
    type?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { appId, type, metadata } = body;
  if (!appId || !type || !INTERACTION_TYPES.includes(type as InteractionType)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const user = await getSessionUser();
  const anon = await resolveAnonIdentity(req);

  const rate = await checkWriteRate(req, anon.anonId);
  if (!rate.allowed) return withAnonCookie(tooManyRequests(), anon);

  const db = await getDb();
  try {
    await db.insert(schema.interactions).values({
      id: crypto.randomUUID(),
      appId,
      type: type as InteractionType,
      userId: user?.id ?? null,
      anonymousId: user ? null : anon.anonId,
      metadata: metadata ?? null,
      createdAt: new Date(),
    });
  } catch {
    // Unknown appId hits the FK — a client bug or a probe, not a 500.
    return withAnonCookie(
      NextResponse.json({ error: "unknown app" }, { status: 400 }),
      anon
    );
  }

  return withAnonCookie(NextResponse.json({ ok: true }), anon);
}
