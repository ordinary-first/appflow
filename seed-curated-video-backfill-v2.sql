-- ===========================================================================
-- Glim curated video backfill v2.
-- Safe to re-run: every statement is deterministic UPDATE by curated id.
--
-- Updated count: 3 of 23 backfill targets.
-- Dropped (no public video found): taste, sundaze, betriqai, tastly, pathcraft,
--   wanderscout, wise-compass, mindspark-study, brand-studio, resumeagent,
--   cutlist-optimizer, goldmine-ai, ninja-alert, trackingpass, svg-doodle,
--   vibe-coders-globe.
-- Dropped (weak match — video exists but not a real product demo): norte-wallet
--   (channel marketing content, not a demo), great-taxi-assignment + vector-tango
--   (shared Wes Roth Vibe Jam compilation, not per-game demos), outlit (YC
--   interview, not a product demo).
--
-- Conventions:
--   apps.id   = 'curated-<slug>'       posts.id = 'post-curated-<slug>'
--   youtube_url lives on apps.
--   Only includes apps where the YouTube URL was verified as public AND
--   represents an actual demo/launch of the product.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Plinq — verified YouTube: TV GUANANDI, "A EMPREENDEDORA SABRINE MATOS CRIOU O PLINQ, PLATAFORMA PARA PROTEGER MULHERES"
-- ---------------------------------------------------------------------------
UPDATE apps
SET youtube_url = 'https://www.youtube.com/watch?v=7XQv6vzc5Fw'
WHERE id = 'curated-plinq';

-- ---------------------------------------------------------------------------
-- 2. Ready, Steady, Find! — verified YouTube: Ready, Steady, Find!, "Ready, Steady, Find! Promo Trailer 1"
-- ---------------------------------------------------------------------------
UPDATE apps
SET youtube_url = 'https://www.youtube.com/watch?v=inbRUBFxECo'
WHERE id = 'curated-ready-steady-find';

-- ---------------------------------------------------------------------------
-- 3. Vibeware — verified YouTube: Matt Gordon, "Training data Microgames #games"
-- ---------------------------------------------------------------------------
UPDATE apps
SET youtube_url = 'https://www.youtube.com/watch?v=eEJOOePv5cI'
WHERE id = 'curated-vibeware';
