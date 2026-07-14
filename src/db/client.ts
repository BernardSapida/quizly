import * as SQLite from "expo-sqlite";
import { randomUUID } from "expo-crypto";
import { migrate } from "./migrations";

const DB_NAME = "quizly.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens (once) and migrates the database. Safe to call from anywhere. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}

/** Device-generated IDs — what lets an imported set merge instead of duplicate. */
export const newId = (): string => randomUUID();

export const now = (): number => Date.now();
