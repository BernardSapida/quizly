// Packs contents/ into one file you can import into an APK that is already installed.
//
// The problem this solves: build-contents.mjs compiles content *into* the bundle, so a
// fixed typo only reaches a phone through a new APK. This writes the same content as a
// normal Quizly v2 export instead — one file, every folder and set — which the app's
// Import screen can read without anyone reinstalling anything.
//
// It is marked `contentPack: true`, which is what earns it the right to delete. A plain
// export only ever adds and updates, because it is someone sharing a set with you and
// must not touch what you have. A content pack is this repo restating what the built-in
// content *is*, so a card removed from contents/ is removed from the phone. Only rows
// the content pipeline owns are ever touched; sets you made yourself are not its
// business. See applyImport in src/db/repo.ts.
//
// Older builds that predate the flag ignore it and merge, which is the safe half of the
// behaviour rather than a crash.
//
// Run: npm run export:all
import { writeFileSync, mkdirSync } from "node:fs";

import { QUIZLY_VERSION, readContents, report } from "./lib/contents.mjs";

const OUT = "storage/quizly-contents.json";

const { bundles, setCount, termCount } = readContents();

// Flatten bundles into the two-array export shape: the folder moves from wrapping its
// sets to sitting beside them, and each set points back by id. Empty folders still ship
// — dropping them would make the importer treat a deliberately-empty subject as deleted.
const payload = {
  quizlyVersion: QUIZLY_VERSION,
  contentPack: true,
  folders: bundles.map((b) => b.folder),
  sets: bundles.flatMap((b) =>
    b.sets.map((set) => ({
      id: set.id,
      folderId: b.folder.id,
      name: set.name,
      description: set.description,
      position: set.position,
      updatedAt: set.updatedAt,
      terms: set.terms,
    }))
  ),
};

mkdirSync("storage", { recursive: true });
writeFileSync(OUT, JSON.stringify(payload, null, 2));

console.log(`Wrote ${OUT}\n`);
report(bundles, { setCount, termCount });
console.log(
  `\n  On the phone: Settings → "Import from a file", then pick this file.\n` +
    `  Sets you made yourself are untouched; content cards no longer in contents/ are removed.`
);
