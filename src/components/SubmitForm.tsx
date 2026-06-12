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

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB per screenshot

export function SubmitForm({ defaultMakerName }: { defaultMakerName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"web" | "ios" | "android" | "cross_platform">("web");
  const [mediaMode, setMediaMode] = useState<"video" | "images">("video");
  const [video, setVideo] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [captions, setCaptions] = useState<string[]>([]);
  const [thumb, setThumb] = useState<File | null>(null);

  const onPickImages = (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files).slice(0, MAX_IMAGES);
    const oversize = picked.find((f) => f.size > MAX_IMAGE_BYTES);
    if (oversize) {
      setError(`"${oversize.name}" is over 5MB — please compress it.`);
      return;
    }
    setError(null);
    setImages(picked);
    setCaptions(picked.map(() => ""));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);

    try {
      const youtubeUrl = String(fd.get("youtubeUrl") ?? "").trim();
      if (mediaMode === "video" && !video && !youtubeUrl) {
        throw new Error("Upload a 15-second demo video (recommended) or add a YouTube URL.");
      }
      if (mediaMode === "images" && images.length === 0) {
        throw new Error("Add 1–5 screenshots of your app.");
      }

      const demoVideoUrl =
        mediaMode === "video" && video ? await uploadFile(video) : null;
      const imageUrls =
        mediaMode === "images"
          ? await Promise.all(images.map((f) => uploadFile(f)))
          : [];
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
          youtubeUrl: (mediaMode === "video" && youtubeUrl) || undefined,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          imageCaptions:
            imageUrls.length > 0 && captions.some((c) => c.trim())
              ? captions.map((c) => c.trim())
              : undefined,
          thumbnailUrl,
          platform,
          storeUrlIos: fd.get("storeUrlIos") || undefined,
          storeUrlAndroid: fd.get("storeUrlAndroid") || undefined,
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

      {/* ---- platform ---- */}
      <div className="space-y-3 rounded-xl border border-border bg-muted p-4">
        <Label>Platform *</Label>
        <div className="flex gap-2">
          {(
            [
              ["web", "🌐 Web"],
              ["ios", "🍎 iOS"],
              ["android", "🤖 Android"],
              ["cross_platform", "📱 Both"],
            ] as const
          ).map(([val, label]) => (
            <MediaModeButton
              key={val}
              active={platform === val}
              onClick={() => setPlatform(val)}
              label={label}
            />
          ))}
        </div>
        {(platform === "ios" || platform === "cross_platform") && (
          <Field label="App Store URL">
            <Input
              name="storeUrlIos"
              type="url"
              placeholder="https://apps.apple.com/app/..."
            />
          </Field>
        )}
        {(platform === "android" || platform === "cross_platform") && (
          <Field label="Play Store URL">
            <Input
              name="storeUrlAndroid"
              type="url"
              placeholder="https://play.google.com/store/apps/..."
            />
          </Field>
        )}
      </div>

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

      {/* ---- demo media: video or screenshot slideshow ---- */}
      <div className="space-y-3 rounded-xl border border-border bg-muted p-4">
        <Label>Demo media *</Label>
        <div className="flex gap-2">
          <MediaModeButton
            active={mediaMode === "video"}
            onClick={() => setMediaMode("video")}
            label="🎬 Video"
          />
          <MediaModeButton
            active={mediaMode === "images"}
            onClick={() => setMediaMode("images")}
            label="🖼 Screenshots"
          />
        </div>

        {mediaMode === "video" ? (
          <>
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
          </>
        ) : (
          <Field
            label={`Screenshots (1–${MAX_IMAGES}, png/jpg/webp, ≤5MB each)`}
            hint="No video needed — your screenshots become a swipeable slideshow in the feed. The first one is the thumbnail."
          >
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={(e) => onPickImages(e.target.files)}
            />
            {images.length > 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Optional: one line per screenshot naming the feature it shows
                  — viewers discover a feature with every swipe.
                </p>
                {images.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center gap-2">
                    <span className="w-6 flex-none text-center text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <Input
                      value={captions[i] ?? ""}
                      maxLength={80}
                      placeholder={`What does screenshot ${i + 1} show? e.g. "AI drafts the PRD for you"`}
                      onChange={(e) =>
                        setCaptions((prev) => {
                          const next = [...prev];
                          next[i] = e.target.value;
                          return next;
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </Field>
        )}
      </div>
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
        {platform === "web" && (
          <Check name="embeddable" label="Can be embedded in an iframe" defaultChecked />
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button size="lg" className="w-full" disabled={busy}>
        {busy ? "Publishing…" : "Publish to the feed"}
      </Button>
    </form>
  );
}

function MediaModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition cursor-pointer " +
        (active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:text-foreground")
      }
    >
      {label}
    </button>
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
