import { Button } from "heroui-native";
import { Check, X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { COLORS, GLASS } from "@/theme";

/**
 * The recognition form of a list. The real items are on screen, shuffled in with
 * decoys from the rest of the set, and you pick the ones that belong.
 *
 * This is what Familiarize asks instead of the empty boxes. A 7-item list you have
 * never seen is not something you can *guess* your way into — recall has to be
 * bootstrapped by recognition, and a grid of chips is the only way to put the
 * answer in front of someone while still genuinely asking them a question.
 *
 * Picks are capped at the number of real items, so "select everything" is not a
 * move. Once you're at the limit the remaining chips go inert until you let one go —
 * choosing what to *drop* is the same muscle as choosing what to keep.
 */
export function SelectAnswer({
  chips,
  expected,
  picked,
  setPicked,
  answered,
  result,
  onSubmit,
  submitLabel = "Answer",
}: {
  chips: string[];
  expected: string[];
  picked: string[];
  setPicked: (next: string[]) => void;
  answered: boolean;
  result: { hits: string[]; missed: string[]; wrong: string[] } | null;
  onSubmit: () => void;
  submitLabel?: string;
}) {
  // Reveal on ANY answered state, not just a graded one — "Don't know?" answers the
  // question without producing a result, and a skip is exactly when you most need to
  // be shown the list.
  if (answered) {
    const graded = result ?? { hits: [], missed: expected, wrong: [] };

    return (
      <View className="gap-2">
        <Text className="text-app-muted text-xs font-semibold">
          {graded.hits.length} of {expected.length} correct
        </Text>

        {expected.map((item) => (
          <Chip
            key={item}
            label={item}
            state={graded.hits.includes(item) ? "hit" : "missed"}
          />
        ))}

        {/* The decoys you fell for, kept separate from the list itself. Mixing them
            in would leave the wrong seven items on screen as the last thing seen. */}
        {graded.wrong.length > 0 && (
          <View className="gap-2 pt-1">
            <Text className="text-app-muted text-xs font-semibold">
              NOT ON THE LIST
            </Text>
            {graded.wrong.map((item) => (
              <Chip key={item} label={item} state="false-pick" />
            ))}
          </View>
        )}
      </View>
    );
  }

  const limit = expected.length;
  const full = picked.length >= limit;

  const toggle = (item: string) => {
    if (picked.includes(item)) {
      setPicked(picked.filter((p) => p !== item));
    } else if (!full) {
      setPicked([...picked, item]);
    }
  };

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {chips.map((item) => {
          const isPicked = picked.includes(item);
          return (
            <Chip
              key={item}
              label={item}
              state={isPicked ? "picked" : full ? "spent" : "default"}
              onPress={() => toggle(item)}
            />
          );
        })}
      </View>

      <Button
        variant="primary"
        size="lg"
        isDisabled={!full}
        onPress={onSubmit}
      >
        <Button.Label>
          {full ? submitLabel : `Pick ${limit - picked.length} more`}
        </Button.Label>
      </Button>

      <Text className="text-app-muted text-center text-xs">
        Order doesn&apos;t matter. Not everything here belongs.
      </Text>
    </View>
  );
}

/**
 * Solid = you did this. Dashed = the app is showing you something. Deliberately the
 * same language as OptionRow, so a dashed green border means "here's the one you
 * were reaching for" everywhere in the app.
 */
type ChipState = "default" | "picked" | "spent" | "hit" | "missed" | "false-pick";

function Chip({
  label,
  state,
  onPress,
}: {
  label: string;
  state: ChipState;
  onPress?: () => void;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const style = CHIP_STYLES[state];
  const interactive = !!onPress && state !== "spent";
  const graded = state === "hit" || state === "missed" || state === "false-pick";

  return (
    <Animated.View style={[animated, graded ? { alignSelf: "stretch" } : null]}>
      <Pressable
        onPress={onPress}
        disabled={!interactive}
        onPressIn={() => {
          if (interactive) scale.set(withSpring(0.96, { damping: 15 }));
        }}
        onPressOut={() => {
          if (interactive) scale.set(withSpring(1, { damping: 15 }));
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          minHeight: 48,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 16,
          borderWidth: style.borderWidth,
          borderStyle: style.borderStyle,
          borderColor: style.borderColor,
          backgroundColor: style.background,
          opacity: state === "spent" ? 0.45 : 1,
        }}
      >
        {state === "hit" && <Check color={COLORS.correct} size={18} />}
        {state === "missed" && <X color={COLORS.incorrect} size={18} />}
        {state === "false-pick" && <X color={COLORS.incorrect} size={18} />}
        <Text
          style={{
            fontSize: 15,
            fontWeight: "500",
            color: COLORS.dark.text,
            // A graded row spans the width; a pickable chip hugs its label so the
            // grid stays a grid.
            flex: graded ? 1 : undefined,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const CHIP_STYLES: Record<
  ChipState,
  {
    background: string;
    borderColor: string;
    borderWidth: number;
    borderStyle: "solid" | "dashed";
  }
> = {
  default: {
    background: GLASS.fill,
    borderColor: GLASS.border,
    borderWidth: 1,
    borderStyle: "solid",
  },
  picked: {
    background: GLASS.fillStrong,
    borderColor: COLORS.brand,
    borderWidth: 2,
    borderStyle: "solid",
  },
  spent: {
    background: GLASS.fill,
    borderColor: GLASS.border,
    borderWidth: 1,
    borderStyle: "solid",
  },
  hit: {
    background: "transparent",
    borderColor: COLORS.correct,
    borderWidth: 2,
    borderStyle: "solid",
  },
  missed: {
    background: GLASS.fillStrong,
    borderColor: COLORS.incorrect,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  "false-pick": {
    background: GLASS.fillStrong,
    borderColor: COLORS.incorrect,
    borderWidth: 2,
    borderStyle: "solid",
  },
};
