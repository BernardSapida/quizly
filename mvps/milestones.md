# Quizly — MVP Milestones

Five milestones. Each one ends with something you can actually open and use — no
milestone is "plumbing only." Ship M1 to your classmates before starting M3.

See [offline-mvp.md](./offline-mvp.md) for architecture and schema,
[app-spec.md](./app-spec.md) for screens and rules,
[design-system.md](./design-system.md) for the visual language.

---

## M0 — Strip the template ✅ DONE

The repo was a generic app starter that assumed accounts and a server. Nothing in it was
quiz-related.

**Deleted routes:** the entire `(auth)` group, plus
`app/(app)/admin|reports|notifications|activity|explore` and `app/(app)/profile/`.

**Deleted source:** `src/lib/trpc.ts`, `src/lib/query/`, `src/lib/query-client.ts`,
`src/lib/realtime/`, `src/lib/security/`, `src/features/auth/`,
`src/features/notifications/`, `src/features/app-lock/`,
`src/store/slices/auth.slice.ts`, and eight server-state UI components
(`NoInternetScreen`, `OfflineBanner`, `ServerErrorScreen`, `MaintenanceModeScreen`,
`ForceUpdateScreen`, `PasswordInput`, `NotificationPermissionPrimer`,
`PartialErrorBanner`).

**Deleted deps:** `better-auth`, `@trpc/client`, `@tanstack/react-query`, `superjson`,
`@react-native-community/netinfo`, `expo-notifications`, `pusher-js`,
`expo-local-authentication`.

**Added deps:** `expo-sqlite`, `expo-file-system`, `expo-document-picker`,
`expo-sharing` (installed via `expo install` so versions match SDK 56).

**Rewritten:** `app/_layout.tsx` (was a connectivity check → remote app-config fetch →
JWT refresh → realtime mount; now just waits for preferences to rehydrate),
`app/(app)/_layout.tsx` and `tabs.config.ts` (three tabs, no roles), `ui.slice.ts`
(server-state flags → one `sessionActive` flag), `index.tsx` (Library placeholder).

**Renamed the app** from "My Application" to Quizly — `name`, `slug`, `scheme`, Android
`package` (`com.bernardsapida.quizly`), and the APK output name. Done now because nobody
has it installed yet; changing the Android package after distribution forces a reinstall
and destroys everyone's data.

### Things learned during M0

- **`app-lock` could not survive.** It reads `session` / `isLocked` / `pinEnabled` off the
  auth store. A PIN lock is still meaningful offline — reintroduce it in M4 backed by the
  preferences store. `expo-local-authentication` comes back then.
- **SDK 56 forbids importing `@react-navigation/native`** ("no longer compatible with
  expo-router"). The template did it anyway in `app/_layout.tsx` — a latent break that
  only surfaces at bundle time, not typecheck. Theming now goes through HeroUI + Uniwind.
- **`.env` was tracked in git** and held an API URL and Pusher keys. Deleted, and `.env`
  added to `.gitignore`.
- **Four pre-existing type errors remain** (`edgeToEdgeEnabled`, two `Tabs`/`CustomTabBar`
  variance errors, and the `global.css` side-effect import). All present at HEAD, none
  introduced by M0. They do not block the bundle. Worth fixing, but not here.

**Verified:** `expo lint` → 0 errors. `expo export --platform android` → bundles clean,
4124 modules. No new type errors versus HEAD.

---

## M1 — Study something (the actual product) ✅ DONE

This is the milestone that matters. Everything before it is setup; everything after it
is leverage. You can now install the APK and genuinely study for COSC50.

**Built:** `src/db/` (client, migrations, typed repo), `src/features/study/`
(engine, grading, messages, `useSession`), Library, Folder Detail, Set Detail, Term
Editor, Learn Session, Round Complete, Session Complete, and the Quizly palette wired
into `global.css` + `src/theme.ts`.

Routing changed: the root layout is now a **Stack**, and `set/`, `folder/`, and `study`
live *outside* the `(app)` tab group so detail screens push over the tab bar and the study
session runs fullscreen without one.

**Verified:** 0 lint errors, no new type errors, Android bundle clean, and 31 assertions
against the engine's pure functions all pass — round chunking (28 → 4×7, trailing 1–2
merged back), requeue landing the miss after exactly one other question, the correct
option appearing in all 4 slots across 200 draws, typo tolerance forgiving
`context free gramar` while still rejecting `DFA` for `NFA`, and order-independent
enumeration grading.

