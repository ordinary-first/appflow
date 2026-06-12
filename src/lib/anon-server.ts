import { getEnv } from "@/db";
import { getAuthSecret } from "@/lib/auth";
import { deriveAnonKey, signAnonId, verifyAnonCookie } from "@/lib/anon-crypto";

/**
 * Server-determined anonymous identity (signed cookie).
 *
 * The client never supplies its own anonymousId anymore — the server reads
 * the HMAC-signed `glim_anon_id` cookie, and on a first/forged/legacy value
 * it mints a fresh id, ACCEPTS the current request with it, and asks the
 * caller to attach the Set-Cookie header to the response.
 */

const COOKIE = "glim_anon_id";
const MAX_AGE = 60 * 60 * 24 * 365;

// HKDF is cheap but not free — cache the derived key per isolate. Keyed by
// secret so a rotated secret in a fresh deployment derives a fresh key.
let cached: { secret: string; key: Promise<CryptoKey> } | null = null;

async function getKey(): Promise<CryptoKey> {
  const env = await getEnv();
  const secret = getAuthSecret(env);
  if (!cached || cached.secret !== secret) {
    cached = { secret, key: deriveAnonKey(secret) };
  }
  return cached.key;
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export type AnonIdentity = {
  anonId: string;
  /** Non-null when a fresh identity was minted — attach to the response. */
  setCookie: string | null;
};

export async function resolveAnonIdentity(req: Request): Promise<AnonIdentity> {
  const key = await getKey();
  const raw = readCookie(req, COOKIE);
  if (raw) {
    const id = await verifyAnonCookie(key, raw);
    if (id) return { anonId: id, setCookie: null };
  }
  // First visit, legacy unsigned cookie, or forged value: mint and accept.
  const id = crypto.randomUUID();
  const value = await signAnonId(key, id);
  return {
    anonId: id,
    setCookie: `${COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`,
  };
}

/** Attaches the Set-Cookie header from resolveAnonIdentity when present. */
export function withAnonCookie(res: Response, identity: AnonIdentity): Response {
  if (identity.setCookie) res.headers.append("Set-Cookie", identity.setCookie);
  return res;
}

/**
 * Verify-only anon id for server components (RSC can't set cookies, so a
 * missing/invalid cookie just means "no anonymous identity yet" — the first
 * write route will mint one).
 */
export async function readAnonIdFromCookies(): Promise<string | null> {
  const { cookies } = await import("next/headers");
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const key = await getKey();
  return verifyAnonCookie(key, raw);
}
