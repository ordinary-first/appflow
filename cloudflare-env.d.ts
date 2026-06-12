// Types for Cloudflare bindings + secrets available via getCloudflareContext().env
interface CloudflareEnv {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
  // [vars] / secrets (.dev.vars locally, `wrangler secret put` in prod)
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** Operator token for POST /api/claims/approve (claim flow, manual v1). */
  CLAIM_ADMIN_TOKEN?: string;
}
