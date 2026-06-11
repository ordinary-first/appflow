import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getDb, schema } from "@/db";
import { getAppStats } from "@/lib/feed";
import { youtubeVideoId } from "@/lib/utils";

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
  return app && app.status === "published" ? app : null;
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = await getApp(slug);
  if (!app) notFound();

  const stats = (await getAppStats()).get(app.id);
  const ytId = !app.demoVideoUrl && app.youtubeUrl ? youtubeVideoId(app.youtubeUrl) : null;
  const topTags = Object.entries(stats?.topFeedbackTags ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <main className="mx-auto max-w-2xl px-5 py-6">
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

      {/* Maker */}
      <section className="mt-6 flex items-center justify-between rounded-2xl border border-border p-4">
        <div>
          <p className="text-xs text-muted-foreground">Made by</p>
          <p className="font-medium">{app.makerName}</p>
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
