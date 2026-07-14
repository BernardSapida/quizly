/**
 * Both lines rotate and never repeat twice in a row.
 *
 * Encouragement rules: warm, present tense, second person, and never the words
 * "wrong", "incorrect", "failed", or "try harder". The user already knows they
 * missed it. The copy's only job is to keep them in the chair.
 */

// No emoji anywhere in the copy — they render differently on every device and
// clash with the Lucide icon set. The UI pairs these lines with a real icon.
const PRAISE = [
  "Hard work pays off! Way to go.",
  "Nailed it.",
  "You're on a roll.",
  "Locked in.",
  "That's the one.",
  "Clean answer.",
];

const STREAK_PRAISE: Record<number, string> = {
  3: "Three in a row!",
  5: "Five straight! you're flying.",
  10: "Ten in a row. Unstoppable.",
};

const ENCOURAGEMENT = [
  "No sweat, you're still learning!",
  "No worries, learning is a process!",
  "Almost! you'll get it next time.",
  "That one's tricky.",
  "Keep going, this is how it sticks.",
  "Not yet, but you're getting closer.",
];

function pick(pool: string[], last: string | null): string {
  const options = pool.filter((m) => m !== last);
  return options[Math.floor(Math.random() * options.length)] ?? pool[0];
}

export function pickPraise(streak: number, last: string | null): string {
  // A streak milestone always wins — it is the moment worth calling out.
  const milestone = STREAK_PRAISE[streak];
  if (milestone) return milestone;
  return pick(PRAISE, last);
}

export function pickEncouragement(last: string | null): string {
  return pick(ENCOURAGEMENT, last);
}
