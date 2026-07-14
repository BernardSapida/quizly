# Quizly — Offline MVP Plan

## Scope

A fully offline study app. No server, no network calls, no accounts. All data lives
on the device in SQLite. Sets are shared between people by exporting a JSON file and
sending it through whatever channel they already use (Messenger, Drive, Bluetooth).

Deliberately out of scope: sync, cloud backup, real-time collaboration.

## Architecture

```
Laptop (authoring)              Phone (app)
─────────────────               ──────────────────────────
PDF / PPT                       import .json  ──► SQLite
   │                                              │
   └─ scripts/ingest.ts ──► set.json              ├─ Practice (Learn)
      (LLM, runs on your                          ├─ Test
       machine, key never                         └─ export .json ──► share
       touches the device)
```

The app never talks to a network. The LLM step happens on the laptop, offline from
the app's point of view — it just produces a file the app can import.

## Storage: SQLite, not JSON files

JSON is the *interchange* format. SQLite (`expo-sqlite`) is the *storage* format.

Reasons a raw `.json` file on disk does not work here:

- Every answer mutates study progress. A JSON file means rewriting the whole file on
  each answer, and a crash mid-write corrupts the set.
- Multiple choice needs "3 random other terms from this set" — one SQL query, versus
  hand-rolled shuffling over an in-memory array.
- Study progress is per-term and grows over time. That is a table, not a document.

## Schema

All IDs are UUIDs generated on-device (`expo-crypto` — already a dependency). This is
what makes re-importing an updated set from a classmate *update* existing terms
instead of duplicating them.

**Folder → Set → Term.** A folder is a subject (`COSC50`); a set is a lesson within it
(`Lesson 3: Grammars`). This keeps sets at the 20–30 terms that rounds of 7 are sized
for. A whole-semester set would be 200 terms and 30 rounds, and you could never drill
just the lecture you are behind on.

Folders are **optional** — `sets.folder_id` is nullable, so a set can sit loose at the
top level. Forcing every quick 10-term set into a folder is friction for no gain.

```sql
CREATE TABLE folders (
  id         TEXT PRIMARY KEY,       -- uuid
  name       TEXT NOT NULL,          -- "COSC50"
  color      TEXT,                   -- optional accent for the library card
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE sets (
  id          TEXT PRIMARY KEY,      -- uuid
  folder_id   TEXT REFERENCES folders(id) ON DELETE SET NULL,  -- nullable: loose sets allowed
  name        TEXT NOT NULL,         -- "Lesson 3: Grammars"
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0,  -- order within the folder
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE terms (
  id         TEXT PRIMARY KEY,       -- uuid
  set_id     TEXT NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL DEFAULT 'standard',  -- 'standard' | 'enumeration'
  term       TEXT NOT NULL,          -- "Context Free Grammar"
  definition TEXT NOT NULL,          -- "Generates context-free languages with..."
  answers    TEXT,                   -- JSON array, enumeration only
  position   INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- One row per (term, mode). Progress in multiple choice and progress in
-- identification are tracked SEPARATELY -- they are different modes, not stages.
CREATE TABLE progress (
  term_id      TEXT NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  mode         TEXT NOT NULL,               -- 'choice' | 'written'
  mastered     INTEGER NOT NULL DEFAULT 0,  -- 0 | 1
  wrong_count  INTEGER NOT NULL DEFAULT 0,
  last_seen_at INTEGER,
  PRIMARY KEY (term_id, mode)
);

-- Test mode results. One row per completed test.
CREATE TABLE test_runs (
  id         TEXT PRIMARY KEY,
  set_id     TEXT NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL,
  total      INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE test_answers (
  run_id     TEXT NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  term_id    TEXT NOT NULL,
  given      TEXT,
  correct    INTEGER NOT NULL  -- 0 | 1
);
```

Deleting a folder uses `ON DELETE SET NULL` — the sets survive and fall back to the top
level. Losing a semester of terms because you tidied up a folder would be unforgivable.

## Study pools

A study session runs over a **pool of terms**. The pool is either:

- **One set** — the normal case. "I have a quiz on Lesson 3 tomorrow."
- **A whole folder** — every term across every set in it, concatenated in set `position`
  order. This is midterm review, and it is the feature that makes folders worth having
  rather than merely tidy.

Everything downstream — rounds of 7, mastery, requeue, distractors — operates on the
pool and does not care which grain produced it. Distractors for a folder session are
drawn from the whole folder, which makes them harder in exactly the right way.

Progress is always stored per `(term_id, mode)`, so studying a folder and studying its
sets individually update the *same* rows. Master Lesson 3 on its own and the folder
session already counts those terms as done. There is no double bookkeeping.

## Learn engine (the reinforcement loop)

This is the flow observed in Quizlet and the core of the app.

**Two modes, chosen by the user. They are separate, not stages.**

| Mode | Question style | Progress stored as |
|---|---|---|
| **Familiarize** | Multiple choice only | `progress.mode = 'choice'` |
| **Identify** | Written answer only | `progress.mode = 'written'` |

Each mode has its own independent progress through the set. Perfecting Familiarize does
not advance Identify at all. This mirrors how the app is actually used: grind multiple
choice until you are getting everything right, then deliberately step up to
identification as a self-imposed challenge.

