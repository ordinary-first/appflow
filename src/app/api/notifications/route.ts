import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /api/notifications — unread badge count for the bottom nav.
 * Cheap single count query; returns { unread: 0 } for anonymous users.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ unread: 0 });
  }
  const db = await getDb();
  const rows = await db
    .select({ id: schema.notifications.id })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.recipientId, user.id),
        eq(schema.notifications.read, false)
      )
    )
    .limit(100);
  return NextResponse.json({ unread: rows.length });
}

/**
 * POST /api/notifications — mark all of the user's notifications read and
 * stamp lastNotifCheckAt (the badge baseline for followed-app new posts).
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }
  const db = await getDb();
  const now = new Date();
  await db
    .update(schema.notifications)
    .set({ read: true })
    .where(
      and(
        eq(schema.notifications.recipientId, user.id),
        eq(schema.notifications.read, false)
      )
    );
  await db
    .update(schema.user)
    .set({ lastNotifCheckAt: now })
    .where(eq(schema.user.id, user.id));
  return NextResponse.json({ ok: true });
}
