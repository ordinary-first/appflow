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

  if (!app || app.status !== "published") notFound();

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
