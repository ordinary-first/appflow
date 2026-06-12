import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/**
 * DELETE /api/posts/[id] — author-only, REVIEW posts only. Official posts
 * are excluded: deleting an app's canonical 'post-<appId>' would orphan
 * backfilled likes and break the app's feed presence. likes/comments
 * cascade via FK.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const db = await getDb();
  const res = await db
    .delete(schema.posts)
    .where(
      and(
        eq(schema.posts.id, id),
        eq(schema.posts.authorId, user.id),
        eq(schema.posts.type, "review")
      )
    )
    .returning({ id: schema.posts.id });

  if (res.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
