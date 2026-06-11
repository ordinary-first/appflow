import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Enables access to Cloudflare bindings (D1, R2) during `next dev` via miniflare.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Demo videos are served from external hosts and our own /api/media route;
  // we don't use next/image optimization on the Workers runtime.
  images: { unoptimized: true },
};

export default nextConfig;
