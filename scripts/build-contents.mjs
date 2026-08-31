// Compiles contents/ into a single bundle the app seeds on launch.
//
//   contents/
//     Heritage Tourism/       -> a folder in Quizly, named exactly that
//       <anything>.json       -> a set inside that folder
//
// Name the directory the way the folder should read in the app. It is the display
// name verbatim - spaces, capitals, and all - so there is no slug to decode and no
// second place to keep the real name in sync.
//
// Each JSON is in Quizly's own export format — v2, the same file the app's Share button
// produces — so you can export a set from the app, drop it in here, and it round trips.
//
// This bundle only reaches a phone through a new APK. To push the same content to an
// APK that is already installed, see export-all.mjs — it reads the same folders through
// the same module, so the two agree on every id.
//
// Run: npm run contents:gf   (or  npm run contents -- <profile>)
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";

import { QUIZLY_VERSION, readContents, report } from "./lib/contents.mjs";
import { resolveProfile } from "./lib/profile.mjs";

// One shared output: this is the seed compiled into the APK, and the app has no notion
// of profiles. Whichever profile you build last is what a fresh APK ships with — build
// the one whose APK you are about to cut.
const OUT = "src/features/share/data/contents.json";

const profile = resolveProfile();
const { bundles, setCount, termCount } = readContents(profile);

// A hash of everything: the app only re-syncs when this changes, so a normal
// launch costs one string comparison instead of hundreds of upserts.
const payload = { quizlyVersion: QUIZLY_VERSION, bundles };
payload.hash = createHash("sha256")
  .update(JSON.stringify(bundles))
  .digest("hex")
  .slice(0, 16);

mkdirSync("src/features/share/data", { recursive: true });
writeFileSync(OUT, JSON.stringify(payload, null, 2));

// A build report, not just a success message: it's the only place you see what a
// lesson actually turned into, so a set that quietly lost its enumerations — or a
// subject you meant to fill in and never did — is visible the moment you build.
console.log(`Wrote ${OUT}  (profile: ${profile})\n  hash ${payload.hash}\n`);
report(bundles, { setCount, termCount });
