import type { StudyTerm } from "@/db";

/**
 * Normalise before comparing. A student who knows the answer but typos it must
 * not be punished — that is the fastest way to make the app feel hostile.
 */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()"'?]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^(a|an|the) /, "");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Roughly one forgiven edit per 8 characters, min 1 on anything non-trivial. */
function tolerance(expected: string): number {
  if (expected.length <= 3) return 0;
  return Math.max(1, Math.floor(expected.length / 8));
}

export type WrittenResult = {
  correct: boolean;
  /** True when accepted despite a typo — the UI should show the exact spelling. */
  nearMiss: boolean;
};

export function gradeWritten(input: string, term: StudyTerm): WrittenResult {
  const given = normalize(input);
  if (!given) return { correct: false, nearMiss: false };

  const accepted = [term.term, ...parseAnswers(term.answers)];

  for (const candidate of accepted) {
    const expected = normalize(candidate);
    if (!expected) continue;
    if (given === expected) return { correct: true, nearMiss: false };
    if (levenshtein(given, expected) <= tolerance(expected)) {
      return { correct: true, nearMiss: true };
    }
  }
  return { correct: false, nearMiss: false };
}

export type EnumerationResult = {
  correct: boolean;
  hits: string[];
  missed: string[];
};

/**
 * Order-independent. Partial credit is shown item by item, but only a full
 * sweep counts as correct for mastery.
 */
export function gradeEnumeration(
  inputs: string[],
  term: StudyTerm
): EnumerationResult {
  const expected = parseAnswers(term.answers);
  const given = inputs.map(normalize).filter(Boolean);

  const hits: string[] = [];
  const missed: string[] = [];

  for (const item of expected) {
    const target = normalize(item);
    const found = given.some(
      (g) => g === target || levenshtein(g, target) <= tolerance(target)
    );
    (found ? hits : missed).push(item);
  }

  return { correct: missed.length === 0 && expected.length > 0, hits, missed };
}

export type SelectionResult = {
  correct: boolean;
  hits: string[];
  missed: string[];
  /** Decoys that were picked — the thing to *un*learn, so it gets its own slot. */
  wrong: string[];
};

/**
 * Grading for "pick the list". The chips are the term's own items verbatim, so this
 * compares by identity — there is nothing to normalise or forgive, you either
 * touched it or you didn't.
 *
 * A decoy costs you the question. Without that, selecting every chip on screen would
 * be a winning strategy, and the whole thing would collapse into a tapping exercise.
 */
export function gradeSelection(picked: string[], term: StudyTerm): SelectionResult {
  const expected = parseAnswers(term.answers);
  const chosen = new Set(picked);

  const hits = expected.filter((item) => chosen.has(item));
  const missed = expected.filter((item) => !chosen.has(item));
  const wrong = picked.filter((item) => !expected.includes(item));

  return {
    correct: expected.length > 0 && missed.length === 0 && wrong.length === 0,
    hits,
    missed,
    wrong,
  };
}

export function parseAnswers(answers: string | null): string[] {
  if (!answers) return [];
  try {
    const parsed = JSON.parse(answers);
    return Array.isArray(parsed) ? parsed.filter((a) => typeof a === "string") : [];
  } catch {
    return [];
  }
}
