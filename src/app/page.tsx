import { Feed } from "@/components/feed/Feed";
import { getFeedPosts } from "@/lib/feed";
import type { FeedItem } from "@/lib/types";

// The feed reads D1 per request — never statically generated.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let items: FeedItem[] = [];
  try {
    const entries = await getFeedPosts(40);
    items = entries.map(({ post, app, stats }) => ({
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
      // Interim display source: interactions stats (the client still writes
      // likes/saves via track()). Migration COPIED legacy rows into
      // likes/saves, so stats covers full history without double counting.
      // Phase 4/5 switch the write path and the display to the cached
      // post.likeCount / app.saveCount columns.
      likes: stats.likes,
      saves: stats.saves,
      feedbackCount: stats.feedbackCount,
    }));
  } catch {
    // DB not migrated yet — render the empty state instead of crashing.
  }

  return <Feed apps={items} />;
}
