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
import {
  Check,
  Flag,
  Flame,
  PartyPopper,
  Settings,
  Sparkles,
  Trophy,
  X,
} from "lucide-react-native";

import { repo, type StudyMode, type StudyTerm } from "@/db";
import { useSession } from "@/features/study/useSession";
import { parseAnswers } from "@/features/study/grading";
import { OptionRow, RoundBar, type OptionState } from "@/features/study/components/OptionRow";
import { Screen } from "@/components/ui/Screen";
import { COLORS, GLASS, SPACING } from "@/theme";

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
    feedback,
    streak,
    roundIndex,
    isRetry,
    stats,
    answerChoice,
    answerWritten,
    answerEnumeration,
    skip,
    continueAfterWrong,
    nextRound,
  } = session;

  const [input, setInput] = useState("");
  const [listInputs, setListInputs] = useState<string[]>([]);

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

  const optionState = (optionId: string): OptionState => {
    if (!answered) return "default";
    if (optionId === feedback?.chosenId) {
      return phase === "correct" ? "chosen-correct" : "chosen-wrong";
    }
    // The answer you missed gets a dashed border — "here's what you were reaching for".
    if (phase === "wrong" && optionId === question.term.id) return "revealed";
    return "dimmed";
  };

  const submitWritten = () => {
    if (answered || !input.trim()) return;
    answerWritten(input);
    setInput("");
  };

  const expectedItems = parseAnswers(question.term.answers);

  const submitList = () => {
    if (answered) return;
    answerEnumeration(listInputs);
    setListInputs([]);
  };

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
              {question.mode === "enumeration"
                ? question.term.term
                : question.term.definition}
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

          {question.mode === "enumeration" ? (
            <ListAnswer
              expected={expectedItems}
              inputs={listInputs}
              setInputs={setListInputs}
              answered={answered}
              result={feedback?.enumeration ?? null}
              onSubmit={submitList}
            />
          ) : question.mode === "choice" ? (
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
          ) : (
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
          )}

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

/**
 * The gap Quizlet never filled. One input per expected item, graded
 * order-independently. After answering, every item is shown as hit or missed — the
 * point is to see *which* one you forgot, not just that you were short.
 */
function ListAnswer({
  expected,
  inputs,
  setInputs,
  answered,
  result,
  onSubmit,
}: {
  expected: string[];
  inputs: string[];
  setInputs: (next: string[]) => void;
  answered: boolean;
  result: { hits: string[]; missed: string[] } | null;
  onSubmit: () => void;
}) {
  // Reveal on ANY answered state, not just a graded one. "Don't know?" grades the
  // term wrong without producing a result, and the old `answered && result` guard
  // fell through to the input list — seven blank boxes and a dead Answer button,
  // with the answers never shown. A skip is exactly when you most need to see them.
  if (answered) {
    const graded = result ?? { hits: [], missed: expected };

    return (
      <View className="gap-2">
        <Text className="text-app-muted text-xs font-semibold">
          {graded.hits.length} of {expected.length} correct
        </Text>
        {expected.map((item) => {
          const hit = graded.hits.includes(item);
          return (
            <View
              key={item}
              className="flex-row items-center gap-3 rounded-2xl p-3"
              style={{
                // Same language as multiple choice: solid = you got it, dashed =
                // here is the one you were reaching for.
                borderColor: hit ? COLORS.correct : COLORS.incorrect,
                borderWidth: 2,
                borderStyle: hit ? "solid" : "dashed",
                backgroundColor: hit ? "transparent" : GLASS.fillStrong,
              }}
            >
              {hit ? (
                <Check color={COLORS.correct} size={18} />
              ) : (
                <X color={COLORS.incorrect} size={18} />
              )}
              <Text className="text-app-text flex-1 font-medium">{item}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View className="gap-3">
      {expected.map((_, i) => (
        <TextInput
          key={i}
          value={inputs[i] ?? ""}
          onChangeText={(text) => {
            const next = [...inputs];
            next[i] = text;
            setInputs(next);
          }}
          placeholder={`${i + 1}.`}
          placeholderTextColor={COLORS.dark.muted}
          autoCorrect={false}
          autoCapitalize="none"
          className="rounded-2xl border border-app-glassline bg-app-glass px-4 py-4 text-app-text text-base"
        />
      ))}
      <Button
        variant="primary"
        size="lg"
        isDisabled={!inputs.some((i) => i?.trim())}
        onPress={onSubmit}
      >
        <Button.Label>Answer</Button.Label>
      </Button>
      <Text className="text-app-muted text-center text-xs">
        Order doesn&apos;t matter.
      </Text>
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

      {/* Bottom padding clears the pinned Continue button — without it the last
          review card sits underneath it and is unreadable. */}
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 160 }}>
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

      <View className="absolute inset-x-0 bottom-0 px-5 pb-8 pt-2">
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
