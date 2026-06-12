import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getDb, schema } from "@/db";
import { getAppStats } from "@/lib/feed";
import { youtubeVideoId, cn } from "@/lib/utils";
import { ClaimButton } from "@/components/ClaimButton";
import { FollowAppButton } from "@/components/FollowAppButton";
import { BottomNav } from "@/components/BottomNav";

export const dynamic = "force-dynamic";

const TAG_LABELS: Record<string, string> = {
  useful: "👍 Useful",
  interesting: "✨ Interesting",
  confusing: "😕 Confusing",
  buggy: "🐞 Buggy",
  login_blocked: "🚪 Login blocked",
  too_slow: "🐢 Too slow",
  not_for_me: "❌ Not for me",
};

async function getApp(slug: string) {
  const db = await getDb();
  const [app] = await db
    .select()
    .from(schema.apps)
    .where(eq(schema.apps.slug, slug))
    .limit(1);
  // Unclaimed (curated) apps are public — that's how makers find and claim
  // them. Only 'hidden' and 'draft' stay private.
  return app && ["published", "unclaimed"].includes(app.status) ? app : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const app = await getApp(slug);
    if (!app) return { title: "Glim" };
    return {
      title: `${app.name} — Glim`,
      description: app.tagline,
      openGraph: {
        title: app.name,
        description: app.tagline,
        images: app.thumbnailUrl ? [app.thumbnailUrl] : undefined,
        type: "website",
      },
    };
  } catch {
    return { title: "Glim" };
  }
}

export default async function AppDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = ["official", "reviews"].includes(rawTab ?? "") ? rawTab : "all";
  const app = await getApp(slug);
  if (!app) notFound();

  const db = await getDb();
  const postFilter =
    tab === "official"
      ? and(
          eq(schema.posts.appId, app.id),
          eq(schema.posts.status, "published"),
          eq(schema.posts.type, "official")
        )
      : tab === "reviews"
        ? and(
            eq(schema.posts.appId, app.id),
            eq(schema.posts.status, "published"),
            eq(schema.posts.type, "review")
          )
        : and(eq(schema.posts.appId, app.id), eq(schema.posts.status, "published"));
  const posts = await db
    .select({
      id: schema.posts.id,
      type: schema.posts.type,
      mediaType: schema.posts.mediaType,
      thumbnailUrl: schema.posts.thumbnailUrl,
      caption: schema.posts.caption,
      likeCount: schema.posts.likeCount,
      commentCount: schema.posts.commentCount,
      createdAt: schema.posts.createdAt,
      authorName: schema.user.name,
    })
    .from(schema.posts)
    .innerJoin(schema.user, eq(schema.posts.authorId, schema.user.id))
    .where(postFilter)
    .orderBy(desc(schema.posts.createdAt))
    .limit(50);

  const stats = (await getAppStats()).get(app.id);
  const ytId = !app.demoVideoUrl && app.youtubeUrl ? youtubeVideoId(app.youtubeUrl) : null;
  const topTags = Object.entries(stats?.topFeedbackTags ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Glim
      </Link>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-black">
        {app.demoVideoUrl ? (
          <video
            src={app.demoVideoUrl}
            poster={app.thumbnailUrl ?? undefined}
            className="aspect-video w-full object-contain"
            controls
            muted
            autoPlay
            loop
            playsInline
          />
        ) : ytId ? (
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube.com/embed/${ytId}?mute=1&rel=0`}
            title={app.name}
            allow="autoplay; encrypted-media"
          />
        ) : null}
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            {app.category}
          </span>
          {app.status === "unclaimed" && (
            <span className="ml-1.5 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2.5 py-0.5 text-xs text-yellow-500">
              Curated · unclaimed
            </span>
          )}
          <h1 className="mt-2 text-2xl font-bold">{app.name}</h1>
          <p className="mt-1 text-muted-foreground">{app.tagline}</p>
        </div>
        <Link
          href={`/try/${app.id}`}
          className="inline-flex h-12 shrink-0 items-center rounded-xl bg-foreground px-6 font-semibold text-background hover:bg-foreground/90"
        >
          Try
        </Link>
      </div>

      <div className="mt-4">
        <FollowAppButton
          appId={app.id}
          appSlug={app.slug}
          initialCount={app.followerCount}
        />
      </div>

      {app.status === "unclaimed" && (
        <ClaimButton appId={app.id} appSlug={app.slug} />
      )}

      {app.description && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {app.description}
        </p>
      )}

      {(app.tags?.length ?? 0) > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {app.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Feedback summary */}
      <section className="mt-8 rounded-2xl border border-border bg-muted p-5">
        <h2 className="text-sm font-semibold text-muted-foreground">
          What testers said
        </h2>
        {topTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {topTags.map(([tag, n]) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-background px-3 py-1 text-sm"
              >
                {TAG_LABELS[tag] ?? tag}{" "}
                <span className="text-muted-foreground">×{n}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No feedback yet — be the first to try it.
          </p>
        )}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          <Stat label="Tries" value={stats?.tryClicks ?? 0} />
          <Stat label="Likes" value={stats?.likes ?? 0} />
          <Stat label="Feedback" value={stats?.feedbackCount ?? 0} />
        </div>
      </section>

      {/* Posts: the app's content timeline (official updates + user reviews) */}
      <section className="mt-8">
        <div className="flex gap-2 border-b border-border pb-2 text-sm">
          {([
            ["all", "All"],
            ["official", "Official"],
            ["reviews", "Reviews"],
          ] as const).map(([key, label]) => (
            <Link
              key={key}
              href={key === "all" ? `/app/${app.slug}` : `/app/${app.slug}?tab=${key}`}
              className={cn(
                "rounded-full px-3 py-1 transition",
                tab === key
                  ? "bg-foreground font-semibold text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        {posts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {tab === "reviews"
              ? "No user reviews yet — try the app and share yours."
              : "No posts yet."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {posts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                {p.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- R2/maker media
                  <img
                    src={p.thumbnailUrl}
                    alt=""
                    className="h-14 w-14 flex-none rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 flex-none items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                    {p.mediaType === "video" ? "🎬" : "🖼"}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-px text-[10px] font-medium",
                        p.type === "official"
                          ? "bg-foreground/10 text-foreground"
                          : "bg-blue-500/15 text-blue-400"
                      )}
                    >
                      {p.type === "official" ? "Official" : "Review"}
                    </span>
                    {p.authorName} · {p.createdAt.toLocaleDateString()}
                  </p>
                  {p.caption && (
                    <p className="mt-0.5 line-clamp-2 text-sm">{p.caption}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ♥ {p.likeCount} · 💬 {p.commentCount}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Maker */}
      <section className="mt-6 flex items-center justify-between rounded-2xl border border-border p-4">
        <div>
          <p className="text-xs text-muted-foreground">Made by</p>
          {app.status === "unclaimed" ? (
            <p className="font-medium">{app.makerName}</p>
          ) : (
            <Link href={`/maker/${app.makerId}`} className="font-medium hover:underline">
              {app.makerName}
            </Link>
          )}
        </div>
        <div className="flex gap-3 text-sm text-muted-foreground">
          {app.makerLinks?.website && (
            <a
              href={app.makerLinks.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              Website <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {app.makerLinks?.x && (
            <a
              href={app.makerLinks.x}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              X
            </a>
          )}
          {app.makerLinks?.github && (
            <a
              href={app.makerLinks.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
          )}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <p className="text-lg font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
