import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, getEnv, schema } from "@/db";
import { GLIM_SYSTEM_USER_ID } from "@/db/schema";

async function digestEquals(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [da, db_] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const ua = new Uint8Array(da);
  const ub = new Uint8Array(db_);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

/**
 * POST /api/claims/approve — operator-only (x-admin-token header must match
 * the CLAIM_ADMIN_TOKEN secret). Body: { claimId, approve?: boolean }.
 *
 * Approval transfers ownership: apps.makerId/makerName → claimant,
 * status 'unclaimed' → 'published', system-authored official posts are
 * reassigned, and the claimant gets a claim_approved notification.
 * likes/saves/follows need no migration — they key off appId/postId.
 *
 * Operator usage:
 *   curl -X POST https://…/api/claims/approve \
 *     -H "x-admin-token: $CLAIM_ADMIN_TOKEN" \
 *     -H "Content-Type: application/json" -d '{"claimId":"…"}'
 */
export async function POST(req: Request) {
  const env = (await getEnv()) as { CLAIM_ADMIN_TOKEN?: string };
  const token = env.CLAIM_ADMIN_TOKEN;
  const given = req.headers.get("x-admin-token");
  // Constant-time compare via SHA-256 digests — direct string !== leaks
  // timing on this ownership-transfer secret. Fails closed when unset.
  if (!token || !given || !(await digestEquals(given, token))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const claimId = String(body.claimId ?? "").trim();
  const approve = body.approve === undefined ? true : Boolean(body.approve);
  if (!claimId) {
    return NextResponse.json({ error: "claimId required" }, { status: 400 });
  }

  const db = await getDb();
  const [claim] = await db
    .select()
    .from(schema.claimRequests)
    .where(eq(schema.claimRequests.id, claimId))
    .limit(1);
  if (!claim || claim.status !== "pending") {
    return NextResponse.json({ error: "pending claim not found" }, { status: 404 });
  }

  if (!approve) {
    await db
      .update(schema.claimRequests)
      .set({ status: "rejected" })
      .where(eq(schema.claimRequests.id, claimId));
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  const [claimant] = await db
    .select({ id: schema.user.id, name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, claim.userId))
    .limit(1);
  if (!claimant) {
    return NextResponse.json({ error: "claimant no longer exists" }, { status: 404 });
  }

  await db
    .update(schema.apps)
    .set({
      makerId: claimant.id,
      makerName: claimant.name,
      status: "published",
      updatedAt: new Date(),
    })
    .where(eq(schema.apps.id, claim.appId));

  // Hand the system-curated official posts to their real maker.
  // User reviews keep their original authors.
  await db
    .update(schema.posts)
    .set({ authorId: claimant.id })
    .where(
      and(
        eq(schema.posts.appId, claim.appId),
        eq(schema.posts.authorId, GLIM_SYSTEM_USER_ID),
        eq(schema.posts.type, "official")
      )
    );

  await db
    .update(schema.claimRequests)
    .set({ status: "approved" })
    .where(eq(schema.claimRequests.id, claimId));

  await db.insert(schema.notifications).values({
    id: crypto.randomUUID(),
    recipientId: claimant.id,
    type: "claim_approved",
    postId: null,
    actorId: null,
    read: false,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true, status: "approved", appId: claim.appId });
}
