# Quizly — App Spec (Screens, Flows, Rules)

Companion to [offline-mvp.md](./offline-mvp.md), which covers architecture and schema.
This document covers what the user sees and what the app must do.

---

## 0. Template cleanup (do this first)

This repo started as a generic app template. Most of it assumes accounts and a server,
which an offline-only app does not have. Leaving it in place means dead screens, dead
deps, and confusing dead code.

**Delete these routes** — all require a backend:

```
app/(auth)/sign-in.tsx            app/(auth)/otp.tsx
app/(auth)/sign-up.tsx            app/(auth)/account-locked.tsx
app/(auth)/forgot-password.tsx    app/(auth)/reset-password.tsx
app/(app)/admin.tsx               app/(app)/reports.tsx
app/(app)/notifications.tsx       app/(app)/activity.tsx
app/(app)/explore.tsx             app/(app)/profile/*      (entire folder)
```

**Keep and repurpose:**

| File | Becomes |
|---|---|
| `app/(app)/index.tsx` | Library (folders + loose sets) |
| `app/(app)/create.tsx` | Create set / folder |
| `app/(app)/settings.tsx` | Settings |
| `app/(app)/about.tsx` | About (keep as-is) |

`app/_layout.tsx` is **rewritten, not trimmed** — it did a connectivity check, fetched
remote app-config, ran JWT refresh, and mounted realtime. Boot is now purely local: wait
for persisted preferences to rehydrate, then render.

**Delete these dependencies:** `better-auth`, `@trpc/client`, `@tanstack/react-query`,
`superjson`, `@react-native-community/netinfo`, `expo-notifications`.
Also delete `src/lib/trpc.ts`, `src/lib/query/`, `src/lib/query-client.ts`,
`src/lib/realtime/`, `src/lib/security/`, `src/features/auth/`,
`src/features/notifications/`, `src/store/slices/auth.slice.ts`, and the server-state UI
components (`NoInternetScreen`, `OfflineBanner`, `ServerErrorScreen`,
`MaintenanceModeScreen`, `ForceUpdateScreen`, `PasswordInput`,
`NotificationPermissionPrimer`, `PartialErrorBanner`).

**`src/features/app-lock/` also goes.** It reads `session`, `isLocked`, and `pinEnabled`
off the auth store, so it cannot survive auth's removal as-is. A PIN lock is still
meaningful offline — reintroduce it in M4 backed by the preferences store instead.

**Trim, don't delete:** `src/lib/secure-store/` keeps its storage adapter (the
preferences store persists through it) but loses the JWT token helpers.

**Add:** `expo-sqlite`, `expo-file-system`, `expo-document-picker`, `expo-sharing`.

**Onboarding** moves to M4. It lived in the `(auth)` group, and standing it back up is
not worth blocking the data layer on.

---

## 1. Navigation

No auth stack. Three tabs at root:

```
Home    (index)    — search · Jump back in · Recents
Create  (create)   — new set / folder
Folders (folders)  — folders + loose sets
```

**Settings is not a tab.** It lives behind a gear in the Home header, so the bar stays
reserved for the three things you actually *do*. Everything else is a pushed screen or a
modal.

**Home** is the landing screen, not a list:

- A search pill across the top (filters sets by name, client-side — 30 sets is nothing
  and a `LIKE` query would be premature) with the settings gear beside it.
- **Jump back in** — a horizontal, snapping carousel of the sets you have *started but
  not finished*, each showing "N% of questions completed" and a **Continue** button that
  resumes the right mode (Familiarize until it is cleared, then Identify).
- **Recents** — every set, most recently studied first, as compact rows.

