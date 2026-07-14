# Quizly — Design System

Derived from the Quizlet Learn-mode dark theme. The repo already uses **uniwind**
(Tailwind for RN) + **heroui-native**, with tokens declared in `global.css` under
`@theme` and gradient stops mirrored in `src/theme.ts`. Everything below plugs into that
existing system — no parallel styling layer.

> **One caveat before you ship publicly.** Matching a colour palette and layout for a
> personal study app you pass around your class is fine. Do not ship Quizlet's *name,
> logo, or typeface* — their font (Hurme Geometric) is licensed, and the wordmark is a
> trademark. Use the free alternatives in §2 and your own name. The palette below is
> yours to keep.

---

## 1. Colour tokens

Read off the two Learn-mode screenshots. Dark theme is the primary theme — design it
first, treat light as the derivative.

### Dark (primary)

| Token | Hex | Used for |
|---|---|---|
| `--color-app-base` | `#0A092D` | Screen background. Deep navy, not black. |
| `--color-app-surface` | `#12102F` | Answer-option default fill; barely lifted off the base. |
| `--color-app-surface-2` | `#2E3856` | Elevated fill — the *wrong* option's background, chips, inactive round bars. |
| `--color-app-border` | `#2E3856` | Hairline borders on default option rows. |
| `--color-app-brand` | `#4255FF` | Continue button, primary actions, active states. |
| `--color-app-text` | `#F6F7FB` | Primary text, prompt copy. |
| `--color-app-muted` | `#939BB4` | Unanswered option labels, "Don't know?", section labels. |
| `--color-app-correct` | `#3BE0A0` | Correct-answer ✓, dashed border, mint accents. |
| `--color-app-incorrect` | `#F97316` | Wrong-answer ✕, solid border. **Orange, not red.** |
| `--color-app-encourage` | `#FF8A3D` | The "still learning" line. |
| `--color-app-round-active` | `#E8590C` | Current round pill. |
| `--color-app-round-idle` | `#4A5169` | Upcoming round bars, the total-count chip. |

**The single most important colour decision:** a wrong answer is **orange, not red**.
Red reads as failure. Orange reads as "not yet." The entire emotional tone of the app
rests on this, and it is why the wrong option, the encouragement line, and the round
pill all share the same warm family.

### Light (derivative)

| Token | Hex |
|---|---|
| `--color-app-base` | `#FFFFFF` |
| `--color-app-surface` | `#F6F7FB` |
| `--color-app-surface-2` | `#EDEFF4` |
| `--color-app-border` | `#D9DDE8` |
| `--color-app-text` | `#0A092D` |
| `--color-app-muted` | `#646F90` |

Brand, correct, incorrect, and encourage keep the same hex in both themes.

### Wiring into `global.css`

```css
@theme {
  --color-app-base:       #0A092D;
  --color-app-surface:    #12102F;
  --color-app-surface-2:  #2E3856;
  --color-app-border:     #2E3856;
  --color-app-brand:      #4255FF;
  --color-app-text:       #F6F7FB;
  --color-app-muted:      #939BB4;
  --color-app-correct:    #3BE0A0;
  --color-app-incorrect:  #F97316;
  --color-app-encourage:  #FF8A3D;
  --color-app-round-active: #E8590C;
  --color-app-round-idle:   #4A5169;
}
```

`--accent` is already mapped to `--color-app-brand` in `global.css`, so every
heroui-native button, focus ring, and active state follows automatically.

---

## 2. Typography

Quizlet's face is licensed. Free geometric sans alternatives that hold the same
character, in order of preference: **Outfit**, **Poppins**, **Inter**.

| Role | Size / weight | Notes |
|---|---|---|
| Prompt (the definition) | 22–24px, 600 | Generous line height (~1.4). This is the hero. |
| Section label (`Definition`) | 13px, 600, `--color-app-muted` | Sits above the prompt with the 🔊 button. |
| Option label | 16px, 500 | `--color-app-muted` when unanswered, `--color-app-text` once marked. |
| Encouragement line | 14px, 600, `--color-app-encourage` | |
| Button | 17px, 600 | |

---

## 2b. Glass — one material, everywhere

