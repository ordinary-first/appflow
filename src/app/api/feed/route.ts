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
  // Viewer hydration flags — same EXISTS pattern as getFeedPosts. The
  // following feed is login-only, so user-keyed lookups suffice.
  const likedByMe = sql<number>`EXISTS(SELECT 1 FROM likes WHERE likes.post_id = ${schema.posts.id} AND likes.user_id = ${user.id})`;
  const savedByMe = sql<number>`EXISTS(SELECT 1 FROM saves WHERE saves.app_id = ${schema.apps.id} AND saves.user_id = ${user.id})`;
  const rows = await db
    .select({ post: schema.posts, app: schema.apps, likedByMe, savedByMe })
    .from(schema.posts)
    .innerJoin(schema.apps, eq(schema.posts.appId, schema.apps.id))
    .where(
      sql`${schema.posts.status} = 'published'
        AND ${schema.posts.mediaType} != 'text'
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

  const statsMap = await getAppStats([...new Set(rows.map((r) => r.app.id))]);

  const items: FeedItem[] = rows.map(({ post, app, likedByMe, savedByMe }) => {
    const stats = statsMap.get(app.id);
    return {
      likedByMe: !!likedByMe,
      savedByMe: !!savedByMe,
      followedByMe: true, // by construction: this feed only contains followed targets
      postId: post.id,
      id: app.id,
      slug: app.slug,
      name: app.name,
      tagline: post.caption ?? app.tagline,
      category: app.category,
      url: app.url,
      // 'text' posts are excluded in the WHERE above — safe to narrow.
      mediaType: post.mediaType as "video" | "images",
      demoVideoUrl: post.videoUrl,
      youtubeUrl: app.youtubeUrl,
      imageUrls: post.imageUrls ?? null,
      imageCaptions: post.imageCaptions ?? null,
      thumbnailUrl: post.thumbnailUrl ?? app.thumbnailUrl,
      iconUrl: app.iconUrl,
      makerName: app.makerName,
      embeddable: app.embeddable,
      platform: app.platform,
      storeUrls: app.storeUrls ?? null,
      // Signal Authority: cached columns, not interactions aggregates.
      likes: post.likeCount,
      saves: app.saveCount,
      feedbackCount: stats?.feedbackCount ?? 0,
      commentCount: post.commentCount,
      tryCount: stats?.tryClicks ?? 0,
    };
  });

  return NextResponse.json({ items });
}
