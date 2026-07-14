import type { StudyMode, StudyTerm } from "@/db";
import { normalize, parseAnswers } from "./grading";

export const ROUND_SIZE = 7;

/**
 * Where a missed term lands in the queue *after* the current one is removed.
 * 1 = one question passes, then it comes back — exactly the observed behaviour.
 */
export const REQUEUE_OFFSET = 1;

/** Multiple choice needs 3 distractors, so a pool under this can only be written. */
export const MIN_POOL_FOR_CHOICE = 4;

/**
 * A round is a thing you should be able to clear in one sitting. Recalling a whole
 * list is several times the work of one term, so more than a couple of them in the
 * same seven turns a round into a slog.
 */
export const MAX_ENUM_PER_ROUND = 2;

/** How many decoys join the real items in a "pick the list" question. */
export const SELECT_DISTRACTORS = 4;

/**
 * Below this the grid stops being a question. "Pick the 5" with 5 right answers and
 * one decoy is a formality — fall back to typing the list out instead.
 */
export const MIN_SELECT_DISTRACTORS = 2;

export type Round = {
  index: number;
  terms: StudyTerm[];
};

/**
 * Chunks of 7. Round membership is a pure function of pool order, so a session
 * resumes after an app restart with no stored shuffle. A trailing 1-2 term round is
 * merged back rather than shipping a 1-question round.
 *
 * Enumerations are dealt out across the rounds, at most MAX_ENUM_PER_ROUND each,
 * and the standard terms fill in around them. They used to be pushed to the *end* of
 * the pool, which meant a set with five lists finished with a round that was nothing
 * but lists — a wall of the hardest thing there is, arriving exactly when the learner
 * is most spent. Spread out, each one lands among terms that carry the round.
 */
export function buildRounds(pool: StudyTerm[]): Round[] {
  if (pool.length === 0) return [];

  const standard = pool.filter((t) => t.kind !== "enumeration");
  const lists = pool.filter((t) => t.kind === "enumeration");

  const count = Math.ceil(pool.length / ROUND_SIZE);
  const rounds: Round[] = Array.from({ length: count }, (_, index) => ({
    index,
    terms: [],
  }));

  // Deal the lists round-robin so consecutive ones land in different rounds.
  const listCount = new Array<number>(count).fill(0);
  let cursor = 0;

  for (const term of lists) {
    let placed = false;
    for (let i = 0; i < count; i++) {
      const at = (cursor + i) % count;
      if (listCount[at] < MAX_ENUM_PER_ROUND && rounds[at].terms.length < ROUND_SIZE) {
        rounds[at].terms.push(term);
        listCount[at]++;
        cursor = at + 1;
        placed = true;
        break;
      }
    }
    // A pool that is mostly lists cannot honour the cap. Keep them balanced rather
    // than letting the overflow pile up at the back.
    if (!placed) {
      const emptiest = rounds.reduce(
        (best, r, i) => (r.terms.length < rounds[best].terms.length ? i : best),
        0
      );
      rounds[emptiest].terms.push(term);
    }
  }

  const rest = [...standard];
  for (const round of rounds) {
    while (round.terms.length < ROUND_SIZE && rest.length > 0) {
      round.terms.push(rest.shift()!);
    }
  }
  // Only reachable when lists overflowed their cap and stole the slots.
  rounds[rounds.length - 1].terms.push(...rest);

  const populated = rounds.filter((r) => r.terms.length > 0);
  populated.forEach((r, i) => (r.index = i));

  const last = populated[populated.length - 1];
  if (populated.length > 1 && last.terms.length <= 2) {
    populated[populated.length - 2].terms.push(...last.terms);
    populated.pop();
  }
  return populated;
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
 *
 * 'select' is the recognition form of a list: the items are on screen, mixed with
 * decoys, and you pick the ones that belong. 'enumeration' is the recall form: N
 * empty boxes and nothing else.
 */
export type QuestionMode = StudyMode | "enumeration" | "select";

export type Question = {
  term: StudyTerm;
  mode: QuestionMode;
  /** Multiple choice only: 4 options with the correct one shuffled into place. */
  options: StudyTerm[];
  /** Select only: every real item shuffled together with the decoys. */
  chips: string[];
};

/**
 * Decoys for a "pick the list" question, drawn first from the items of OTHER lists
 * in the same pool. Those are the sharpest ones available: same subject, same
 * register, and each is a real thing the learner has to be able to rule out. Terms
 * fill in behind them when the set has only the one list.
 *
 * Returns null when the pool cannot field enough of them — the caller falls back to
 * asking for the list to be typed out.
 */
export function buildChips(term: StudyTerm, pool: StudyTerm[]): string[] | null {
  const items = parseAnswers(term.answers);
  if (items.length === 0) return null;

  const seen = new Set(items.map(normalize));
  const fromLists: string[] = [];
  const fromTerms: string[] = [];

  const add = (into: string[], value: string) => {
    const key = normalize(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    into.push(value);
  };

  for (const other of pool) {
    if (other.id === term.id) continue;
    if (other.kind === "enumeration") {
      for (const item of parseAnswers(other.answers)) add(fromLists, item);
    } else {
      add(fromTerms, other.term);
    }
  }

  const decoys = [...shuffle(fromLists), ...shuffle(fromTerms)].slice(
    0,
    SELECT_DISTRACTORS
  );
  if (decoys.length < MIN_SELECT_DISTRACTORS) return null;

  return shuffle([...items, ...decoys]);
}

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
  // A list has no single term to pick, so it never becomes multiple choice. But it
  // does have a recognition form, and Familiarize is where it belongs: handing a
  // learner seven empty boxes for a list they have never been shown is not
  // familiarising them with it, it is testing them on it. Identify still asks for
  // the whole thing from memory — that is what Identify is for.
  if (term.kind === "enumeration") {
    if (mode === "choice") {
      const chips = buildChips(term, pool);
      if (chips) return { term, mode: "select", options: [], chips };
    }
    return { term, mode: "enumeration", options: [], chips: [] };
  }

  if (mode === "written" || pool.length < MIN_POOL_FOR_CHOICE) {
    return { term, mode: "written", options: [], chips: [] };
  }

  const distractors = shuffle(
    pool.filter((t) => t.id !== term.id && t.kind !== "enumeration")
  ).slice(0, 3);

  // Not enough standard terms to fill the distractor slots — fall back rather
  // than showing a 2-option "choice".
  if (distractors.length < 3) {
    return { term, mode: "written", options: [], chips: [] };
  }

  return {
    term,
    mode: "choice",
    options: shuffle([term, ...distractors]),
    chips: [],
  };
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
