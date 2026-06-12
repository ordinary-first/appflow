import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /api/notifications — badge count for the bottom nav:
 * unread notification rows + new posts from followed apps/users since
 * lastNotifCheckAt (derived at read time — 'new_post' creates no rows by
 * design, so follows × posts is joined here instead of fanned out on write).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ unread: 0 });
  }
  const db = await getDb();

  const [unreadRow] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.recipientId, user.id),
        eq(schema.notifications.read, false)
      )
    );

  // Followed-app/user posts newer than the last inbox check. Indexed lookups:
  // follows_follower_idx drives the subqueries, posts_app_idx the date scan.
  const [me] = await db
    .select({ lastCheck: schema.user.lastNotifCheckAt })
    .from(schema.user)
    .where(eq(schema.user.id, user.id))
    .limit(1);
  const since = me?.lastCheck ?? new Date(0);
  const [newPostsRow] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(schema.posts)
    .where(
      sql`${schema.posts.status} = 'published'
        AND ${schema.posts.createdAt} > ${since.getTime()}
        AND ${schema.posts.authorId} != ${user.id}
        AND (
          ${schema.posts.appId} IN (
            SELECT target_id FROM follows
            WHERE follower_id = ${user.id} AND target_type = 'app'
          )
          OR ${schema.posts.authorId} IN (
            SELECT target_id FROM follows
            WHERE follower_id = ${user.id} AND target_type = 'user'
          )
        )`
    );

  return NextResponse.json({
    unread: (unreadRow?.n ?? 0) + (newPostsRow?.n ?? 0),
  });
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
