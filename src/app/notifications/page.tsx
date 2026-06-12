import { Bell } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { BottomNav } from "@/components/BottomNav";

// Session check reads D1 per request.
export const dynamic = "force-dynamic";

/**
 * Inbox tab. v1 shows comment/reply/follow notifications (Phase 5 wires the
 * data); until then it renders the signed-in empty state so the tab exists
 * in the bottom nav from day one.
 */
export default async function NotificationsPage() {
  const user = await getSessionUser();

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <h1 className="text-2xl font-bold">Inbox</h1>

      {user ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Bell className="h-10 w-10 text-muted-foreground/60" />
          <p className="text-base font-medium">No notifications yet.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Comments on your posts and new posts from apps you follow will
            show up here.
          </p>
        </div>
      ) : (
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
      )}

      <BottomNav />
    </main>
  );
}
