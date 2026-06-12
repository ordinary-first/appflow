"use client";

import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * "Did you make this app?" CTA shown on unclaimed (curated) app pages.
 * Logged-in makers submit a proof URL; the operator approves manually (v1).
 */
export function ClaimButton({ appId, appSlug }: { appId: string; appSlug: string }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const submit = async () => {
    setState("busy");
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId, proofUrl: proofUrl.trim() || undefined }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-muted p-5 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <BadgeCheck className="h-4 w-4" /> Claim received.
        </p>
        <p className="mt-1 text-muted-foreground">
          We&apos;ll review it and hand the app over to you — usually within a
          day. You&apos;ll get a notification.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-border p-5">
      <p className="text-sm font-medium">Did you make this app?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        This app was curated by Glim. Claim it to get your maker profile,
        followers and feedback.
      </p>

      {!session?.user ? (
        <div className="mt-3 max-w-xs">
          <GoogleSignIn callbackURL={`/app/${appSlug}`} />
        </div>
      ) : !open ? (
        <Button className="mt-3" variant="outline" onClick={() => setOpen(true)}>
          Claim this app
        </Button>
      ) : (
        <div className="mt-3 space-y-2">
          <Input
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            placeholder="Proof link — your X/Product Hunt post or site (optional)"
          />
          <div className="flex gap-2">
            <Button onClick={submit} disabled={state === "busy"}>
              {state === "busy" ? "Submitting…" : "Submit claim"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          {state === "error" && (
            <p className="text-xs text-red-400">Something went wrong — try again.</p>
          )}
        </div>
      )}
    </div>
  );
}
