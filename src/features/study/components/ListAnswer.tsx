import { Button } from "heroui-native";
import { Check } from "lucide-react-native";
import { Text, TextInput, View } from "react-native";

import { mask } from "@/features/study/mask";
import { COLORS, GLASS } from "@/theme";

/**
 * The gap Quizlet never filled. One input per expected item, graded
 * order-independently. After answering, every item is shown as hit or missed — the
 * point is to see *which* one you forgot, not just that you were short.
 *
 * Shared by the study session and the test. A test never passes `answered`: it
 * withholds every result until the end, so the inputs are all it ever renders.
 */
export function ListAnswer({
  expected,
  inputs,
  setInputs,
  answered,
  result,
  onSubmit,
  submitLabel = "Answer",
  hint = false,
}: {
  expected: string[];
  inputs: string[];
  setInputs: (next: string[]) => void;
  answered: boolean;
  result: { hits: string[]; missed: string[] } | null;
  onSubmit: () => void;
  submitLabel?: string;
  /** Second time round: seed each box with a first letter. See `mask`. */
  hint?: boolean;
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
                // Same language as multiple choice: solid green = you got it, dashed
                // green = here is the one you were reaching for. A missed item is
                // still one of the answers, so it is never marked with the ✕ that
                // means "this one is wrong".
                borderColor: COLORS.correct,
                borderWidth: 2,
                borderStyle: hit ? "solid" : "dashed",
                backgroundColor: hit ? "transparent" : GLASS.fillStrong,
              }}
            >
              {hit ? (
                <Check color={COLORS.correct} size={18} />
              ) : (
                <View style={{ width: 18 }} />
              )}
              <Text className="text-app-text flex-1 font-medium">{item}</Text>
              {!hit && (
                <Text
                  style={{ fontSize: 12, fontWeight: "600", color: COLORS.correct }}
                >
                  Missed
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View className="gap-3">
      {expected.map((item, i) => (
        <TextInput
          key={i}
          value={inputs[i] ?? ""}
          onChangeText={(text) => {
            const next = [...inputs];
            next[i] = text;
            setInputs(next);
          }}
          placeholder={hint ? mask(item) : `${i + 1}.`}
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
        <Button.Label>{submitLabel}</Button.Label>
      </Button>
      <Text className="text-app-muted text-center text-xs">
        {hint
          ? "A letter to get you started. Order doesn't matter."
          : "Order doesn't matter."}
      </Text>
    </View>
  );
}
