import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { runToggleBatch } from "@/lib/toggle";

/**
 * POST /api/likes — intent-based like toggle. Body: { postId, action: 'add'|'remove' }.
 * Likes are per-post and login-required (anonymous tap → login prompt;
 * intentional asymmetry with saves). `likes` is the authority,
 * posts.like_count is the cached display value, recounted in the same batch.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  let body: { postId?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const postId = String(body.postId ?? "").trim();
  const action = body.action;
  if (!postId || (action !== "add" && action !== "remove")) {
    return NextResponse.json(
      { error: "postId and action ('add'|'remove') are required" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const [post] = await db
    .select({ id: schema.posts.id, status: schema.posts.status })
    .from(schema.posts)
    .where(eq(schema.posts.id, postId))
    .limit(1);
  if (!post || post.status !== "published") {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }

  const mutation =
    action === "add"
      ? db
          .insert(schema.likes)
          .values({
            id: crypto.randomUUID(),
            postId,
            userId: user.id,
            createdAt: new Date(),
          })
          .onConflictDoNothing()
      : db
          .delete(schema.likes)
          .where(
            sql`${schema.likes.postId} = ${postId} AND ${schema.likes.userId} = ${user.id}`
          );

  const likeCount = await runToggleBatch(
    db,
    mutation,
    db
      .update(schema.posts)
      .set({
        likeCount: sql`(SELECT COUNT(*) FROM likes WHERE post_id = ${postId})`,
      })
      .where(eq(schema.posts.id, postId)),
    db
      .select({ n: schema.posts.likeCount })
      .from(schema.posts)
      .where(eq(schema.posts.id, postId))
  );

  return NextResponse.json({ ok: true, liked: action === "add", likeCount });
}
