// Which person's content a build is for. Everything under contents/ and storage/ is
// split one directory deep by profile:
//
//   contents/gf/<Subject>/<lesson>.json   storage/gf/quizly-contents.json
//   contents/kylie/<Subject>/…            storage/kylie/quizly-contents.json
//
// A profile is just a directory name under contents/ — add a person by adding the
// folder. The two build scripts each take the profile as their first argument:
//
//   node scripts/build-contents.mjs gf      (npm run contents:gf,  or  npm run contents -- gf)
//   node scripts/export-all.mjs kylie       (npm run export:all:kylie,  ...  export:all -- kylie)
//
// npm eats "--kylie" as its own flag, so the pass-through form needs the bare "--"
// first: `npm run contents -- kylie`. The contents:<name> aliases sidestep that.
import { readdirSync } from "node:fs";

const ROOT = "contents";

/** Directory names under contents/ — the set of valid profiles. */
export function listProfiles() {
  try {
    return readdirSync(ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * The profile for this run: the first non-flag CLI arg, else $QUIZLY_PROFILE. Exits
 * with the list of valid names if it is missing or unknown — a wrong name must never
 * quietly fall through to someone else's content.
 */
export function resolveProfile(argv = process.argv.slice(2)) {
  const known = listProfiles();
  const asList = known.length ? known.join(", ") : "(none - add a folder under contents/)";
  const name = argv.find((a) => !a.startsWith("-")) ?? process.env.QUIZLY_PROFILE;

  if (!name) {
    console.error(
      `No profile given. Pass one: npm run contents -- <name>  (or npm run contents:<name>)\n` +
        `  known: ${asList}`
    );
    process.exit(1);
  }
  if (!known.includes(name)) {
    console.error(`Unknown profile "${name}".\n  known: ${asList}`);
    process.exit(1);
  }
  return name;
}
