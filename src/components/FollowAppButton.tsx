"use client";

import { useEffect, useState } from "react";
import { Plus, Check } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Follow/unfollow pill for app profile pages. Anonymous tap → login dialog. */
export function FollowAppButton({
  appId,
  appSlug,
  initialCount,
}: {
  appId: string;
  appSlug: string;
  initialCount: number;
}) {
  const { data: session } = useSession();
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    fetch("/api/follows")
      .then(async (r): Promise<{ follows: { targetType: string; targetId: string }[] }> =>
        r.ok ? ((await r.json()) as { follows: { targetType: string; targetId: string }[] }) : { follows: [] }
      )
      .then((d) => {
        if (cancelled) return;
        setFollowing(d.follows.some((f) => f.targetType === "app" && f.targetId === appId));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.user, appId]);

  const toggle = async () => {
    if (!session?.user) {
      setShowLogin(true);
      return;
    }
    const was = following;
    setFollowing(!was);
    setCount((c) => c + (was ? -1 : 1));
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "app", targetId: appId }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { followerCount?: number };
      if (typeof data.followerCount === "number") setCount(data.followerCount);
    } catch {
      setFollowing(was);
      setCount((c) => c + (was ? 1 : -1));
    }
  };

  return (
    <>
      <button
        onClick={toggle}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition cursor-pointer",
          following
            ? "border border-border bg-muted text-foreground"
            : "bg-red-500 text-white hover:bg-red-600"
        )}
      >
        {following ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {following ? "Following" : "Follow"}
        {count > 0 && <span className="opacity-75">· {count}</span>}
      </button>

      <Dialog open={showLogin} onClose={() => setShowLogin(false)}>
        <h2 className="text-lg font-semibold">Follow this app&apos;s journey.</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to get its updates in your Following feed.
        </p>
        <div className="mt-4">
          <GoogleSignIn callbackURL={`/app/${appSlug}`} />
        </div>
      </Dialog>
    </>
  );
}
