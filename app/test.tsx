import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "heroui-native";
import { CheckCircle2, ChevronRight, Target, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInRight,
  FadeInUp,
} from "react-native-reanimated";

import { ModeProgress } from "@/components/ui/ModeProgress";
import { Screen } from "@/components/ui/Screen";
import { useConfirm } from "@/components/ui/useConfirm";
import { repo } from "@/db";
import { ListAnswer } from "@/features/study/components/ListAnswer";
import { OptionRow } from "@/features/study/components/OptionRow";
import { SelectAnswer } from "@/features/study/components/SelectAnswer";
import { MIN_POOL_FOR_CHOICE } from "@/features/study/engine";
import { parseAnswers } from "@/features/study/grading";
import { TEST_FORMATS, type TestFormat } from "@/features/study/test";
import type { Scope } from "@/features/study/useSession";
import { useTest } from "@/features/study/useTest";
import { useAsync } from "@/lib/use-async";
import { COLORS, GLASS, SPACING } from "@/theme";

/**
 * A test, not a study session. Every term is asked exactly once, in shuffled order,
 * with no feedback until the end — which is the only way the score at the end means
 * anything. The study loop next door is for *learning*; this is for finding out
 * whether the learning took.
 */
export default function TestScreen() {
  const params = useLocalSearchParams<{ setId?: string; folderId?: string }>();
  const [format, setFormat] = useState<TestFormat | null>(null);

  const scope: Scope = params.folderId
    ? { folderId: params.folderId }
    : { setId: params.setId ?? "" };

  if (!format) return <TestSetup scope={scope} onStart={setFormat} />;
  return <TestRunner scope={scope} format={format} />;
}

/* -------------------------------------------------------------------- setup */