```
Home
 ├─ Set Detail  (from search / Recents / Continue)
 └─ Settings    (gear)

Folders
 ├─ Folder Detail              — the lesson sets inside a subject
 │   └─ Study all              — pools every term in the folder
 └─ Set Detail
     ├─ Term Editor            (push)
     ├─ Learn Session          (push, fullscreen, no tab bar)
     │   ├─ Learn Settings     (bottom sheet)
     │   ├─ Round Complete     (in-session screen)
     │   └─ Session Complete   (in-session screen)
     ├─ Test Setup             (push)
     │   ├─ Test Session       (push, fullscreen)
     │   └─ Test Results       (push, replaces session)
     └─ Export                 (OS share sheet)

Create
 ├─ New Set (manual)
 └─ Import from file          (document picker)
```

---

## 2. Screens

### 2.1 Onboarding (first launch only)

Three panels: what it is, how sets work, that sharing is by file. Final button seeds a
small demo set so the Library is never empty on first run. Skippable. Flag stored in
SQLite so it never shows again.

### 2.2 Library

The home screen. **Folders (subjects) and loose sets, together in one list.**

**Folder card:** name (`COSC50`), `4 lessons · 87 terms`, a mastery chip, optional
accent colour.

**Set card** (loose, not in a folder): name, term count, a mastery chip.

**The mastery chip** replaces the progress bars these cards used to carry. A bar answers
"how far along am I", which is not the question you are asking when you scan a list of
twelve lessons the night before an exam. The chip answers "am I done with this":

| State | Colour | Means |
|---|---|---|
| `NOT STARTED` | grey | nothing attempted in either mode |
| `LEARNING 19/32` | orange | working through Familiarize; count is terms recognised |
| `FAMILIAR 28/32` | blue | recognises every term; count is now Identify — the terms you cannot yet produce |
| `MASTERED ✓` | green | every term, both modes |

The colours are the app's existing language, not a new one: blue is already Familiarize
and green is already Identify, so clearing Familiarize turns the chip blue and clearing
Identify on top of it turns it green. Orange keeps the meaning it has on the answer
screen — "not yet", never "wrong".

Bars survive where you are looking at *one* thing rather than scanning many: Set Detail
and Home.

**Actions:** tap a folder → Folder Detail. Tap a set → Set Detail. Long-press either →
sheet with Export / Rename / Move to folder / Delete. FAB → Create (set or folder).

**Empty state:** "No sets yet." Two buttons: *Create a set* and *Import a file*. This is
the screen a classmate sees on a fresh install, so make the import path obvious.

**Sort:** last studied first. Never-studied items go last.

### 2.3 Folder Detail

One subject. The lesson sets inside it. **You study inside a lesson, not here** — the
folder screen is a list, and the only thing it does that a lesson cannot is pool the
whole subject.

**Header:** folder name, `4 lessons · 87 terms`.

**Primary action: Test all N terms** — pools every term across every set in the folder
into one exam. This is midterm review, and it is the reason folders exist rather than
being mere tidiness. It is the screen's *only* action: per-mode drilling belongs to the
lesson that owns the terms.

**Below:** the lesson sets in `position` order, each with its term count and a mastery
chip (§2.2). Tap → Set Detail. Drag to reorder.

**Overflow:** Export folder (bundles every set into one file), Rename, Delete.

**Deleting a folder does not delete its sets** — they fall back to the top level of the
Library. Say so in the confirm dialog.

### 2.4 Set Detail

Header: set name, description, term count.

**Two independent progress bars**, one per practice mode — this is the core of the
screen, because the two modes are separate tracks, not stages of one:

```
Familiarize  ████████░░  21 / 28     (multiple choice)
Identify     ██░░░░░░░░   5 / 28     (written)
```

Primary actions, in this order (most-used first):

- **Familiarize** → Learn Session in multiple-choice mode. Big, primary button.
- **Identify** → Learn Session in written mode. Secondary, but equally prominent once
  Familiarize is complete — that is the moment the user goes looking for it.
- **Test** → Test Setup (§2.9), scoped to this lesson. Every term once, then a score.
- **Edit terms** → Term Editor.

When Familiarize hits 100%, surface a nudge on this screen: *"Ready for a challenge? Try
Identify."* That is the exact behaviour a motivated student does manually.

