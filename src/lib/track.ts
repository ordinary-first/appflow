"use client";

import type { InteractionType } from "@/db/schema";

const seen = new Set<string>();

/**
 * Fire-and-forget interaction tracking.
 * Identity is server-determined: the HMAC-signed `glim_anon_id` cookie rides
 * along automatically — the client no longer mints or sends an anonymousId
 * (forgeable ids were a feed-ranking manipulation vector).
 * `once` dedupes per (appId,type) for the current page session.
 */
export function track(
  appId: string,
  type: InteractionType,
  metadata?: Record<string, unknown>,
  opts?: { once?: boolean }
) {
  if (opts?.once) {
    const k = `${appId}:${type}`;
    if (seen.has(k)) return;
    seen.add(k);
  }
  const body = JSON.stringify({ appId, type, metadata });
  // keepalive so skips/page-leaves still get recorded
  fetch("/api/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
