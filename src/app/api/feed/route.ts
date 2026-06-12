import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { getAppStats } from "@/lib/feed";
import type { FeedItem } from "@/lib/types";

/**
 * GET /api/feed?type=following — posts from followed apps (all their posts)
 * UNION posts authored by followed users. Newest first, capped at 40 (v1 —
 * cursor pagination comes with the recommendation-feed rework).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("type") !== "following") {
    return NextResponse.json({ error: "unsupported feed type" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ items: [] });
  }

  const db = await getDb();
  const rows = await db
    .select({ post: schema.posts, app: schema.apps })
    .from(schema.posts)
    .innerJoin(schema.apps, eq(schema.posts.appId, schema.apps.id))
    .where(
      sql`${schema.posts.status} = 'published'
        AND ${schema.apps.status} IN ('published', 'unclaimed')
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
    )
    .orderBy(sql`${schema.posts.createdAt} desc, ${schema.posts.id} desc`)
    .limit(40);

  const statsMap = await getAppStats();

  const items: FeedItem[] = rows.map(({ post, app }) => {
    const stats = statsMap.get(app.id);
    return {
      postId: post.id,
      id: app.id,
      slug: app.slug,
      name: app.name,
      tagline: post.caption ?? app.tagline,
      category: app.category,
      url: app.url,
      mediaType: post.mediaType,
      demoVideoUrl: post.videoUrl,
      youtubeUrl: app.youtubeUrl,
      imageUrls: post.imageUrls ?? null,
      thumbnailUrl: post.thumbnailUrl ?? app.thumbnailUrl,
      iconUrl: app.iconUrl,
      makerName: app.makerName,
      embeddable: app.embeddable,
      likes: stats?.likes ?? 0,
      saves: stats?.saves ?? 0,
      feedbackCount: stats?.feedbackCount ?? 0,
      commentCount: post.commentCount,
    };
  });

  return NextResponse.json({ items });
}
