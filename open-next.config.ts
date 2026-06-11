import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // MVP: no incremental cache / queue overrides. Add R2 incremental cache later if needed.
});
