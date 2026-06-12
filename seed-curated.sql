-- ===========================================================================
-- Glim curated seed — 8 apps + 1 official post each.
-- Safe to re-run: every statement is INSERT OR IGNORE.
--
-- Conventions:
--   apps.id   = 'curated-<slug>'       posts.id = 'post-curated-<slug>'
--   maker_id / author_id = 'glim-system' (reserved system user, migration 0001)
--   apps.status = 'unclaimed'          posts: type='official', status='published'
--   embeddable = 0 (iframe capability unverified), guest/no-login flags = 0
--   timestamps: integer ms, staggered 2026-06-07 → 2026-06-11 (organic look)
--
-- NOTE: screenshots must be uploaded to R2 under curated/<app>/NN.png before
-- (or after) running this — the /api/media route serves the 'curated/' prefix.
-- ===========================================================================

-- Defensive: make sure the system user exists (no-op when migration 0001 ran).
INSERT OR IGNORE INTO user (id, name, email, email_verified, created_at, updated_at)
VALUES ('glim-system', 'Glim', 'system@glim.app', 1, 1780790400000, 1780790400000);

-- ---------------------------------------------------------------------------
-- 1. Lovelee — iOS couples app (Jack Friks)  · 2026-06-07
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO apps (
  id, slug, name, tagline, description, url,
  demo_video_url, youtube_url, thumbnail_url, category, tags,
  maker_id, maker_name, maker_links,
  guest_mode_available, no_login_trial_available, embeddable,
  platform, store_urls, status, icon_url,
  follower_count, save_count, created_at, updated_at
) VALUES (
  'curated-lovelee', 'lovelee', 'Lovelee',
  'A tiny private world for two — love notes, doodles, moods, and a virtual pig on your home screen.',
  'Lovelee gives couples a private little world: love letters, doodles, mood sharing, and a virtual pig you raise together, all living in home-screen widgets. Jack Friks vibe-coded the first version in five days with Claude and Cursor — it now hosts 20K+ couples and makes about $5K a month. Proof that small, warm, and fast beats big and bloated.',
  'https://www.lovelee-app.com/',
  NULL, NULL, '/api/media/curated/lovelee/01.png', 'Other',
  '["couples","love","widgets"]',
  'glim-system', 'Jack Friks', '{"x":"https://x.com/jackfriks"}',
  0, 0, 0,
  'ios', '{"ios":"https://apps.apple.com/us/app/lovelee-couples-love-note-app/id6754182711"}',
  'unclaimed', NULL,
  0, 0, 1780812345000, 1780812345000
);

INSERT OR IGNORE INTO posts (
  id, app_id, author_id, type, status, media_type,
  video_url, image_urls, thumbnail_url, caption,
  like_count, comment_count, created_at
) VALUES (
  'post-curated-lovelee', 'curated-lovelee', 'glim-system', 'official', 'published', 'images',
  NULL, '["/api/media/curated/lovelee/01.png","/api/media/curated/lovelee/02.png"]',
  '/api/media/curated/lovelee/01.png',
  'A tiny private world for two — love notes, doodles, moods, and a virtual pig on your home screen.',
  0, 0, 1780812405000
);

-- ---------------------------------------------------------------------------
-- 2. Sundaze — iOS UV / tan tracker (Robert Baxter)  · 2026-06-08
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO apps (
  id, slug, name, tagline, description, url,
  demo_video_url, youtube_url, thumbnail_url, category, tags,
  maker_id, maker_name, maker_links,
  guest_mode_available, no_login_trial_available, embeddable,
  platform, store_urls, status, icon_url,
  follower_count, save_count, created_at, updated_at
) VALUES (
  'curated-sundaze', 'sundaze', 'Sundaze',
  'Real-time UV tracking and personalized skin recs — tan smarter, not redder.',
  'Sundaze tracks real-time UV where you are, gives recommendations tuned to your skin, and logs tanning sessions so you get the glow without the burn. Built by Robert Baxter and sitting at 4.9 stars on the App Store.',
  'https://www.sundazeapp.com/',
  NULL, NULL, '/api/media/curated/sundaze/01.png', 'Health',
  '["uv","tanning","skincare"]',
  'glim-system', 'Robert Baxter', '{"x":"https://x.com/BaxterTailwinds"}',
  0, 0, 0,
  'ios', '{"ios":"https://apps.apple.com/us/app/sundaze-uv-tan-tracker/id6762488554"}',
  'unclaimed', NULL,
  0, 0, 1780923456000, 1780923456000
);

