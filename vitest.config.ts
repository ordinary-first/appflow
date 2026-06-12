import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Plain-Node vitest for the pure truth-logic layer (anon-crypto, toggle
 * helpers, backfill SQL against in-memory better-sqlite3). Route handlers
 * depend on the Workers request context (getCloudflareContext) and are NOT
 * runnable here — route-level integration tests are a TODO via
 * @cloudflare/vitest-pool-workers.
 *
 * NOTE: better-sqlite3 is a dialect smoke test, not a D1 guarantee —
 * RETURNING/date-function edge cases can differ. Gate 2's rate-limit proof
 * stays manual (curl) for that reason.
 */
export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
