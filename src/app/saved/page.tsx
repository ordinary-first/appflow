import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { UserMenu } from "@/components/UserMenu";
import { BottomNav } from "@/components/BottomNav";
import { SavedGrid, EmptySaved, type SavedCardData } from "@/components/SavedGrid";
import { AnonymousSaved } from "@/components/AnonymousSaved";

// D1 reads per request — never statically generate.
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await getSessionUser();

  let userApps: SavedCardData[] | null = null;
  if (user) {
    const db = await getDb();

    // Distinct app_ids the user has ever 'save'-interacted with, ordered by
    // their most recent save. Hidden/deleted apps drop out at the next step.
    const savedRows = await db
      .select({ appId: schema.interactions.appId })
      .from(schema.interactions)
      .where(
        and(
          eq(schema.interactions.userId, user.id),
          eq(schema.interactions.type, "save"),
        ),
      )
      .groupBy(schema.interactions.appId)
      .orderBy(sql`max(${schema.interactions.createdAt}) desc`);

    const orderedIds = savedRows.map((r) => r.appId);
    if (orderedIds.length === 0) {
      userApps = [];
    } else {
      const appsRaw = await db
        .select({
          id: schema.apps.id,
          slug: schema.apps.slug,
          name: schema.apps.name,
          tagline: schema.apps.tagline,
          category: schema.apps.category,
          thumbnailUrl: schema.apps.thumbnailUrl,
        })
        .from(schema.apps)
        .where(
          and(
            // Unclaimed (curated) apps are public — keep them in saved lists.
            inArray(schema.apps.status, ["published", "unclaimed"]),
            inArray(schema.apps.id, orderedIds),
          ),
        );
      const byId = new Map(appsRaw.map((a) => [a.id, a]));
      userApps = orderedIds
        .map((id) => byId.get(id))
        .filter((a): a is SavedCardData => Boolean(a));
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-6 pb-24">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Glim
        </Link>
        {user && <UserMenu variant="inline" />}
      </div>

      <h1 className="mt-5 text-2xl font-bold">Saved</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {user ? "Apps you've bookmarked." : "Saved on this device."}
      </p>

      {user ? (
        userApps && userApps.length > 0 ? (
          <SavedGrid apps={userApps} />
        ) : (
          <EmptySaved hasAccount />
        )
      ) : (
        <>
          <AnonymousSaved />
          <div className="mt-10 rounded-2xl border border-border bg-muted p-5">
            <p className="text-sm font-medium">Want your saves on every device?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sign in once — your existing saves get linked to your account.
            </p>
            <div className="mt-4 max-w-xs">
              <GoogleSignIn callbackURL="/saved" />
            </div>
          </div>
        </>
      )}
      <BottomNav />
    </main>
  );
}
