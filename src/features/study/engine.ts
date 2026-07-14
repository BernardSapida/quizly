import type { StudyMode, StudyTerm } from "@/db";

export const ROUND_SIZE = 7;

/**
 * Where a missed term lands in the queue *after* the current one is removed.
 * 1 = one question passes, then it comes back — exactly the observed behaviour.
 */
export const REQUEUE_OFFSET = 1;

/** Multiple choice needs 3 distractors, so a pool under this can only be written. */
export const MIN_POOL_FOR_CHOICE = 4;

export type Round = {
  index: number;
  terms: StudyTerm[];
};

/**
 * Fixed chunks of 7, by position. Round membership is a pure function of order,
 * so a session resumes after an app restart with no stored shuffle. A trailing
 * 1-2 term round is merged back rather than shipping a 1-question round.
 *
 * Enumeration terms are held back to the end of the pool first, so they land in
 * the final round(s). Recalling a whole list is a much slower thing to master than
 * picking or typing one answer, and mixing them in early stalls a round the learner
 * could otherwise have cleared. The partition is stable, so order is still fixed.
 */
export function buildRounds(pool: StudyTerm[]): Round[] {
  if (pool.length === 0) return [];

  const ordered = [
    ...pool.filter((t) => t.kind !== "enumeration"),
    ...pool.filter((t) => t.kind === "enumeration"),
  ];

  const rounds: Round[] = [];
  for (let i = 0; i < ordered.length; i += ROUND_SIZE) {
    rounds.push({ index: rounds.length, terms: ordered.slice(i, i + ROUND_SIZE) });
  }

  const last = rounds[rounds.length - 1];
  if (rounds.length > 1 && last.terms.length <= 2) {
    rounds[rounds.length - 2].terms.push(...last.terms);
    rounds.pop();
  }
  return rounds;
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * How a question is *asked*. Distinct from StudyMode, which is how progress is
 * *stored* — an enumeration term asked inside a Familiarize session still records
 * its mastery under 'choice'.
 */
export type QuestionMode = StudyMode | "enumeration";

export type Question = {
  term: StudyTerm;
  mode: QuestionMode;
  /** Multiple choice only: 4 options with the correct one shuffled into place. */
  options: StudyTerm[];
};

/**
 * Distractors are other terms from the same pool — no AI needed, and it is what
 * makes the choices hard: every wrong option is a real concept from the subject.
 *
 * Both the distractor picks and the correct answer's slot are randomised. Building
 * options as [correct, ...distractors] would put the answer in slot 1 every time.
 */
export function buildQuestion(
  term: StudyTerm,
  pool: StudyTerm[],
  mode: StudyMode
): Question {
  // An enumeration term is always asked as a list, whatever the session mode.
  // "Name the 5 phases" has no meaningful multiple-choice form — the prompt IS
  // the question, and there is no single term to pick.
  if (term.kind === "enumeration") {
    return { term, mode: "enumeration", options: [] };
  }

  if (mode === "written" || pool.length < MIN_POOL_FOR_CHOICE) {
    return { term, mode: "written", options: [] };
  }

  const distractors = shuffle(
    pool.filter((t) => t.id !== term.id && t.kind !== "enumeration")
  ).slice(0, 3);

  // Not enough standard terms to fill the distractor slots — fall back rather
  // than showing a 2-option "choice".
  if (distractors.length < 3) {
    return { term, mode: "written", options: [] };
  }

  return { term, mode: "choice", options: shuffle([term, ...distractors]) };
}

/** A round is done when every term in it is mastered in the session's mode. */
export function buildQueue(round: Round): StudyTerm[] {
  return shuffle(round.terms.filter((t) => t.mastered !== 1));
}

/**
 * Reinsert a missed term into the queue that remains *after* the current question
 * has been removed, so exactly one other question comes between. When it is the
 * only term left there is nothing to come between and it is simply asked again.
 */
export function requeue(remaining: StudyTerm[], term: StudyTerm): StudyTerm[] {
  const next = [...remaining];
  next.splice(Math.min(REQUEUE_OFFSET, next.length), 0, term);
  return next;
}

export function masteredCount(terms: StudyTerm[]): number {
  return terms.filter((t) => t.mastered === 1).length;
}
