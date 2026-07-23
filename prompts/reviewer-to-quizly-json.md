# Reviewer → Quizly JSON

You turn one lesson's source material into one Quizly reviewer file under `contents/`.

## Workflow

I send you **one lesson at a time** — slides, a PDF, a handout, notes, or pasted text — and name the subject and lesson (e.g. "Heritage Tourism, Lesson 3"). You reply with a single JSON file covering **only that lesson**. Never merge two lessons into one file, never invent a lesson I didn't send.

Write it to:

```
contents/<Subject Name>/<lesson-title-slug>.json
```

The directory is named exactly as the folder should read in the app — spaces, capitals, and all: `contents/Heritage Tourism/the-ecosystem-of-heritage-tourism.json`. **Reuse the existing directory** for that subject (`ls contents/`); the directory name is both the folder's name and its identity, so a new directory means a new, separate folder in the app.

The file itself is named for the **lesson's own title**, slugged — not `lesson-<n>`, and not the source file. See `set.name` under [File shape](#file-shape).

Then run `npm run contents` to recompile the bundle. The file is not live in the app until you do.

## The prime rule: copy, don't compose

This is a **reviewer**, not a summary. It's used to study for an exam whose answers come from these exact materials.

- **Terms** must be worded as the source words them. No renaming, no synonyms, no "improving."
- **Definitions** must be the source's definition. Trim filler and fix obvious typos; do **not** add facts the source never states, and do **not** drop qualifiers it does state — the law number, the "previously called NHI," the example.
- If the source gives an example, keep the example. Examples get asked.
- If something is genuinely absent from the source, leave it out. A gap is safer than a plausible invention.

The one thing you may author is the **label** on an enumeration (`"The 7 Stakeholders of Heritage Tourism"`), because the source usually presents a list under a heading rather than as a question. The list items themselves stay verbatim.

## What to extract

Go through **every page/slide, including the ones that look like filler**. For each, ask "could this be asked on the test?" Pull:

- Defined terms, jargon, vocabulary.
- Named entities — agencies, offices, organizations, people, places, sites.
- Laws, codes, and their numbers — R.A., P.D., E.O. — plus any year attached.
- Every numbered or bulleted list ("the 4 functions…", "the 5 categories…", "the 3 types…").
- Classifications, categories, stages, phases, steps, principles.
- Roles and responsibilities ("X is in charge of…").
- Dates, figures, and formulas the lecture states explicitly.
- Distinctions the lecture draws between two similar things.

Skip course logistics, the instructor's name, "any questions?" slides, and decorative photos with no caption content.

Be **exhaustive rather than selective**. A term I already know costs me one swipe; a term you skipped costs me the point.

## Term kinds

Exactly two, and the choice is mechanical.

**`standard`** — one concept, one prose definition.

```json
{
  "id": "b87a214f-b1e5-4bfd-8bef-5c67df748205",
  "term": "Tourism Promotions Board (TPB)",
  "kind": "standard",
  "definition": "Under R.A. 9593; serves as the marketing arm of the Department of Tourism.",
  "answers": null,
  "updatedAt": 1783971504483,
  "position": 18
}
```

`definition` must be a **non-empty** string — the build fails otherwise. `answers` is `null`. Where the source ties a body to a law, keep both: `"Created under P.D. 189; overall in charge of …"`.

**The term is the thing's name, nothing else.** In written mode I type the term out, so every extra word is a word I have to type and a way to get marked wrong. A descriptive qualifier — the superlative, the category, the role the slide filed it under — belongs at the front of the definition, not in the term:

```json
{ "term": "Palawan", "definition": "The largest province in terms of land area. It has a land area of 17,030.75 sq. kms." }
```

Not `"Palawan (Largest Province)"`, `"Mount Apo (Highest Point)"`, `"Aklan (Oldest Province)"`. The slide heading "5. Largest Province: Palawan" names the card **Palawan** — the heading is the question, and the answer is the bare name.

Parentheses stay only when the term is genuinely ambiguous without them. If you can delete the parenthetical and still know what the card is about, delete it.

This applies to `standard` terms. An `enumeration` label is a prompt I read, never type, so it keeps its count and its framing.

### Anything I type is one bare name — no slashes, no parentheses

Every string I have to **type** — a `standard` term, an `enumeration` answer — is reproduced character for character, punctuation included. So it must be one name and nothing else. Two habits from the slides break this:

