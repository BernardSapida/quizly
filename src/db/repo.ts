import { getDb, newId, now } from "./client";
import type {
  Folder,
  FolderWithProgress,
  Set,
  SetWithProgress,
  StudyMode,
  StudyTerm,
  Term,
  TermKind,
} from "./types";

// Progress is stored per (term, mode), so every aggregate below counts mastery
// in each mode separately. A term mastered in Familiarize is still 0 in Identify.
const MASTERY_COLUMNS = `
  COUNT(t.id) AS term_count,
  COALESCE(SUM(CASE WHEN t.kind = 'enumeration' THEN 1 ELSE 0 END), 0) AS enum_count,
  COALESCE(SUM(CASE WHEN pc.mastered = 1 THEN 1 ELSE 0 END), 0) AS choice_mastered,
  COALESCE(SUM(CASE WHEN pw.mastered = 1 THEN 1 ELSE 0 END), 0) AS written_mastered,
  MAX(COALESCE(pc.last_seen_at, 0), COALESCE(pw.last_seen_at, 0)) AS last_seen_at
`;

const MASTERY_JOINS = `
  LEFT JOIN progress pc ON pc.term_id = t.id AND pc.mode = 'choice'
  LEFT JOIN progress pw ON pw.term_id = t.id AND pw.mode = 'written'
`;

// Folder name, carried on every set row. One-to-one, so it does not disturb the
// counts above. LEFT, not INNER: a loose set is still a set.
const SET_FOLDER_COLUMN = `f.name AS folder_name`;
const SET_FOLDER_JOIN = `LEFT JOIN folders f ON f.id = s.folder_id`;

/* ------------------------------------------------------------------ folders */

export async function listFolders(): Promise<FolderWithProgress[]> {
  const db = await getDb();
  return db.getAllAsync<FolderWithProgress>(`
    SELECT f.*,
           COUNT(DISTINCT s.id) AS set_count,
           ${MASTERY_COLUMNS}
    FROM folders f
    LEFT JOIN sets s ON s.folder_id = f.id
    LEFT JOIN terms t ON t.set_id = s.id
    ${MASTERY_JOINS}
    GROUP BY f.id
    ORDER BY last_seen_at DESC, f.created_at DESC
  `);
}

export async function getFolder(id: string): Promise<FolderWithProgress | null> {
  const db = await getDb();
  return db.getFirstAsync<FolderWithProgress>(
    `
    SELECT f.*,
           COUNT(DISTINCT s.id) AS set_count,
           ${MASTERY_COLUMNS}
    FROM folders f
    LEFT JOIN sets s ON s.folder_id = f.id
    LEFT JOIN terms t ON t.set_id = s.id
    ${MASTERY_JOINS}
    WHERE f.id = ?
    GROUP BY f.id
  `,
    [id]
  );
}

export async function createFolder(name: string): Promise<string> {
  const db = await getDb();
  const id = newId();
  const ts = now();
  await db.runAsync(
    "INSERT INTO folders (id, name, color, created_at, updated_at) VALUES (?, ?, NULL, ?, ?)",
    [id, name, ts, ts]
  );
  return id;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE folders SET name = ?, updated_at = ? WHERE id = ?", [
    name,
    now(),
    id,
  ]);
}

/** Sets survive: folder_id is ON DELETE SET NULL, so they fall back to the Library. */
export async function deleteFolder(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM folders WHERE id = ?", [id]);
}

/* --------------------------------------------------------------------- sets */

/** Sets not inside any folder — shown alongside folders on the Library screen. */
export async function listLooseSets(): Promise<SetWithProgress[]> {
  const db = await getDb();
  return db.getAllAsync<SetWithProgress>(`
    SELECT s.*, ${SET_FOLDER_COLUMN}, ${MASTERY_COLUMNS}
    FROM sets s
    ${SET_FOLDER_JOIN}
    LEFT JOIN terms t ON t.set_id = s.id
    ${MASTERY_JOINS}
    WHERE s.folder_id IS NULL
    GROUP BY s.id
    ORDER BY last_seen_at DESC, s.created_at DESC
  `);
}

/**
 * Every set, folder or not, most recently studied first. Drives Home — both the
 * "Jump back in" row and Recents — and the search box filters this client-side
 * (30 sets is nothing; a LIKE query would be premature).
 */
