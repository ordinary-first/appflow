"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";

/**
 * After login, claim this browser's anonymous activity for the account (once).
 * The server reads the HMAC-signed anon cookie itself — no body needed.
 */
export function MergeOnLogin() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;
    const flag = `glim_merged_${session.user.id}`;
    if (localStorage.getItem(flag)) return;
    fetch("/api/merge", { method: "POST" })
      .then((r) => {
        if (r.ok) localStorage.setItem(flag, "1");
      })
      .catch(() => {});
  }, [session?.user]);

  return null;
}
