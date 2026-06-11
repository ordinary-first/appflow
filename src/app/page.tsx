import { Feed } from "@/components/feed/Feed";
import { getFeedApps } from "@/lib/feed";
import type { FeedItem } from "@/lib/types";

// The feed reads D1 per request — never statically generated.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let items: FeedItem[] = [];
  try {
    const apps = await getFeedApps(40);
    items = apps.map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      tagline: a.tagline,
      category: a.category,
      url: a.url,
      demoVideoUrl: a.demoVideoUrl,
      youtubeUrl: a.youtubeUrl,
      thumbnailUrl: a.thumbnailUrl,
      makerName: a.makerName,
      embeddable: a.embeddable,
      likes: a.stats.likes,
      saves: a.stats.saves,
      feedbackCount: a.stats.feedbackCount,
    }));
  } catch {
    // DB not migrated yet — render the empty state instead of crashing.
  }

  return <Feed apps={items} />;
}
