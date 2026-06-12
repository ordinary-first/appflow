import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { TryView } from "@/components/TryView";

export const dynamic = "force-dynamic";

export default async function TryPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const db = await getDb();
  const [app] = await db
    .select()
    .from(schema.apps)
    .where(eq(schema.apps.id, appId))
    .limit(1);

  // Unclaimed (curated) apps are public and fully try-able — same rule as the
  // feed and the app detail page. Only draft/hidden are excluded.
  if (!app || !["published", "unclaimed"].includes(app.status)) notFound();
  if (app.platform !== "web") notFound(); // native apps link out; no iframe view

  return (
    <TryView
      app={{
        id: app.id,
        name: app.name,
        slug: app.slug,
        url: app.url,
        embeddable: app.embeddable,
      }}
    />
  );
}