**Slashed alternatives.** `Ilokano/Ilocano`, `Bisaya/Visayan`. This asks me to type both spellings *and* a slash I'd never think to include. Pick **one**: the source's dominant spelling, or the more common one if the source is even-handed.

**Parentheticals.** `Department of Tourism (DOT)`, `Region I (Ilocos Region)`, `Region IV-A (CALABARZON)`. Two names for one thing, and I can only type one. Keep whichever name I would actually answer with, alone, and drop the rest — including its brackets.

```json
{ "term": "Ilocano" }                          // not "Ilokano/Ilocano"
{ "term": "Department of Tourism" }            // not "Department of Tourism (DOT)"
{ "answers": ["Bisaya", "Cebuano", …] }        // not "Bisaya/Visayan"
{ "answers": ["Ilocos Region", "CALABARZON",   // not "Region I (Ilocos Region)"
              "Cagayan Valley", …] }           // not "Region II (Cagayan Valley)"
```

For an agency, that means the **full name** — the acronym is a mechanical contraction of it, so a card that teaches the name teaches the acronym for free, and the reverse is not true. Whichever form you keep, keep it consistently across a list: don't mix `Region I` with `CALABARZON`.

A parenthetical survives in a **`standard`** term only when the bare name is genuinely ambiguous without it. It never survives in an `enumeration` answer — those are a typed list, and the label already supplies the context.

### The definition is the question, so it must not contain the answer

In written mode the definition is what I'm shown and the term is what I type. So a definition that opens `"DOT. Created under P.D. 189…"` has handed me the answer's initials before I've thought about it, and the card is now free.

Whatever you strip out of a term, **do not park it in that term's definition**. Not the acronym, not the alternate spelling, not the name itself in a different form. If it cannot be typed and cannot be shown, it is simply not on this card:

```json
// wrong — the prompt spells out the answer
{ "term": "Department of Tourism", "definition": "DOT. Created under P.D. 189; …" }

// right — the prompt describes the answer
{ "term": "Department of Tourism", "definition": "Created under P.D. 189; overall in charge of all tourism sites, attractions, activities, services, and infrastructure in the Philippines." }
```

Where the dropped form *can* safely live: an `enumeration` **label** (`"The 18 Administrative Regions of the Philippines, by name"`), which I read and never type. Or a *different* card, where it is the question rather than the answer.

Read every definition back as a quiz question before you ship it. If knowing only the definition would let a stranger produce the term without knowing the lesson, rewrite it.

**`enumeration`** — a list I must recall item by item.

```json
{
  "id": "9c004705-499f-4ad6-bb78-85834cdd387b",
  "term": "5 Categories of Suppliers and Service Providers",
  "kind": "enumeration",
  "definition": "",
  "answers": [
    "Accommodation",
    "Food and beverage",
    "Transportation",
    "Souvenir production",
    "Security and maintenance"
  ],
  "updatedAt": 1783971504483,
  "position": 9
}
```

`definition` is the **empty string** `""`. `answers` is the array. Rules:

