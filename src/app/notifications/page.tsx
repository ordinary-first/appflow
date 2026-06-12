import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Bell, MessageSquare, Reply, UserPlus } from "lucide-react";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { BottomNav } from "@/components/BottomNav";
import { MarkNotificationsRead } from "@/components/MarkNotificationsRead";

// Session + D1 reads per request.
export const dynamic = "force-dynamic";

/**
 * Inbox: comment / reply / follow notifications, newest first.
 * Opening the page marks everything read (client trigger).
 * "New post from followed app" is not stored — it surfaces in the
 * Following feed tab instead (no fan-out rows by design).
 */
export default async function NotificationsPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/60" />
          <p className="text-base font-medium">Sign in to see your inbox.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Replies to your comments and updates from apps you follow land here.
          </p>
          <div className="mt-2 w-full max-w-xs">
            <GoogleSignIn callbackURL="/notifications" />
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  const db = await getDb();
  const rows = await db
    .select({
      id: schema.notifications.id,
      type: schema.notifications.type,
      postId: schema.notifications.postId,
      read: schema.notifications.read,
      createdAt: schema.notifications.createdAt,
      actorName: schema.user.name,
      actorImage: schema.user.image,
    })
    .from(schema.notifications)
    .leftJoin(schema.user, eq(schema.notifications.actorId, schema.user.id))
    .where(eq(schema.notifications.recipientId, user.id))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(50);

  // Resolve post → app slug for clickable rows (small set, one query).
  const postIds = [...new Set(rows.map((r) => r.postId).filter(Boolean))] as string[];
  const postApps = new Map<string, { slug: string; name: string }>();
  if (postIds.length > 0) {
    const apps = await db
      .select({
        postId: schema.posts.id,
        slug: schema.apps.slug,
        name: schema.apps.name,
      })
      .from(schema.posts)
      .innerJoin(schema.apps, eq(schema.posts.appId, schema.apps.id));
    for (const a of apps) {
      if (postIds.includes(a.postId)) postApps.set(a.postId, a);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <h1 className="text-2xl font-bold">Inbox</h1>
      <MarkNotificationsRead />

      {rows.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/60" />
          <p className="text-base font-medium">No notifications yet.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Comments on your posts and new followers will show up here. New
            posts from apps you follow are in the Following tab.
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border">
          {rows.map((n) => {
            const app = n.postId ? postApps.get(n.postId) : null;
            const text =
              n.type === "comment"
                ? `commented on your post${app ? ` (${app.name})` : ""}`
                : n.type === "reply"
                  ? `replied to your comment${app ? ` (${app.name})` : ""}`
                  : "started following you";
            const Icon =
              n.type === "comment"
                ? MessageSquare
                : n.type === "reply"
                  ? Reply
                  : UserPlus;
            const row = (
              <div className="flex items-center gap-3 py-3.5">
                {n.actorImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- OAuth avatar
                  <img src={n.actorImage} alt="" className="h-9 w-9 rounded-full" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{n.actorName ?? "Someone"}</span>{" "}
                    <span className="text-muted-foreground">{text}</span>
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {n.createdAt.toLocaleDateString()}
                  </p>
                </div>
                {!n.read && (
                  <span className="h-2 w-2 flex-none rounded-full bg-red-500" />
                )}
              </div>
            );
            return (
              <li key={n.id}>
                {app ? (
                  <Link href={`/app/${app.slug}`} className="block transition hover:bg-muted/50">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}

      <BottomNav />
    </main>
  );
}