### Deliberately deferred out of M1

- **Drag-to-reorder terms.** `repo.reorderTerms()` exists and works; there is no UI for it.
- **Learn Settings sheet** (prompt direction, audio). The session is hardcoded to
  definition → term.
- **Real confetti.** Celebrations use emoji plus staggered spring entrances. A particle
  library would be a genuine upgrade.

~~Enumeration in the Term Editor~~ and ~~the Settings screen~~ shipped after M2 — see below.

**Data layer**
- `expo-sqlite` setup, schema, migration runner
- `folders`, `sets`, `terms`, `progress` tables (skip `test_runs` for now)
- UUIDs via `expo-crypto`

**Screens**
- Library — folder cards + loose set cards, empty state, FAB
- Folder Detail — lesson sets, aggregate progress, **Study all** (pools every term in the
  folder)
- Set Detail — Familiarize / Identify buttons, term list, two progress bars
- Term Editor — add/edit/delete/reorder, autosave on blur
- Learn Session — the core screen
- Round Complete, Session Complete

**Learn engine**
- Rounds of 7, `ceil(n/7)`, positional and stable, trailing 1–2 merged back
- Familiarize (multiple choice) and Identify (written) as **separate modes with separate
  progress**, keyed `(term_id, mode)`
- Requeue a miss at `currentIndex + 2`
- **Wrong answer blocks on a Continue tap — never auto-advance.** This is the feature.
- Distractors: 3 random other terms from the same set
- Shuffle question order within a round, and shuffle the position of the correct choice
- Fuzzy grading for written answers (normalize + ~1 typo per 8 chars)

**Done when:** you can hand-type a 28-term set, clear all 4 rounds of Familiarize, get
nudged into Identify, and clear that too.

---

## M2 — Share it with your classmates ✅ DONE

Turns a personal tool into a group one. Also your only backup mechanism.

**Built:** `src/features/share/` (`format.ts` — the versioned envelope and its
plain-language parse errors; `transfer.ts` — write to cache, hand to the OS share sheet,
pick and parse a file back), `repo.getSetsForExport` / `planImport` / `applyImport`, the
`/import` preview screen, Share buttons on Set and Folder Detail, an Import button on the
empty Library, and a rebuilt Settings screen fronted by the data-loss warning and
**Export all my sets**.

**Verified** by running the real `repo.ts` SQL against Node's built-in SQLite (shimming
`expo-sqlite`) — 18 assertions, all passing:

- A newer incoming term overwrites; a **staler one does not clobber your edit**.
- Terms you added locally are never touched.
- **Study progress survives an import** — mastery counts are unchanged afterwards.
- Re-importing the identical file a second time duplicates nothing.
- `planImport` writes nothing to the database.
- Deleting a folder leaves its sets alive and loose in the Library, terms and progress
  intact.

One thing the test caught in *itself*: fixture timestamps must be realistic epoch-ms.
Local rows are written with `Date.now()`, so a "newer" incoming term dated `2_000_000`
is actually 55 years older and correctly refuses to overwrite.

**The flow:** Share a set or folder → JSON written to cache → OS share sheet → send it
however you already talk. They tap the file → import preview (`12 new · 3 updated ·
6 unchanged`) → confirm. Nothing is written until they do.

---

## Enumeration ✅ DONE (pulled forward from M4)

The one gap Quizlet never filled, and the reason to use Quizly over it.

- **Term Editor**: a `LIST` toggle per term. Enumeration terms swap the definition field
  for a repeating list of answer items with add/remove.
- **Session**: one input per expected item, `NAME ALL 5` as the prompt label. After
  answering, every item is shown hit (solid green ✓) or missed (dashed orange ✕) — the
  point is seeing *which* one you forgot, not just that you were short.
- Grading is order-independent with the same typo tolerance as written answers. Partial
  credit is displayed, but **only a full sweep counts as mastery** — knowing 3 of 5 phases
  is not knowing them.

**An enumeration term is never asked as multiple choice**, whatever the session mode.
"Name the 5 phases" has no meaningful 4-option form — the prompt *is* the question. It is
also never used as a distractor for a normal question, and if a pool has too few standard
terms to fill 3 distractor slots, the question falls back to written rather than showing a
2-option "choice".

---

## First APK ✅ BUILT