INSERT OR IGNORE INTO posts (
  id, app_id, author_id, type, status, media_type,
  video_url, image_urls, thumbnail_url, caption,
  like_count, comment_count, created_at
) VALUES (
  'post-curated-sundaze', 'curated-sundaze', 'glim-system', 'official', 'published', 'images',
  NULL, '["/api/media/curated/sundaze/01.png","/api/media/curated/sundaze/02.png"]',
  '/api/media/curated/sundaze/01.png',
  'Real-time UV tracking and personalized skin recs — tan smarter, not redder.',
  0, 0, 1780923516000
);

-- ---------------------------------------------------------------------------
-- 3. Vugola — web AI clipping agent (Vadim Strizheus)  · 2026-06-09
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO apps (
  id, slug, name, tagline, description, url,
  demo_video_url, youtube_url, thumbnail_url, category, tags,
  maker_id, maker_name, maker_links,
  guest_mode_available, no_login_trial_available, embeddable,
  platform, store_urls, status, icon_url,
  follower_count, save_count, created_at, updated_at
) VALUES (
  'curated-vugola', 'vugola', 'Vugola',
  'An AI clipping agent that turns hours of footage into ready-to-post viral shorts.',
  'Point Vugola at long-form footage and its AI clipping agent hands back shorts that are ready to post. Built by 18-year-old Vadim Strizheus, who has already pushed it to $10K a month — one teenager plus AI tooling doing the work of a clipping team.',
  'https://www.vugolaai.com/',
  NULL, 'https://www.youtube.com/watch?v=yQkzwon5Kh8',
  '/api/media/curated/vugola/01.png', 'Content',
  '["ai","clips","shorts","creators"]',
  'glim-system', 'Vadim Strizheus', '{"x":"https://x.com/VadimStrizheus"}',
  0, 0, 0,
  'web', NULL,
  'unclaimed', NULL,
  0, 0, 1781001234000, 1781001234000
);

INSERT OR IGNORE INTO posts (
  id, app_id, author_id, type, status, media_type,
  video_url, image_urls, thumbnail_url, caption,
  like_count, comment_count, created_at
) VALUES (
  'post-curated-vugola', 'curated-vugola', 'glim-system', 'official', 'published', 'images',
  NULL, '["/api/media/curated/vugola/01.png","/api/media/curated/vugola/02.png","/api/media/curated/vugola/03.png"]',
  '/api/media/curated/vugola/01.png',
  'An AI clipping agent that turns hours of footage into ready-to-post viral shorts.',
  0, 0, 1781001294000
);

-- ---------------------------------------------------------------------------
-- 4. FULL SEND — web multiplayer racing game (Daniel Vassallo)  · 2026-06-10
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO apps (
  id, slug, name, tagline, description, url,
  demo_video_url, youtube_url, thumbnail_url, category, tags,
  maker_id, maker_name, maker_links,
  guest_mode_available, no_login_trial_available, embeddable,
  platform, store_urls, status, icon_url,
  follower_count, save_count, created_at, updated_at
) VALUES (
  'curated-full-send', 'full-send', 'FULL SEND',
  'Top-down multiplayer racing — time trials, a track editor, and a global leaderboard. Open source.',
  'An open-source, top-down multiplayer racing game: time trials, a track editor, and a global leaderboard. Daniel Vassallo built it with his 11-year-old son for Vibe Jam 2026, and the father-son energy shows in every track. Open a tab and race.',
  'https://fullsend.game/',
  NULL, NULL, '/api/media/curated/fullsend/01.png', 'Game',
  '["racing","multiplayer","open-source"]',
  'glim-system', 'Daniel Vassallo', '{"x":"https://x.com/dvassallo"}',
  0, 0, 0,
  'web', NULL,
  'unclaimed', NULL,
  0, 0, 1781087654000, 1781087654000
);

