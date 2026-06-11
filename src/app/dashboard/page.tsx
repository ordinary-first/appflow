import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { ArrowLeft, Plus } from "lucide-react";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { getAppStats, type AppStats } from "@/lib/feed";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { UserMenu } from "@/components/UserMenu";
import { AppActions } from "@/components/AppActions";

type AppStatus = "draft" | "published" | "hidden";

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

  const statsMap = await getAppStats();
  const appIds = myApps.map((a) => a.id);
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
  comments,
}: {
  app: { id: string; name: string; slug: string; tagline: string; status: AppStatus };
  stats?: AppStats;
  comments: { id: string; comment: string; rating: string | null }[];
}) {
  const views = stats?.views ?? 0;
  const tryClicks = stats?.tryClicks ?? 0;
  const ctr = views > 0 ? Math.round((tryClicks / views) * 100) : 0;

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

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <p className="text-lg font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}
