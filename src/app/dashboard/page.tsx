import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { ArrowLeft, Plus } from "lucide-react";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { getAppStats, type AppStats } from "@/lib/feed";
import { getDailyTrend, rollupDailyStats } from "@/lib/stats";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { BadgeEmbed } from "@/components/BadgeEmbed";
import { UserMenu } from "@/components/UserMenu";
import { AppActions } from "@/components/AppActions";

type AppStatus = "unclaimed" | "draft" | "published" | "hidden";

export const dynamic = "force-dynamic";

const TAG_LABELS: Record<string, string> = {
  useful: "Useful",
  interesting: "Interesting",
  confusing: "Confusing",
  buggy: "Buggy",
  login_blocked: "Login blocked me",
  too_slow: "Too slow",
  not_for_me: "Not for me",
};
const FRICTION_TAGS = ["login_blocked", "confusing", "too_slow", "buggy", "not_for_me"];

export default async function DashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="text-2xl font-bold">Maker Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to see how people actually use your apps.
        </p>
        <div className="mx-auto mt-6 max-w-xs">
          <GoogleSignIn callbackURL="/dashboard" />
        </div>
        <Link href="/" className="mt-6 inline-block text-sm text-muted-foreground underline">
          Back to the feed
        </Link>
      </main>
    );
  }

  const db = await getDb();
  // Ownership enforced here: only this maker's apps are ever queried.
  const myApps = await db
    .select()
    .from(schema.apps)
    .where(eq(schema.apps.makerId, user.id))
    .orderBy(desc(schema.apps.createdAt));

  const appIds = myApps.map((a) => a.id);
  // Scoped to this maker's apps — no full-table interactions aggregate.
  const statsMap = await getAppStats(appIds);
  // E2: lazy daily rollup — recompute missing days, then read the trend.
  // A failed rollup serves yesterday's rows instead of killing the page.
  let trendMap = new Map<string, { date: string; viewers: number; triers: number }[]>();
  try {
    await rollupDailyStats(appIds);
    trendMap = await getDailyTrend(appIds, 14);
  } catch (err) {
    console.error("[dashboard] daily rollup failed — serving stale trend", err);
    trendMap = await getDailyTrend(appIds, 14).catch(() => trendMap);
  }
  const comments =
    appIds.length > 0
      ? await db
          .select()
          .from(schema.feedback)
          .where(inArray(schema.feedback.appId, appIds))
          .orderBy(desc(schema.feedback.createdAt))
          .limit(100)
      : [];

  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Glim
        </Link>
        <div className="flex items-center gap-2">
          <UserMenu variant="inline" />
          <Link
            href="/submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm hover:bg-muted"
          >
            <Plus className="h-4 w-4" /> Submit app
          </Link>
        </div>
      </div>

      <h1 className="mt-5 text-2xl font-bold">Maker Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Not vanity metrics — real trial conversion.
      </p>

      {myApps.length === 0 && (
        <div className="mt-8 rounded-2xl border border-border bg-muted p-8 text-center">
          <p className="font-medium">You haven&apos;t published any apps yet.</p>
          <Link href="/submit" className="mt-2 inline-block text-sm underline">
            Publish your first app →
          </Link>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {myApps.map((app) => {
          const s = statsMap.get(app.id);
          const appComments = comments.filter(
            (c) => c.appId === app.id && c.comment
          );
          return (
            <AppPanel
              key={app.id}
              app={{
                id: app.id,
                name: app.name,
                slug: app.slug,
                tagline: app.tagline,
                status: app.status,
              }}
              stats={s}
              trend={trendMap.get(app.id) ?? []}
              comments={appComments.map((c) => ({
                id: c.id,
                comment: c.comment!,
                rating: c.rating,
              }))}
            />
          );
        })}
      </div>
    </main>
  );
}

