# Kling AI Prompts for Glim Demo

Use these prompts to generate optional AI-made source clips for the opening hook or transition shots. Export each result as vertical 9:16 MP4, then place it in `scripts/video/clips/` with the matching file name from `record-guide.md`.

Recommended Kling settings:

- Model: Kling 3.0
- Aspect ratio: 9:16 vertical
- Duration: 3-5 seconds per generated clip
- Motion: medium
- Style: realistic product demo, crisp screen details, no fake brand logos
- Text: avoid generated text inside the video; the FFmpeg script adds final captions

## Hook Clip: Coding to App

File target: `01-hook.mp4`

Prompt:

```text
Vertical 9:16 realistic screen-recording style video. A solo indie maker rapidly builds a polished mobile web app using an AI coding assistant and a modern code editor. The scene begins with code and terminal output, then quickly transitions to a finished mobile app preview on the right side of the screen. Fast but readable cursor movement, clean developer workspace, high contrast UI, cinematic but natural lighting, sharp details, modern SaaS startup energy. No readable brand logos, no distorted text, no hands, no faces.
```

Negative prompt:

```text
blurry screen, unreadable UI, fake logos, extra fingers, human face, low resolution, warped text, chaotic camera shake, horizontal layout, dark unreadable scene
```

## Problem Clip: Empty Analytics

File target: `02-empty-analytics.mp4`

Prompt:

```text
Vertical 9:16 realistic product analytics dashboard on a laptop or browser window, showing an early-stage app with empty charts, zero user activity, and quiet blank-state panels. Minimal clean interface, muted colors, lonely startup mood, subtle camera push-in, crisp UI details, no brand logos, no readable private data.
```

Negative prompt:

```text
busy dashboard, crowded charts, people, faces, fake company logos, unreadable tiny text, horizontal composition, shaky camera
```

## Transition Clip: Discovery Feed

File target: `03-glim-feed-scroll.mp4`

Prompt:

```text
Vertical 9:16 mobile app discovery feed, TikTok-style scrolling interface for indie apps and AI-built tools. Smooth thumb-like scrolling motion without showing a hand, polished app cards with colorful app previews, modern mobile UI, bright but not neon, crisp readable layout, energetic discovery feeling, no existing brand logos.
```

Negative prompt:

```text
social media logos, real app store logos, faces, hands, distorted UI, unreadable clutter, horizontal framing, overly dark visuals
```

## App Launch Clip: Tap Card to Real App

File target: `04-app-card-to-app.mp4`

Prompt:

```text
Vertical 9:16 mobile screen capture style video. A discovery feed card is selected and the view transitions into a real interactive web app with a polished interface. Smooth tap animation, fast loading, clear app preview, modern AI-native product aesthetic, crisp edges, minimal camera movement, no human subjects.
```

Negative prompt:

```text
fake browser chrome, broken loading spinner, blurry UI, malformed text, brand logos, people, hands, horizontal video, heavy motion blur
```

## Social Proof Clip: Many Listed Apps

File target: `05-social-proof.mp4`

Prompt:

```text
Vertical 9:16 mobile app feed showing many polished indie app cards already listed. The feed scrolls smoothly through varied app previews: productivity tools, creative tools, small games, dashboards, and AI utilities. Clean modern UI, vivid but balanced colors, high-detail product screenshots, confident momentum, no logos from real companies.
```

Negative prompt:

```text
messy collage, duplicated cards, distorted screenshots, unreadable interface, faces, hands, brand logos, horizontal layout
```

## Maker CTA Clip: AI-Built Apps

File target: `06-maker-cta.mp4`

Prompt:

```text
Vertical 9:16 mobile product demo showing a feed of AI-built apps made by indie makers. The visuals feel like a home for projects built with modern AI coding tools, with polished app cards, submit/listing interaction hints, and smooth scrolling. Clean interface, clear hierarchy, startup builder aesthetic, no actual tool logos, no people.
```

Negative prompt:

```text
logo wall, fake brand marks, blurry UI, unreadable text, people, hands, dark muddy colors, horizontal framing
```

## Final URL Clip: Clean Closing

File target: `07-final-url.mp4`

Prompt:

```text
Vertical 9:16 clean mobile app screen with a polished app discovery feed paused in the background, subtle motion and depth, designed to leave space for a large final URL caption. Minimal modern UI, crisp details, bright professional look, no brand logos, no human subjects, no generated text.
```

Negative prompt:

```text
busy motion, cluttered screen, generated text, fake logos, people, faces, hands, horizontal video, blurry visuals
```