export async function listAllSets(): Promise<SetWithProgress[]> {
  const db = await getDb();
  return db.getAllAsync<SetWithProgress>(`
    SELECT s.*, ${SET_FOLDER_COLUMN}, ${MASTERY_COLUMNS}
    FROM sets s
    ${SET_FOLDER_JOIN}
    LEFT JOIN terms t ON t.set_id = s.id
    ${MASTERY_JOINS}
    GROUP BY s.id
    ORDER BY last_seen_at DESC, s.created_at DESC
  `);
}

export async function listSetsInFolder(
  folderId: string
): Promise<SetWithProgress[]> {
  const db = await getDb();
  return db.getAllAsync<SetWithProgress>(
    `
    SELECT s.*, ${SET_FOLDER_COLUMN}, ${MASTERY_COLUMNS}
    FROM sets s
    ${SET_FOLDER_JOIN}
    LEFT JOIN terms t ON t.set_id = s.id
    ${MASTERY_JOINS}
    WHERE s.folder_id = ?
    GROUP BY s.id
    ORDER BY s.position ASC, s.created_at ASC
  `,
    [folderId]
  );
}

export async function getSet(id: string): Promise<SetWithProgress | null> {
  const db = await getDb();
  return db.getFirstAsync<SetWithProgress>(
    `
    SELECT s.*, ${SET_FOLDER_COLUMN}, ${MASTERY_COLUMNS}
    FROM sets s
    ${SET_FOLDER_JOIN}
    LEFT JOIN terms t ON t.set_id = s.id
    ${MASTERY_JOINS}
    WHERE s.id = ?
    GROUP BY s.id
  `,
    [id]
  );
}

export async function createSet(
  name: string,
  folderId: string | null = null,
  description: string | null = null
): Promise<string> {
  const db = await getDb();
  const id = newId();
  const ts = now();

  const row = await db.getFirstAsync<{ next: number }>(
    "SELECT COALESCE(MAX(position), -1) + 1 AS next FROM sets WHERE folder_id IS ?",
    [folderId]
  );

  await db.runAsync(
    `INSERT INTO sets (id, folder_id, name, description, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, folderId, name, description, row?.next ?? 0, ts, ts]
  );
  return id;
}

export async function updateSet(
  id: string,
  fields: { name?: string; description?: string | null; folder_id?: string | null }
): Promise<void> {
  const db = await getDb();
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;

  const clause = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v as string | null);
  await db.runAsync(`UPDATE sets SET ${clause}, updated_at = ? WHERE id = ?`, [
    ...values,
    now(),
    id,
  ]);
}

/** Terms and progress cascade. This is destructive and unrecoverable. */
export async function deleteSet(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM sets WHERE id = ?", [id]);
}

/* -------------------------------------------------------------------- terms */

export async function listTerms(setId: string): Promise<Term[]> {
  const db = await getDb();
  return db.getAllAsync<Term>(
    "SELECT * FROM terms WHERE set_id = ? ORDER BY position ASC, created_at ASC",
    [setId]
  );
}

export async function createTerm(
  setId: string,
  fields: {
    term?: string;
    definition?: string;
    kind?: TermKind;
    answers?: string[] | null;
  } = {}
): Promise<string> {
  const db = await getDb();
  const id = newId();
  const ts = now();

  const row = await db.getFirstAsync<{ next: number }>(
    "SELECT COALESCE(MAX(position), -1) + 1 AS next FROM terms WHERE set_id = ?",
    [setId]
  );

  await db.runAsync(
    `INSERT INTO terms (id, set_id, kind, term, definition, answers, position, flagged, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      id,
      setId,
      fields.kind ?? "standard",
      fields.term ?? "",
      fields.definition ?? "",
      fields.answers ? JSON.stringify(fields.answers) : null,
      row?.next ?? 0,
      ts,
      ts,
    ]
  );
  return id;
}

export async function updateTerm(
  id: string,
  fields: {
    term?: string;
    definition?: string;
    kind?: TermKind;
    answers?: string[] | null;
    flagged?: boolean;
  }
): Promise<void> {
  const db = await getDb();

  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  if (fields.term !== undefined) {
    sets.push("term = ?");
    values.push(fields.term);
  }
  if (fields.definition !== undefined) {
    sets.push("definition = ?");
    values.push(fields.definition);
  }
  if (fields.kind !== undefined) {
    sets.push("kind = ?");
    values.push(fields.kind);
  }
  if (fields.answers !== undefined) {
    sets.push("answers = ?");
    values.push(fields.answers ? JSON.stringify(fields.answers) : null);
  }
  if (fields.flagged !== undefined) {
    sets.push("flagged = ?");
    values.push(fields.flagged ? 1 : 0);
  }
  if (sets.length === 0) return;

  await db.runAsync(
    `UPDATE terms SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`,
    [...values, now(), id]
  );
}

