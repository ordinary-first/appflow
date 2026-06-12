import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray, and } from "drizzle-orm";
import { ArrowLeft, Globe, Github } from "lucide-react";
import { getDb, schema } from "@/db";
import { GLIM_SYSTEM_USER_ID, type MakerLinks } from "@/db/schema";
import { BottomNav } from "@/components/BottomNav";
import { SavedGrid, type SavedCardData } from "@/components/SavedGrid";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  try {
    const db = await getDb();
    const [maker] = await db
      .select({ name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);
    return { title: maker ? `${maker.name} — Glim` : "Glim" };
  } catch {
    return { title: "Glim" };
  }
}

/**
 * Public maker profile: who they are, the apps they make, and the reviews
 * they've posted on other apps. Most early users are maker-and-user at the
 * same time, so both halves get their own section.
 */
export default async function MakerProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  if (userId === GLIM_SYSTEM_USER_ID) notFound(); // system account has no public page

  const db = await getDb();
  const [maker] = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      image: schema.user.image,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1);
  if (!maker) notFound();

  const [apps, reviews] = await Promise.all([
    db
      .select({
        id: schema.apps.id,
        slug: schema.apps.slug,
        name: schema.apps.name,
        tagline: schema.apps.tagline,
        category: schema.apps.category,
        thumbnailUrl: schema.apps.thumbnailUrl,
        makerLinks: schema.apps.makerLinks,
      })
      .from(schema.apps)
      .where(and(eq(schema.apps.makerId, userId), eq(schema.apps.status, "published")))
      .orderBy(desc(schema.apps.createdAt)),
    db
      .select({
        id: schema.posts.id,
        caption: schema.posts.caption,
        thumbnailUrl: schema.posts.thumbnailUrl,
        likeCount: schema.posts.likeCount,
        commentCount: schema.posts.commentCount,
        createdAt: schema.posts.createdAt,
        appId: schema.posts.appId,
      })
      .from(schema.posts)
      .where(
        and(
          eq(schema.posts.authorId, userId),
          eq(schema.posts.type, "review"),
          eq(schema.posts.status, "published")
        )
      )
      .orderBy(desc(schema.posts.createdAt))
      .limit(30),
  ]);

  // Resolve the apps the reviews are about (for names/links).
  const reviewAppIds = [...new Set(reviews.map((r) => r.appId))];
  const reviewApps = new Map<string, { slug: string; name: string }>();
  if (reviewAppIds.length > 0) {
    const rows = await db
      .select({ id: schema.apps.id, slug: schema.apps.slug, name: schema.apps.name })
      .from(schema.apps)
      .where(inArray(schema.apps.id, reviewAppIds));
    for (const r of rows) reviewApps.set(r.id, r);
  }

  // Social links: maker_links live per-app (set at app creation). For the
  // profile, surface the first published app's links — same person across
  // apps in practice.
  const links: MakerLinks | null = apps.find((a) => a.makerLinks)?.makerLinks ?? null;

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Glim
      </Link>

      <div className="mt-6 flex items-center gap-4">
        {maker.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- OAuth avatar
          <img src={maker.image} alt="" className="h-20 w-20 rounded-full" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-semibold">
            {maker.name[0]?.toUpperCase() ?? "?"}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-tight">{maker.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {apps.length} app{apps.length === 1 ? "" : "s"} · {reviews.length}{" "}
            review{reviews.length === 1 ? "" : "s"}
          </p>
          {links && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              {links.x && (
                <a
                  href={links.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <span className="font-semibold">𝕏</span>
                </a>
              )}
              {links.github && (
                <a
                  href={links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Github className="h-4 w-4" />
                </a>
              )}
              {links.website && (
                <a
                  href={links.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Globe className="h-4 w-4" />
                  <span className="truncate">
                    {links.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground">Apps</h2>
        {apps.length > 0 ? (
          <SavedGrid apps={apps as SavedCardData[]} />
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No apps yet.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground">Reviews</h2>
        {reviews.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {reviews.map((r) => {
              const about = reviewApps.get(r.appId);
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-border bg-muted/30 p-4"
                >
                  {about && (
                    <Link
                      href={`/app/${about.slug}`}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      on {about.name}
                    </Link>
                  )}
                  {r.caption && (
                    <p className="mt-1.5 line-clamp-4 text-sm leading-relaxed text-foreground/90">
                      {r.caption}
                    </p>
                  )}
                  {r.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- R2/maker media
                    <img
                      src={r.thumbnailUrl}
                      alt=""
                      className="mt-2 h-28 w-full rounded-lg object-cover"
                    />
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    ♥ {r.likeCount} · 💬 {r.commentCount} ·{" "}
                    {r.createdAt.toLocaleDateString()}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No reviews yet.</p>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
