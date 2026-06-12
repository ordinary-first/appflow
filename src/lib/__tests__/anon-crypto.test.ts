import { describe, expect, it } from "vitest";
import { deriveAnonKey, signAnonId, verifyAnonCookie } from "@/lib/anon-crypto";

describe("anon cookie HMAC", () => {
  it("round-trips a signed id", async () => {
    const key = await deriveAnonKey("test-secret");
    const cookie = await signAnonId(key, "abc-123");
    expect(await verifyAnonCookie(key, cookie)).toBe("abc-123");
  });

  it("rejects forged signatures", async () => {
    const key = await deriveAnonKey("test-secret");
    const cookie = await signAnonId(key, "abc-123");
    const [v, id] = cookie.split(".");
    expect(await verifyAnonCookie(key, `${v}.${id}.AAAAforged`)).toBeNull();
  });

  it("rejects an id swapped into a valid envelope", async () => {
    const key = await deriveAnonKey("test-secret");
    const cookie = await signAnonId(key, "victim-id");
    const [v, , sig] = cookie.split(".");
    expect(await verifyAnonCookie(key, `${v}.attacker-id.${sig}`)).toBeNull();
  });

  it("rejects legacy unsigned values and malformed input", async () => {
    const key = await deriveAnonKey("test-secret");
    expect(await verifyAnonCookie(key, "plain-uuid-no-signature")).toBeNull();
    expect(await verifyAnonCookie(key, "")).toBeNull();
    expect(await verifyAnonCookie(key, "v1.only-two")).toBeNull();
    expect(await verifyAnonCookie(key, "v1.id.%%%not-base64%%%")).toBeNull();
  });

  it("rejects cookies signed under a different secret (key rotation)", async () => {
    const k1 = await deriveAnonKey("secret-v1");
    const k2 = await deriveAnonKey("secret-v2-rotated");
    const cookie = await signAnonId(k1, "abc-123");
    expect(await verifyAnonCookie(k2, cookie)).toBeNull();
    // and the fresh key still works for fresh cookies
    expect(await verifyAnonCookie(k2, await signAnonId(k2, "new-id"))).toBe("new-id");
  });

  it("rejects a wrong version label even with a matching key", async () => {
    const key = await deriveAnonKey("test-secret");
    const cookie = await signAnonId(key, "abc-123");
    const [, id, sig] = cookie.split(".");
    expect(await verifyAnonCookie(key, `v2.${id}.${sig}`)).toBeNull();
  });
});