export async function deleteTerm(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM terms WHERE id = ?", [id]);
}

export async function reorderTerms(ids: string[]): Promise<void> {
  const db = await getDb();
  const ts = now();
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < ids.length; i++) {
      await db.runAsync(
        "UPDATE terms SET position = ?, updated_at = ? WHERE id = ?",
        [i, ts, ids[i]]
      );
    }
  });
}

/* ------------------------------------------------------------------ studying */

/**
 * The term pool for a study session, with progress in `mode` joined on.
 *
 * A folder pool concatenates every set in the folder in `position` order, which
 * is what makes distractors for a folder session draw from the whole subject.
 */
export async function getStudyPool(
  scope: { setId: string } | { folderId: string },
  mode: StudyMode
): Promise<StudyTerm[]> {
  const db = await getDb();

  const where =
    "setId" in scope ? "t.set_id = ?" : "s.folder_id = ?";
  const param = "setId" in scope ? scope.setId : scope.folderId;

  return db.getAllAsync<StudyTerm>(
    `
    SELECT t.*,
           COALESCE(p.mastered, 0)    AS mastered,
           COALESCE(p.wrong_count, 0) AS wrong_count
    FROM terms t
    JOIN sets s ON s.id = t.set_id
    LEFT JOIN progress p ON p.term_id = t.id AND p.mode = ?
    WHERE ${where}
    ORDER BY s.position ASC, t.position ASC, t.created_at ASC
  `,
    [mode, param]
  );
}

/** Marks the result of one answer. Mastery is binary within a mode. */
export async function recordAnswer(
  termId: string,
  mode: StudyMode,
  correct: boolean
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `
    INSERT INTO progress (term_id, mode, mastered, wrong_count, last_seen_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(term_id, mode) DO UPDATE SET
      mastered     = ?,
      wrong_count  = wrong_count + ?,
      last_seen_at = ?
  `,
    [
      termId,
      mode,
      correct ? 1 : 0,
      correct ? 0 : 1,
      now(),
      correct ? 1 : 0,
      correct ? 0 : 1,
      now(),
    ]
  );
}

/* ---------------------------------------------------------------- transfer */

/** Raw rows for the export builder — progress is deliberately excluded. */
/**
 * Everything a file needs, at whichever grain was asked for.
 *
 * `all` is the backup path, so it must carry the whole shape of the Library: every
 * folder, not one. The narrower scopes are the sharing paths, and they deliberately
 * flatten — sending one set should not drag your folder along with it.
 *
 * Progress is never selected here. It does not travel; see format.ts.
 */
export async function getSetsForExport(
  scope: { setId: string } | { folderId: string } | { all: true }
): Promise<{ folders: Folder[]; sets: Set[]; terms: Term[] }> {
  const db = await getDb();

  let sets: Set[];
  let folders: Folder[] = [];

  if ("setId" in scope) {
    sets = await db.getAllAsync<Set>("SELECT * FROM sets WHERE id = ?", [scope.setId]);
  } else if ("folderId" in scope) {
    const folder = await db.getFirstAsync<Folder>(
      "SELECT * FROM folders WHERE id = ?",
      [scope.folderId]
    );
    folders = folder ? [folder] : [];
    sets = await db.getAllAsync<Set>(
      "SELECT * FROM sets WHERE folder_id = ? ORDER BY position ASC",
      [scope.folderId]
    );
  } else {
    folders = await db.getAllAsync<Folder>("SELECT * FROM folders ORDER BY name ASC");
    sets = await db.getAllAsync<Set>("SELECT * FROM sets ORDER BY position ASC");
  }

  if (sets.length === 0) return { folders, sets: [], terms: [] };

  const placeholders = sets.map(() => "?").join(",");
  const terms = await db.getAllAsync<Term>(
    `SELECT * FROM terms WHERE set_id IN (${placeholders}) ORDER BY position ASC`,
    sets.map((s) => s.id)
  );

  return { folders, sets, terms };
}

