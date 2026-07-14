import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeIn, FadeInRight, FadeInUp } from "react-native-reanimated";
import { Button } from "heroui-native";
import { Flag, Flame, Settings, Sparkles, Trophy, X } from "lucide-react-native";

import { repo, type StudyMode, type StudyTerm } from "@/db";
import { useSession } from "@/features/study/useSession";
import { parseAnswers } from "@/features/study/grading";
import { ListAnswer } from "@/features/study/components/ListAnswer";
import { SelectAnswer } from "@/features/study/components/SelectAnswer";
import { OptionRow, RoundBar, type OptionState } from "@/features/study/components/OptionRow";
import { Screen } from "@/components/ui/Screen";
import { COLORS, SPACING } from "@/theme";

export default function StudyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    setId?: string;
    folderId?: string;
    mode?: StudyMode;
  }>();

  const mode: StudyMode = params.mode === "written" ? "written" : "choice";
  const scope = params.folderId
    ? { folderId: params.folderId }
    : { setId: params.setId ?? "" };

  const session = useSession(scope, mode);
  const {
    phase,
    question,
    askId,
    feedback,
    streak,
    roundIndex,
    isRetry,
    stats,
    answerChoice,
    answerWritten,
    answerEnumeration,
    answerSelect,
    skip,
    continueAfterWrong,
    nextRound,
  } = session;

  if (phase === "loading") return <Screen />;

  if (phase === "round-done") {
    return (
      <RoundComplete
        roundIndex={roundIndex}
        mastered={stats.mastered}
        total={stats.total}
        terms={stats.lastRoundTerms}
        onClose={() => router.back()}
        onContinue={nextRound}
      />
    );
  }

  if (phase === "done") {
    return (
      <SessionComplete
        mode={mode}
        total={stats.total}
        firstTryCorrect={stats.firstTryCorrect}
        hardest={stats.hardest.filter((t) => t.wrong_count > 0).map((t) => t.term)}
        onDone={() => router.back()}
        onTryIdentify={() =>
          router.replace(
            params.folderId
              ? `/study?folderId=${params.folderId}&mode=written`
              : `/study?setId=${params.setId}&mode=written`
          )
        }
      />
    );
  }

  if (!question) return <Screen />;

  const answered = phase === "correct" || phase === "wrong";
  const lastCorrect = phase === "correct" ? true : phase === "wrong" ? false : null;
  const expectedItems = parseAnswers(question.term.answers);

  // Both list forms ask about the prompt itself ("Name the 5 phases"), not a
  // definition — the prompt IS the question.
  const isList = question.mode === "enumeration" || question.mode === "select";

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header: close on the left, settings on the right. */}
        <View
          className="gap-6"
          style={{
            paddingHorizontal: SPACING.gutter,
            paddingTop: SPACING.headerTop,
          }}
        >
          <View className="h-8 flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <X color={COLORS.dark.text} size={26} />
            </Pressable>
            <View className="flex-row items-center gap-3">
              {streak >= 3 && (
                <Animated.View
                  entering={FadeIn}
                  className="flex-row items-center gap-1"
                >
                  <Flame color={COLORS.incorrect} size={18} />
                  <Text
                    className="text-sm font-bold"
                    style={{ color: COLORS.incorrect }}
                  >
                    {streak}
                  </Text>
                </Animated.View>
              )}
              <Settings color={COLORS.dark.text} size={22} />
            </View>
          </View>

          <RoundBar
            roundCount={stats.roundCount}
            roundIndex={roundIndex}
            roundMastered={stats.roundMastered}
            roundTotal={stats.roundTotal}
            mastered={stats.mastered}
            total={stats.total}
            lastCorrect={lastCorrect}
          />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 24, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View key={question.term.id} entering={FadeInRight.duration(200)}>
            <Text className="text-app-text text-2xl font-semibold leading-8">
              {isList ? question.term.term : question.term.definition}
            </Text>
          </Animated.View>

          {/* One slot, three states: the instruction before answering, then praise
              (green) or encouragement (orange). Only the tone and colour change —
              the layout never shifts under the user's thumb. */}
          {feedback ? (
            <Animated.View
              entering={FadeInUp.duration(200)}
              className="flex-row items-center gap-2"
            >
              {phase === "correct" && <Sparkles color={COLORS.correct} size={16} />}
              <Text
                className="text-sm font-semibold"
                style={{
                  color: phase === "correct" ? COLORS.correct : COLORS.encourage,
                }}
              >
                {feedback.message}
              </Text>
            </Animated.View>
          ) : (
            <View className="flex-row items-center gap-3">
              <Text className="text-app-text text-sm font-semibold">
                {question.mode === "choice"
                  ? "Choose the answer"
                  : question.mode === "written"
                    ? "Type the answer"
                    : question.mode === "select"
                      ? `Pick all ${expectedItems.length}`
                      : `Name all ${expectedItems.length}`}
              </Text>

              {/* A term you missed earlier, coming back around. Naming it takes the
                  sting out of seeing it twice — it is the mechanism, not a penalty. */}
              {isRetry && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: COLORS.roundIdle }}
                >
                  <Text className="text-xs font-semibold" style={{ color: COLORS.dark.text }}>
                    Let&apos;s try again
                  </Text>
                </Animated.View>
              )}
            </View>
          )}

          {feedback?.nearMiss && (
            <Text className="text-app-muted -mt-4 text-xs">
              Close enough — the exact spelling is “{question.term.term}”.
            </Text>
          )}

          {/* Keyed on the ask, not the term: a missed term that is last in the queue
              comes straight back around under the same id, and the panel has to come
              back empty. Remounting is also what clears a half-typed answer that was
              abandoned with "Don't know?". */}
          <AnswerPanel
            key={askId}
            question={question}
            expectedItems={expectedItems}
            phase={phase}
            answered={answered}
            isRetry={isRetry}
            feedback={feedback}
            answerChoice={answerChoice}
            answerWritten={answerWritten}
            answerEnumeration={answerEnumeration}
            answerSelect={answerSelect}
          />

          <View className="flex-1" />

          {!answered && (
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => void repo.updateTerm(question.term.id, { flagged: true })}
                hitSlop={10}
              >
                <Flag color={COLORS.dark.muted} size={18} />
              </Pressable>
              <Pressable onPress={skip} hitSlop={10}>
                <Text
                  className="text-base font-semibold"
                  style={{ color: COLORS.brand }}
                >
                  Don&apos;t know?
                </Text>
              </Pressable>
            </View>
          )}

          {/* A wrong answer blocks here until tapped. Never auto-advance. The
              forced pause is the reinforcement mechanism, not a UI courtesy. */}
          {phase === "wrong" && (
            <Animated.View entering={FadeInUp.duration(220)}>
              <Button variant="primary" size="lg" onPress={continueAfterWrong}>
                <Button.Label>Continue</Button.Label>
              </Button>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

type Session = ReturnType<typeof useSession>;

/**
 * Everything the learner can put *into* a question, and the draft answer they build
 * on the way there. The draft lives here rather than on the screen so that remounting
 * this one component is enough to reset it — see the `key` at the call site.
 */
function AnswerPanel({
  question,
  expectedItems,
  phase,
  answered,
  isRetry,
  feedback,
  answerChoice,
  answerWritten,
  answerEnumeration,
  answerSelect,
}: {
  question: NonNullable<Session["question"]>;
  expectedItems: string[];
  phase: Session["phase"];
  answered: boolean;
  isRetry: boolean;
  feedback: Session["feedback"];
} & Pick<
  Session,
  "answerChoice" | "answerWritten" | "answerEnumeration" | "answerSelect"
>) {
  const [input, setInput] = useState("");
  const [listInputs, setListInputs] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  const optionState = (optionId: string): OptionState => {
    if (!answered) return "default";
    if (optionId === feedback?.chosenId) {
      return phase === "correct" ? "chosen-correct" : "chosen-wrong";
    }
    // The answer you missed gets a dashed border — "here's what you were reaching for".
    if (phase === "wrong" && optionId === question.term.id) return "revealed";
    return "dimmed";
  };

  if (question.mode === "select") {
    return (
      <SelectAnswer
        chips={question.chips}
        expected={expectedItems}
        picked={picked}
        setPicked={setPicked}
        answered={answered}
        result={feedback?.selection ?? null}
        onSubmit={() => {
          if (!answered) answerSelect(picked);
        }}
      />
    );
  }

  if (question.mode === "enumeration") {
    return (
      <ListAnswer
        expected={expectedItems}
        inputs={listInputs}
        setInputs={setListInputs}
        answered={answered}
        result={feedback?.enumeration ?? null}
        onSubmit={() => {
          if (!answered) answerEnumeration(listInputs);
        }}
        // Second time around, a first letter. Missing a seven-item list twice with
        // nothing at all to go on is where a learner quits.
        hint={isRetry}
      />
    );
  }

  if (question.mode === "choice") {
    return (
      <View className="gap-3">
        {question.options.map((option) => (
          <OptionRow
            key={option.id}
            label={option.term}
            state={optionState(option.id)}
            disabled={answered}
            onPress={() => answerChoice(option)}
          />
        ))}
      </View>
    );
  }

  const submitWritten = () => {
    if (answered || !input.trim()) return;
    answerWritten(input);
  };

  return (
    <View className="gap-3">
      {answered ? (
        <View className="gap-2">
          <OptionRow
            label={question.term.term}
            state={phase === "correct" ? "chosen-correct" : "revealed"}
            disabled
            onPress={() => {}}
          />
        </View>
      ) : (
        <>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type the term…"
            placeholderTextColor={COLORS.dark.muted}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            onSubmitEditing={submitWritten}
            returnKeyType="done"
            className="rounded-2xl border border-app-glassline bg-app-glass px-4 py-4 text-app-text text-base"
          />
          <Button
            variant="primary"
            size="lg"
            isDisabled={!input.trim()}
            onPress={submitWritten}
          >
            <Button.Label>Answer</Button.Label>
          </Button>
        </>
      )}
    </View>
  );
}

const ROUND_HEADLINES = [
  "Going strong, you can do this.",
  "Nice work — keep the momentum.",
  "You're getting the hang of this.",
  "That's another one down.",
];

/**
 * Between rounds: a breather, a sense of progress, and — the important part — a
 * review of the terms you just studied. Seeing the pairs again right after
 * earning them is what makes the round stick.
 */
function RoundComplete({
  roundIndex,
  mastered,
  total,
  terms,
  onClose,
  onContinue,
}: {
  roundIndex: number;
  mastered: number;
  total: number;
  terms: StudyTerm[];
  onClose: () => void;
  onContinue: () => void;
}) {
  const pct = total === 0 ? 0 : Math.round((mastered / total) * 100);
  const headline = ROUND_HEADLINES[roundIndex % ROUND_HEADLINES.length];

  return (
    <Screen>
      <View
        className="h-8 flex-row items-center justify-between"
        style={{
          paddingHorizontal: SPACING.gutter,
          marginTop: SPACING.headerTop,
        }}
      >
        <Pressable onPress={onClose} hitSlop={12}>
          <X color={COLORS.dark.text} size={26} />
        </Pressable>
        <Settings color={COLORS.dark.text} size={22} />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, gap: 24 }}>
        <Animated.Text
          entering={FadeInUp.duration(300)}
          className="text-app-text text-3xl font-bold leading-10"
        >
          {headline}
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(80).duration(300)} className="gap-2">
          <Text className="text-app-text text-base font-semibold">
            Total set progress:{" "}
            <Text style={{ color: COLORS.correct }}>{pct}%</Text>
          </Text>

          <RoundBar
            roundCount={1}
            roundIndex={0}
            roundMastered={mastered}
            roundTotal={total}
            mastered={mastered}
            total={total}
            lastCorrect={true}
          />

          <View className="flex-row justify-between pt-1">
            <Text className="text-sm font-semibold" style={{ color: COLORS.correct }}>
              Mastered
            </Text>
            <Text className="text-app-text text-sm font-semibold">Total terms</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(160).duration(300)} className="gap-3">
          <Text className="text-app-text text-base font-semibold">
            Terms studied in your last round
          </Text>

          {terms.map((term, i) => (
            <Animated.View
              key={term.id}
              entering={FadeInUp.delay(200 + i * 50).duration(280)}
              className="gap-1.5 rounded-2xl border border-app-glassline bg-app-glass p-4"
            >
              <Text className="text-app-text text-base font-semibold">{term.term}</Text>
              <Text className="text-app-muted text-sm">
                {term.kind === "enumeration"
                  ? parseAnswers(term.answers).join(" · ")
                  : term.definition}
              </Text>
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>

      {/* A sibling of the ScrollView, never absolutely positioned: an absolute child
          is laid out against the parent's border box, so `bottom: 0` here ignored
          Screen's safe-area padding and shoved the button into the phone's nav bar.
          In the flow it lands exactly where the in-question Continue does — 20px of
          padding above the inset. */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8 }}>
        <Button variant="primary" size="lg" onPress={onContinue}>
          <Button.Label>Continue to round {roundIndex + 2}</Button.Label>
        </Button>
      </View>
    </Screen>
  );
}

