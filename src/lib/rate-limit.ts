import { getEnv } from "@/db";

/**
 * Write-route rate limiting via the Workers Rate Limiting binding (GA).
 * Keyed primarily by CF-Connecting-IP; falls back to the signed anon id so
 * missing-IP traffic (local dev, some proxies) never collapses into one
 * global bucket. Limits are configured in wrangler.toml ([[ratelimits]]).
 *
 * Binding absent:
 *  - production  → loud error log, request allowed (fail-open by decision —
 *    a missing binding is a deploy misconfiguration; deploy checklist item).
 *  - dev/preview → silent no-op.
 */
export async function checkWriteRate(
  req: Request,
  fallbackKey: string
): Promise<{ allowed: boolean }> {
  const env = await getEnv();
  const limiter = env.RL_WRITE;
  if (!limiter) {
    if (env.ENVIRONMENT === "production") {
      console.error(
        "[rate-limit] RL_WRITE binding missing in production — requests are NOT rate limited"
      );
    }
    return { allowed: true };
  }
  const ip = req.headers.get("cf-connecting-ip");
  const key = ip ? `ip:${ip}` : `anon:${fallbackKey}`;
  try {
    const { success } = await limiter.limit({ key });
    return { allowed: success };
  } catch (err) {
    console.error("[rate-limit] limiter.limit failed", err);
    return { allowed: true };
  }
}

export function tooManyRequests(): Response {
  return Response.json({ error: "too many requests" }, { status: 429 });
}
