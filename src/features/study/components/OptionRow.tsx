import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Check, X } from "lucide-react-native";

import { COLORS, GLASS } from "@/theme";

/**
 * Progress never springs. A bar that overshoots and settles back reads as losing
 * ground you just earned — it must only ever travel forwards, smoothly.
 */
export const PROGRESS_EASING = {
  duration: 380,
  easing: Easing.out(Easing.cubic),
} as const;

/**
 * Solid border = you chose this. Dashed border = the app is showing you what you
 * missed. Two different green states — collapsing them loses the distinction
 * between "you got it" and "here's the one you were reaching for".
 */
export type OptionState =
  | "default"
  | "chosen-correct"
  | "chosen-wrong"
  | "revealed"
  | "dimmed";

type Props = {
  label: string;
  state: OptionState;
  onPress: () => void;
  disabled: boolean;
};

export function OptionRow({ label, state, onPress, disabled }: Props) {
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (state === "chosen-correct") {
      // Pop — brief, springy, celebratory.
      scale.set(
        withSequence(
          withTiming(1.04, { duration: 120 }),
          withSpring(1, { damping: 12, stiffness: 200 })
        )
      );
    }
    if (state === "chosen-wrong") {
      // Shake — three short oscillations. Never a slow, mournful animation.
      shake.set(
        withSequence(
          withTiming(-6, { duration: 50 }),
          withTiming(6, { duration: 50 }),
          withTiming(-4, { duration: 50 }),
          withTiming(0, { duration: 50 })
        )
      );
    }
  }, [state, scale, shake]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }, { translateX: shake.get() }],
  }));

  const style = STYLES[state];

  return (
    <Animated.View style={animated}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          if (!disabled) scale.set(withSpring(0.97, { damping: 15 }));
        }}
        onPressOut={() => {
          if (!disabled) scale.set(withSpring(1, { damping: 15 }));
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          minHeight: 76,
          paddingHorizontal: 20,
          paddingVertical: 18,
          borderRadius: 24,
          borderWidth: style.borderWidth,
          borderStyle: style.borderStyle,
          borderColor: style.borderColor,
          backgroundColor: style.background,
          opacity: state === "dimmed" ? 0.55 : 1,
        }}
      >
        {state === "chosen-wrong" && <X color={COLORS.incorrect} size={22} />}
        {(state === "chosen-correct" || state === "revealed") && (
          <Check color={COLORS.correct} size={22} />
        )}
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: "500",
            color: style.text,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

type Style = {
  background: string;
  borderColor: string;
  borderWidth: number;
  borderStyle: "solid" | "dashed";
  text: string;
};

const STYLES: Record<OptionState, Style> = {
  default: {
    background: GLASS.fill,
    borderColor: GLASS.border,
    borderWidth: 1,
    borderStyle: "solid",
    text: COLORS.dark.text,
  },
  "chosen-correct": {
    background: GLASS.fill,
    borderColor: COLORS.correct,
    borderWidth: 2,
    borderStyle: "solid",
    text: COLORS.dark.text,
  },
  "chosen-wrong": {
    background: GLASS.fillStrong,
    borderColor: COLORS.incorrect,
    borderWidth: 2,
    borderStyle: "solid",
    text: COLORS.dark.text,
  },
  revealed: {
    background: "transparent",
    borderColor: COLORS.correct,
    borderWidth: 2,
    borderStyle: "dashed",
    text: COLORS.dark.text,
  },
  dimmed: {
    background: GLASS.fill,
    borderColor: GLASS.border,
    borderWidth: 1,
    borderStyle: "solid",
    // Still white — the row is dimmed by opacity, not by greying the text.
    text: COLORS.dark.text,
  },
};

/**
 * The round bar: a mastered-count pill on the left, one segment per round, and the
 * pool's total in a chip on the right.
 *
 * The pill is tinted by your LAST answer — green after a correct one, orange after
 * a miss. It gives peripheral confirmation of how you just did without having to
 * look away from the options.
 */
export function RoundBar({
  roundCount,
  roundIndex,
  roundMastered,
  roundTotal,
  mastered,
  total,
  lastCorrect,
}: {
  roundCount: number;
  roundIndex: number;
  roundMastered: number;
  roundTotal: number;
  /** Mastered across the whole pool — the number shown in the travelling pill. */
  mastered: number;
  total: number;
  lastCorrect: boolean | null;
}) {
  const pct = roundTotal === 0 ? 0 : roundMastered / roundTotal;
  const tint =
    lastCorrect === null
      ? COLORS.brand
      : lastCorrect
        ? "#1DA05C"
        : COLORS.roundActive;

  const fill = useAnimatedStyle(() => ({
    width: withTiming(`${pct * 100}%`, PROGRESS_EASING),
  }));

  // The pill rides the head of the current round's fill, so it visibly travels
  // left-to-right as you master terms. It shows how many you have mastered in the
  // whole pool, not just this round.
  const pillPos = useAnimatedStyle(() => ({
    left: withTiming(`${pct * 100}%`, PROGRESS_EASING),
  }));

  return (
    <View className="flex-row items-center">
      <View className="flex-1 flex-row items-center gap-2">
        {Array.from({ length: roundCount }).map((_, i) => {
          const done = i < roundIndex;
          const current = i === roundIndex;
          return (
            <View
              key={i}
              className="h-3 flex-1 rounded-full"
              style={{
                backgroundColor: done ? COLORS.correct : COLORS.roundIdle,
                overflow: current ? "visible" : "hidden",
              }}
            >
              {current && (
                <>
                  <Animated.View
                    style={[
                      {
                        height: "100%",
                        borderRadius: 999,
                        backgroundColor: tint,
                      },
                      fill,
                    ]}
                  />
                  <Animated.View
                    style={[
                      {
                        position: "absolute",
                        top: -11,
                        marginLeft: -17,
                        height: 34,
                        minWidth: 34,
                        paddingHorizontal: 8,
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: tint,
                      },
                      pillPos,
                    ]}
                  >
                    <Text className="text-sm font-bold" style={{ color: "#FFFFFF" }}>
                      {mastered}
                    </Text>
                  </Animated.View>
                </>
              )}
            </View>
          );
        })}
      </View>

      <View
        className="ml-3 h-9 min-w-9 items-center justify-center rounded-full px-2"
        style={{ backgroundColor: COLORS.roundIdle }}
      >
        <Text className="text-sm font-bold" style={{ color: COLORS.dark.text }}>
          {total}
        </Text>
      </View>
    </View>
  );
}
