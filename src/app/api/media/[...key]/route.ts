import { getEnv } from "@/db";

/**
 * Streams R2 objects (demo videos / thumbnails) with Range support so
 * <video> seeking works. R2 egress is free, so serving video here is cheap.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ key: string[] }> }
) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!key.startsWith("uploads/")) {
    return new Response("not found", { status: 404 });
  }

  const env = await getEnv();
  const range = req.headers.get("range");

  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    if (m) {
      const start = Number(m[1]);
      const head = await env.BUCKET.head(key);
      if (!head) return new Response("not found", { status: 404 });
      const size = head.size;
      const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
      const obj = await env.BUCKET.get(key, {
        range: { offset: start, length: end - start + 1 },
      });
      if (!obj) return new Response("not found", { status: 404 });
      return new Response(obj.body as ReadableStream, {
        status: 206,
        headers: {
          "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Content-Length": String(end - start + 1),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  const obj = await env.BUCKET.get(key);
  if (!obj) return new Response("not found", { status: 404 });
  return new Response(obj.body as ReadableStream, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Content-Length": String(obj.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
