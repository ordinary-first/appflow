"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { getAnonymousId } from "@/lib/anon";

/** After login, claim this browser's anonymous activity for the account (once). */
export function MergeOnLogin() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;
    const flag = `glim_merged_${session.user.id}`;
    if (localStorage.getItem(flag)) return;
    const anonymousId = getAnonymousId();
    if (!anonymousId) return;
    fetch("/api/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonymousId }),
    })
      .then((r) => {
        if (r.ok) localStorage.setItem(flag, "1");
      })
      .catch(() => {});
  }, [session?.user]);

  return null;
}