Set Detail therefore shows **two progress bars**, one per mode.

**Rounds.** The set is split into fixed rounds of 7 terms, in order.
`rounds = ceil(termCount / 7)` — 28 terms is exactly 4 rounds of 7. Round N is always
terms `[7N, 7N+7)`; the chunking is stable, not reshuffled between attempts. If the last
round would hold only 1–2 terms, merge it into the previous round rather than shipping a
1-question round.

**A round is complete when every term in it has been answered correctly once, in the
current mode.** You cannot advance to round 2 with an unanswered miss in round 1.

**Mastery is per (term, mode) and binary.**

| Event | Effect |
|---|---|
| Correct in the current mode | `mastered` → 1, term leaves the round queue |
| Wrong in the current mode | `mastered` → 0, `wrong_count`++, term is requeued |

**Requeue on miss.** The round is an in-memory queue. On a wrong answer, show the
correct answer, wait for an explicit "Continue" tap (never auto-advance — the pause is
what makes it stick), then reinsert the missed term at `currentIndex + 2` so it comes
back after the next question. It stays in the queue until answered correctly.

The counter in the header (`2 / 21` in the reference screenshot) counts **terms mastered
in the current mode**, not questions answered. A miss does not increment it.

**Distractors are other terms in the same set.** No AI needed, and it is what makes the
choices genuinely hard — every wrong option is a real concept from the same subject.

```sql
SELECT term FROM terms
WHERE set_id = ? AND id != ?
ORDER BY RANDOM() LIMIT 3;
```

If a set has fewer than 4 terms, fall back to written mode.

**Difficulty progression.** Default to multiple choice. Once the user clears a round
with zero misses, offer to step up to identification. This mirrors how people actually
use it: MC until confident, then challenge yourself.

## Test mode

One-shot. No requeue, no mastery updates, no second chances.

- Configurable before starting: question count, and which types (MC / identification /
  enumeration / mixed).
- Answer every question, submit, then a results screen: score, and a per-question
  breakdown of what you got wrong with the correct answer beside it.
- Persisted to `test_runs` so you can see whether you are improving.

## Enumeration (the gap Quizlet does not fill)

Quizlet has no list-type question — people fake it by cramming the list into the
definition. Quizly supports it as a first-class `kind`.

- Authoring: term = the prompt ("Phases of compilation"), `answers` = JSON array of the
  expected items.
- Grading: normalize case and whitespace, order-independent, mark each item
  hit/missed, score as `hits / total`. Partial credit shown item by item.

## Import / export

**Export.** Serialize to JSON, write via `expo-file-system`, hand to the OS share sheet
via `expo-sharing`. Any transport works — the app does not care.

Two grains, **one format**. A file always carries an array of sets, and a `folders` array
naming the structure they sat in; each set points at its folder with `folderId`, or `null`
to sit loose in the Library. Exporting a single set just means the array has one entry and
`folders` is empty, so the importer only ever needs one code path.

```json
{
  "quizlyVersion": 2,
  "folders": [{ "id": "uuid", "name": "COSC50" }],
  "sets": [
    {
      "id": "uuid",
      "folderId": "uuid",
      "name": "Lesson 3: Grammars",
      "position": 2,
      "updatedAt": 1736000000000,
      "terms": [
        { "id": "uuid", "kind": "standard", "term": "...", "definition": "...", "position": 0 }
      ]
    }
  ]
}
```

For each folder in `folders`: if the user does not already have that folder ID, create it.
If they do, merge the sets into it. A set whose `folderId` names no folder in the file
lands loose in the Library rather than under a folder that does not exist.

`quizlyVersion` is `2`, and 2 is the only version the app reads — a v1 file (singular
`folder` key) is rejected with a plain-language message telling the user to ask for a
fresh export.

**Import.** `expo-document-picker` → parse → upsert by UUID:

- Set ID not present locally → create the set and all its terms.
- Set ID already present → for each term, insert if new, update if the incoming
  `updatedAt` is newer, leave alone otherwise. Terms the user added locally are never
  touched.
- Study progress is always local and never travels in the file. Importing a classmate's
  updated set does not wipe what you have already mastered.

Known and accepted limitation: if two people edit the same term, last import wins.
There is no merge. This is the price of no server, and it is fine for a class group.

## Laptop ingest script

`scripts/ingest.ts` — run on your machine, not on the phone.

1. Extract text from the PDF/PPT.
2. Send to an LLM with a prompt that returns term/definition pairs (and enumeration
   items where a slide is clearly a list).
3. Generate UUIDs, write the export-format JSON above.
4. Move the file to your phone and import it.

The API key lives in the script's `.env` on your laptop. It never ships in the app
bundle.

## Dependencies to add

```
expo-sqlite          storage
expo-file-system     read/write export files
expo-document-picker import
expo-sharing         export via OS share sheet
```

`expo-crypto` is already installed and covers UUID generation.

## Build order

1. SQLite setup + schema + migrations
2. Set CRUD (create set, add/edit/delete terms) — manual entry, no import yet
3. Learn engine: rounds, queue, requeue, mastery counters, MC distractors
4. Identification mode + written-answer grading
5. Export / import JSON
6. Test mode + results screen
7. Enumeration question type
8. `scripts/ingest.ts`

Steps 1–3 are the whole product. Everything after is leverage.
