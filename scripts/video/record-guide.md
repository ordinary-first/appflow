# Glim Demo Recording Guide

This guide records the source clips for a 30-second vertical Glim marketing demo.

Target app: https://glim.ordinaryindividuality.workers.dev

## Output Targets

- Canvas: 1080x1920, vertical 9:16
- Frame rate: 60 fps
- Format: MP4
- Audio: optional during capture; final music/voiceover can be added later
- Clip folder: `scripts/video/clips/`
- Final output: `scripts/video/output/glim-demo-30s.mp4`

## OBS Setup on Windows

1. Install OBS Studio from https://obsproject.com/
2. Open OBS and create a new profile named `Glim Vertical`.
3. Go to `Settings > Video`.
4. Set `Base (Canvas) Resolution` to `1080x1920`.
5. Set `Output (Scaled) Resolution` to `1080x1920`.
6. Set `Common FPS Values` to `60`.
7. Go to `Settings > Output`.
8. Set `Output Mode` to `Advanced`.
9. In `Recording`, set:
   - Type: `Standard`
   - Recording Format: `mp4`
   - Encoder: hardware encoder if available, otherwise x264
   - Rate Control: `CBR`
   - Bitrate: `16000 Kbps` to `24000 Kbps`
   - Keyframe Interval: `2 s`
10. Go to `Settings > Audio` and disable unused audio devices if recording silent screen clips.
11. Create a scene named `Glim Mobile Capture`.
12. Add a `Window Capture` or `Display Capture` source.
13. Crop or scale the browser/mobile emulator so the app fills the 1080x1920 canvas.

## Browser Preparation

1. Open Chrome or Edge.
2. Navigate to https://glim.ordinaryindividuality.workers.dev
3. Open DevTools with `F12`.
4. Toggle device toolbar with `Ctrl+Shift+M`.
5. Use a mobile preset or custom size close to `390x844`.
6. Zoom the browser if needed so the captured app is readable in the OBS preview.
7. Hide bookmarks, extensions, and browser UI where possible.
8. Reload the page before recording each app scene.

## Required Clip Names

Save clips into `scripts/video/clips/` with these exact names:

| Time | File | Scene | Notes |
| --- | --- | --- | --- |
| 0-3s | `01-hook.mp4` | Coding screen / AI builder / editor | Use real editor, terminal, or AI coding UI. Fast, focused, no private keys. |
| 3-7s | `02-empty-analytics.mp4` | Empty analytics screen | Show zero users, zero events, or a clean mock dashboard. |
| 7-12s | `03-glim-feed-scroll.mp4` | Glim feed scroll | Scroll through app cards smoothly. |
| 12-18s | `04-app-card-to-app.mp4` | Tap an app card, enter real app | Start on Glim feed, tap a card, wait for app view. |
| 18-23s | `05-social-proof.mp4` | Glim feed or app grid | Use motion behind the text "82 apps already listed". |
| 23-27s | `06-maker-cta.mp4` | Glim feed, submit/listing flow, or makers' apps | Show apps that look built with AI tools. |
| 27-30s | `07-final-url.mp4` | Clean Glim screen | Keep motion subtle so URL is readable. |

The stitch script will trim each clip to the exact target duration, so capture 1-2 extra seconds at the start and end of every scene.

## Capture Checklist

- Record in a quiet environment if keeping system audio.
- Close notifications and messaging apps.
- Use a fresh browser profile if bookmarks or private tabs are visible.
- Keep scrolling slow enough that app names and cards remain legible.
- Avoid sudden cursor movement unless it helps explain the tap/click.
- Record each clip as a separate MP4.
- Place all finished clips in `scripts/video/clips/`.

## Sequence Direction

### 0-3s Hook

Visual: editor, terminal, AI coding session, or build output.

On-screen text added by script:

`48hrs. Built an app. Zero users.`

### 3-7s Problem

Visual: empty analytics dashboard or zero-user product metrics.

On-screen text added by script:

`Shipping was easy. Distribution was not.`

### 7-18s Solution

Visual: Glim feed scroll, app card tap, real app opening.

On-screen text added by script:

`Glim is a TikTok-style feed for vibe-coded apps.`

### 18-23s Social Proof

Visual: Glim cards or a fast scroll through listed apps.

On-screen text added by script:

`82 apps already listed.`

### 23-27s Maker CTA

Visual: app cards, maker-oriented listing flow, or polished Glim feed.

On-screen text added by script:

`Built with Lovable / Cursor / Claude? Get real users.`

### 27-30s Final CTA

Visual: Glim landing/feed screen with minimal motion.

On-screen text added by script:

`glim.ordinaryindividuality.workers.dev`