export type ImportPlan = {
  folderNames: string[];
  newFolders: number;
  newSets: number;
  newTerms: number;
  updatedTerms: number;
  unchangedTerms: number;
  /**
   * Only ever non-zero for a content pack, which is the one import allowed to delete.
   * Counted so the number is on screen before the button is pressed — it is the only
   * part of an import that can take something away.
   */
  removedSets: number;
  removedTerms: number;
};

type IncomingFolder = {
  id: string;
  name: string;
};

type IncomingTerm = {
  id: string;
  kind: TermKind;
  term: string;
  definition: string;
  answers: string[] | null;
  position: number;
  updatedAt: number;
};

type IncomingSet = {
  id: string;
  folderId: string | null;
  name: string;
  description: string | null;
  position: number;
  updatedAt: number;
  terms: IncomingTerm[];
};

/** Whatever the file carried, already normalised to the current shape. */
export type ImportBundle = {
  /**
   * Set only by the file `npm run export:all` writes — this repo restating what the
   * built-in content is. It is what licenses applyImport to delete; a normal export,
   * which is a person sharing a set, may only add and update.
   */
  contentPack?: boolean;
  folders: IncomingFolder[];
  sets: IncomingSet[];
};

/**
 * What an import *would* do, without writing anything. Never import silently —
 * the user must see what is about to change before it changes.
 */
export async function planImport(bundle: ImportBundle): Promise<ImportPlan> {
  const db = await getDb();
  const plan: ImportPlan = {
    folderNames: bundle.folders.map((f) => f.name),
    newFolders: 0,
    newSets: 0,
    newTerms: 0,
    updatedTerms: 0,
    unchangedTerms: 0,
    removedSets: 0,
    removedTerms: 0,
  };

  for (const folder of bundle.folders) {
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM folders WHERE id = ?",
      [folder.id]
    );
    if (!existing) plan.newFolders++;
  }

  for (const set of bundle.sets) {
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM sets WHERE id = ?",
      [set.id]
    );
    if (!existing) plan.newSets++;

    for (const term of set.terms) {
      const row = await db.getFirstAsync<{ updated_at: number }>(
        "SELECT updated_at FROM terms WHERE id = ?",
        [term.id]
      );
      if (!row) plan.newTerms++;
      else if (term.updatedAt > row.updated_at) plan.updatedTerms++;
      else plan.unchangedTerms++;
    }
  }

  // What a content pack would delete: rows the content pipeline owns that the pack no
  // longer carries. Diffed in memory rather than as a `NOT IN (?, ?, …)` because the
  // id list is every content term there is, and SQLite caps how many parameters one
  // statement may bind.
  if (bundle.contentPack) {
    const incomingSets = new Set(bundle.sets.map((s) => s.id));
    const incomingTerms = new Set(bundle.sets.flatMap((s) => s.terms.map((t) => t.id)));

    const setRows = await db.getAllAsync<{ id: string }>(
      "SELECT id FROM sets WHERE source = 'content'"
    );
    const termRows = await db.getAllAsync<{ id: string }>(
      "SELECT id FROM terms WHERE source = 'content'"
    );

    plan.removedSets = setRows.filter((r) => !incomingSets.has(r.id)).length;
    plan.removedTerms = termRows.filter((r) => !incomingTerms.has(r.id)).length;
  }

  return plan;
}

/**
 * Upsert by UUID. Terms you added locally are never touched, and a term is only
 * overwritten when the incoming copy is genuinely newer. Progress is never
 * written here — mastery is yours, not the sender's.
 *
 * Nothing is ever deleted, because a normal import is a classmate handing you a set and
 * a file someone sent you has no business removing your cards. The single exception is a
 * content pack — see the branch below — which is this repo's own content arriving as a
 * file rather than as a new APK, and is allowed the same prune a launch-time sync does.
 *
 * Known limitation: if two people edit the same term, last import wins. There is
 * no merge. That is the accepted price of having no server.
 */
