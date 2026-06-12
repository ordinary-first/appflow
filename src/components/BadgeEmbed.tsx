"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * "Live on Glim" embed badge snippet (E5) — the maker pastes this on their
 * site; every badge render is a free inbound channel (Product Hunt's badge
 * playbook). The dashboard shows a live preview + one-tap copy.
 */
export function BadgeEmbed({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const badgeUrl = `/api/badge/${slug}`;

  const copy = async () => {
    const origin = window.location.origin;
    const snippet = `<a href="${origin}/app/${slug}?utm_source=badge"><img src="${origin}${badgeUrl}" alt="Live on Glim" height="28" /></a>`;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Embed badge
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- own SVG endpoint */}
      <img src={badgeUrl} alt="Live on Glim badge preview" className="h-7" />
      <button
        onClick={copy}
        className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border px-3 text-xs text-muted-foreground transition hover:text-foreground cursor-pointer"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy embed code"}
      </button>
    </div>
  );
}