Every raised surface in the app is **glass**: a translucent white wash over the navy base
plus a hairline light border.

```
--color-app-glass:     rgba(255, 255, 255, 0.06)   /* fill   */
--color-app-glassline: rgba(255, 255, 255, 0.12)   /* border */
```

**The border is what sells it.** A translucent fill on its own just reads as a slightly
lighter rectangle — it is the bright hairline catching the "edge" of the pane that makes
it look like a physical sheet lying on the background.

**Deliberately not `expo-blur`.** The background behind these cards is a flat colour, so
a real backdrop blur would produce a pixel-identical result at the cost of a native
dependency and a per-frame GPU pass.

**Icon tiles are the exception: they stay solid.** A tinted-glass tile dissolves into the
glass card behind it. The tile is the one opaque element on the card, and that is exactly
why it anchors the row.

Everything lives in `src/components/ui/Cards.tsx` — `Card`, `IconTile`, `SetCard`,
`FolderCard` — so Home, Library, Folder Detail, and Set Detail cannot drift apart. Answer
options, flashcards, the search pill, the tab bar, and the Library segmented control all
use the same two tokens.

| | |
|---|---|
| Card radius | 24px (`rounded-3xl`); 16px for compact rows |
| Card padding | 20px |
| Icon tile | 44×44, 16px radius, **solid** brand fill, white glyph, glass hairline border |
| Press | scale to 0.97, spring back — every card must move |
| Progress bar height | 12px full, 8px compact — a 4px bar reads as a hairline, not as progress |

## 2c. Icons, not emoji

**No emoji anywhere in the UI.** They render differently on every device and OS version,
they cannot be recoloured, and they clash visually with a line-icon set. Every one has
been replaced with **Lucide** (`lucide-react-native`), which inherits the palette:

| Was | Now |
|---|---|
| 🔥 streak | `Flame`, tinted `incorrect` |
| 👏 / ✨ praise | `Sparkles`, tinted `correct` |
| 🏆 session complete | `Trophy`, tinted `correct` |
| 🎉 celebration | `PartyPopper` |
| ⚠️ warning | `TriangleAlert`, tinted `encourage` |
| ✓ / ✕ enumeration | `Check` / `X` |
| 📚 / 📁 / ✏️ empty states | `Library` / `FolderOpen` / `Pencil`, tinted `round-idle` |

The praise and encouragement *copy* carries no emoji either — the icon sits beside the
line, so the message stays plain text.

## 2d. Dialogs, not `Alert.alert`

Confirmations use **HeroUI's `Dialog`** via `useConfirm()`, never the OS alert. The native
alert is styled by Android, not by us: it lands as a light-grey box in the middle of a
dark navy app and breaks the illusion entirely. `useConfirm()` returns `{ confirm, dialog }`
— call `confirm({...})`, render `{dialog}` inside the `Screen`. Omitting `onConfirm` makes
it an acknowledgement (single "Okay" button, no Cancel).

Destructive actions pass `variant: "danger"`.

## 3. The answer option row

Six states. Getting these right *is* the visual design of the app.

| State | Fill | Border | Icon | Label colour |
|---|---|---|---|---|
| **Default** | `surface` | 1px `border` | — | `muted` |
| **Pressed** | `surface-2` | 1px `border` | — | `text` |
| **Chosen & correct** | `surface` | **2px solid** `correct` | ✓ `correct` | `text` |
| **Chosen & wrong** | `surface-2` | **2px solid** `incorrect` | ✕ `incorrect` | `text` |
| **Revealed answer** (the one you missed) | transparent | **2px dashed** `correct` | ✓ `correct` | `text` |
| **Dimmed** (unpicked, after answering) | `surface` | 1px `border` | — | `muted` @ 55% opacity |

**Solid border = you chose this. Dashed border = the app is showing you what you
missed.** These are two different green states and they must not be collapsed into one.
When you pick correctly, the row gets a *solid* mint border. When you pick wrong, your
row goes solid orange and the right answer appears with a *dashed* mint border — the
dashes read as "here's the thing you were reaching for," which is softer than a graded
result. Same colour, different sentence.

