import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { resolveAnonIdentity, withAnonCookie } from "@/lib/anon-server";
import { checkWriteRate, tooManyRequests } from "@/lib/rate-limit";
import { FEEDBACK_TAGS, type FeedbackTag } from "@/db/schema";

/**
 * 3-second feedback: tag multi-select + optional one-line comment.
 * Identity is server-determined (session user or HMAC-signed anon cookie) —
 * feedback feeds the App Score, so it gets the same anti-forgery treatment
 * as interactions.
 */
export async function POST(req: Request) {
  let body: {
    appId?: string;
    rating?: "positive" | "neutral" | "negative";
    tags?: string[];
    comment?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { appId, rating } = body;
  const tags = (body.tags ?? []).filter((t): t is FeedbackTag =>
    FEEDBACK_TAGS.includes(t as FeedbackTag)
  );
  const comment = body.comment?.trim().slice(0, 280) || null;

  if (!appId || (tags.length === 0 && !comment)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const user = await getSessionUser();
  const anon = await resolveAnonIdentity(req);

  const rate = await checkWriteRate(req, anon.anonId);
  if (!rate.allowed) return withAnonCookie(tooManyRequests(), anon);

  // Derive rating from tags when not given.
  const derivedRating =
    rating ??
    (tags.some((t) => t === "useful" || t === "interesting")
      ? ("positive" as const)
      : tags.length > 0
        ? ("negative" as const)
        : ("neutral" as const));

  const db = await getDb();
  const now = new Date();
  const anonymousId = user ? null : anon.anonId;
  try {
    await db.insert(schema.feedback).values({
      id: crypto.randomUUID(),
      appId,
      userId: user?.id ?? null,
      anonymousId,
      rating: derivedRating,
      tags,
      comment,
      createdAt: now,
    });
    await db.insert(schema.interactions).values({
      id: crypto.randomUUID(),
      appId,
      type: "feedback_submit",
      userId: user?.id ?? null,
      anonymousId,
      createdAt: now,
    });
  } catch {
    return withAnonCookie(
      NextResponse.json({ error: "unknown app" }, { status: 400 }),
      anon
    );
  }

  return withAnonCookie(NextResponse.json({ ok: true }), anon);
}