function AppPanel({
  app,
  stats,
  trend,
  comments,
}: {
  app: { id: string; name: string; slug: string; tagline: string; status: AppStatus };
  stats?: AppStats;
  trend: { date: string; viewers: number; triers: number }[];
  comments: { id: string; comment: string; rating: string | null }[];
}) {
  const views = stats?.views ?? 0;
  const tryClicks = stats?.tryClicks ?? 0;
  const ctr = views > 0 ? Math.round((tryClicks / views) * 100) : 0;

  // Week-over-week: last 7 stored days vs the 7 before them.
  const sum = (rows: typeof trend, k: "viewers" | "triers") =>
    rows.reduce((a, r) => a + r[k], 0);
  const last7 = trend.slice(-7);
  const prev7 = trend.slice(-14, -7);
  const wow = (k: "viewers" | "triers") => sum(last7, k) - sum(prev7, k);

  const frictionEntries = FRICTION_TAGS.map(
    (t) => [t, stats?.topFeedbackTags[t] ?? 0] as const
  ).filter(([, n]) => n > 0);
  const frictionTotal = frictionEntries.reduce((acc, [, n]) => acc + n, 0);

  return (
    <section className="rounded-2xl border border-border bg-muted p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/app/${app.slug}`} className="font-semibold hover:underline">
            {app.name}
          </Link>
          <p className="text-sm text-muted-foreground">{app.tagline}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={
              app.status === "hidden"
                ? "rounded-full border border-border bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-300"
                : "rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
            }
          >
            {app.status}
          </span>
          <AppActions appId={app.id} status={app.status} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Views" value={views} />
        <Stat label="Completed views" value={stats?.completedViews ?? 0} />
        <Stat label="Try clicks" value={tryClicks} sub={`${ctr}% of views`} />
        <Stat label="Feedback" value={stats?.feedbackCount ?? 0} />
        <Stat label="Likes" value={stats?.likes ?? 0} />
        <Stat label="Saves" value={stats?.saves ?? 0} />
        <Stat label="Shares" value={stats?.shares ?? 0} />
        <Stat label="Try returns" value={stats?.tryReturns ?? 0} />
      </div>

      {trend.length > 0 && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Last 14 days — unique people
            </p>
            {prev7.length > 0 && (
              <p className="text-xs text-muted-foreground">
                vs prev week:{" "}
                <Delta n={wow("viewers")} /> watched · <Delta n={wow("triers")} /> tried
              </p>
            )}
          </div>
          <TrendBars trend={trend} />
          <p className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-foreground/70" /> watched
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-emerald-400" /> tried
            </span>
          </p>
        </div>
      )}

      <BadgeEmbed slug={app.slug} />

      {frictionTotal > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Top friction
          </p>
          <div className="mt-2 space-y-1.5">
            {frictionEntries
              .sort((a, b) => b[1] - a[1])
              .map(([tag, n]) => {
                const pct = Math.round((n / frictionTotal) * 100);
                return (
                  <div key={tag} className="flex items-center gap-2 text-sm">
                    <span className="w-36 shrink-0 text-muted-foreground">
                      {TAG_LABELS[tag]}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full bg-red-400/80"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-muted-foreground">{pct}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {comments.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Comments
          </p>
          <ul className="mt-2 space-y-2">
            {comments.slice(0, 10).map((c) => (
              <li
                key={c.id}
                className="rounded-lg bg-background px-3 py-2 text-sm text-foreground/90"
              >
                {c.rating === "positive" ? "👍 " : c.rating === "negative" ? "👎 " : ""}
                {c.comment}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Delta({ n }: { n: number }) {
  if (n === 0) return <span>±0</span>;
  return n > 0 ? (
    <span className="text-emerald-400">▲{n}</span>
  ) : (
    <span className="text-red-400">▼{Math.abs(n)}</span>
  );
}

/** Server-rendered grouped bar chart — no chart lib, just divs. */
function TrendBars({
  trend,
}: {
  trend: { date: string; viewers: number; triers: number }[];
}) {
  const max = Math.max(1, ...trend.map((d) => d.viewers));
  return (
    <div className="mt-2 flex h-20 items-end gap-1">
      {trend.map((d) => (
        <div
          key={d.date}
          className="flex flex-1 items-end justify-center gap-px"
          title={`${d.date}: ${d.viewers} watched · ${d.triers} tried`}
        >
          <div
            className="w-1/2 rounded-t-sm bg-foreground/70"
            style={{ height: `${Math.max(3, (d.viewers / max) * 100)}%` }}
          />
          <div
            className="w-1/2 rounded-t-sm bg-emerald-400"
            style={{ height: `${Math.max(d.triers > 0 ? 3 : 0, (d.triers / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <p className="text-lg font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}