INSERT OR IGNORE INTO posts (
  id, app_id, author_id, type, status, media_type,
  video_url, image_urls, thumbnail_url, caption,
  like_count, comment_count, created_at
) VALUES (
  'post-curated-full-send', 'curated-full-send', 'glim-system', 'official', 'published', 'images',
  NULL, '["/api/media/curated/fullsend/01.png","/api/media/curated/fullsend/02.png"]',
  '/api/media/curated/fullsend/01.png',
  'Top-down multiplayer racing — time trials, a track editor, and a global leaderboard. Open source.',
  0, 0, 1781087714000
);

-- ---------------------------------------------------------------------------
-- 5. 82-0 — web NBA roster simulator (anonymous maker)  · 2026-06-11
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO apps (
  id, slug, name, tagline, description, url,
  demo_video_url, youtube_url, thumbnail_url, category, tags,
  maker_id, maker_name, maker_links,
  guest_mode_available, no_login_trial_available, embeddable,
  platform, store_urls, status, icon_url,
  follower_count, save_count, created_at, updated_at
) VALUES (
  'curated-82-0', '82-0', '82-0',
  'Draft five players from any era. See if your dream roster goes 82-0.',
  'Draft a five-player all-time NBA roster from randomized eras and simulate whether it can run the table at 82-0. The viral June 2026 time-killer that picked up ESPN and Bleacher Report coverage. Easy to start, harder to win than you think.',
  'https://www.82-0.com/',
  NULL, NULL, '/api/media/curated/82-0/01.png', 'Game',
  '["nba","basketball","simulator"]',
  'glim-system', 'Anonymous', '{"x":"https://x.com/EightyTwoAndO"}',
  0, 0, 0,
  'web', NULL,
  'unclaimed', NULL,
  0, 0, 1781162345000, 1781162345000
);

INSERT OR IGNORE INTO posts (
  id, app_id, author_id, type, status, media_type,
  video_url, image_urls, thumbnail_url, caption,
  like_count, comment_count, created_at
) VALUES (
  'post-curated-82-0', 'curated-82-0', 'glim-system', 'official', 'published', 'images',
  NULL, '["/api/media/curated/82-0/01.png"]',
  '/api/media/curated/82-0/01.png',
  'Draft five players from any era. See if your dream roster goes 82-0.',
  0, 0, 1781162405000
);

-- ---------------------------------------------------------------------------
-- 6. BirdsEyes — web personal knowledge graph (Christian Collins)  · 2026-06-11
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO apps (
  id, slug, name, tagline, description, url,
  demo_video_url, youtube_url, thumbnail_url, category, tags,
  maker_id, maker_name, maker_links,
  guest_mode_available, no_login_trial_available, embeddable,
  platform, store_urls, status, icon_url,
  follower_count, save_count, created_at, updated_at
) VALUES (
  'curated-birdseyes', 'birdseyes', 'BirdsEyes',
  'A private knowledge graph of everything you read, watch, and explore — see your mind from above.',
  'BirdsEyes turns what you read, watch, and explore into a private knowledge graph — a map of your own curiosity you can see from above. Christian Collins (4.9M on TikTok) built it with Lovable and grew it past 30K users. Your second brain, drawn as a map you can fly over.',
  'https://birdseyes.app/',
  NULL, 'https://www.youtube.com/watch?v=S3KOX7qh0Qg',
  '/api/media/curated/birdseyes/01.png', 'Productivity',
  '["knowledge","notes","ai"]',
  'glim-system', 'Christian Collins', '{"x":"https://x.com/weeklychr"}',
  0, 0, 0,
  'web', NULL,
  'unclaimed', NULL,
  0, 0, 1781216789000, 1781216789000
);

INSERT OR IGNORE INTO posts (
  id, app_id, author_id, type, status, media_type,
  video_url, image_urls, thumbnail_url, caption,
  like_count, comment_count, created_at
) VALUES (
  'post-curated-birdseyes', 'curated-birdseyes', 'glim-system', 'official', 'published', 'images',
  NULL, '["/api/media/curated/birdseyes/01.png"]',
  '/api/media/curated/birdseyes/01.png',
  'A private knowledge graph of everything you read, watch, and explore — see your mind from above.',
  0, 0, 1781216849000
);

