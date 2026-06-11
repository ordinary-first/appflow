"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";

const CATEGORIES = [
  "AI",
  "Productivity",
  "DevTools",
  "Finance",
  "Health",
  "Content",
  "Education",
  "Game",
  "Other",
];

async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "upload failed");
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

export function SubmitForm({ defaultMakerName }: { defaultMakerName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);

    try {
      const youtubeUrl = String(fd.get("youtubeUrl") ?? "").trim();
      if (!video && !youtubeUrl) {
        throw new Error("Upload a 15-second demo video (recommended) or add a YouTube URL.");
      }

      const demoVideoUrl = video ? await uploadFile(video) : null;
      const thumbnailUrl = thumb ? await uploadFile(thumb) : null;

      const res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          tagline: fd.get("tagline"),
          description: fd.get("description") || undefined,
          url: fd.get("url"),
          category: fd.get("category"),
          tags: String(fd.get("tags") ?? "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          demoVideoUrl,
          youtubeUrl: youtubeUrl || undefined,
          thumbnailUrl,
          makerName: fd.get("makerName") || undefined,
          makerWebsite: fd.get("makerWebsite") || undefined,
          makerX: fd.get("makerX") || undefined,
          makerGithub: fd.get("makerGithub") || undefined,
          guestModeAvailable: fd.get("guestModeAvailable") === "on",
          noLoginTrialAvailable: fd.get("noLoginTrialAvailable") === "on",
          embeddable: fd.get("embeddable") === "on",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to submit");
      }
      const { slug } = (await res.json()) as { slug: string };
      router.push(`/app/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      <Field label="App name *">
        <Input name="name" required maxLength={80} placeholder="MeetingNote AI" />
      </Field>
      <Field label="App URL *">
        <Input name="url" type="url" required placeholder="https://yourapp.com" />
      </Field>
      <Field label="Tagline (one line) *">
        <Input
          name="tagline"
          required
          maxLength={120}
          placeholder="AI meeting notes in seconds."
        />
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={4} maxLength={2000} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Category *">
          <select
            name="category"
            required
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tags (comma separated)">
          <Input name="tags" placeholder="ai, notes, meetings" />
        </Field>
      </div>

      <Field
        label="15-second demo video (mp4/webm) — recommended"
        hint="Hosted on Glim (R2): no ads, no branding. YouTube below is a fallback and may show ads."
      >
        <Input
          type="file"
          accept="video/mp4,video/webm"
          onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
        />
      </Field>
      <Field label="YouTube URL (fallback)">
        <Input name="youtubeUrl" placeholder="https://youtube.com/watch?v=…" />
      </Field>
      <Field label="Thumbnail (png/jpg/webp)">
        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setThumb(e.target.files?.[0] ?? null)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Maker name">
          <Input name="makerName" defaultValue={defaultMakerName} maxLength={60} />
        </Field>
        <Field label="Website">
          <Input name="makerWebsite" placeholder="https://…" />
        </Field>
        <Field label="X / Twitter">
          <Input name="makerX" placeholder="https://x.com/…" />
        </Field>
        <Field label="GitHub">
          <Input name="makerGithub" placeholder="https://github.com/…" />
        </Field>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-muted p-4 text-sm">
        <Check name="noLoginTrialAvailable" label="Usable for 30+ seconds without login (boosts your ranking)" />
        <Check name="guestModeAvailable" label="Has a guest mode" />
        <Check name="embeddable" label="Can be embedded in an iframe" defaultChecked />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button size="lg" className="w-full" disabled={busy}>
        {busy ? "Publishing…" : "Publish to the feed"}
      </Button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-white"
      />
      <span>{label}</span>
    </label>
  );
}
