-- ===========================================================================
-- Glim curated video/media backfill.
-- Safe to re-run: every statement is deterministic UPDATE by curated id.
--
-- Conventions:
--   apps.id   = 'curated-<slug>'       posts.id = 'post-curated-<slug>'
--   youtube_url lives on apps; image_urls / image_captions live on posts.
--   Only includes apps where the YouTube URL was verified as real.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Lovelee — verified YouTube: jack friks, "how i went from idea to $$$ in 5 days (mobile app)"
-- ---------------------------------------------------------------------------
UPDATE apps
SET youtube_url = 'https://www.youtube.com/watch?v=EFwhwB_tPBI'
WHERE id = 'curated-lovelee';

UPDATE posts
SET
  image_urls = '["/api/media/curated/lovelee/01.png","/api/media/curated/lovelee/02.png","https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/89/3c/21/893c2112-ea8b-b5fc-0d75-bcc4c147b880/01.png/600x1300bb.webp","https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/e2/18/dd/e218dd4c-0c2b-bf09-db66-e45760027e91/02.png/600x1300bb.webp"]',
  image_captions = '["Lovelee shared couple space","Lovelee widgets and pet pig","App Store screenshot: shared home","App Store screenshot: couple prompts"]'
WHERE id = 'post-curated-lovelee';

-- ---------------------------------------------------------------------------
-- 2. Vugola — verified YouTube: The Next New Thing, "Hermes: your video clipping machine"
-- ---------------------------------------------------------------------------
UPDATE apps
SET youtube_url = 'https://www.youtube.com/watch?v=yQkzwon5Kh8'
WHERE id = 'curated-vugola';

UPDATE posts
SET
  image_urls = '["/api/media/curated/vugola/01.png","/api/media/curated/vugola/02.png","/api/media/curated/vugola/03.png","https://www.vugolaai.com/showcase/page-1.png","https://www.vugolaai.com/showcase/page-2.png","https://www.vugolaai.com/features/clipping-agent.png"]',
  image_captions = '["Vugola landing page","Vugola clip workflow","Vugola output preview","Official showcase: page 1","Official showcase: page 2","Official feature: clipping agent"]'
WHERE id = 'post-curated-vugola';

-- ---------------------------------------------------------------------------
-- 3. FULL SEND — verified YouTube: Sulfur Cubed, "Track Update of Full Send! Many New Tracks!"
-- ---------------------------------------------------------------------------
UPDATE apps
SET youtube_url = 'https://www.youtube.com/watch?v=A5uKPBH2-og'
WHERE id = 'curated-full-send';

UPDATE posts
SET
  image_urls = '["/api/media/curated/fullsend/01.png","/api/media/curated/fullsend/02.png","https://fullsend.game/og-image.jpg?v=5790c417c834eeb870c6bc680a386cdff8d025e7","https://fullsend.game/assets/about-photo.png"]',
  image_captions = '["FULL SEND gameplay","FULL SEND track editor","Official social preview","Official about image"]'
WHERE id = 'post-curated-full-send';

-- ---------------------------------------------------------------------------
-- 4. 82-0 — verified YouTube: No Dunks, "No Dunks plays the new 82-0.com game"
-- ---------------------------------------------------------------------------
UPDATE apps
SET youtube_url = 'https://www.youtube.com/watch?v=wr92TDDbj2E'
WHERE id = 'curated-82-0';

UPDATE posts
SET
  image_urls = '["/api/media/curated/82-0/01.png","https://82-0.com/og.png"]',
  image_captions = '["82-0 roster simulator","Official 82-0 social preview"]'
WHERE id = 'post-curated-82-0';

-- ---------------------------------------------------------------------------
-- 5. BirdsEyes — verified YouTube: Lovable, "How He Vibe Coded a Viral App and got 30K Users"
-- ---------------------------------------------------------------------------
UPDATE apps
SET youtube_url = 'https://www.youtube.com/watch?v=S3KOX7qh0Qg'
WHERE id = 'curated-birdseyes';

UPDATE posts
SET
  image_urls = '["/api/media/curated/birdseyes/01.png","https://storage.googleapis.com/gpt-engineer-file-uploads/QVRDuNqQjgUvmmq9ugV7H3wmdXT2/social-images/social-1762972163966-freepik__a_minimalistic_cute_black_bird_with_glasses.png"]',
  image_captions = '["BirdsEyes knowledge graph","Official BirdsEyes social image"]'
WHERE id = 'post-curated-birdseyes';

-- ---------------------------------------------------------------------------
-- 6. Dreambase — verified YouTube: Colin Matthews, "5 -figures in 90 days with Supabase Analytics"
-- ---------------------------------------------------------------------------
UPDATE apps
SET youtube_url = 'https://www.youtube.com/watch?v=kpAhuO7HO-I'
WHERE id = 'curated-dreambase';

UPDATE posts
SET
  image_urls = '["/api/media/curated/dreambase/01.png","/api/media/curated/dreambase/02.png","https://images.ctfassets.net/lzny33ho1g45/5Vdy9CB32RxULFMUgCHAZj/f6cf8bd32ae81b9f70b0b756d1529352/vibe-coding-examples-image5.jpeg","https://framerusercontent.com/images/N0SLEXGGnxh0ehSH9mNbwsdU.png?width=1672&height=941","https://framerusercontent.com/images/TdyuUBujxKlQOj0pmtQSr62tes.png?width=2408&height=1686"]',
  image_captions = '["Dreambase landing page","Dreambase dashboard","Zapier article screenshot: Dreambase landing page","Official Dreambase product screenshot","Official Dreambase dashboard screenshot"]'
WHERE id = 'post-curated-dreambase';
