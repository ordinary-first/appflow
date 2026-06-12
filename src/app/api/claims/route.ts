import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";

/**
 * POST /api/claims — "I made this app." Login required; the app must be in
 * 'unclaimed' status. One pending request per user+app. The claimant adds a
 * proof URL (their X/Product Hunt/site) for the operator's manual review —
 * automated domain-email verification is a v2 upgrade.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const appId = String(body.appId ?? "").trim();
  const proofUrl = body.proofUrl ? String(body.proofUrl).trim().slice(0, 500) : null;
  // Outreach attribution — the DM → claim conversion KPI's measurement basis.
  const utmSource = body.utmSource
    ? String(body.utmSource).trim().slice(0, 60) || null
    : null;
  if (!appId) {
    return NextResponse.json({ error: "appId required" }, { status: 400 });
  }

  const db = await getDb();
  const [app] = await db
    .select({ id: schema.apps.id, status: schema.apps.status })
    .from(schema.apps)
    .where(eq(schema.apps.id, appId))
    .limit(1);
  if (!app) {
    return NextResponse.json({ error: "app not found" }, { status: 404 });
  }
  if (app.status !== "unclaimed") {
    return NextResponse.json(
      { error: "this app already has a maker" },
      { status: 409 }
    );
  }

  const existing = await db
    .select({ id: schema.claimRequests.id })
    .from(schema.claimRequests)
    .where(
      and(
        eq(schema.claimRequests.appId, appId),
        eq(schema.claimRequests.userId, user.id),
        eq(schema.claimRequests.status, "pending")
      )
    )
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ ok: true, status: "pending" });
  }

  await db.insert(schema.claimRequests).values({
    id: crypto.randomUUID(),
    appId,
    userId: user.id,
    status: "pending",
    proofUrl,
    utmSource,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true, status: "pending" });
}
