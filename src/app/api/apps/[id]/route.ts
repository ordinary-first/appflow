import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

/** Makers can only toggle these via PATCH — 'unclaimed' is reserved for the
 * curation/claim flow and never settable through this endpoint. */
const VALID_STATUSES = ["draft", "published", "hidden"] as const;
type PatchableStatus = (typeof VALID_STATUSES)[number];

/**
 * PATCH /api/apps/[id] — owner only.
 * Body: { status: "draft" | "published" | "hidden" }
 *
 * Drives the dashboard's Hide / Unhide toggle. D1 has no RLS — ownership is
 * asserted by including `makerId = session.user.id` in the WHERE clause, so a
 * caller can never modify someone else's app (the update simply matches no rows).
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const next = String(body.status ?? "");
  if (!(VALID_STATUSES as readonly string[]).includes(next)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const db = await getDb();
  const res = await db
    .update(schema.apps)
    .set({ status: next as PatchableStatus, updatedAt: new Date() })
    .where(and(eq(schema.apps.id, id), eq(schema.apps.makerId, user.id)))
    .returning({ id: schema.apps.id, status: schema.apps.status });

  if (res.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ...res[0] });
}

/**
 * DELETE /api/apps/[id] — owner only.
 * Cascades to interactions and feedback via the FK ON DELETE CASCADE on app_id.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const db = await getDb();
  const res = await db
    .delete(schema.apps)
    .where(and(eq(schema.apps.id, id), eq(schema.apps.makerId, user.id)))
    .returning({ id: schema.apps.id });

  if (res.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