Below: the full term list, read-only, `term — definition`, with a small badge on
enumeration terms. Terms with `wrong_count > 0` get a subtle marker so you can see
your problem cards at a glance.

Overflow menu: Export, Reset progress, Delete set.

**Reset progress** wipes rows in `progress` for this set only. Confirm first — it is
destructive and not undoable.

### 2.5 Term Editor

A list of editable rows. Each row: term field, definition field, a kind toggle
(Standard / Enumeration), a delete button. Reorderable by drag.

For **enumeration** terms the definition field is replaced by a repeating list of
answer items with add/remove.

"Add term" button at the bottom. Autosave on blur — no explicit save button, and no
way to lose work by backing out.

**Validation:** term and definition both non-empty. An enumeration term needs at least
2 answer items. Do not block saving a set with one term, but warn that multiple choice
needs 4+ terms to work.

### 2.6 Learn Session

The core screen. This is the one in the reference screenshot. It runs in **one mode for
the whole session** — the mode was chosen on Set Detail. Questions never switch type
mid-session.

**Top bar:**
- Left: a small progress ring for the current round.
- Center: round segments — **one bar per round**. A 28-term set shows 4 bars. The active
  one fills as you master terms in it; completed ones are solid.
- Right: `mastered / total` counter (`2 / 21`), a settings gear, and a close X.

**Body:**
- A label saying which side you are being shown (`Term` or `Definition`) with an
  optional 🔊 speak button.
- The prompt, large.
- Below it, the answer area — determined by the session's mode:

**Familiarize (multiple choice):** 4 options. One correct, 3 distractors pulled from
other terms in the same set (`ORDER BY RANDOM() LIMIT 3`). Tapping an option immediately
grades it.

**Identify (written):** a text input plus a Submit button. Grading rules in §4.

**Feedback state (after answering).** Both outcomes show a message in the same slot above
the options — only the tone and colour change. Full visual spec in
[design-system.md](./design-system.md) §3 and §5.