-- ---------------------------------------------------------------------------
-- 7. Taste — web restaurant/recipe journal + social (Maddy Osman)  · 2026-06-12
--    Verified in-browser: full public landing renders, no broken features.
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO apps (
  id, slug, name, tagline, description, url,
  demo_video_url, youtube_url, thumbnail_url, category, tags,
  maker_id, maker_name, maker_links,
  guest_mode_available, no_login_trial_available, embeddable,
  platform, store_urls, status, icon_url,
  follower_count, save_count, created_at, updated_at
) VALUES (
  'curated-taste', 'taste', 'Taste',
  'Catalog the restaurant meals and recipes you love — then share your taste with your people.',
  'Taste is a tasting journal: log restaurant meals and homemade recipes, rate them, tag cuisines, and share favorites and dietary preferences with friends and family. Maddy Osman — a non-coder — vibe-coded it with Lovable and Cursor, and it grew a real social discovery layer (follows, bookmarks, community feed) on top of a simple personal logger.',
  'https://taste-6fd78.web.app',
  NULL, NULL, '/api/media/curated/taste/01.png', 'Other',
  '["food","recipes","social"]',
  'glim-system', 'Maddy Osman', '{"x":"https://x.com/MaddyOsman"}',
  0, 0, 0,
  'web', NULL,
  'unclaimed', NULL,
  0, 0, 1781290000000, 1781290000000
);

INSERT OR IGNORE INTO posts (
  id, app_id, author_id, type, status, media_type,
  video_url, image_urls, thumbnail_url, caption,
  like_count, comment_count, created_at
) VALUES (
  'post-curated-taste', 'curated-taste', 'glim-system', 'official', 'published', 'images',
  NULL, '["/api/media/curated/taste/01.png","/api/media/curated/taste/02.png"]',
  '/api/media/curated/taste/01.png',
  'Catalog the restaurant meals and recipes you love — then share your taste with your people.',
  0, 0, 1781290060000
);

-- ---------------------------------------------------------------------------
-- 8. Dreambase — web AI-native Supabase analytics (Kyle Ledbetter)  · 2026-06-12
--    Verified in-browser: polished landing + live product dashboard, works.
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO apps (
  id, slug, name, tagline, description, url,
  demo_video_url, youtube_url, thumbnail_url, category, tags,
  maker_id, maker_name, maker_links,
  guest_mode_available, no_login_trial_available, embeddable,
  platform, store_urls, status, icon_url,
  follower_count, save_count, created_at, updated_at
) VALUES (
  'curated-dreambase', 'dreambase', 'Dreambase',
  'AI-native analytics for Supabase — connect your database, get production dashboards in 90 seconds.',
  'Dreambase points an AI analytics layer straight at your Supabase database — no data warehouse, no data team, just production dashboards from day zero. Prototyped with Lovable and v0, refined in Cursor, it is the rare vibe-coded build that turned into a funded SaaS ($3.7M seed) and a Supabase marketplace partner.',
  'https://dreambase.com',
  NULL, NULL, '/api/media/curated/dreambase/01.png', 'DevTools',
  '["analytics","supabase","dashboards"]',
  'glim-system', 'Kyle Ledbetter', '{"x":"https://x.com/kyleledbetter","website":"https://dreambase.com"}',
  0, 0, 0,
  'web', NULL,
  'unclaimed', NULL,
  0, 0, 1781295000000, 1781295000000
);

INSERT OR IGNORE INTO posts (
  id, app_id, author_id, type, status, media_type,
  video_url, image_urls, thumbnail_url, caption,
  like_count, comment_count, created_at
) VALUES (
  'post-curated-dreambase', 'curated-dreambase', 'glim-system', 'official', 'published', 'images',
  NULL, '["/api/media/curated/dreambase/01.png","/api/media/curated/dreambase/02.png"]',
  '/api/media/curated/dreambase/01.png',
  'AI-native analytics for Supabase — connect your database, get production dashboards in 90 seconds.',
  0, 0, 1781295060000
);