export async function applyImport(bundle: ImportBundle): Promise<void> {
  // A content pack is the contents/ pipeline arriving as a file instead of baked into
  // the APK, so it means exactly what a launch-time sync means — including the prune
  // that lets a deleted card actually disappear. Regroup it into the shape syncContent
  // takes and hand it over: one implementation of that prune, not two to drift apart.
  if (bundle.contentPack) {
    await syncContent(toContentBundles(bundle));
    return;
  }

  const db = await getDb();
  const ts = now();

  await db.withTransactionAsync(async () => {
    for (const folder of bundle.folders) {
      await db.runAsync(
        `INSERT INTO folders (id, name, color, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
        [folder.id, folder.name, ts, ts]
      );
    }

    for (const set of bundle.sets) {
      // folder_id is only reassigned for a set that is new to this phone. If you
      // already filed someone's set into a folder of your own, re-importing their
      // update must not yank it back out from under you.
      await db.runAsync(
        `INSERT INTO sets (id, folder_id, name, description, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name        = CASE WHEN excluded.updated_at > sets.updated_at THEN excluded.name ELSE sets.name END,
           description = CASE WHEN excluded.updated_at > sets.updated_at THEN excluded.description ELSE sets.description END,
           updated_at  = MAX(excluded.updated_at, sets.updated_at)`,
        [
          set.id,
          set.folderId,
          set.name,
          set.description,
          set.position,
          ts,
          set.updatedAt,
        ]
      );

      for (const term of set.terms) {
        await db.runAsync(
          `INSERT INTO terms (id, set_id, kind, term, definition, answers, position, flagged, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             kind       = CASE WHEN excluded.updated_at > terms.updated_at THEN excluded.kind ELSE terms.kind END,
             term       = CASE WHEN excluded.updated_at > terms.updated_at THEN excluded.term ELSE terms.term END,
             definition = CASE WHEN excluded.updated_at > terms.updated_at THEN excluded.definition ELSE terms.definition END,
             answers    = CASE WHEN excluded.updated_at > terms.updated_at THEN excluded.answers ELSE terms.answers END,
             position   = CASE WHEN excluded.updated_at > terms.updated_at THEN excluded.position ELSE terms.position END,
             updated_at = MAX(excluded.updated_at, terms.updated_at)`,
          [
            term.id,
            set.id,
            term.kind ?? "standard",
            term.term,
            term.definition,
            term.answers ? JSON.stringify(term.answers) : null,
            term.position,
            ts,
            term.updatedAt,
          ]
        );
      }
    }
  });
}

/* ----------------------------------------------------------------- contents */

export type ContentBundle = {
  folder: { id: string; name: string };
  /** The bundle's folder is the folder — a content set never carries its own. */
  sets: Omit<IncomingSet, "folderId">[];
};

/**
 * The flat export shape back into bundles: the folder stops sitting beside its sets and
 * goes back to wrapping them.
 *
 * Every folder is kept, including one with no sets. An empty subject in contents/ is a
 * deliberate "fill this in later", and dropping it here would hand syncContent a folder
 * list that no longer mentions it — which reads as deleted.
 */
function toContentBundles(bundle: ImportBundle): ContentBundle[] {
  return bundle.folders.map((folder) => ({
    folder: { id: folder.id, name: folder.name },
    sets: bundle.sets
      .filter((set) => set.folderId === folder.id)
      .map(({ folderId: _ignored, ...set }) => set),
  }));
}

/**
 * Syncs the bundled contents/ pipeline into the database.
 *
 * Rows written here are marked `source = 'content'`, which is what lets the prune
 * below be safe: removing a term from a JSON file deletes that term, while terms
 * the user added to the same set themselves are untouched.
 *
 * Study progress is never written or deleted here. Editing a definition does not
 * cost anyone their mastery.
 */
export async function syncContent(bundles: ContentBundle[]): Promise<void> {
  const db = await getDb();
  const ts = now();

  await db.withTransactionAsync(async () => {
    const keptSets: string[] = [];
    const keptFolders: string[] = [];

    for (const { folder, sets } of bundles) {
      keptFolders.push(folder.id);
      await db.runAsync(
        `INSERT INTO folders (id, name, color, source, created_at, updated_at)
         VALUES (?, ?, NULL, 'content', ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = ?`,
        [folder.id, folder.name, ts, ts, ts]
      );

      for (const set of sets) {
        keptSets.push(set.id);

        await db.runAsync(
          `INSERT INTO sets (id, folder_id, name, description, position, source, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'content', ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name        = CASE WHEN excluded.updated_at > sets.updated_at THEN excluded.name ELSE sets.name END,
             description = CASE WHEN excluded.updated_at > sets.updated_at THEN excluded.description ELSE sets.description END,
             folder_id   = excluded.folder_id,
             source      = 'content',
             updated_at  = MAX(excluded.updated_at, sets.updated_at)`,
          [set.id, folder.id, set.name, set.description, set.position, ts, set.updatedAt]
        );

        for (const term of set.terms) {
          await db.runAsync(
            `INSERT INTO terms (id, set_id, kind, term, definition, answers, position, flagged, source, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'content', ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               kind       = CASE WHEN excluded.updated_at > terms.updated_at THEN excluded.kind ELSE terms.kind END,
               term       = CASE WHEN excluded.updated_at > terms.updated_at THEN excluded.term ELSE terms.term END,
               definition = CASE WHEN excluded.updated_at > terms.updated_at THEN excluded.definition ELSE terms.definition END,
               answers    = CASE WHEN excluded.updated_at > terms.updated_at THEN excluded.answers ELSE terms.answers END,
               position   = CASE WHEN excluded.updated_at > terms.updated_at THEN excluded.position ELSE terms.position END,
               source     = 'content',
               updated_at = MAX(excluded.updated_at, terms.updated_at)`,
            [
              term.id,
              set.id,
              term.kind ?? "standard",
              term.term,
              term.definition,
              term.answers ? JSON.stringify(term.answers) : null,
              term.position,
              ts,
              term.updatedAt,
            ]
          );
        }

        // Terms deleted from the JSON file. Scoped to source='content', so the
        // user's own additions to this set survive.
        const termIds = set.terms.map((t) => t.id);
        const holes = termIds.map(() => "?").join(",") || "''";
        await db.runAsync(
          `DELETE FROM terms
           WHERE set_id = ? AND source = 'content' AND id NOT IN (${holes})`,
          [set.id, ...termIds]
        );
      }
    }

    // Whole JSON files that were deleted. Again, only content-sourced sets.
    const setHoles = keptSets.map(() => "?").join(",") || "''";
    await db.runAsync(
      `DELETE FROM sets WHERE source = 'content' AND id NOT IN (${setHoles})`,
      keptSets
    );

    // Folders whose directory was removed from contents/. Scoped to the folders we
    // no longer ship: an empty directory in contents/ is a deliberate, still-listed
    // folder, and deleting it here would make "create the subject now, add lessons
    // later" impossible. Folders holding a set the user made are also spared.
    const folderHoles = keptFolders.map(() => "?").join(",") || "''";
    await db.runAsync(
      `DELETE FROM folders
       WHERE source = 'content'
         AND id NOT IN (${folderHoles})
         AND id NOT IN (SELECT DISTINCT folder_id FROM sets WHERE folder_id IS NOT NULL)`,
      keptFolders
    );
  });
}

/** Wipes progress for one mode of one pool. Destructive, not undoable. */
export async function resetProgress(
  scope: { setId: string } | { folderId: string },
  mode?: StudyMode
): Promise<void> {
  const db = await getDb();

  const termFilter =
    "setId" in scope
      ? "SELECT id FROM terms WHERE set_id = ?"
      : "SELECT t.id FROM terms t JOIN sets s ON s.id = t.set_id WHERE s.folder_id = ?";
  const param = "setId" in scope ? scope.setId : scope.folderId;

  const modeClause = mode ? " AND mode = ?" : "";
  const params: (string | number)[] = mode ? [param, mode] : [param];

  await db.runAsync(
    `DELETE FROM progress WHERE term_id IN (${termFilter})${modeClause}`,
    params
  );
}

/**
 * Every set back to 0%, in every mode. The sets, folders and terms all survive —
 * this is the "start the semester again" button, not the delete button.
 *
 * Destructive and not undoable: an export does not carry progress, so there is no
 * backup that could put this back.
 */
export async function resetAllProgress(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM progress");
}

/**
 * Every row, gone: sets, terms, folders, progress. The uninstall, without the
 * uninstall — which makes it the only honest way to rehearse a restore.
 *
 * Deleted child-first by hand rather than leaning on the ON DELETE cascades, since
 * foreign keys are not enabled on this connection (see client.ts) and a cascade
 * that silently does not fire would leave orphaned terms behind.
 *
 * Bundled content is deleted here too, but it comes back: the caller re-syncs it,
 * exactly as a first launch would. See settings.tsx.
 */
export async function deleteAllData(): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM progress");
    await db.runAsync("DELETE FROM terms");
    await db.runAsync("DELETE FROM sets");
    await db.runAsync("DELETE FROM folders");
  });
}
