import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";

/**
 * POST /api/posts — publish a text review (the feedback→review conversion).
 * Login required (posts.authorId is NOT NULL); body: { appId, body }.
 * The one-tap consent in the feedback modal is the only entry point today —
 * the prompt explicitly says the review will be public.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  let payload: { appId?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const appId = String(payload.appId ?? "").trim();
  const body = String(payload.body ?? "").trim().slice(0, 280);
  if (!appId || body.length < 20) {
    return NextResponse.json(
      { error: "appId and a review of at least 20 characters are required" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const [app] = await db
    .select({ id: schema.apps.id, status: schema.apps.status })
    .from(schema.apps)
    .where(eq(schema.apps.id, appId))
    .limit(1);
  if (!app || app.status === "hidden") {
    return NextResponse.json({ error: "app not found" }, { status: 404 });
  }

  const id = crypto.randomUUID();
  await db.insert(schema.posts).values({
    id,
    appId,
    authorId: user.id,
    type: "review",
    status: "published",
    mediaType: "text",
    videoUrl: null,
    imageUrls: null,
    thumbnailUrl: null,
    caption: body,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true, postId: id });
}
