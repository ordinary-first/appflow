# Glim 30-Second Demo Pipeline

Goal: produce a 30-second vertical 9:16 demo video for Glim.

Final URL: https://glim.ordinaryindividuality.workers.dev

Final output path: `scripts/video/output/glim-demo-30s.mp4`

## Folder Structure

```text
scripts/video/
  clips/
    01-hook.mp4
    02-empty-analytics.mp4
    03-glim-feed-scroll.mp4
    04-app-card-to-app.mp4
    05-social-proof.mp4
    06-maker-cta.mp4
    07-final-url.mp4
  output/
    glim-demo-30s.mp4
  record-guide.md
  stitch.mjs
  kling-prompts.md
  submagic-config.json
  reddit-posts.md
  pipeline.md
```

## Day 1: Capture and Assemble

### Checklist

- Install OBS Studio.
- Install FFmpeg.
- Open Glim on a mobile viewport.
- Record all seven source clips listed in `record-guide.md`.
- Put clips in `scripts/video/clips/` with exact file names.
- Run the stitch script.
- Watch the exported video end to end.
- Replace any clip where text is unreadable or motion is too fast.

### Commands

From the repo root:

```powershell
node .\scripts\video\stitch.mjs
```

Expected output:

```text
scripts/video/output/glim-demo-30s.mp4
```

### Tools

OBS Studio:

- Link: https://obsproject.com/
- Cost: free and open source
- Use: screen recording at 1080x1920, 60 fps, MP4

FFmpeg:

- Link: https://ffmpeg.org/download.html
- Windows install option: `winget install Gyan.FFmpeg`
- Cost: free and open source
- Use: trim clips, normalize resolution, add text overlays, concatenate final video

Node.js:

- Link: https://nodejs.org/
- Cost: free
- Use: run `stitch.mjs`

Glim:

- Link: https://glim.ordinaryindividuality.workers.dev
- Use: record live product feed and app entry scenes

## Day 2: Polish and Distribution

### Checklist

- Optional: generate or replace the hook clip with Kling.
- Optional: import the final MP4 into Submagic for captions and pacing variants.
- Export final video variants:
  - TikTok/Reels/Shorts version with burned-in captions
  - clean version without captions if platform editor captions are preferred
- Draft Reddit posts from `reddit-posts.md`.
- Post to one subreddit first, then wait for comments before posting elsewhere.
- Capture feedback and update the hook or CTA if viewers misunderstand the product.

### Optional AI Clip Generation

Kling AI:

- Link: https://klingai.com/
- Cost: free tier availability changes; check current credit limits before generating
- Use: generate hook or transition clips when real screen capture is not strong enough
- Prompt file: `kling-prompts.md`

### Caption Polish

Submagic:

- Link: https://www.submagic.co/
- Cost: free tier availability changes; check current export watermark and minute limits
- Use: caption styling, platform-ready subtitle variants, quick social edits
- Config file: `submagic-config.json`

CapCut:

- Link: https://www.capcut.com/
- Cost: free tier available, paid features vary by region and date
- Use: final manual polish, music, pacing tweaks, thumbnails

## Sequence Timing

| Time | Scene | Caption |
| --- | --- | --- |
| 0-3s | Hook | 48hrs. Built an app. Zero users. |
| 3-7s | Problem | Shipping was easy. Distribution was not. |
| 7-12s | Glim feed | Glim is a TikTok-style feed for vibe-coded apps. |
| 12-18s | App tap | Tap a card. Try the app instantly. |
| 18-23s | Social proof | 82 apps already listed. |
| 23-27s | Maker CTA | Built with Lovable / Cursor / Claude? Get real users. |
| 27-30s | Final CTA | glim.ordinaryindividuality.workers.dev |

## Quality Bar

- The first frame must communicate "builder app" immediately.
- Captions must be readable on a phone at arm's length.
- Glim must be visible by second 7.
- The card-to-app transition must be obvious.
- The URL must be readable for the full final three seconds.
- No private browser tabs, local secrets, tokens, usernames, or notification banners.

## Troubleshooting

### FFmpeg is not found

Install FFmpeg:

```powershell
winget install Gyan.FFmpeg
```

Then close and reopen the terminal.

### Output is horizontal

Check OBS canvas settings:

- Base canvas: `1080x1920`
- Output resolution: `1080x1920`

The stitch script also scales and crops to 1080x1920, but a properly vertical source gives better framing.

### Caption text is too long

Shorten the relevant `text` value in `stitch.mjs` and `submagic-config.json`. The longest caption is the maker CTA; if it feels cramped, split it manually in Submagic.

### Clip has audio

The stitch script uses `-an`, so source audio is removed. Add music or voiceover in CapCut, Submagic, Premiere, or another editor after the stitched export.