function TestSetup({
  scope,
  onStart,
}: {
  scope: Scope;
  onStart: (format: TestFormat) => void;
}) {
  const router = useRouter();

  const load = useCallback(
    async () =>
      "folderId" in scope
        ? await repo.getFolder(scope.folderId)
        : await repo.getSet(scope.setId),
    [scope],
  );
  const { data } = useAsync(load);

  if (!data) return <Screen />;

  const total = data.term_count;

  // Four standard terms are needed to fill the distractor slots. Below that every
  // question would silently fall back to typed, so we do not offer the lie.
  const canChoice = total >= MIN_POOL_FOR_CHOICE;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SPACING.gutter,
          paddingTop: SPACING.headerTop,
          paddingBottom: 40,
          gap: 24,
        }}
      >
        <View className="h-8 flex-row items-center">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <X color={COLORS.dark.text} size={26} />
          </Pressable>
        </View>

        <Animated.View entering={FadeInUp.duration(300)} className="gap-2">
          <View className="flex-row items-center gap-2">
            <Target color={COLORS.brandTint} size={20} />
            <Text
              className="text-xs font-bold"
              style={{ color: COLORS.brandTint, letterSpacing: 0.6 }}
            >
              TAKE A TEST
            </Text>
          </View>
          <Text className="text-app-text text-3xl font-bold leading-10">
            {data.name}
          </Text>
          <Text className="text-app-muted text-sm">
            {total} question{total === 1 ? "" : "s"} · every term, once, in
            random order. No second tries and you&apos;ll see your score at the
            end.
          </Text>
        </Animated.View>

        <View className="gap-3">
          {TEST_FORMATS.map((option, i) => {
            const disabled = option.value !== "written" && !canChoice;

            return (
              <Animated.View
                key={option.value}
                entering={FadeInUp.delay(80 + i * 60).duration(300)}
              >
                <Pressable
                  disabled={disabled || total === 0}
                  onPress={() => onStart(option.value)}
                  className="flex-row items-center gap-4 rounded-2xl p-4"
                  style={{
                    backgroundColor: GLASS.fill,
                    borderWidth: 1,
                    borderColor: GLASS.border,
                    opacity: disabled || total === 0 ? 0.4 : 1,
                  }}
                >
                  <View className="flex-1 gap-0.5">
                    <Text className="text-app-text text-base font-bold">
                      {option.label}
                    </Text>
                    <Text className="text-app-muted text-xs">
                      {disabled
                        ? `Needs at least ${MIN_POOL_FOR_CHOICE} terms for the options`
                        : option.blurb}
                    </Text>
                  </View>
                  <ChevronRight color={COLORS.dark.muted} size={20} />
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

/* ------------------------------------------------------------------ running */

function TestRunner({ scope, format }: { scope: Scope; format: TestFormat }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const { phase, question, index, total, score, answer, skip } = useTest(
    scope,
    format,
  );

  const [input, setInput] = useState("");
  const [listInputs, setListInputs] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  /** Walking out of an exam is a decision, not a slip of the thumb. */
  const confirmQuit = () =>
    confirm({
      title: "Leave the test?",
      description: `You're on question ${index + 1} of ${total}. The answers you've already given are kept, but the test won't be scored.`,
      confirmLabel: "Leave",
      variant: "danger",
      onConfirm: () => router.back(),
    });

  if (phase === "loading") return <Screen />;

  if (phase === "done") {
    return <TestComplete score={score} onDone={() => router.back()} />;
  }

  if (!question) return <Screen />;

  const expectedItems = parseAnswers(question.term.answers);

  const submitWritten = () => {
    if (!input.trim()) return;
    answer({ typed: input });
    setInput("");
  };

  const submitList = () => {
    answer({ list: listInputs });
    setListInputs([]);
  };

  const submitSelect = () => {
    answer({ picked });
    setPicked([]);
  };

  const isList =
    question.mode === "enumeration" || question.mode === "select";

  return (
    <Screen>
      {dialog}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          className="gap-4"
          style={{
            paddingHorizontal: SPACING.gutter,
            paddingTop: SPACING.headerTop,
          }}
        >
          <View className="h-8 flex-row items-center justify-between">
            <Pressable onPress={confirmQuit} hitSlop={12}>
              <X color={COLORS.dark.text} size={26} />
            </Pressable>
            <Text className="text-app-muted text-sm font-semibold">
              Question {index + 1} of {total}
            </Text>
          </View>

          {/* The only progress shown during a test: how far in you are. NOT how many
              you have right — a running score would turn every question into a
              verdict on the last one, which is exactly the pressure a test is
              supposed to let you rehearse without. */}
          <ModeProgress label="" mastered={index} total={total} compact />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 24, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            key={question.term.id}
            entering={FadeInRight.duration(200)}
          >
            <Text className="text-app-text text-2xl font-semibold leading-8">
              {isList ? question.term.term : question.term.definition}
            </Text>
          </Animated.View>

          <Text className="text-app-text text-sm font-semibold">
            {question.mode === "choice"
              ? "Choose the answer"
              : question.mode === "written"
                ? "Type the answer"
                : question.mode === "select"
                  ? `Pick all ${expectedItems.length}`
                  : `Name all ${expectedItems.length}`}
          </Text>

          {question.mode === "select" ? (
            <SelectAnswer
              chips={question.chips}
              expected={expectedItems}
              picked={picked}
              setPicked={setPicked}
              answered={false}
              result={null}
              onSubmit={submitSelect}
              submitLabel="Next"
            />
          ) : question.mode === "enumeration" ? (
            <ListAnswer
              expected={expectedItems}
              inputs={listInputs}
              setInputs={setListInputs}
              answered={false}
              result={null}
              onSubmit={submitList}
              submitLabel="Next"
            />
          ) : question.mode === "choice" ? (
            <View className="gap-3">
              {question.options.map((option) => (
                <OptionRow
                  key={option.id}
                  label={option.term}
                  state="default"
                  disabled={false}
                  onPress={() => answer({ chosen: option })}
                />
              ))}
            </View>
          ) : (
            <View className="gap-3">
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Type the term…"
                placeholderTextColor={COLORS.dark.muted}
                autoFocus
                autoCorrect={false}
                autoCapitalize="none"
                onSubmitEditing={submitWritten}
                returnKeyType="next"
                className="rounded-2xl border border-app-glassline bg-app-glass px-4 py-4 text-app-text text-base"
              />
              <Button
                variant="primary"
                size="lg"
                isDisabled={!input.trim()}
                onPress={submitWritten}
              >
                <Button.Label>Next</Button.Label>
              </Button>
            </View>
          )}

          <View className="flex-1" />

          <View className="flex-row justify-end">
            <Pressable onPress={skip} hitSlop={10}>
              <Text className="text-app-muted text-base font-semibold">
                Skip
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/* ------------------------------------------------------------------ results */

/** The one number a test exists to produce, and then — the useful half — the misses. */
function TestComplete({
  score,
  onDone,
}: {
  score: ReturnType<typeof useTest>["score"];
  onDone: () => void;
}) {
  const passed = score.pct >= 80;
  const tone = passed ? COLORS.correct : COLORS.encourage;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 140, gap: 20 }}
      >
        <Animated.View
          entering={FadeInUp.duration(300)}
          className="items-center gap-2 pt-8"
        >
          {passed ? (
            <CheckCircle2 color={tone} size={64} />
          ) : (
            <Target color={tone} size={64} />
          )}
          <Text className="text-6xl font-bold" style={{ color: tone }}>
            {score.pct}%
          </Text>
          <Text className="text-app-text text-lg font-semibold">
            {score.correct} of {score.total} correct
          </Text>
          <Text className="text-app-muted text-center text-sm">
            {passed
              ? "You're ready. Anything you missed is below."
              : "Not there yet — and now you know exactly which ones."}
          </Text>
        </Animated.View>

        {score.wrong.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(120).duration(300)}
            className="gap-3"
          >
            <Text className="text-app-muted text-xs font-semibold">
              REVIEW THESE {score.wrong.length}
            </Text>

            {score.wrong.map((miss, i) => (
              <Animated.View
                key={miss.term.id}
                entering={FadeIn.delay(160 + i * 40).duration(240)}
                className="gap-1.5 rounded-2xl border border-app-glassline bg-app-glass p-4"
              >
                <Text className="text-app-text text-base font-semibold">
                  {miss.term.term}
                </Text>
                <Text className="text-app-muted text-sm">
                  {miss.term.kind === "enumeration"
                    ? parseAnswers(miss.term.answers).join(" · ")
                    : miss.term.definition}
                </Text>

                {/* What you actually put down. Seeing your own wrong answer next to
                    the right one is what makes the correction stick. */}
                {miss.given && (
                  <Text
                    className="mt-1 text-xs"
                    style={{ color: COLORS.encourage }}
                  >
                    You said “{miss.given}”
                  </Text>
                )}
                {miss.missed.length > 0 && (
                  <Text
                    className="mt-1 text-xs"
                    style={{ color: COLORS.encourage }}
                  >
                    Missed: {miss.missed.join(" · ")}
                  </Text>
                )}
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </ScrollView>

      <View className="absolute inset-x-0 bottom-0 px-5 pb-8 pt-2">
        <Button variant="primary" size="lg" onPress={onDone}>
          <Button.Label>Done</Button.Label>
        </Button>
      </View>
    </Screen>
  );
}
