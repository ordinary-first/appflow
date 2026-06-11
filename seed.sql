-- Glim seed data: 1 seed maker + 12 sample apps so the feed is never empty.
-- Apply with: wrangler d1 execute glim-db --local --file=./seed.sql
-- Demo videos are short public sample mp4s (Google sample bucket).
-- App URLs point at real free web tools so "Try" actually works;
-- a few are intentionally non-embeddable to exercise the fallback path.

INSERT OR IGNORE INTO user (id, name, email, email_verified, image, created_at, updated_at)
VALUES ('seed-maker', 'Glim Team', 'seed@glim.app', 1, NULL, unixepoch()*1000, unixepoch()*1000);

INSERT OR IGNORE INTO apps
  (id, slug, name, tagline, description, url, demo_video_url, youtube_url, thumbnail_url,
   category, tags, maker_id, maker_name, maker_links,
   guest_mode_available, no_login_trial_available, embeddable, status, created_at, updated_at)
VALUES
('seed-app-01', 'sketchdeck', 'SketchDeck', 'Whiteboard that thinks in diagrams — sketch ideas at the speed of thought.',
 'A virtual collaborative whiteboard. No signup needed: open and start drawing wireframes, flowcharts and diagrams instantly.',
 'https://excalidraw.com',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', NULL, NULL,
 'Productivity', '["whiteboard","diagrams","collab"]', 'seed-maker', 'Glim Team', '{"website":"https://excalidraw.com"}',
 1, 1, 1, 'published', unixepoch()*1000 - 86400000*1, unixepoch()*1000),

('seed-app-02', 'pixelpea', 'PixelPea', 'Photoshop-grade editing, zero install, zero login.',
 'Full image editor that runs entirely in your browser. Open a PSD, retouch a photo, export — all without an account.',
 'https://www.photopea.com',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', NULL, NULL,
 'Content', '["design","photo","editor"]', 'seed-maker', 'Glim Team', '{"website":"https://www.photopea.com"}',
 1, 1, 1, 'published', unixepoch()*1000 - 86400000*2, unixepoch()*1000),

('seed-app-03', 'squishify', 'Squishify', 'Drop an image, watch it shrink — visual compression you can feel.',
 'Compare compression formats side by side with a draggable slider. Great for shipping lighter web pages.',
 'https://squoosh.app',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', NULL, NULL,
 'DevTools', '["images","performance","web"]', 'seed-maker', 'Glim Team', '{"website":"https://squoosh.app"}',
 1, 1, 1, 'published', unixepoch()*1000 - 86400000*3, unixepoch()*1000),

('seed-app-04', 'flowcanvas', 'FlowCanvas', 'An infinite canvas where your team actually wants to think.',
 'Collaborative infinite canvas for product teams. Sticky notes, arrows, freehand — multiplayer by default.',
 'https://www.tldraw.com',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', NULL, NULL,
 'Productivity', '["canvas","collab","brainstorm"]', 'seed-maker', 'Glim Team', '{"website":"https://www.tldraw.com"}',
 1, 1, 1, 'published', unixepoch()*1000 - 86400000*4, unixepoch()*1000),

('seed-app-05', 'typebeat', 'TypeBeat', 'Find out how fast you really type — then get faster.',
 'Minimal typing test with live WPM, accuracy heatmaps and daily streaks. No login to start a run.',
 'https://monkeytype.com',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', NULL, NULL,
 'Education', '["typing","practice","speed"]', 'seed-maker', 'Glim Team', '{"website":"https://monkeytype.com"}',
 1, 1, 0, 'published', unixepoch()*1000 - 86400000*5, unixepoch()*1000),

('seed-app-06', 'regexlab', 'RegexLab', 'Stop guessing regex. See every match explained live.',
 'Paste a pattern, paste your text, and watch matches light up with a full explanation tree.',
 'https://regex101.com',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', NULL, NULL,
 'DevTools', '["regex","debugging","tools"]', 'seed-maker', 'Glim Team', '{"website":"https://regex101.com"}',
 1, 1, 0, 'published', unixepoch()*1000 - 86400000*6, unixepoch()*1000),

('seed-app-07', 'budgetlens', 'BudgetLens', 'See where your money leaks in 30 seconds.',
 'Paste a CSV of transactions and get an instant spending breakdown. Everything stays in your browser.',
 'https://example.com',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
 'https://www.youtube.com/watch?v=ysz5S6PUM-U', NULL,
 'Finance', '["budget","csv","privacy"]', 'seed-maker', 'Glim Team', NULL,
 1, 1, 1, 'published', unixepoch()*1000 - 86400000*7, unixepoch()*1000),

('seed-app-08', 'breathbox', 'BreathBox', 'Box breathing with a visual you can sync to.',
 'A guided breathing timer for resets between meetings. 4-4-4-4 box breathing, calming visuals, nothing else.',
 'https://example.com',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', NULL, NULL,
 'Health', '["breathing","focus","calm"]', 'seed-maker', 'Glim Team', NULL,
 1, 1, 1, 'published', unixepoch()*1000 - 86400000*8, unixepoch()*1000),

('seed-app-09', 'promptvault', 'PromptVault', 'Your best prompts, versioned like code.',
 'Save, tag and diff your LLM prompts. Share a vault with your team and stop losing the magic words.',
 'https://example.com',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
 'https://www.youtube.com/watch?v=ScMzIvxBSi4', NULL,
 'AI', '["prompts","llm","team"]', 'seed-maker', 'Glim Team', NULL,
 0, 1, 1, 'published', unixepoch()*1000 - 86400000*9, unixepoch()*1000),

('seed-app-10', 'meetingnote-ai', 'MeetingNote AI', 'AI meeting notes in seconds.',
 'Drop a recording, get a clean summary with action items and owners. Built in a weekend with vibe coding.',
 'https://example.com',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', NULL, NULL,
 'AI', '["meetings","notes","summary"]', 'seed-maker', 'Glim Team', NULL,
 0, 0, 1, 'published', unixepoch()*1000 - 86400000*10, unixepoch()*1000),

('seed-app-11', 'wordweave', 'WordWeave', 'A daily word puzzle that fights back.',
 'Five guesses, one word, infinite bragging rights. A tiny daily game to share with your group chat.',
 'https://example.com',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', NULL, NULL,
 'Game', '["puzzle","daily","words"]', 'seed-maker', 'Glim Team', NULL,
 1, 1, 1, 'published', unixepoch()*1000 - 86400000*11, unixepoch()*1000),

('seed-app-12', 'shipcast', 'ShipCast', 'Tweet-sized changelogs your users actually read.',
 'Write a changelog entry, get a beautiful shareable page and an embeddable widget for your app.',
 'https://example.com',
 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', NULL,
 'Content', '["changelog","marketing","saas"]', 'seed-maker', 'Glim Team', NULL,
 1, 1, 1, 'published', unixepoch()*1000 - 86400000*12, unixepoch()*1000);