- **Correct** → the chosen option gets a **solid** mint border and a ✓, every other option
  dims, the round pill turns green, and a 👏 praise line appears ("Hard work pays off! Way
  to go."). Success haptic, rising chime, **auto-advances after ~800ms** — long enough to
  read the message, short enough to keep momentum. No tap needed.
- **Wrong** → the chosen option gets a **solid orange** border and an ✕, the right answer
  appears with a **dashed** mint border and a ✓, every other option dims, the round pill
  turns orange, and an encouragement line appears ("No sweat, you're still learning!").
  Error haptic, soft descending tone, and a **Continue** button that **blocks until
  tapped.**

**The asymmetry is the design: correct auto-advances, wrong makes you stop.** You are
rewarded with momentum and penalised with a beat of your own attention — never with harsh
colour or a punitive sound. That forced pause is the single most important interaction in
the app.

Both message lines rotate from a pool and never repeat twice in a row.

**Footer:** a flag icon (mark a term as troublesome — sets a flag column, surfaces it
in the editor) and a "Don't know?" link that grades as wrong without guessing.

**Back / close:** X asks "End session? Your progress is saved." Progress is saved
per-answer anyway, so nothing is lost either way. Android hardware back does the same
thing — never let it silently drop out of a session.

### 2.7 Round Complete

Shown between rounds. "Round 2 of 3 complete." Shows how many terms you mastered and
how many you missed at least once. Single button: **Keep going**.

### 2.8 Session Complete

Every term in the set mastered, in this mode. Show total terms, how many you got right
first try, and the terms you struggled with most (highest `wrong_count`).

The primary button depends on which mode just finished:

- Finished **Familiarize** → **Try Identify** is the primary button. This is the exact
  moment the user is ready to raise the difficulty, and the app should offer it rather
  than making them go hunting.
- Finished **Identify** → **Take a test** is the primary button.

Secondary: **Practice again** (resets progress *for this mode only*, after
confirmation), **Done** → back to Set Detail.

### 2.9 Test Setup

Reached from Set Detail (**Test**) or Folder Detail (**Test all N terms**) — the same
screen, scoped to one lesson or to a whole subject. It shows what you are in for
(`111 questions · every term, once, in random order`) and asks one thing: the format.

- **Multiple choice** — pick the term from four options.
- **Identification** — type the term from memory.
- **Mixed** — each question is dealt one or the other at random. This is the one that
  resembles the actual exam.

Enumeration terms are always asked as a list, whatever the format — "name the 5 phases"
has no multiple-choice form.

Multiple choice and Mixed are disabled below `MIN_POOL_FOR_CHOICE` terms: without four
standard terms there are no distractors, so offering them would be a lie.

### 2.10 Test Session

One question at a time. A counter (`7 / 111`) and a progress bar.

**No feedback. No requeue.** You answer, you move on — no "correct!", no "let's try
again", no running score. That absence is what makes it a test rather than practice, and
it is the key behavioural difference from Learn mode. Skipping is answering wrong; a
blank on an exam is a blank.

**Answers DO update mastery**, unlike everything else on this screen. A correct
multiple-choice answer marks the term mastered under Familiarize, a typed one under
Identify — the track follows the format the question was *dealt*, so a choice question
that fell back to typed for want of distractors still records under Familiarize. Progress
is progress however you earned it, and it is written as you go, so a test abandoned at
question 80 keeps the 80 answers it earned.

Leaving mid-test asks for confirmation, and the run is simply not scored.

### 2.11 Test Results

- Score, large: `78%`, with `87 of 111 correct` under it. 80% or better reads as ready
  (green); below that is orange — "not yet", never "failed".
- **Review these N**: every term you missed, with its definition (or its full answer
  list), plus what you actually put down. Seeing your own wrong answer next to the right
  one is what makes the correction stick. A perfect test shows nothing here.
- Button: **Done**.

Not yet built: **Practice the ones I missed** (a Learn session scoped to just the misses
— the highest-value button this screen could have), **Retake**, and persistence to
`test_runs` for a score trend on Set Detail.

### 2.12 Import

Document picker → parse → **preview before committing**:

> `COSC50`
> 12 new terms · 3 updated · 6 unchanged

Buttons: **Import** / **Cancel**. Never import silently — the user must see what is
about to change.

Errors to handle explicitly: not JSON, wrong `quizlyVersion`, missing fields. Show a
plain-language message, not a stack trace.

### 2.13 Settings

- Theme (light / dark / system).
- Haptics on/off.
- App lock (reuse the existing `app-lock` feature).
- **Backup: export all sets** — see §5, this is not optional.
- Reset all data (double confirm).
- About.

---

## 3. Learn engine rules

The heart of the app. Get this right and everything else is decoration.

**Two modes, picked by the user, tracked separately.**

| Mode | Questions | Progress key |
|---|---|---|
| **Familiarize** | Multiple choice only | `progress.mode = 'choice'` |
| **Identify** | Written only | `progress.mode = 'written'` |

A session is one mode, start to finish. Progress in one does **not** carry into the
other — mastering all 28 terms in Familiarize leaves Identify at 0/28. That separation
is the point: the user chooses when to raise the difficulty, and Identify only means
something if it was earned on its own.

**Rounds.** Split the set into fixed chunks of 7, in order. `rounds = ceil(n / 7)`, so
28 terms → 4 rounds of 7. Round N is always terms `[7N, 7N+7)` — stable across attempts,
not reshuffled. Merge a trailing 1–2 term round into the previous one.

Round N must be fully mastered before round N+1 starts.

**Mastery is per (term, mode) and binary:**

| Event | Effect |
|---|---|
| Correct in the session's mode | `mastered` = 1, leaves the round queue |
| Wrong | `mastered` = 0, `wrong_count`++, requeued |

**Requeue.** The round is an in-memory queue. On a miss, reinsert the term at
`currentIndex + 2` — it comes back after the next question, exactly as observed. It stays
in the queue until answered correctly; the round cannot end with a term unmastered.

**Distractors.** Always from the same set. If the set has fewer than 4 terms, Familiarize
is impossible — disable it and say why.

**Ordering and shuffling.** Three separate decisions, and they do not get the same
answer:

| What | Shuffled? | Why |
|---|---|---|
| Which terms are in round N | **No** — always `[7N, 7N+7)` by position | Round membership stays a pure function of position, so a session resumes after an app restart with no stored shuffle order. Sets authored from lecture slides also chunk into topically coherent rounds for free. |
| Question order **within** a round | **Yes** — reshuffled every time the round starts | Otherwise the user learns "the third one is always BNF Grammar" — position, not content. |
| Position of the correct answer among the 4 choices | **Yes** — every question | Building options as `[correct, ...distractors]` and forgetting to shuffle puts the answer in slot 1 every time and makes the mode trivially gameable. |

So each multiple-choice question involves two random draws: which 3 distractors, and
where the correct option lands.

If you later want to shuffle round membership too, it must be **persisted** — write the
shuffled order to the DB when the session starts, or the user's rounds silently
rearrange between app launches and progress appears to jump around.

**Prompt direction.** Default to showing the definition and asking for the term (as in
the screenshot). Configurable in Learn Settings: term→definition, definition→term, both.

---

## 4. Answer grading

**Multiple choice:** exact ID match. Trivial.

**Identification:** be generous. A student who knows the answer but typos it must not
be punished — that is the fastest way to make the app feel hostile.

Normalize both sides before comparing: trim, collapse whitespace, lowercase, strip
punctuation, drop a leading `a`/`an`/`the`. Then accept if the strings match, **or** if
the Levenshtein distance is within a small threshold scaled to length (roughly 1 edit
per 8 characters).

Also accept: an `answers` array on the term for explicit alternate spellings
(`CFG` for `Context Free Grammar`).

When accepting a near-miss, say so: "Correct — you typed *context free gramar*." The
user learns the exact spelling without losing the point.

**Enumeration:** order-independent. Normalize each item the same way. Score as
`hits / expected`. Show item-by-item which you got and which you missed. Count as
correct for mastery only at 100%.

---

## 5. Things you must know

**Uninstalling the app destroys everything.** There is no server and no cloud backup.
SQLite lives in the app sandbox; uninstall wipes it. This is the single biggest risk of
the offline-only decision.

Consequences you must design for:
- **Export is your backup mechanism, not just a sharing mechanism.** Put "Export all
  sets" in Settings and mean it.
- Consider nudging a backup after any session where the user added or edited terms.
- Say this in onboarding, plainly. A student who loses a semester of sets to a phone
  reset will not forgive the app.

**Reinstalling an APK over an existing one keeps the data** — as long as it is signed
with the same key and they do not uninstall first. Tell your classmates: *update, don't
uninstall*. If they uninstall to "get a clean install," their progress is gone.

**Content and code ship separately.** Updating a set never requires a new APK. You
export JSON, send it in the group chat, they import. Only code changes need a rebuild.

**Study progress never travels in the export file.** Importing a classmate's updated set
updates the terms and leaves your mastery counters alone. Progress is personal and
local, always.

**Last import wins.** If two people edit the same term, there is no merge. Accepted
tradeoff of having no server.

**UUIDs are non-negotiable.** Autoincrement integer IDs would make every import
duplicate every term. IDs are generated on-device with `expo-crypto`.

**Never auto-advance after a wrong answer.** Worth repeating. The Continue tap is the
feature.

---

## 6. Build order

1. Template cleanup (§0) — delete auth, server, and unused deps
2. SQLite setup, schema, migrations
3. Library + Set Detail + Term Editor (manual CRUD)
4. Learn engine: rounds, queue, requeue, mastery, MC distractors
5. Identification mode + fuzzy grading
6. Export / Import with preview
7. Test mode + Results + "practice what I missed"
8. Enumeration type
9. `scripts/ingest.ts` (PDF/PPT → JSON on the laptop)
10. Settings, onboarding, backup nudges

Steps 2–4 are the product. Everything after is leverage.
