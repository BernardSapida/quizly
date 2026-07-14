import type { StudyMode, StudyTerm } from "@/db";
import {
  buildQuestion,
  buildQueue,
  buildRounds,
  requeue,
  type Question,
  type Round,
} from "./engine";
import type { EnumerationResult } from "./grading";

export type Phase = "loading" | "asking" | "correct" | "wrong" | "round-done" | "done";

export type Feedback = {
  message: string;
  nearMiss: boolean;
  chosenId: string | null;
  enumeration: EnumerationResult | null;
};

export type SessionState = {
  mode: StudyMode;
  pool: StudyTerm[];
  rounds: Round[];
  roundIndex: number;
  /** Unmastered terms in the current round, in ask order. Head is the current one. */
  queue: StudyTerm[];
  question: Question | null;
  phase: Phase;
  feedback: Feedback | null;
  streak: number;
  firstTryCorrect: number;
  /** Terms already asked this round — used so a retry does not count as first-try. */
  seen: string[];
  /** Terms missed in THIS session. Drives the "Let's try again" chip on a retry. */
  missed: string[];
  /** The round just finished, kept so Round Complete can review its terms. */
  lastRoundTerms: StudyTerm[];
};

export type SessionAction =
  | { type: "loaded"; pool: StudyTerm[] }
  | {
      type: "answered";
      correct: boolean;
      message: string;
      chosenId: string | null;
      nearMiss: boolean;
      enumeration: EnumerationResult | null;
    }
  | { type: "advance" }
  | { type: "next-round" };

export const initialState = (mode: StudyMode): SessionState => ({
  mode,
  pool: [],
  rounds: [],
  roundIndex: 0,
  queue: [],
  question: null,
  phase: "loading",
  feedback: null,
  streak: 0,
  firstTryCorrect: 0,
  seen: [],
  missed: [],
  lastRoundTerms: [],
});

/**
 * Pure. Every transition in the study session lives here so it can be tested
 * without a renderer, a database, or a device.
 *
 * This exists because the logic previously lived inside a `setQueue` updater that
 * also called `setQuestion` and `setPhase`. React may invoke an updater more than
 * once, which fired those side effects twice and let the session skip questions.
 */
export function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case "loaded": {
      const rounds = buildRounds(action.pool);

      if (rounds.length === 0 || action.pool.every((t) => t.mastered === 1)) {
        return {
          ...state,
          pool: action.pool,
          rounds,
          roundIndex: Math.max(0, rounds.length - 1),
          phase: "done",
        };
      }

      // Resume at the first round that still has unmastered terms.
      const roundIndex = Math.max(
        0,
        rounds.findIndex((r) => r.terms.some((t) => t.mastered !== 1))
      );
      const queue = buildQueue(rounds[roundIndex]);

      return {
        ...state,
        pool: action.pool,
        rounds,
        roundIndex,
        queue,
        question: buildQuestion(queue[0], action.pool, state.mode),
        phase: "asking",
        seen: [],
      };
    }

    case "answered": {
      if (state.phase !== "asking" || !state.question) return state;

      const term = state.question.term;
      const { correct } = action;

      // Mastery is binary within a mode; a miss resets it to 0.
      const pool = state.pool.map((t) =>
        t.id === term.id
          ? {
              ...t,
              mastered: correct ? 1 : 0,
              wrong_count: t.wrong_count + (correct ? 0 : 1),
            }
          : t
      );

      const isFirstAttempt = !state.seen.includes(term.id);

      return {
        ...state,
        pool,
        seen: isFirstAttempt ? [...state.seen, term.id] : state.seen,
        missed:
          !correct && !state.missed.includes(term.id)
            ? [...state.missed, term.id]
            : state.missed,
        firstTryCorrect:
          correct && isFirstAttempt ? state.firstTryCorrect + 1 : state.firstTryCorrect,
        streak: correct ? state.streak + 1 : 0,
        phase: correct ? "correct" : "wrong",
        feedback: {
          message: action.message,
          nearMiss: action.nearMiss,
          chosenId: action.chosenId,
          enumeration: action.enumeration,
        },
      };
    }

    case "advance": {
      if (state.phase !== "correct" && state.phase !== "wrong") return state;
      if (!state.question) return state;

      const answered = state.question.term;
      const correct = state.phase === "correct";

      // Drop the current question, then requeue it if it was missed so exactly
      // one other question comes between.
      const remaining = state.queue.slice(1);
      const queue = correct
        ? remaining
        : requeue(remaining, { ...answered, mastered: 0 });

      if (queue.length === 0) {
        const isLastRound = state.roundIndex >= state.rounds.length - 1;
        // Snapshot the round's terms (with the mastery just earned) so the
        // Round Complete screen can review exactly what was studied.
        const roundTerms = (state.rounds[state.roundIndex]?.terms ?? []).map(
          (t) => state.pool.find((p) => p.id === t.id) ?? t
        );
        return {
          ...state,
          queue,
          question: null,
          feedback: null,
          lastRoundTerms: roundTerms,
          phase: isLastRound ? "done" : "round-done",
        };
      }

      return {
        ...state,
        queue,
        question: buildQuestion(queue[0], state.pool, state.mode),
        feedback: null,
        phase: "asking",
      };
    }

    case "next-round": {
      const next = state.roundIndex + 1;
      // Re-chunk from the live pool so mastery earned this session is respected.
      const rounds = buildRounds(state.pool);

      if (next >= rounds.length) return { ...state, rounds, phase: "done" };

      const queue = buildQueue(rounds[next]);
      if (queue.length === 0) {
        return {
          ...state,
          rounds,
          roundIndex: next,
          queue,
          phase: next >= rounds.length - 1 ? "done" : "round-done",
        };
      }

      return {
        ...state,
        rounds,
        roundIndex: next,
        queue,
        question: buildQuestion(queue[0], state.pool, state.mode),
        phase: "asking",
        feedback: null,
        seen: [],
      };
    }

    default:
      return state;
  }
}
