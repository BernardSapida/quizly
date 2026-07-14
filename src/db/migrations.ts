import type { SQLiteDatabase } from "expo-sqlite";

/**
 * Migrations run in order, once each. Never edit a migration that has shipped —
 * append a new one instead, or devices already carrying the old schema will
 * silently diverge.
 */
const MIGRATIONS: { version: number; up: string }[] = [
  {
    version: 1,
    up: `
      CREATE TABLE folders (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        color      TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE sets (
        id          TEXT PRIMARY KEY,
        folder_id   TEXT REFERENCES folders(id) ON DELETE SET NULL,
        name        TEXT NOT NULL,
        description TEXT,
        position    INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );

      CREATE TABLE terms (
        id         TEXT PRIMARY KEY,
        set_id     TEXT NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
        kind       TEXT NOT NULL DEFAULT 'standard',
        term       TEXT NOT NULL,
        definition TEXT NOT NULL,
        answers    TEXT,
        position   INTEGER NOT NULL DEFAULT 0,
        flagged    INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE progress (
        term_id      TEXT NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
        mode         TEXT NOT NULL,
        mastered     INTEGER NOT NULL DEFAULT 0,
        wrong_count  INTEGER NOT NULL DEFAULT 0,
        last_seen_at INTEGER,
        PRIMARY KEY (term_id, mode)
      );

      CREATE INDEX idx_sets_folder ON sets(folder_id);
      CREATE INDEX idx_terms_set   ON terms(set_id);
    `,
  },
  {
    version: 2,
    // Marks rows that came from the bundled contents/ pipeline rather than from the
    // user. Without this the app cannot safely prune: deleting a term from a JSON
    // file has to remove that term WITHOUT touching terms the user added themselves
    // to the same set.
    up: `
      ALTER TABLE folders ADD COLUMN source TEXT;
      ALTER TABLE sets    ADD COLUMN source TEXT;
      ALTER TABLE terms   ADD COLUMN source TEXT;
    `,
  },
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  const current = row?.user_version ?? 0;

  for (const { version, up } of MIGRATIONS) {
    if (version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(up);
    });
    // PRAGMA does not accept bound parameters.
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}
