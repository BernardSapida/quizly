import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import * as Haptics from "expo-haptics";

import { repo, type StudyMode, type StudyTerm } from "@/db";
import { masteredCount } from "./engine";
import {
  gradeEnumeration,
  gradeSelection,
  gradeWritten,
  type EnumerationResult,
  type SelectionResult,
  type WrittenResult,
} from "./grading";
import { pickEncouragement, pickPraise } from "./messages";
import { initialState, sessionReducer } from "./reducer";

export type { Feedback, Phase } from "./reducer";

export type Scope = { setId: string } | { folderId: string };

/**
 * The asymmetry is the design: a correct answer auto-advances, a wrong one stops
 * you until you tap Continue. You are rewarded with momentum and penalised with a
 * beat of your own attention — never with harsh colour or a punitive sound.
 */
export const CORRECT_DWELL_MS = 800;

export function useSession(scope: Scope, mode: StudyMode) {
  const [state, dispatch] = useReducer(sessionReducer, mode, initialState);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessage = useRef<string | null>(null);

  const scopeKey = "setId" in scope ? scope.setId : scope.folderId;
  const isFolder = "folderId" in scope;

  /* ---------------------------------------------------------------- loading */

  useEffect(() => {
    let cancelled = false;
    const target = isFolder ? { folderId: scopeKey } : { setId: scopeKey };

    repo.getStudyPool(target, mode).then((pool) => {
      if (!cancelled) dispatch({ type: "loaded", pool });
    });

    return () => {
      cancelled = true;
    };
  }, [scopeKey, isFolder, mode]);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    []
  );

  const advance = useCallback(() => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    dispatch({ type: "advance" });
  }, []);

  /* ---------------------------------------------------------------- answers */

  const submit = useCallback(
    (
      term: StudyTerm,
      correct: boolean,
      detail: {
        chosenId?: string | null;
        nearMiss?: boolean;
        enumeration?: EnumerationResult | null;
        selection?: SelectionResult | null;
      } = {}
    ) => {
      void repo.recordAnswer(term.id, mode, correct);

      const message = correct
        ? pickPraise(state.streak + 1, lastMessage.current)
        : pickEncouragement(lastMessage.current);
      lastMessage.current = message;

      Haptics.notificationAsync(
        correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      ).catch(() => {});

      dispatch({
        type: "answered",
        correct,
        message,
        chosenId: detail.chosenId ?? null,
        nearMiss: detail.nearMiss ?? false,
        enumeration: detail.enumeration ?? null,
        selection: detail.selection ?? null,
      });

      // Correct answers roll on by themselves; wrong ones wait for Continue.
      if (correct) {
        advanceTimer.current = setTimeout(advance, CORRECT_DWELL_MS);
      }
    },
    [mode, state.streak, advance]
  );

  const answerChoice = useCallback(
    (chosen: StudyTerm) => {
      if (state.phase !== "asking" || !state.question) return;
      Haptics.selectionAsync().catch(() => {});
      submit(state.question.term, chosen.id === state.question.term.id, {
        chosenId: chosen.id,
      });
    },
    [state.phase, state.question, submit]
  );

  const answerWritten = useCallback(
    (input: string): WrittenResult => {
      const empty: WrittenResult = { correct: false, nearMiss: false };
      if (state.phase !== "asking" || !state.question) return empty;
      const result = gradeWritten(input, state.question.term);
      submit(state.question.term, result.correct, { nearMiss: result.nearMiss });
      return result;
    },
    [state.phase, state.question, submit]
  );

  /**
   * Order-independent, graded item by item. Partial credit is shown but only a
   * full sweep counts as mastery — knowing 3 of 5 phases is not knowing them.
   */
  const answerEnumeration = useCallback(
    (inputs: string[]): EnumerationResult => {
      const empty: EnumerationResult = { correct: false, hits: [], missed: [] };
      if (state.phase !== "asking" || !state.question) return empty;
      const result = gradeEnumeration(inputs, state.question.term);
      submit(state.question.term, result.correct, { enumeration: result });
      return result;
    },
    [state.phase, state.question, submit]
  );

  /**
   * "Pick the list" — Familiarize's form of an enumeration. A decoy costs you the
   * question, same as a missing item: mastery here means you can pick the list out
   * of a line-up, not that you got most of the way there.
   */
  const answerSelect = useCallback(
    (picked: string[]): SelectionResult => {
      const empty: SelectionResult = {
        correct: false,
        hits: [],
        missed: [],
        wrong: [],
      };
      if (state.phase !== "asking" || !state.question) return empty;
      const result = gradeSelection(picked, state.question.term);
      submit(state.question.term, result.correct, { selection: result });
      return result;
    },
    [state.phase, state.question, submit]
  );

  /** "Don't know?" — grades as wrong without a guess, so mastery resets honestly. */
  const skip = useCallback(() => {
    if (state.phase !== "asking" || !state.question) return;
    submit(state.question.term, false);
  }, [state.phase, state.question, submit]);

  const continueAfterWrong = useCallback(() => {
    if (state.phase !== "wrong") return;
    advance();
  }, [state.phase, advance]);

  const nextRound = useCallback(() => dispatch({ type: "next-round" }), []);

  /* ----------------------------------------------------------------- derived */

  const stats = useMemo(() => {
    const round = state.rounds[state.roundIndex];
    const roundTerms = round?.terms ?? [];
    const live = roundTerms.map(
      (t) => state.pool.find((p) => p.id === t.id) ?? t
    );

    return {
      total: state.pool.length,
      mastered: masteredCount(state.pool),
      roundTotal: roundTerms.length,
      roundMastered: masteredCount(live),
      roundCount: state.rounds.length,
      firstTryCorrect: state.firstTryCorrect,
      lastRoundTerms: state.lastRoundTerms,
      hardest: [...state.pool]
        .sort((a, b) => b.wrong_count - a.wrong_count)
        .slice(0, 3),
    };
  }, [
    state.pool,
    state.rounds,
    state.roundIndex,
    state.firstTryCorrect,
    state.lastRoundTerms,
  ]);

  /** A term coming back after a miss — the UI flags it with "Let's try again". */
  const isRetry = !!state.question && state.missed.includes(state.question.term.id);

  return {
    phase: state.phase,
    question: state.question,
    askId: state.askId,
    feedback: state.feedback,
    streak: state.streak,
    roundIndex: state.roundIndex,
    isRetry,
    stats,
    answerChoice,
    answerWritten,
    answerEnumeration,
    answerSelect,
    skip,
    continueAfterWrong,
    nextRound,
  };
}
