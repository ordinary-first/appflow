import { Feed } from "@/components/feed/Feed";
import { getFeedPosts } from "@/lib/feed";
import { getSessionUser } from "@/lib/auth";
import { readAnonIdFromCookies } from "@/lib/anon-server";
import type { FeedItem } from "@/lib/types";

// The feed reads D1 per request — never statically generated.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let items: FeedItem[] = [];
  try {
    const [user, anonId] = await Promise.all([
      getSessionUser(),
      readAnonIdFromCookies(),
    ]);
    const entries = await getFeedPosts(40, {
      userId: user?.id ?? null,
      anonId: user ? null : anonId,
    });
    items = entries.map(({ post, app, stats, likedByMe, savedByMe, followedByMe }) => ({
      postId: post.id,
      id: app.id,
      slug: app.slug,
      name: app.name,
      tagline: post.caption ?? app.tagline,
      category: app.category,
      url: app.url,
      // 'text' posts are excluded in getFeedPosts' WHERE — safe to narrow.
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
      // Signal Authority: user-visible counts come from the cached columns
      // (likes/saves tables are the source of truth, recounted on toggle).
      // interactions remain analytics-only (ranking/trends, deduped).
      likes: post.likeCount,
      saves: app.saveCount,
      feedbackCount: stats.feedbackCount,
      commentCount: post.commentCount,
      tryCount: stats.tryClicks,
      likedByMe,
      savedByMe,
      followedByMe,
    }));
  } catch {
    // DB not migrated yet — render the empty state instead of crashing.
  }

  return <Feed apps={items} />;
}
