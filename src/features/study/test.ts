import type { StudyMode, StudyTerm } from "@/db";
import { buildQuestion, shuffle, type Question } from "./engine";

/**
 * What the user picks on the test's start screen. Note this is how questions are
 * ASKED, not how progress is stored — see `store` below.
 */
export type TestFormat = "choice" | "written" | "mixed";

export const TEST_FORMATS: {
  value: TestFormat;
  label: string;
  blurb: string;
}[] = [
  {
    value: "choice",
    label: "Multiple choice",
    blurb: "Pick the right term from four options",
  },
  {
    value: "written",
    label: "Identification",
    blurb: "Type the term from memory and no options",
  },
  {
    value: "mixed",
    label: "Mixed",
    blurb: "A coin-flip of both, the way a real exam comes at you",
  },
];

export type TestQuestion = Question & {
  /**
   * The mastery track this answer lands in. It follows the format the slot was
   * DEALT, not the form it ended up being asked in: a choice slot that fell back
   * to written for want of distractors still records under 'choice', exactly as a
   * Familiarize session does. Otherwise a small pool would quietly log Identify
   * mastery the user never earned.
   */
  store: StudyMode;
};

/**
 * A test, unlike a study session, asks every term exactly once. No rounds, no
 * requeue: the whole point is a clean measurement, and a term you get to retry is
 * not a term you were tested on.
 *
 * Order is shuffled — position order would let you lean on the sequence you
 * revised in, which is the thing an exam is designed to strip away.
 */
export function buildTest(
  pool: StudyTerm[],
  format: TestFormat,
): TestQuestion[] {
  return shuffle(pool).map((term) => {
    const store: StudyMode =
      format === "mixed"
        ? Math.random() < 0.5
          ? "choice"
          : "written"
        : format;
    return { ...buildQuestion(term, pool, store), store };
  });
}

export type Answer = {
  term: StudyTerm;
  correct: boolean;
  /** What they typed / picked, for the review list. Enumerations use `missed`. */
  given: string | null;
  missed: string[];
};

export type Score = {
  correct: number;
  total: number;
  pct: number;
  /** Only the ones worth reviewing — a perfect test has nothing to show. */
  wrong: Answer[];
};

export function scoreTest(answers: Answer[]): Score {
  const correct = answers.filter((a) => a.correct).length;
  return {
    correct,
    total: answers.length,
    pct:
      answers.length === 0 ? 0 : Math.round((correct / answers.length) * 100),
    wrong: answers.filter((a) => !a.correct),
  };
}
