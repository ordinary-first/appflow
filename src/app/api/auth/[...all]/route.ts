import { getAuth } from "@/lib/auth";

// better-auth is built per-request (D1 binding is request-scoped on Workers).
async function handler(req: Request) {
  const auth = await getAuth();
  return auth.handler(req);
}

export { handler as GET, handler as POST };
