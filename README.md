# Glim

> **Discover what was built today.**
> Watch 15-second demos, try apps instantly, and leave feedback in seconds.

Glim is a TikTok-style discovery feed for newly built (vibe-coded) apps: scroll a
vertical feed of 15-second demos, hit **Try** to use the app inside Glim, and
leave tag-based feedback in under 3 seconds. Makers get a dashboard that shows
real trial conversion — not vanity metrics.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Runtime / hosting | **Cloudflare Workers** via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) |
| Database | **Cloudflare D1** (SQLite) + Drizzle ORM |
| File storage | **Cloudflare R2** (demo videos / thumbnails — free egress) |
| Auth | [better-auth](https://better-auth.com) + Google OAuth (sessions in D1) |

> **Security note:** D1 has no row-level security. All ownership checks
> ("only the maker edits their app", "only claim your own anonymous data")
> are enforced in the server layer (API routes), never the client.

## Local development

Requirements: Node 20+, pnpm, a Cloudflare account is **not** needed for local dev
(wrangler runs D1/R2 locally via miniflare).

```bash
pnpm install

# 1) Secrets — copy and fill (Google keys optional; browsing works without login)
cp .env.example .dev.vars

# 2) Create the local D1 schema + sample apps
pnpm db:migrate:local
pnpm db:seed:local

# 3) Run
pnpm dev          # http://localhost:3000 — the feed plays immediately
```

The seed inserts 12 sample apps so the feed is never empty.

### Google OAuth (optional for browsing, required for submit/dashboard)
1. Create an OAuth client at <https://console.cloud.google.com/apis/credentials>.
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   (and your production URL equivalent).
3. Put `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.dev.vars`.

## Deploy to Cloudflare

```bash
# One-time setup
wrangler d1 create glim-db          # paste the printed database_id into wrangler.toml
wrangler r2 bucket create glim-media

# Schema + seed on the remote DB
pnpm db:migrate:remote
pnpm db:seed:remote                  # optional sample data

# Secrets
wrangler secret put BETTER_AUTH_SECRET   # openssl rand -base64 32
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
# Set BETTER_AUTH_URL in wrangler.toml [vars] to your production URL

# Ship it
pnpm deploy
```

## Project layout

```
src/
  app/
    page.tsx               # Home feed (vertical snap, autoplay, no login wall)
    try/[appId]/           # In-platform trial: iframe + Glim bar + fallback
    app/[slug]/            # Shareable app detail (OG tags, feedback summary)
    submit/                # Maker app submission (R2 upload, login-gated)
    dashboard/             # Maker stats: views→try conversion, top friction
    api/
      auth/[...all]/       # better-auth (Google OAuth)
      interactions/        # impression / video / skip / like / save / try events
      feedback/            # 3-second tag feedback
      apps/                # create app (server-side ownership)
      upload/              # R2 upload through the Worker
      media/[...key]/      # R2 streaming with Range support (video seeking)
      merge/               # claim anonymous activity after login
  components/              # Feed, AppCard, TryView, FeedbackModal, SubmitForm…
  db/                      # Drizzle schema (better-auth + glim tables)
  lib/                     # auth, feed mix + App Score, tracking, anon identity
drizzle/                   # SQL migrations (wrangler d1 migrations apply)
seed.sql                   # 12 sample apps
```

## Product principles baked into the code

- **Show, don't tell** — `/` opens straight into a playing demo; no landing page.
- **Try before login** — anonymous users can watch, try, like, save and give
  feedback; a soft login nudge appears only after real engagement
  (3 likes / 1 save / 1 feedback), and anonymous activity is merged on login.
- **Inside, not away** — Try opens the app in an iframe under a persistent Glim
  bar; new-tab is only the fallback for apps that refuse framing.
- **Try clicks > likes** — the feed's App Score weighs trial conversion (×5)
  over completion (×2), and penalizes login-walled apps via `login_blocked`
  feedback (×−3). Mix: 30% popular / 30% recent / 40% random — no ML yet,
  but every interaction is logged for future personalization.
- **R2 video first** — demos are mp4s on R2 (zero egress cost, zero ads);
  YouTube URLs are accepted as a fallback only.
