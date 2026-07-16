// Reads contents/ into bundles. Shared by the two things that must agree on ids:
//
//   build-contents.mjs   -> the bundle compiled into the APK and seeded on launch
//   export-all.mjs       -> the content pack you import to update an installed APK
//
// Both derive every id from this one file. If they drifted even slightly, an imported
// pack would land as a *duplicate* folder beside the compiled one rather than updating
// it — so the sharing is the point, not a tidiness exercise.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const SRC = "contents";

// Must match QUIZLY_VERSION in src/features/share/format.ts. One shape, everywhere.
export const QUIZLY_VERSION = 2;

/**
 * Stable IDs from stable text. A file that omits `id` still gets the *same* id on
 * every build, so re-running this never duplicates a term — it updates it.
 *
 * The separator is NUL because it cannot occur in a folder or term name: joining on a
 * space would let ("folder", "A B") and ("folder A", "B") hash to the same id. Written
 * as the `\0` escape rather than the raw byte it used to be — the value is identical,
 * but a literal NUL makes the file read as binary to grep and diff, and any editor
 * that strips it would silently renumber every folder in the app.
 */
export function stableId(...parts) {
  const h = createHash("sha256").update(parts.join("\0")).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    "5" + h.slice(13, 16),
    ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

/** "lesson-2" -> "Lesson 2". Only used to name a set whose file omits one. */
const titleCase = (slug) =>
  slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Every folder under contents/, with its sets and terms, ids resolved.
 *
 * Empty directories are kept: standing a subject up now and filling it later is a
 * supported move, and the folder has to exist in the app for that to mean anything.
 */
export function readContents() {
  let dirs;
  try {
    dirs = readdirSync(SRC, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    console.error(`No ${SRC}/ directory. Create it and add a folder per subject.`);
    process.exit(1);
  }

  const bundles = [];
  let setCount = 0;
  let termCount = 0;

  for (const dir of dirs) {
    const dirPath = join(SRC, dir.name);
    const files = readdirSync(dirPath).filter((f) => f.endsWith(".json"));

    // The directory is the folder: it supplies both the identity and the display
    // name, so every set file inside lands in one folder and reads under one name,
    // whatever the files themselves declare.
    const folderId = stableId("folder", dir.name);
    const sets = [];

    for (const file of files) {
      const path = join(dirPath, file);
      const raw = JSON.parse(readFileSync(path, "utf8"));

      if (raw.quizlyVersion !== QUIZLY_VERSION) {
        throw new Error(
          `${path}: quizlyVersion must be ${QUIZLY_VERSION}, got ${JSON.stringify(raw.quizlyVersion)}. ` +
            `v1's singular "folder" key is no longer read — use a "folders" array.`
        );
      }
      if (!Array.isArray(raw.sets)) {
        throw new Error(`${path}: missing a "sets" array.`);
      }

      // Editing a file bumps its mtime, which bumps updatedAt, which is what makes
      // the app overwrite the old copy. Without this, edits would never propagate.
      const updatedAt = Math.floor(statSync(path).mtimeMs);

      // A file's own `folders` and `folderId` are read past, not obeyed: the directory
      // decides both the folder's name and its id. Otherwise two lesson files in one
      // directory could disagree, and the folder's name would come down to which
      // filename sorted first. It also means an export from the app drops in as is.

      for (const set of raw.sets) {
        const name = set.name ?? titleCase(file.replace(/\.json$/, ""));
        const setId = set.id ?? stableId("set", dir.name, name);

        const terms = (set.terms ?? []).map((t, i) => {
          if (!t.term) throw new Error(`${path}: a term is missing its "term" field`);
          const kind = t.kind ?? (t.answers ? "enumeration" : "standard");
          if (kind === "standard" && !t.definition) {
            throw new Error(`${path}: "${t.term}" is missing its definition`);
          }
          return {
            id: t.id ?? stableId("term", dir.name, name, t.term),
            kind,
            term: t.term,
            definition: t.definition ?? "",
            answers: t.answers ?? null,
            position: t.position ?? i,
            updatedAt,
          };
        });

        termCount += terms.length;
        setCount++;
        sets.push({
          id: setId,
          name,
          description: set.description ?? null,
          position: set.position ?? sets.length,
          updatedAt,
          terms,
        });
      }
    }

    bundles.push({ folder: { id: folderId, name: dir.name }, sets });
  }

  return { bundles, setCount, termCount };
}

/** A build report both scripts print, so a lost enumeration is visible either way. */
export function report(bundles, { setCount, termCount }) {
  const stats = bundles.map((b) => {
    const sets = b.sets.map((s) => {
      const enums = s.terms.filter((t) => t.kind === "enumeration");
      return {
        name: s.name,
        terms: s.terms.length,
        standard: s.terms.length - enums.length,
        enumerations: enums.length,
        answers: enums.reduce((n, t) => n + (t.answers?.length ?? 0), 0),
      };
    });
    return {
      name: b.folder.name,
      sets,
      terms: sets.reduce((n, s) => n + s.terms, 0),
      answers: sets.reduce((n, s) => n + s.answers, 0),
    };
  });

  const answerCount = stats.reduce((n, f) => n + f.answers, 0);
  const filled = stats.filter((f) => f.sets.length > 0);
  const empty = stats.filter((f) => f.sets.length === 0);

  // Wide enough for the longest name, but never so wide the counts fall off the screen.
  // Sets sit two spaces deeper than their folder, so budgeting for the folder name means
  // budgeting for it *plus* that indent — otherwise a long folder name shoves its own
  // counts out of the column its sets line up in.
  const COL = Math.min(
    50,
    Math.max(
      ...filled.flatMap((f) => [f.name.length - 2, ...f.sets.map((s) => s.name.length)]),
      0
    )
  );
  const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

  console.log(
    `  ${plural(bundles.length, "folder")} · ${plural(setCount, "set")} · ` +
      `${plural(termCount, "term")} · ${plural(answerCount, "answer")}\n`
  );

  for (const folder of filled) {
    console.log(`  ${folder.name.padEnd(COL + 2)}  ${plural(folder.terms, "term").padStart(9)}`);
    for (const s of folder.sets) {
      const enums = s.enumerations
        ? `  ${String(s.enumerations).padStart(2)} enum (${plural(s.answers, "answer")})`
        : "";
      console.log(
        `    ${s.name.padEnd(COL)}  ${String(s.terms).padStart(3)}  ` +
          `${String(s.standard).padStart(3)} std${enums}`
      );
    }
    console.log();
  }

  // Empty folders are legal — you can stand a subject up now and fill it later — so they
  // get one shared line rather than one line each, wrapped to stay readable.
  if (empty.length) {
    const names = empty.map((f) => f.name).join(", ");
    const lines = [];
    for (const word of names.split(" ")) {
      const last = lines[lines.length - 1];
      if (last && last.length + word.length + 1 <= 70) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    console.log(`  ${plural(empty.length, "folder")}, no sets yet:`);
    for (const line of lines) console.log(`    ${line}`);
  }
}
