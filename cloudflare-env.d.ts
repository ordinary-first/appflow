// Types for Cloudflare bindings + secrets available via getCloudflareContext().env

/** Workers Rate Limiting binding (GA) — wrangler.toml [[ratelimits]]. */
interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface CloudflareEnv {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
  /** Absent in local dev (binding is a no-op there). */
  RL_WRITE?: RateLimitBinding;
  // [vars] / secrets (.dev.vars locally, `wrangler secret put` in prod)
  /** "production" in deployed workers; .dev.vars overrides locally. */
  ENVIRONMENT?: string;
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** Operator token for POST /api/claims/approve (claim flow, manual v1). */
  CLAIM_ADMIN_TOKEN?: string;
}
