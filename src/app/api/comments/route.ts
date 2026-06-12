import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";

export type CommentDTO = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: number;
  author: { id: string; name: string; image: string | null };
};

/**
 * GET /api/comments?postId=… — all comments for a post (public read).
 * Flat list ordered oldest-first; the client groups replies under parents.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const postId = url.searchParams.get("postId")?.trim();
  if (!postId) {
    return NextResponse.json({ error: "postId required" }, { status: 400 });
  }

  const db = await getDb();
  const rows = await db
    .select({
      id: schema.comments.id,
      parentId: schema.comments.parentId,
      body: schema.comments.body,
      createdAt: schema.comments.createdAt,
      authorId: schema.user.id,
      authorName: schema.user.name,
      authorImage: schema.user.image,
    })
    .from(schema.comments)
    .innerJoin(schema.user, eq(schema.comments.authorId, schema.user.id))
    .where(eq(schema.comments.postId, postId))
    .orderBy(schema.comments.createdAt)
    .limit(200);

  const comments: CommentDTO[] = rows.map((r) => ({
    id: r.id,
    parentId: r.parentId,
    body: r.body,
    createdAt: r.createdAt.getTime(),
    author: { id: r.authorId, name: r.authorName, image: r.authorImage },
  }));
  return NextResponse.json({ comments });
}

/**
 * POST /api/comments — add a comment or a single-level reply.
 * Body: { postId, body, parentId? }. Login required.
 * Replies to replies are rejected (parent must be top-level).
 * posts.commentCount cache updates in the same request; the post author
 * (or parent commenter) gets an in-app notification.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const postId = String(raw.postId ?? "").trim();
  const body = String(raw.body ?? "").trim();
  const parentId = raw.parentId ? String(raw.parentId).trim() : null;
  if (!postId || !body) {
    return NextResponse.json({ error: "postId and body are required" }, { status: 400 });
  }
  if (body.length > 1000) {
    return NextResponse.json({ error: "comment too long (max 1000)" }, { status: 400 });
  }

  const db = await getDb();
  const [post] = await db
    .select({ id: schema.posts.id, authorId: schema.posts.authorId })
    .from(schema.posts)
    .where(and(eq(schema.posts.id, postId), eq(schema.posts.status, "published")))
    .limit(1);
  if (!post) {
    return NextResponse.json({ error: "post not found" }, { status: 404 });
  }

  let notifyUserId: string | null = post.authorId;
  let notifType: "comment" | "reply" = "comment";
  if (parentId) {
    // One reply level only: the parent must itself be a top-level comment.
    const [parent] = await db
      .select({ id: schema.comments.id, authorId: schema.comments.authorId })
      .from(schema.comments)
      .where(
        and(
          eq(schema.comments.id, parentId),
          eq(schema.comments.postId, postId),
          isNull(schema.comments.parentId)
        )
      )
      .limit(1);
    if (!parent) {
      return NextResponse.json(
        { error: "parent comment not found (replies to replies are not allowed)" },
        { status: 400 }
      );
    }
    notifyUserId = parent.authorId;
    notifType = "reply";
  }

  const now = new Date();
  const id = crypto.randomUUID();
  await db.insert(schema.comments).values({
    id,
    postId,
    authorId: user.id,
    parentId,
    body,
    createdAt: now,
  });
  await db
    .update(schema.posts)
    .set({ commentCount: sql`${schema.posts.commentCount} + 1` })
    .where(eq(schema.posts.id, postId));

  // Notify, unless you're talking to yourself or to the system account.
  if (notifyUserId && notifyUserId !== user.id && notifyUserId !== "glim-system") {
    await db.insert(schema.notifications).values({
      id: crypto.randomUUID(),
      recipientId: notifyUserId,
      type: notifType,
      postId,
      actorId: user.id,
      read: false,
      createdAt: now,
    });
  }

  return NextResponse.json({
    ok: true,
    comment: {
      id,
      parentId,
      body,
      createdAt: now.getTime(),
      author: { id: user.id, name: user.name, image: user.image ?? null },
    } satisfies CommentDTO,
  });
}
