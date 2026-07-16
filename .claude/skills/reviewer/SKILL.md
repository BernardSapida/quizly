---
name: reviewer
description: Turn one lesson's source material (.pptx, .docx, or .pdf) into a Quizly reviewer set under contents/. Use when the user attaches or points at lecture slides, a handout, or a lesson PDF and wants flashcards/a reviewer/a JSON set made from it.
---

# Lesson → Quizly reviewer

One lesson in, one JSON set out, filed under the right subject and compiled into the app.

## 1. Find the file and the lesson

The user drops a `.pptx`, `.docx`, or `.pdf` and usually names the subject and lesson ("Heritage Tourism, Lesson 3"). If either is missing, infer from the filename and the material's own title slide, then **state what you inferred** as you go — don't stop to ask unless it is genuinely ambiguous.

Handle **one lesson per run**. If the file clearly contains several lessons, ask which one before extracting anything.

## 2. Read the source

| Format | How |
| --- | --- |
| `.pdf` | The **Read** tool, directly. Use the `pages` parameter; it is required past 10 pages, so page through the whole file. |
| `.pptx` / `.docx` | `powershell -File .claude/skills/reviewer/office-text.ps1 -Path "<file>"` |
| `.ppt` / `.doc` | Legacy binary. Ask the user to re-save as `.pptx`/`.docx`. |

`office-text.ps1` prints decks slide by slide with speaker notes (lecturers hide the real definitions there), and docs paragraph by paragraph. Pass `-NoNotes` to skip notes.

Set the console to UTF-8 first, or every accent comes back mangled — `Car�me` for
`Carême`, `didn’t` for a curly apostrophe — and the corruption lands silently in
the cards, where it becomes a term the student can never type correctly:

```
powershell -Command "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; & .claude/skills/reviewer/office-text.ps1 -Path '<file>'"
```

The script itself decodes correctly; it is the pipe out of PowerShell that does not.

Where the source spells one name two ways (`Carême` on one slide, `Careme` on the next),
the typed card takes the dominant plain spelling — same rule as slashes and parentheses
below.

If a slide comes back `(no text - image-only slide)`, its content is in the image. Say so — the terms on that slide will be missing unless the user sends a screenshot or the PDF.

## 3. Build the JSON

**Read [`prompts/reviewer-to-quizly-json.md`](../../../prompts/reviewer-to-quizly-json.md) and follow it exactly.** It is the source of truth for the file shape and the extraction rules. The short version, which does not replace reading it:

- Terms and definitions are **copied from the source, not composed**. Same wording, same qualifiers, same examples.
- Go through **every** slide/page. Be exhaustive rather than selective.
- `standard` = one concept, non-empty `definition`, `answers: null`. `enumeration` = a list, `definition: ""`, items in `answers`, count in the term label.
- Anything the student **types** — a `standard` term, an `enumeration` answer — is **one bare name**: no slashed alternatives (`Ilocano`, not `Ilokano/Ilocano`) and no parentheticals (`Department of Tourism`, not `Department of Tourism (DOT)`; `Ilocos Region`, not `Region I (Ilocos Region)`).
- The **definition is the question**, so it must not contain the answer. What you strip out of a term does not get parked in that term's definition — an acronym there gives the term away for free.
- `quizlyVersion: 2`, a `folders` array, and `folderId` on the set. It is the only shape; the build rejects anything else.

## 4. File it

Write to `contents/<Subject Name>/<lesson-title-slug>.json` — e.g.
`contents/Kitchen Essentials and Basic Food Preparation/history-of-culinary-arts.json`.

**The set is named for the lesson's own title — never `Lesson <n>`, and never the
filename.** Take the title from the material itself: the deck's title slide, the PDF's
chapter heading. Write it as it reads there, and put nothing else in it:

```json
{ "name": "History of Culinary Arts" }   // not "Lesson 1: History of Culinary Arts"
```

Course files are named for the registrar — `PRELIM - WEEK 1- HRM 11-002 PPT.pptx` —
which says nothing about what is on the cards. The title does, and the title is what the
student is scanning the Library for. So the filename is a slug *of the title*, not of the
source file, and `WEEK 1` and `HRM 11-002` do not survive into either.

Order comes from `set.position`, not from the name: use the source's own sequence number
(week 1, chapter 3) minus one, so sets still sort the way the course teaches them even
though the number is no longer written anywhere the student reads.

The directory name is the folder's name **and** its identity in the app, spelled exactly as it should read there (spaces and capitals, not a slug). So **reuse the existing subject directory** — run `ls contents/` first; a new directory means a new, separate folder. Directory names contain spaces, so quote every path you pass to a shell.

If the subject already has a lesson file, open it and copy its `folders[0].id` and `folders[0].name` verbatim. Only create a directory for a genuinely new subject, and name it the way it should appear in the app.

## 5. Compile and report

Run `npm run contents`. Without it the lesson is not in the app at all. The build validates as it goes — it fails if a `standard` term has an empty definition — so a clean run is part of the check.

Then report, in this shape. The point of the report is that the user can check your
coverage **without reopening the deck**, so every card is listed against the slide it
came from — a card with no slide number is a card you invented.

Open with one line: subject, lesson, the path you wrote, slides covered, cards made.

Then the cards, in file order:

| # | Term | Kind | Slide |
| --- | --- | --- | --- |
| 0 | Stakeholders (Heritage Tourism) | standard | 3 |
| 1 | The 7 Stakeholders of Heritage Tourism | enumeration (7) | 4 |

For enumerations put the item count in the Kind cell — it is the thing most likely to
be wrong, and the easiest for the user to eyeball against the slide.

Then a short **Gaps** list, and say plainly if it is empty:

- Slides you could not read (image-only), and the terms likely lost with them.
- Anything you deliberately left out, and why.
- Any definition you had to trim or reword, so the user can check it against the source.

Do not commit. The user reviews first.
