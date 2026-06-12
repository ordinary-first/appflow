import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /api/follows — the current user's follows (both app and user targets).
 * Used by the client to hydrate follow-button state.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ follows: [] });
  }
  const db = await getDb();
  const rows = await db
    .select({
      targetType: schema.follows.targetType,
      targetId: schema.follows.targetId,
    })
    .from(schema.follows)
    .where(eq(schema.follows.followerId, user.id));
  return NextResponse.json({ follows: rows });
}

/**
 * POST /api/follows — toggle. Body: { targetType: 'app' | 'user', targetId }.
 * Login required (follows drive the following feed — no anonymous mode).
 * apps.followerCount cache is updated in the same request (no triggers on D1).
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const targetType = String(body.targetType ?? "");
  const targetId = String(body.targetId ?? "").trim();
  if (!["app", "user"].includes(targetType) || !targetId) {
    return NextResponse.json(
      { error: "targetType ('app'|'user') and targetId are required" },
      { status: 400 }
    );
  }

  const db = await getDb();

  // Validate the target exists (and is followable).
  if (targetType === "app") {
    const [app] = await db
      .select({ id: schema.apps.id, status: schema.apps.status })
      .from(schema.apps)
      .where(eq(schema.apps.id, targetId))
      .limit(1);
    if (!app || app.status === "hidden") {
      return NextResponse.json({ error: "app not found" }, { status: 404 });
    }
  } else {
    const [target] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.id, targetId))
      .limit(1);
    if (!target) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }
    if (target.id === user.id) {
      return NextResponse.json({ error: "cannot follow yourself" }, { status: 400 });
    }
  }

  const where = and(
    eq(schema.follows.followerId, user.id),
    eq(schema.follows.targetType, targetType as "app" | "user"),
    eq(schema.follows.targetId, targetId)
  );
  const existing = await db
    .select({ id: schema.follows.id })
    .from(schema.follows)
    .where(where)
    .limit(1);

  let following: boolean;
  if (existing.length > 0) {
    await db.delete(schema.follows).where(where);
    following = false;
  } else {
    await db.insert(schema.follows).values({
      id: crypto.randomUUID(),
      followerId: user.id,
      targetType: targetType as "app" | "user",
      targetId,
      createdAt: new Date(),
    });
    following = true;

    // Notify the followed maker (app target → its claimed maker). System
    // account and self-follows produce no notification.
    let recipient: string | null = null;
    if (targetType === "user") {
      recipient = targetId;
    } else {
      const [app] = await db
        .select({ makerId: schema.apps.makerId, status: schema.apps.status })
        .from(schema.apps)
        .where(eq(schema.apps.id, targetId))
        .limit(1);
      if (app && app.status !== "unclaimed") recipient = app.makerId;
    }
    if (recipient && recipient !== user.id && recipient !== "glim-system") {
      await db.insert(schema.notifications).values({
        id: crypto.randomUUID(),
        recipientId: recipient,
        type: "follow",
        postId: null,
        actorId: user.id,
        read: false,
        createdAt: new Date(),
      });
    }
  }

  // Keep the cached counter in sync for app targets.
  let followerCount: number | undefined;
  if (targetType === "app") {
    await db
      .update(schema.apps)
      .set({
        followerCount: sql`(SELECT COUNT(*) FROM ${schema.follows} WHERE ${schema.follows.targetType} = 'app' AND ${schema.follows.targetId} = ${targetId})`,
      })
      .where(eq(schema.apps.id, targetId));
    const [row] = await db
      .select({ n: schema.apps.followerCount })
      .from(schema.apps)
      .where(eq(schema.apps.id, targetId))
      .limit(1);
    followerCount = row?.n;
  }

  return NextResponse.json({ ok: true, following, followerCount });
}
