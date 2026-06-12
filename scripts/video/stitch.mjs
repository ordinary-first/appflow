#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clipsDir = join(__dirname, "clips");
const outputDir = join(__dirname, "output");
const outputFile = join(outputDir, "glim-demo-30s.mp4");
const concatListFile = join(outputDir, "concat-list.txt");

const sequence = [
  {
    file: "01-hook.mp4",
    duration: 3,
    text: "48hrs.\nBuilt an app.\nZero users.",
  },
  {
    file: "02-empty-analytics.mp4",
    duration: 4,
    text: "Shipping was easy.\nDistribution was not.",
  },
  {
    file: "03-glim-feed-scroll.mp4",
    duration: 5,
    text: "Glim is a TikTok-style feed\nfor vibe-coded apps.",
  },
  {
    file: "04-app-card-to-app.mp4",
    duration: 6,
    text: "Tap a card.\nTry the app instantly.",
  },
  {
    file: "05-social-proof.mp4",
    duration: 5,
    text: "82 apps already listed.",
  },
  {
    file: "06-maker-cta.mp4",
    duration: 4,
    text: "Built with Lovable / Cursor / Claude?\nGet real users.",
  },
  {
    file: "07-final-url.mp4",
    duration: 3,
    text: "glim.ordinaryindividuality.workers.dev",
  },
];

function quoteConcatPath(value) {
  return value.replaceAll("\\", "/").replaceAll("'", "'\\''");
}

function quoteFilterPath(value) {
  return value
    .replaceAll("\\", "/")
    .replaceAll(":", "\\:")
    .replaceAll("'", "\\'")
    .replaceAll(",", "\\,");
}

function run(command, args) {
  const printable = [command, ...args.map((arg) => (arg.includes(" ") ? `"${arg}"` : arg))].join(" ");
  console.log(`\n${printable}\n`);

  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureInputs() {
  const missing = sequence
    .map((clip) => join(clipsDir, clip.file))
    .filter((clipPath) => !existsSync(clipPath));

  if (missing.length > 0) {
    console.error("Missing source clips:");
    for (const clipPath of missing) {
      console.error(`- ${clipPath}`);
    }
    console.error("\nRecord the clips listed in record-guide.md and place them in scripts/video/clips/.");
    process.exit(1);
  }
}

function buildSegment(clip, index) {
  const inputPath = join(clipsDir, clip.file);
  const segmentPath = join(outputDir, `${String(index + 1).padStart(2, "0")}-${clip.file.replace(/\.mp4$/i, "")}-segment.mp4`);
  const captionPath = join(outputDir, `${String(index + 1).padStart(2, "0")}-caption.txt`);
  writeFileSync(captionPath, clip.text, "utf8");

  const fontFile = process.platform === "win32" ? "C:/Windows/Fonts/arialbd.ttf" : "";
  const fontOption = fontFile ? `:fontfile='${quoteFilterPath(fontFile)}'` : "";

  const videoFilters = [
    "scale=1080:1920:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    "fps=60",
    "format=yuv420p",
    `drawtext=textfile='${quoteFilterPath(captionPath)}'${fontOption}:fontcolor=white:fontsize=64:borderw=5:bordercolor=black:x=(w-text_w)/2:y=h*0.72:line_spacing=14:box=1:boxcolor=black@0.18:boxborderw=28`,
    "fade=t=in:st=0:d=0.12",
    `fade=t=out:st=${Math.max(0, clip.duration - 0.18).toFixed(2)}:d=0.18`,
  ].join(",");

  run("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-t",
    String(clip.duration),
    "-vf",
    videoFilters,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-movflags",
    "+faststart",
    segmentPath,
  ]);

  return segmentPath;
}

function main() {
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(clipsDir, { recursive: true });

  const ffmpegCheck = spawnSync("ffmpeg", ["-version"], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });

  if (ffmpegCheck.status !== 0) {
    console.error("FFmpeg was not found. Install it from https://ffmpeg.org/download.html or with `winget install Gyan.FFmpeg`.");
    process.exit(1);
  }

  ensureInputs();

  const segments = sequence.map(buildSegment);
  const concatList = segments.map((segment) => `file '${quoteConcatPath(resolve(segment))}'`).join("\n");
  writeFileSync(concatListFile, `${concatList}\n`, "utf8");

  run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListFile,
    "-c",
    "copy",
    outputFile,
  ]);

  console.log(`\nCreated ${outputFile}`);
}

main();
