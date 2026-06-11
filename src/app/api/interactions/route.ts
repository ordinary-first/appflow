import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { INTERACTION_TYPES, type InteractionType } from "@/db/schema";

/**
 * Records a single interaction event (anonymous or logged-in).
 * Insert-only: events are immutable, so no ownership checks needed beyond
 * attributing user_id from the verified session (never from the body).
 */
export async function POST(req: Request) {
  let body: {
    appId?: string;
    type?: string;
    anonymousId?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { appId, type, anonymousId, metadata } = body;
  if (!appId || !type || !INTERACTION_TYPES.includes(type as InteractionType)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user && !anonymousId) {
    return NextResponse.json({ error: "missing identity" }, { status: 400 });
  }

  const db = await getDb();
  await db.insert(schema.interactions).values({
    id: crypto.randomUUID(),
    appId,
    type: type as InteractionType,
    userId: user?.id ?? null,
    anonymousId: anonymousId ?? null,
    metadata: metadata ?? null,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
