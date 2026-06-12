/**
 * Pure crypto primitives for the signed anonymous-id cookie. No Workers or
 * Next.js dependencies — unit-testable in plain vitest (Node 18+ WebCrypto).
 *
 * Cookie format: `v1.<uuid>.<base64url(HMAC-SHA256("v1.<uuid>"))>`
 * The version label ("glim-anon-v1") is baked into the HKDF info parameter,
 * so rotating to v2 derives a different key and silently invalidates v1
 * cookies (server just issues a fresh identity — anonymous ids are low-stakes).
 */

const VERSION = "v1";
const HKDF_INFO = "glim-anon-v1";

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Derives the anon-cookie HMAC key from the auth secret via HKDF.
 * Salt is an explicit zero-length array (HKDF treats it as a zero salt).
 */
export async function deriveAnonKey(secret: string): Promise<CryptoKey> {
  const ikm = await crypto.subtle.importKey("raw", enc.encode(secret), "HKDF", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: enc.encode(HKDF_INFO),
    },
    ikm,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Signs an anon id, returning the full cookie value `v1.<id>.<sig>`. */
export async function signAnonId(key: CryptoKey, id: string): Promise<string> {
  const payload = `${VERSION}.${id}`;
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

/**
 * Verifies a cookie value. Returns the embedded anon id when the signature
 * checks out (constant-time via subtle.verify), or null for anything else —
 * missing parts, wrong version label, forged or legacy unsigned values.
 */
export async function verifyAnonCookie(
  key: CryptoKey,
  cookieValue: string
): Promise<string | null> {
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return null;
  const [version, id, sig] = parts;
  if (version !== VERSION || !id || !sig) return null;
  // Re-encode the base64url signature back to bytes.
  const b64 = sig.replace(/-/g, "+").replace(/_/g, "/");
  let sigBytes: Uint8Array<ArrayBuffer>;
  try {
    const raw = atob(b64);
    sigBytes = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) sigBytes[i] = raw.charCodeAt(i);
  } catch {
    return null;
  }
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    enc.encode(`${version}.${id}`)
  );
  return ok ? id : null;
}