`android/app/build/outputs/apk/release/Quizly.apk` — 72MB, `com.bernardsapida.quizly`.

Two things the first build attempt taught:

- **`npm run apk:build` only worked in cmd.exe.** It called bare `gradlew`; from Bash that
  resolves to nothing and the build silently stops after prebuild, leaving no APK while
  looking like it succeeded. Fixed to `./gradlew`.
- **`edgeToEdgeEnabled` and `newArchEnabled` are both gone from `ExpoConfig`** in SDK 56 —
  edge-to-edge is mandatory on Android 16 and the new architecture is the default. Removing
  them cleared two of the four pre-existing type errors.

---

## Dark-only theme + flashcards + a real bug ✅ DONE

**Dark-only.** Quizly ignores the phone's light/dark setting entirely — the deep navy
*is* the identity. `userInterfaceStyle: "dark"`, the splash is navy in both variants, and
`Screen` / `CustomTabBar` pin their colours rather than reading `useColorScheme`. The
`theme` preference was deleted (persist `version: 2` migrates devices that had stored
`'system'`). Light mode was never going to work anyway: components hardcode
`COLORS.dark.*` for icons and borders, so a light background gave dark-on-dark text.

**Flashcard carousel on Set Detail.** Swipe through every term; tap a card to flip it
between the definition and the term (Reanimated `rotateY`, `backfaceVisibility: hidden`).
Page dots below. Enumeration cards flip to their answer list. Study modes sit under it as
icon rows.

**Seeded sample.** `src/features/share/data/sample-set.json` is bundled and seeded on
first launch through the *same* parse + upsert path as a real import — no second,
untested way of writing data. Fixed UUIDs make it idempotent. Settings has a "Load the
sample set" button.

### Two bugs found by actually running the app

1. **Seed race.** The Library queried SQLite before seeding finished, so a fresh install
   showed "No sets yet" and only corrected itself if you happened to switch tabs. Boot now
   waits for the seed to *finish*, not just start.

2. **The session could double-count and skip questions.** `advance` called `setQuestion`
   and `setPhase` *inside* a `setQueue` updater. React may invoke an updater more than
   once, re-firing those side effects — on device the mastered counter jumped 0 → 2 on a
   single tap and a missed term came straight back instead of after one other question.

   Fixed by extracting `src/features/study/reducer.ts` — every transition is now pure and
   testable without a renderer, a database, or a device. It also guards the failure mode
   directly: **answering while feedback is showing is a no-op**, and **advancing while
   already asking is a no-op**, so a double-fired event can never double-count or skip.

   33 reducer assertions pass, including: one answer counts as exactly one; after a miss
   the next question is a *different* term and the missed one returns after exactly one
   other; a retried term does not count as first-try correct; a part-mastered set resumes
   at the right round.

**Verified on device** (fresh install, Android emulator): dark theme throughout, sample
seeded on first launch, flashcards flip, wrong answer shows solid-orange ✕ / dashed-green
✓ with the counter holding steady, Continue advances to a different term.

---

## M3 — Test mode

- `test_runs` + `test_answers` tables
- Test Setup — question count, types (MC / identification / enumeration / mixed), shuffle
- Test Session — one shot, **no feedback, no requeue, no mastery updates**
- Test Results — score, per-question breakdown with wrong answers sorted to the top
- **"Practice the ones I missed"** → a Learn session scoped to just the missed terms.
  Highest-value button in the app; do not cut it.

**Done when:** you can take a 20-question mixed test, see exactly where you went wrong,
and drill only those terms.

---

## M4 — Leverage

The things that make the app faster to fill and better than Quizlet at one thing.

- **Enumeration question type** — the gap Quizlet does not fill. `kind = 'enumeration'`,
  order-independent grading, per-item hit/miss, partial credit shown.
- **`scripts/ingest.ts`** — runs on your laptop, not the phone. PDF/PPT → text → LLM →
  set JSON in the export format. API key stays in the script's `.env`, never in the app
  bundle.
- Flagged terms surfaced in the editor
- Score trend on Set Detail from `test_runs`
- Audio (🔊) on prompts

---

## Order of operations

```
M0 ──► M1 ──► M2 ──► M3 ──► M4
        │      │
        │      └─ ship the APK to classmates here
        └─ the product exists here
```

Do not start M3 before M2 is in your classmates' hands. Real usage will change what M3
should be.
