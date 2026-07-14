import { useCallback, useEffect, useMemo, useState } from "react";
import * as Haptics from "expo-haptics";

import { repo, type StudyTerm } from "@/db";
import { gradeEnumeration, gradeSelection, gradeWritten } from "./grading";
import { buildTest, scoreTest, type Answer, type TestFormat, type TestQuestion } from "./test";
import type { Scope } from "./useSession";

export type TestPhase = "loading" | "asking" | "done";

/**
 * A test is a straight line: build the questions once, walk them, tally at the end.
 * There is no reducer here because there is no state machine — no requeue, no
 * rounds, no correct/wrong dwell. The absence IS the feature.
 */
export function useTest(scope: Scope, format: TestFormat) {
  const [pool, setPool] = useState<StudyTerm[] | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const scopeKey = "setId" in scope ? scope.setId : scope.folderId;
  const isFolder = "folderId" in scope;

  useEffect(() => {
    let cancelled = false;
    const target = isFolder ? { folderId: scopeKey } : { setId: scopeKey };

    // The mode only decides which progress row gets joined for `mastered`, and a
    // test cares about none of it — every term is asked regardless of what you have
    // already learned. Any mode loads the same terms.
    repo.getStudyPool(target, "choice").then((terms) => {
      if (cancelled) return;
      setPool(terms);
      setQuestions(buildTest(terms, format));
    });

    return () => {
      cancelled = true;
    };
  }, [scopeKey, isFolder, format]);

  const question = questions[index] ?? null;

  /**
   * Grade, record, advance — in one motion, with no feedback surfaced. Mastery is
   * still written as you go rather than batched at the end, so a test abandoned at
   * question 80 keeps the 80 answers it earned.
   */
  const answer = useCallback(
    (given: {
      chosen?: StudyTerm;
      typed?: string;
      list?: string[];
      picked?: string[];
    }) => {
      if (!question) return;

      let correct = false;
      let shown: string | null = null;
      let missed: string[] = [];

      if (given.chosen) {
        correct = given.chosen.id === question.term.id;
        shown = given.chosen.term;
      } else if (given.picked) {
        const result = gradeSelection(given.picked, question.term);
        correct = result.correct;
        missed = result.missed;
        // The decoys they fell for are the useful half of a wrong list answer.
        shown = result.wrong.length > 0 ? result.wrong.join(", ") : null;
      } else if (given.list) {
        const result = gradeEnumeration(given.list, question.term);
        correct = result.correct;
        missed = result.missed;
      } else if (given.typed !== undefined) {
        correct = gradeWritten(given.typed, question.term).correct;
        shown = given.typed.trim() || null;
      }

      void repo.recordAnswer(question.term.id, question.store, correct);
      Haptics.selectionAsync().catch(() => {});

      setAnswers((prev) => [...prev, { term: question.term, correct, given: shown, missed }]);
      setIndex((i) => i + 1);
    },
    [question]
  );

  /** Skipping is answering wrong. A blank on an exam is a blank. */
  const skip = useCallback(() => {
    if (!question) return;
    void repo.recordAnswer(question.term.id, question.store, false);
    setAnswers((prev) => [
      ...prev,
      { term: question.term, correct: false, given: null, missed: [] },
    ]);
    setIndex((i) => i + 1);
  }, [question]);

  const phase: TestPhase =
    pool === null ? "loading" : index >= questions.length ? "done" : "asking";

  const score = useMemo(() => scoreTest(answers), [answers]);

  return { phase, question, index, total: questions.length, score, answer, skip };
}
