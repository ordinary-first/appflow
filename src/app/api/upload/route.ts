import { NextResponse } from "next/server";
import { getEnv } from "@/db";
import { getSessionUser } from "@/lib/auth";

const MAX_BYTES = 100 * 1024 * 1024; // 100MB — 15s demo clips are far smaller
const ALLOWED = ["video/mp4", "video/webm", "image/png", "image/jpeg", "image/webp"];

/**
 * Uploads a demo video / thumbnail to R2 through the Worker (login required).
 * The file is served back via /api/media/<key>, so no public-bucket setup is
 * needed and it works identically in local dev (miniflare R2) and production.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: `unsupported type: ${file.type}` },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large (max 100MB)" }, { status: 400 });
  }

  const ext = file.type.split("/")[1] ?? "bin";
  const key = `uploads/${user.id}/${crypto.randomUUID()}.${ext}`;

  const env = await getEnv();
  await env.BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  return NextResponse.json({ ok: true, key, url: `/api/media/${key}` });
}