- Put the **count in the term label** when the source states or implies one (`"4 Roles of NGOs and Public Interest Groups"`) — recalling how many is half the exam question.
- Keep the source's order.
- Each answer is a **short item, not a sentence**. If the source's bullets run long, keep the key phrase and cut the trailing explanation — in written mode I have to type these.
- Each answer is a **bare name**: no slashed alternatives (`"Ilocano"`, not `"Ilokano/Ilocano"`) and no parentheticals (`"Ilocos Region"`, not `"Region I (Ilocos Region)"`). I type these, so see [Anything I type is one bare name](#anything-i-type-is-one-bare-name--no-slashes-no-parentheses) above.

### Don't make an enumeration I can't type back

The trim rule above assumes each bullet *has* a short key phrase to keep. Some lists don't: each item is a full phrase or clause that loses its meaning the moment you shorten it — a principle stated as a sentence, a step described in a line. A list of those isn't a recall card; it's a paragraph I'd have to reproduce word for word, and in written mode I'm typing every word of it.

Past a handful of such items it's hopeless — nobody types 8+ phrases back verbatim, and a card I can never clear is worse than no card. So when a list is **both long and un-trimmable**, don't force it into an `enumeration`. Instead:

- If each item stands as its own concept, give each its **own `standard` card** — the phrase becomes a term or a definition, not one entry in an eight-way typing test.
- If the items only make sense together, make **one `standard` card** for the concept as a whole and let the definition carry the list as prose.

Reserve `enumeration` for lists of **short, nameable items** — the seven stakeholders, the five categories, the region names. A short list of longer phrases can still work (recalling three is doable); it's the combination of *long* and *many* that breaks it. When in doubt, ask whether I could actually type every answer correctly; if not, it's the wrong kind.

A concept can legitimately be both: a `standard` card for what a stakeholder *is*, plus an `enumeration` card for the seven of them. Do that whenever the source does.

## File shape

Match [`contents/Heritage Tourism/lesson-2.json`](../contents/Heritage%20Tourism/lesson-2.json) exactly:

```json
{
  "quizlyVersion": 2,
  "folders": [
    {
      "id": "<uuid>",
      "name": "Heritage Tourism"
    }
  ],
  "sets": [
    {
      "id": "<uuid>",
      "folderId": "<the uuid from folders[0].id>",
      "name": "<lesson title, exactly as the source's title slide writes it>",
      "description": "<one line naming what the lesson covers>",
      "position": 2,
      "updatedAt": 1783971504483,
      "terms": [ /* … */ ]
    }
  ]
}
```

- **`quizlyVersion`** — `2`. This is Quizly's one and only format: what the app's Share button writes, what Import reads, and what the content build reads. There is no other shape. (v1, with a singular `folder` key, is gone — the build now rejects it.)
- **`folders`** — exactly one folder: this subject.
- **`folders[0].name`** — the subject, matching the directory name. The build does **not** read this — the directory is what names the folder in the app — but keep it truthful so the file stays a valid export the app could import on its own. Copy it from a sibling lesson if one exists.
- **`folders[0].id`** — likewise not read; the folder's real id is derived from the directory name. Keep it present and identical across a subject's files, copying a sibling lesson's value.
- **`sets`** — exactly one set: this lesson.
- **`set.folderId`** — the same uuid as `folders[0].id`. Also not read by the build, and kept for the same reason.
- **`set.name`** — the lesson's **own title**, as the source's title slide or chapter
  heading writes it: `"History of Culinary Arts"`. Never `"Lesson 1: History of Culinary
  Arts"`, and never anything derived from the filename — course files are named for the
  registrar (`PRELIM - WEEK 1- HRM 11-002 PPT.pptx`) and that name tells the student
  nothing about what is on the cards. This is the one string in the file they read while
  choosing what to study, so it carries the topic and nothing else. If the title slide is
  genuinely untitled, name it for what the lesson covers and say so in the report.
- **`set.position`** — the source's own sequence number (week 1, chapter 3) minus one, so
  sets still sort the way the course teaches them. Position is what orders the Library —
  which is exactly why the name does not have to.
- **`id`** (set and every term) — a fresh random UUID v4, never reused across files. The build can generate ids from text if you omit them, but then *editing a term's wording silently replaces the card*; explicit UUIDs keep a card's identity and my progress on it when I fix a typo later.
- **`position`** (terms) — `0…n-1` in source order, no gaps, no duplicates. Order the terms the way the lesson presents them; studying in slide order is how the lecture is remembered.
- **`updatedAt`** — the build overwrites this with the file's mtime, so the value doesn't matter. Include it for parity with the sibling files; use the same number for the set and all its terms.

## Before you hand it over

- [ ] Valid JSON — parses, no trailing commas, no comments.
- [ ] Every `standard` has a non-empty `definition` and `answers: null`.
- [ ] Every `enumeration` has `definition: ""` and a non-empty `answers` array.
- [ ] No `enumeration` asks me to type back long phrases — nothing both long and un-trimmable (roughly 8+ phrase-length items) survived as a list; those became `standard` cards instead.
- [ ] No typed string carries a `/` alternative. No `enumeration` answer carries a parenthetical; a `standard` term carries one only when the bare name is ambiguous without it.
- [ ] No `definition` gives away its own term — no acronym of it, no alternate spelling of it, no restatement of it.
- [ ] Term `position` runs 0…n-1 with no gaps.
- [ ] Every `id` is a distinct UUID; `folder.name` matches the subject's other lessons.
- [ ] `set.name` is the lesson's own title — no `Lesson <n>:` prefix, nothing from the filename — and the filename is that title slugged. Ordering lives in `set.position`.
- [ ] Every term and definition traces back to a line in the source I sent. If you can't point at the slide, delete the card.
- [ ] `npm run contents` runs clean and reports the new set.
- [ ] Tell me how many pages/slides you covered and how many terms you pulled.
