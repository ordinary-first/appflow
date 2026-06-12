import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { getDb, getEnv, schema } from "@/db";

/**
 * Auth/anon-cookie signing secret. Fail-closed: in production (wrangler
 * [vars] ENVIRONMENT="production") a missing secret throws instead of
 * silently signing sessions with a publicly known fallback string.
 */
export function getAuthSecret(env: CloudflareEnv): string {
  const secret = env.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (env.ENVIRONMENT === "production") {
    throw new Error("BETTER_AUTH_SECRET is not set in production");
  }
  return "dev-only-insecure-secret-change-me";
}

/**
 * better-auth must be constructed per-request on Workers because the D1
 * binding is only available inside a request context.
 */
export async function getAuth() {
  const [db, env] = await Promise.all([getDb(), getEnv()]);
  const secret = getAuthSecret(env);
  const baseURL =
    env.BETTER_AUTH_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000";
  const googleClientId =
    env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "";
  const googleClientSecret =
    env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "";

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    secret,
    baseURL,
    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
    },
  });
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

/** Current logged-in user, or null. Server-side only. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    const { id, name, email, image } = session.user;
    return { id, name, email, image };
  } catch {
    return null;
  }
}
