import type { TermKind } from "@/db";

export const QUIZLY_VERSION = 2;

/**
 * Two grains, one format. A file always carries an array of sets; `folders` is the
 * structure they sat in. Exporting a single set just means the array has one entry
 * and `folders` is empty — so the importer only ever needs one code path.
 *
 * Study progress deliberately never travels in the file. It is personal and local:
 * importing a classmate's updated set must never wipe what you have mastered, and
 * restoring your own backup starts every set fresh. Mastery is earned on the phone
 * it lives on.
 *
 * v1 had a single optional `folder` wrapper, which could not express a whole library —
 * "Export all my sets" flattened every folder away. v2 carries a `folders` array and
 * puts `folderId` on each set. v2 is the only shape now: it is what the app writes, what
 * the importer accepts, and what the content build under contents/ is authored in.
 */
export type ExportFolder = {
  id: string;
  name: string;
};

export type ExportTerm = {
  id: string;
  kind: TermKind;
  term: string;
  definition: string;
  answers: string[] | null;
  position: number;
  updatedAt: number;
};

export type ExportSet = {
  id: string;
  /** Null means the set lives loose in the Library, outside any folder. */
  folderId: string | null;
  name: string;
  description: string | null;
  position: number;
  updatedAt: number;
  terms: ExportTerm[];
};

export type ExportFile = {
  quizlyVersion: number;
  /**
   * True only for the file `npm run export:all` writes: this repo restating what the
   * built-in content is, rather than a person sharing a set. It is what licenses the
   * importer to *delete* — see applyImport. Absent or false means a normal export,
   * which may only add and update.
   *
   * Deliberately an optional field on v2 rather than a v3. parseExportFile rejects a
   * version it doesn't recognise in both directions, so bumping would make every
   * installed copy refuse the file outright; a build that predates this flag instead
   * ignores it and merges, which is the safe half of the behaviour.
   */
  contentPack?: boolean;
  folders: ExportFolder[];
  sets: ExportSet[];
};

export class ImportError extends Error {}

/** Plain-language failures — never show the user a stack trace. */
export function parseExportFile(raw: string): ExportFile {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ImportError("That file isn't valid JSON. Is it really a Quizly export?");
  }

  if (typeof json !== "object" || json === null) {
    throw new ImportError("That file doesn't look like a Quizly export.");
  }

  const file = json as Partial<ExportFile>;

  if (typeof file.quizlyVersion !== "number") {
    throw new ImportError("That file doesn't look like a Quizly export.");
  }
  if (file.quizlyVersion > QUIZLY_VERSION) {
    throw new ImportError(
      "This set was made with a newer version of Quizly. Update the app and try again."
    );
  }
  if (file.quizlyVersion < QUIZLY_VERSION) {
    throw new ImportError(
      "This set was made with an older version of Quizly and can no longer be opened. Ask for a fresh export."
    );
  }
  if (!Array.isArray(file.sets) || file.sets.length === 0) {
    throw new ImportError("That export has no sets in it.");
  }

  const folders: ExportFolder[] = Array.isArray(file.folders) ? file.folders : [];

  for (const folder of folders) {
    if (!folder || typeof folder.id !== "string" || typeof folder.name !== "string") {
      throw new ImportError("That export has a folder with no name.");
    }
  }

  const folderIds = new Set(folders.map((f) => f.id));
  const sets: ExportSet[] = [];

  for (const set of file.sets as Partial<ExportSet>[]) {
    if (!set || typeof set.id !== "string" || typeof set.name !== "string") {
      throw new ImportError("That export is missing set names or IDs.");
    }
    if (!Array.isArray(set.terms)) {
      throw new ImportError(`"${set.name}" has no terms.`);
    }
    for (const term of set.terms) {
      if (
        !term ||
        typeof term.id !== "string" ||
        typeof term.term !== "string" ||
        typeof term.definition !== "string"
      ) {
        throw new ImportError(`A term in "${set.name}" is missing its text.`);
      }
    }

    // A set pointing at a folder the file never declared would import as an orphan
    // under a folder that does not exist, so drop the pointer and let it land loose.
    const folderId =
      typeof set.folderId === "string" && folderIds.has(set.folderId)
        ? set.folderId
        : null;

    sets.push({ ...(set as ExportSet), folderId });
  }

  const contentPack = file.contentPack === true;

  // A content pack deletes, so it has to be unambiguous about what it contains. A set
  // pointing at a folder the file never declared just had its pointer nulled above, and
  // would import as a loose set the pack does not appear to own — leaving the real one
  // to be pruned as though it had been removed. Refuse rather than delete on a guess.
  if (contentPack && sets.some((set) => set.folderId === null)) {
    throw new ImportError(
      "That content pack has a set with no folder, so it isn't safe to import."
    );
  }

  return { quizlyVersion: file.quizlyVersion, contentPack, folders, sets };
}

/** Safe as a filename on every platform. */
export function toFilename(name: string): string {
  const clean = name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return `${clean || "quizly-set"}.json`;
}
