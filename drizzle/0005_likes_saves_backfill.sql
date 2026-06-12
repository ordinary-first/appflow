-- 0005: Backfill legacy like/save interactions into the toggle tables
-- (Signal Authority switch — likes/saves tables become the source of truth,
-- interactions stay analytics-only).
--
-- Idempotent: deterministic ids + INSERT OR IGNORE + unique indexes mean
-- re-running is a no-op. NOTE: OR IGNORE does NOT swallow FK violations,
-- hence the EXISTS guards on the target post/app.
--
-- likes: login-only (anonymous likes dropped — policy, same as 0001).
-- Legacy likes were recorded app-level, so they map to the app's canonical
-- official post ('post-' || app_id, the 0001 backfill convention) — the only
-- mapping that exists for app-level history.
INSERT OR IGNORE INTO likes (id, post_id, user_id, created_at)
SELECT
  'like-bf-' || i.user_id || '-' || i.app_id,
  'post-' || i.app_id,
  i.user_id,
  MIN(i.created_at)
FROM interactions i
WHERE i.type = 'like'
  AND i.user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM posts p WHERE p.id = 'post-' || i.app_id)
GROUP BY i.user_id, i.app_id;
--> statement-breakpoint

-- saves: logged-in identities.
INSERT OR IGNORE INTO saves (id, user_id, anonymous_id, app_id, created_at)
SELECT
  'save-bf-u-' || i.user_id || '-' || i.app_id,
  i.user_id,
  NULL,
  i.app_id,
  MIN(i.created_at)
FROM interactions i
WHERE i.type = 'save'
  AND i.user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM apps a WHERE a.id = i.app_id)
GROUP BY i.user_id, i.app_id;
--> statement-breakpoint

-- saves: anonymous identities (0001 precedent — historic anon saves honored;
-- new writes use the server-signed cookie identity).
INSERT OR IGNORE INTO saves (id, user_id, anonymous_id, app_id, created_at)
SELECT
  'save-bf-a-' || i.anonymous_id || '-' || i.app_id,
  NULL,
  i.anonymous_id,
  i.app_id,
  MIN(i.created_at)
FROM interactions i
WHERE i.type = 'save'
  AND i.user_id IS NULL
  AND i.anonymous_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM apps a WHERE a.id = i.app_id)
GROUP BY i.anonymous_id, i.app_id;
--> statement-breakpoint

-- Recount every cached counter from its authority table (self-healing reset).
UPDATE posts SET like_count = (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id);
--> statement-breakpoint
UPDATE posts SET comment_count = (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id);
--> statement-breakpoint
UPDATE apps SET save_count = (SELECT COUNT(*) FROM saves WHERE saves.app_id = apps.id);
--> statement-breakpoint
UPDATE apps SET follower_count = (SELECT COUNT(*) FROM follows WHERE follows.target_type = 'app' AND follows.target_id = apps.id);