function SessionComplete({
  mode,
  total,
  firstTryCorrect,
  hardest,
  onDone,
  onTryIdentify,
}: {
  mode: StudyMode;
  total: number;
  firstTryCorrect: number;
  hardest: string[];
  onDone: () => void;
  onTryIdentify: () => void;
}) {
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, gap: 12 }}>
        <Animated.View
          entering={FadeInUp.duration(300)}
          className="items-center pb-2"
        >
          <Trophy color={COLORS.correct} size={72} />
        </Animated.View>
        <Animated.Text
          entering={FadeInUp.delay(80).duration(300)}
          className="text-app-text text-center text-3xl font-bold"
        >
          You mastered all {total}!
        </Animated.Text>
        <Animated.Text
          entering={FadeInUp.delay(160).duration(300)}
          className="text-app-muted text-center"
        >
          {firstTryCorrect} of {total} right on the first try.
        </Animated.Text>

        {hardest.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(240).duration(300)}
            className="mt-4 rounded-3xl border border-app-glassline bg-app-glass p-5"
          >
            <Text className="text-app-muted text-xs font-semibold">
              THESE GAVE YOU THE MOST TROUBLE
            </Text>
            {hardest.map((term) => (
              <Text key={term} className="text-app-text mt-2 font-semibold">
                {term}
              </Text>
            ))}
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInUp.delay(320).duration(300)}
          className="gap-3 pt-6"
        >
          {/* Finishing Familiarize is exactly when the user is ready to level up. */}
          {mode === "choice" && (
            <Button variant="primary" size="lg" onPress={onTryIdentify}>
              <Button.Label>Try Identify · Type the answers</Button.Label>
            </Button>
          )}
          <Button
            variant={mode === "choice" ? "secondary" : "primary"}
            size="lg"
            onPress={onDone}
          >
            <Button.Label>Done</Button.Label>
          </Button>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
