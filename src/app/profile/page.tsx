import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { LayoutDashboard, Bookmark, User as UserIcon } from "lucide-react";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { UserMenu } from "@/components/UserMenu";
import { BottomNav } from "@/components/BottomNav";

// Session + D1 reads per request.
export const dynamic = "force-dynamic";

/**
 * Profile tab. v1: identity card + quick links (dashboard for makers,
 * saved apps). Phase 6 turns this into the full maker profile with
 * "My apps" / "My reviews" tabs and public /maker/[id] pages.
 */
export default async function ProfilePage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
        <h1 className="text-2xl font-bold">Profile</h1>
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <UserIcon className="h-10 w-10 text-muted-foreground/60" />
          <p className="text-base font-medium">Sign in to Glim.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Keep your saves and likes across devices, follow apps, and submit
            your own.
          </p>
          <div className="mt-2 w-full max-w-xs">
            <GoogleSignIn callbackURL="/profile" />
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  const db = await getDb();
  const [appCountRow] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.apps)
    .where(eq(schema.apps.makerId, user.id));
  const appCount = appCountRow?.n ?? 0;

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        <UserMenu variant="inline" />
      </div>

      <div className="mt-6 flex items-center gap-4">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- OAuth avatar
          <img src={user.image} alt="" className="h-16 w-16 rounded-full" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-semibold">
            {(user.name?.[0] ?? "?").toUpperCase()}
          </span>
        )}
        <div>
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-3">
        {appCount > 0 && (
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-2xl border border-border bg-muted p-4 transition hover:border-foreground/40"
          >
            <LayoutDashboard className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Maker dashboard</p>
              <p className="text-xs text-muted-foreground">
                {appCount} app{appCount > 1 ? "s" : ""} · views, try rate,
                feedback
              </p>
            </div>
          </Link>
        )}
        <Link
          href="/saved"
          className="flex items-center gap-3 rounded-2xl border border-border bg-muted p-4 transition hover:border-foreground/40"
        >
          <Bookmark className="h-5 w-5" />
          <div>
            <p className="text-sm font-medium">Saved apps</p>
            <p className="text-xs text-muted-foreground">
              Apps you bookmarked to try later
            </p>
          </div>
        </Link>
        {appCount === 0 && (
          <Link
            href="/submit"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
          >
            <LayoutDashboard className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Submit your first app</p>
              <p className="text-xs">
                Show what you&apos;re building — video or screenshots
              </p>
            </div>
          </Link>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
