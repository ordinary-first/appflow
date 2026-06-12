import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Truth-logic tests for the Signal Authority switch, run against in-memory
 * SQLite. Dialect smoke test for D1 (close, not identical — see
 * vitest.config.ts note); the SQL under test is the REAL migration file.
 */

const BACKFILL_SQL = readFileSync(
  path.resolve(__dirname, "../../../drizzle/0005_likes_saves_backfill.sql"),
  "utf8"
);

function runBackfill(db: Database.Database) {
  for (const stmt of BACKFILL_SQL.split("--> statement-breakpoint")) {
    const sql = stmt
      .split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n")
      .trim();
    if (sql) db.exec(sql);
  }
}

function makeDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE user (id TEXT PRIMARY KEY);
    CREATE TABLE apps (
      id TEXT PRIMARY KEY,
      save_count INTEGER NOT NULL DEFAULT 0,
      follower_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE posts (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL REFERENCES apps(id),
      like_count INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE interactions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      anonymous_id TEXT,
      app_id TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE likes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES posts(id),
      user_id TEXT NOT NULL REFERENCES user(id),
      created_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX likes_unique_idx ON likes(post_id, user_id);
    CREATE TABLE saves (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      anonymous_id TEXT,
      app_id TEXT NOT NULL REFERENCES apps(id),
      created_at INTEGER NOT NULL,
      CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)
    );
    CREATE UNIQUE INDEX saves_user_idx ON saves(user_id, app_id) WHERE user_id IS NOT NULL;
    CREATE UNIQUE INDEX saves_anon_idx ON saves(anonymous_id, app_id) WHERE anonymous_id IS NOT NULL;
    CREATE TABLE comments (id TEXT PRIMARY KEY, post_id TEXT NOT NULL);
    CREATE TABLE follows (
      id TEXT PRIMARY KEY, follower_id TEXT NOT NULL,
      target_type TEXT NOT NULL, target_id TEXT NOT NULL
    );
  `);
  db.exec(`
    INSERT INTO user VALUES ('u1'), ('u2');
    INSERT INTO apps (id) VALUES ('app1'), ('app2');
    INSERT INTO posts (id, app_id) VALUES ('post-app1', 'app1');
    -- app2 deliberately has NO canonical post → FK-guard case for likes.
  `);
  return db;
}

describe("0005 backfill (the real migration SQL)", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = makeDb();
  });

  it("dedupes spam: N like interactions from one user = 1 like row", () => {
    for (let i = 0; i < 5; i++) {
      db.prepare(
        "INSERT INTO interactions VALUES (?, 'u1', NULL, 'app1', 'like', ?)"
      ).run(`i${i}`, 1000 + i);
    }
    runBackfill(db);
    expect(db.prepare("SELECT COUNT(*) n FROM likes").get()).toEqual({ n: 1 });
    expect(
      db.prepare("SELECT like_count FROM posts WHERE id='post-app1'").get()
    ).toEqual({ like_count: 1 });
  });

  it("drops anonymous likes (login-required policy)", () => {
    db.prepare(
      "INSERT INTO interactions VALUES ('i1', NULL, 'anon-1', 'app1', 'like', 1000)"
    ).run();
    runBackfill(db);
    expect(db.prepare("SELECT COUNT(*) n FROM likes").get()).toEqual({ n: 0 });
  });

  it("FK guard: likes for an app without a canonical post are skipped, not aborted", () => {
    db.prepare("INSERT INTO interactions VALUES ('i1','u1',NULL,'app2','like',1)").run();
    db.prepare("INSERT INTO interactions VALUES ('i2','u1',NULL,'app1','like',2)").run();
    runBackfill(db); // would throw without the EXISTS guard (OR IGNORE ≠ FK)
    expect(db.prepare("SELECT COUNT(*) n FROM likes").get()).toEqual({ n: 1 });
  });

  it("migrates both user and anon saves and recounts save_count", () => {
    db.prepare("INSERT INTO interactions VALUES ('i1','u1',NULL,'app1','save',1)").run();
    db.prepare("INSERT INTO interactions VALUES ('i2',NULL,'anon-1','app1','save',2)").run();
    db.prepare("INSERT INTO interactions VALUES ('i3',NULL,'anon-1','app1','save',3)").run();
    runBackfill(db);
    expect(db.prepare("SELECT COUNT(*) n FROM saves").get()).toEqual({ n: 2 });
    expect(
      db.prepare("SELECT save_count FROM apps WHERE id='app1'").get()
    ).toEqual({ save_count: 2 });
  });

  it("is idempotent: running twice changes nothing", () => {
    db.prepare("INSERT INTO interactions VALUES ('i1','u1',NULL,'app1','like',1)").run();
    db.prepare("INSERT INTO interactions VALUES ('i2','u2',NULL,'app1','save',2)").run();
    runBackfill(db);
    const snap = {
      likes: db.prepare("SELECT COUNT(*) n FROM likes").get(),
      saves: db.prepare("SELECT COUNT(*) n FROM saves").get(),
    };
    runBackfill(db);
    expect(db.prepare("SELECT COUNT(*) n FROM likes").get()).toEqual(snap.likes);
    expect(db.prepare("SELECT COUNT(*) n FROM saves").get()).toEqual(snap.saves);
  });
});

describe("intent-based toggle semantics (the /api/likes statement shapes)", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = makeDb();
  });

  const add = (id: string) =>
    db
      .prepare(
        "INSERT OR IGNORE INTO likes (id, post_id, user_id, created_at) VALUES (?, 'post-app1', 'u1', 1)"
      )
      .run(id);
  const remove = () =>
    db.prepare("DELETE FROM likes WHERE post_id='post-app1' AND user_id='u1'").run();
  const recount = () =>
    db
      .prepare(
        "UPDATE posts SET like_count = (SELECT COUNT(*) FROM likes WHERE post_id='post-app1') WHERE id='post-app1'"
      )
      .run();
  const count = () =>
    (db.prepare("SELECT like_count n FROM posts WHERE id='post-app1'").get() as { n: number }).n;

  it("5 alternating toggles end at exactly 1 row / count 1", () => {
    for (let i = 0; i < 5; i++) {
      if (i % 2 === 0) add(`l${i}`);
      else remove();
      recount();
    }
    expect(db.prepare("SELECT COUNT(*) n FROM likes").get()).toEqual({ n: 1 });
    expect(count()).toBe(1);
  });

  it("double-tap with the same intent is idempotent (no race inflation)", () => {
    add("l1");
    add("l2"); // concurrent duplicate 'add' — OR IGNORE under the unique index
    recount();
    expect(count()).toBe(1);
    remove();
    remove(); // concurrent duplicate 'remove'
    recount();
    expect(count()).toBe(0);
  });
});

describe("App Score identity dedupe", () => {
  it("namespaced identity never collides user ids with anon ids", () => {
    const db = makeDb();
    // Same raw string as user_id and anonymous_id — must count as 2 identities.
    db.prepare("INSERT INTO user VALUES ('xyz')").run();
    db.prepare("INSERT INTO interactions VALUES ('i1','xyz',NULL,'app1','try_click',1)").run();
    db.prepare("INSERT INTO interactions VALUES ('i2',NULL,'xyz','app1','try_click',2)").run();
    db.prepare("INSERT INTO interactions VALUES ('i3',NULL,'xyz','app1','try_click',3)").run();
    const row = db
      .prepare(
        `SELECT COUNT(DISTINCT COALESCE('u:' || user_id, 'a:' || anonymous_id)) n
         FROM interactions WHERE app_id='app1' AND type='try_click'`
      )
      .get() as { n: number };
    expect(row.n).toBe(2); // u:xyz + a:xyz — deduped per identity, spam-proof
  });
});