The other thing both screenshots show: **the marked rows brighten while every untouched
row dims.** Attention collapses onto exactly the comparison that matters — what I picked
versus what was right. Nothing else on the screen competes.

Radius: 12px. Vertical padding: 18px. Gap between rows: 12px.

---

## 4. Round progress bar

Top of the Learn session. One segment per round.

- **Completed round:** solid `correct` green, full width.
- **Current round:** a `round-idle` track filled left-to-right as terms are mastered.
- **Upcoming round:** flat `round-idle`.
- **Far right:** a circular `round-idle` chip with the pool's total term count.

**The pill travels.** A circular pill rides the *head of the current round's fill*,
moving left-to-right as you master terms. It shows how many you have mastered in the
whole pool. A pill pinned to the left edge is dead furniture; one that visibly advances
with each answer is the single clearest signal that you are getting somewhere.

**The fill and pill are tinted by your last answer.** Green after a right answer, orange
after a wrong one. Peripheral confirmation of how you just did, without looking away from
the options.

**Progress never springs.** Use `withTiming` with `Easing.out(Easing.cubic)`, never
`withSpring`. A bar that overshoots and settles back reads as *losing ground you just
earned* — it must only ever travel forwards. (This is the one place the "everything
springs" rule in §6 does not apply.)

Height 12px, radius full, 8px gap between segments.

## 4b. "Let's try again"

When a term you missed comes back around, a small pill reading **"Let's try again"** sits
next to the "Choose the answer" label. It names what is happening, which takes the sting
out of seeing the same card twice — the requeue is the mechanism, not a punishment, and
labelling it that way matters.

## 4c. Round Complete

Not a modal or a toast — a full screen, and the most underrated one in the app.

- A rotating headline ("Going strong, you can do this.").
- **Total set progress: 23%** — the percentage in `correct` green.
- A single full-width bar with the travelling pill, labelled **Mastered** on the left and
  **Total terms** on the right.
- **"Terms studied in your last round"** — every term from the round just cleared, shown
  as term + definition. Seeing the pairs again immediately after earning them is what
  makes the round stick, and it costs the user nothing.
- Pinned at the bottom: **Continue to round 2**.

The scroll container needs generous bottom padding (160) so the last review card does not
hide under the pinned button.

---

## 5. Feedback: copy, sound, haptics

**Both outcomes show a message.** This is the part that is easy to get wrong: a correct
answer is not silent. It gets praise, in green, with an emoji, in the same slot the
encouragement line occupies on a miss. Same position, same size — only the tone and
colour change.

**Correct**
- Chosen row → **solid** mint border + ✓. Everything else dims.
- Round pill and fill turn green.
- 👏 **praise line** appears above the options, in `correct` green
- Success haptic (`Haptics.notificationAsync(Success)`)
- Short rising chime
- **Auto-advances after ~800ms — no tap needed.** The message is shown *during* that
  beat, so the pause is long enough to read it but short enough to keep momentum.

**Wrong**
- Chosen row → **solid** orange border + ✕. The right answer → **dashed** mint border +
  ✓. Everything else dims.
- Round pill and fill turn orange.
- **Encouragement line** appears above the options, in `encourage` orange
- Error haptic (`Haptics.notificationAsync(Error)`)
- Short descending tone — soft, not a buzzer. It must not feel punitive.
- A **Continue** button appears and **blocks progress until tapped.** Never auto-advance.
  The forced pause is the reinforcement mechanism, not a UI courtesy.

The asymmetry is the whole design: **correct auto-advances, wrong makes you stop.** You
are rewarded with momentum and penalised with a beat of your own attention — not with
harsh colour or sound.

**Every tap** gets a light selection haptic (`Haptics.selectionAsync()`) and a soft tick.
This is what makes the app feel responsive rather than laggy, and it costs nothing.

Sound and haptics both get an off switch in Settings — some people study in class.

### Message copy

Both lines **rotate** and never repeat twice in a row. Pick at random, excluding the last
one shown in that session.

**Praise (correct)** — green, emoji-led. Confirmed from the screenshot:

- 👏 "Hard work pays off! Way to go."

More in the same voice: 🎉 "Nailed it." · ⚡ "You're on a roll." · 🔥 "That's three in a
row." · 💪 "Locked in."

**Encouragement (wrong)** — orange, no emoji. Confirmed from the screenshots:

- "No sweat, you're still learning!"
- "No worries, learning is a process!"

More in the same voice: "Almost — you'll get it next time." · "That one's tricky."
· "Keep going, this is how it sticks." · "Not yet, but you're getting closer."

The rules for the wrong-answer copy: warm, present tense, second person, and **never** the
words *wrong*, *incorrect*, *failed*, or *try harder*. The user already knows they missed
it. The copy's only job is to keep them in the chair.

---

## 6. Playfulness

The app must feel **playful, not clinical.** Studying is a chore; the app's job is to make
picking it up feel like opening a game rather than opening a textbook.

The trap: playful is usually implemented as *slow*. Bouncy 600ms transitions are charming
the first time and infuriating by question 40 of a study session. **Playfulness lives in
the flourishes, never in the critical path.** The tap → grade → next-question loop is the
critical path, and it stays fast.

### Motion

Use `react-native-reanimated` (already installed). Springs, not linear easing — everything
should have a little weight and overshoot.

| Element | Motion |
|---|---|
| Option row press | Scale to `0.97`, spring back. Instant, snappy. |
| Correct answer | The row **pops** — scale `1.0 → 1.04 → 1.0`, spring, ~250ms. The ✓ draws in. |
| Wrong answer | The row **shakes** — 3 short horizontal oscillations, ±6px, ~300ms. Never a slow, mournful animation. |
| Question transition | New question slides in from the right, ~200ms. Fast. |
| Round progress fill | Animates to its new width with a spring, so it visibly *lurches* forward on each correct answer. |
| Round bar completing | Brief pulse + glow when a segment fills. |
| Continue button | Fades and slides up ~8px on appearance so it feels like it *arrives*, not blinks. |
| Primary buttons | Scale `0.96` on press. Every tappable thing must move. |

**Every tap has haptics.** Selection haptic on any tap, success/error notification haptics
on grading. This is 80% of what makes an app feel alive, and it costs almost nothing.

### Celebration

Earned, escalating, and **never on the critical path** — celebrate at boundaries (round
end, session end), not on every correct answer.

- **Round Complete** — the round bar fills with a flourish, a burst of confetti, a big
  number counting up. Give it a real moment. It is the payoff for 7 questions of work.
- **Session Complete** — the largest celebration in the app. Confetti, a big "You mastered
  all 28!", the stat cards springing in one after another (~60ms stagger).
- **Streaks** — 🔥 a small flame counter for consecutive correct answers within a session.
  It appears at 3 and grows. Losing it should sting a little; that sting is the engine.
- **Perfect round** — a distinct, better celebration than a normal round. Clearing 7/7 with
  zero misses deserves to feel different from grinding through it.

### Voice

Warm, second person, a little casual. The app is a friend quizzing you, not a proctor.

- Empty library: "No sets yet" — not "0 items."
- Loading: "Shuffling your cards…" — not "Loading."
- Folder card: "4 lessons · 87 terms" — plain and human.
- Emoji, used sparingly and only where they carry meaning: 👏 praise, 🔥 streak,
  🎉 completion. Never decorative emoji in navigation or headers.

### Where playfulness is banned

- **Between questions.** No celebration, no delay, no bounce that gates the next prompt.
- **Test mode.** A test is meant to feel like a test. No praise lines, no confetti, no
  streak counter. The tonal contrast with Learn mode is exactly what makes Test feel
  serious, and it is why the score at the end means something.
- **Destructive confirms.** Deleting a folder is not the place for a joke.

---

## 7. Layout constants

| | |
|---|---|
| Screen padding | 20px horizontal |
| Radius — options, cards | 12px |
| Radius — primary button | full (pill) |
| Primary button height | 56px, full-width minus padding |
| Session header | Back/collapse chevron left · gear + ✕ right |
| Session footer | Flag icon left · "Don't know?" right, both `muted` |

The Continue button sits pinned to the bottom with generous space above it — it should
feel like a deliberate, unhurried beat, not a nag.
