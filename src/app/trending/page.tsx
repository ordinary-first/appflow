import Link from "next/link";
import { ArrowLeft, Flame } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { getTrending } from "@/lib/stats";

export const dynamic = "force-dynamic";

/**
 * Weekly trending — shareable ranking of what people actually tried and
 * saved this week (deduped identities, not raw event counts). Doubles as
 * marketing material: "this week on Glim" posts come straight from here.
 */
export default async function TrendingPage() {
  let apps: Awaited<ReturnType<typeof getTrending>> = [];
  try {
    apps = await getTrending(10);
  } catch {
    // DB unavailable — render the calm empty state below.
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Glim
      </Link>
      <h1 className="mt-5 flex items-center gap-2 text-2xl font-bold">
        <Flame className="h-6 w-6 text-orange-500" /> Trending this week
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ranked by real people who tried and saved — one person counts once.
      </p>

      {apps.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-base font-medium">Counting this week&apos;s tries…</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check back soon — or go try some apps and put them on the board.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-foreground px-6 text-sm font-semibold text-background hover:bg-foreground/90"
          >
            Open the feed
          </Link>
        </div>
      ) : (
        <ol className="mt-6 space-y-1">
          {apps.map((app, i) => (
            <li key={app.id}>
              <Link
                href={`/app/${app.slug}`}
                className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-muted/40"
              >
                <span
                  className={
                    i < 3
                      ? "w-7 flex-none text-center text-lg font-extrabold text-orange-500"
                      : "w-7 flex-none text-center text-lg font-bold text-muted-foreground"
                  }
                >
                  {i + 1}
                </span>
                {app.iconUrl || app.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- R2/maker media
                  <img
                    src={app.iconUrl ?? app.thumbnailUrl ?? ""}
                    alt=""
                    className="h-11 w-11 flex-none rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-muted text-base font-bold">
                    {app.name[0]?.toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{app.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {app.tagline}
                  </p>
                </div>
                <div className="flex-none text-right text-xs text-muted-foreground">
                  {app.triers > 0 && <p>{app.triers} tried</p>}
                  {app.viewers > 0 && <p>{app.viewers} watched</p>}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
      <BottomNav />
    </main>
  );
}
