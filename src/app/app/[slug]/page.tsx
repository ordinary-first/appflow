import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getDb, schema } from "@/db";
import { getAppStats } from "@/lib/feed";
import { getTryTargets } from "@/lib/try-target";
import { TryLink } from "@/components/TryLink";
import { youtubeVideoId, cn } from "@/lib/utils";
import { ClaimButton } from "@/components/ClaimButton";
import { FollowAppButton } from "@/components/FollowAppButton";
import { DescriptionExpander } from "@/components/DescriptionExpander";
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
    .orderBy(desc(schema.posts.likeCount), desc(schema.posts.createdAt))
    .limit(50);

  // Scoped to this single app — no full-table interactions aggregate.
  const stats = (await getAppStats([app.id])).get(app.id);
  const ytId = !app.demoVideoUrl && app.youtubeUrl ? youtubeVideoId(app.youtubeUrl) : null;
  const topTags = Object.entries(stats?.topFeedbackTags ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Top reviews surfaced inline — most liked first, must have caption
  const topReviews = posts
    .filter((p) => p.type === "review" && p.caption)
    .slice(0, 3);

  const hasMedia = !!(app.demoVideoUrl || ytId);

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Glim
      </Link>

      {/* 1. Identity */}
      <div className="mt-5">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            {app.category}
          </span>
          {app.status === "unclaimed" && (
            <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2.5 py-0.5 text-xs text-yellow-500">
              Curated · unclaimed
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold">{app.name}</h1>
        <p className="mt-1 text-muted-foreground">{app.tagline}</p>
      </div>

      {/* 2. Trust signals */}
      {((stats?.tryClicks ?? 0) > 0 || topTags.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {(stats?.tryClicks ?? 0) > 0 && (
            <span>{stats!.tryClicks.toLocaleString()} tried</span>
          )}
          {topTags.map(([tag, n]) => (
            <span key={tag}>
              {TAG_LABELS[tag] ?? tag} ×{n}
            </span>
          ))}
        </div>
      )}

      {/* 3. Media carousel */}
      {hasMedia && (
        <div className="-mx-5 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
          {app.demoVideoUrl && (
            <div className="flex-none snap-start overflow-hidden rounded-2xl border border-border bg-black"
              style={{ width: "75vw", maxWidth: "20rem" }}>
              <video
                src={app.demoVideoUrl}
                poster={app.thumbnailUrl ?? undefined}
                className="h-full w-full object-contain"
                style={{ aspectRatio: "9/16", maxHeight: "60vh" }}
                controls
                muted
                autoPlay
                loop
                playsInline
              />
            </div>
          )}
          {ytId && (
            <div className="flex-none snap-start overflow-hidden rounded-2xl border border-border"
              style={{ width: "75vw", maxWidth: "20rem" }}>
              <iframe
                className="aspect-video w-full"
                src={`https://www.youtube.com/embed/${ytId}?mute=1&rel=0`}
                title={app.name}
                allow="autoplay; encrypted-media"
              />
            </div>
          )}
        </div>
      )}

      {/* 4. Try CTA — getTryTargets is the single source for platform ×
          embeddable routing; TryLink records try_click on external opens
          (previously external opens vanished from the stats). */}
      <div className="mt-5 flex gap-2">
        {getTryTargets(app).map((target) => (
          <TryLink
            key={target.href}
            appId={app.id}
            target={target}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-foreground font-semibold text-background hover:bg-foreground/90"
          >
            {target.external && <ExternalLink className="h-4 w-4" />}
            {app.platform === "web" ? "Try it now →" : target.label}
          </TryLink>
        ))}
      </div>

      {/* 5. Follow + Claim */}
      <div className="mt-3">
        <FollowAppButton
          appId={app.id}
          appSlug={app.slug}
          initialCount={app.followerCount}
        />
      </div>
      {app.status === "unclaimed" && (
        <ClaimButton
          appId={app.id}
          appSlug={app.slug}
          // Deduped identities that viewed or tried — the "already reached N
          // people" line a maker sees when arriving from an outreach DM.
          reach={(stats?.views ?? 0) + (stats?.tryClicks ?? 0)}
        />
      )}

      {/* 6. Description (collapsible) */}
      {app.description && <DescriptionExpander text={app.description} />}

      {/* 7. Tags */}
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

      {/* 8. Top reviews inline */}
      {topReviews.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground">
            사람들의 반응
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {topReviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-muted p-4">
                <p className="text-xs font-medium">{r.authorName}</p>
                <p className="mt-1 line-clamp-3 text-sm">{r.caption}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  ♥ {r.likeCount} · {r.createdAt.toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
          {posts.filter((p) => p.type === "review").length > 3 && (
            <Link
              href={`/app/${app.slug}?tab=reviews`}
              className="mt-3 inline-block text-sm text-muted-foreground hover:text-foreground"
            >
              모든 리뷰 보기 →
            </Link>
          )}
        </section>
      )}

      {/* 9. Made by — clickable: claimed → internal profile, unclaimed → maker's
           primary external link (X > website > github). Never a dead-end name. */}
      <section className="mt-6 flex items-center justify-between rounded-2xl border border-border p-4">
        <div>
          <p className="text-xs text-muted-foreground">Made by</p>
          {app.status === "unclaimed" ? (
            (() => {
              const ext =
                app.makerLinks?.x ??
                app.makerLinks?.website ??
                app.makerLinks?.github;
              return ext ? (
                <a
                  href={ext}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium hover:underline"
                >
                  {app.makerName}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              ) : (
                <p className="font-medium">{app.makerName}</p>
              );
            })()
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

      {/* 10. All posts (secondary — for the curious) */}
      <section className="mt-8">
        <div className="flex gap-2 border-b border-border pb-2 text-sm">
          {(
            [
              ["all", "All"],
              ["official", "Official"],
              ["reviews", "Reviews"],
            ] as const
          ).map(([key, label]) => (
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

      <BottomNav />
    </main>
  );
}
