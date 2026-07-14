import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";

import { PROGRESS_EASING } from "@/features/study/components/OptionRow";
import { COLORS } from "@/theme";

type Props = {
  label: string;
  mastered: number;
  total: number;
  color?: string;
  compact?: boolean;
};

/**
 * Familiarize and Identify are separate tracks, not stages of one — so they get
 * one bar each, everywhere a pool's progress is shown.
 */
export function ModeProgress({
  label,
  mastered,
  total,
  color = COLORS.brand,
  compact = false,
}: Props) {
  const pct = total === 0 ? 0 : mastered / total;

  // Eased, never sprung: progress must only travel forwards. A bar that
  // overshoots and settles back reads as losing ground you just earned.
  const fill = useAnimatedStyle(() => ({
    width: withTiming(`${pct * 100}%`, PROGRESS_EASING),
  }));

  return (
    <View className={compact ? "gap-1" : "gap-1.5"}>
      {!compact && (
        <View className="flex-row justify-between">
          <Text className="text-app-muted text-xs font-semibold">{label}</Text>
          <Text className="text-app-muted text-xs font-semibold">
            {mastered} / {total}
          </Text>
        </View>
      )}
      <View
        className="overflow-hidden rounded-full"
        style={{
          // A 4px bar on a phone reads as a hairline, not as progress worth caring
          // about. These are the main signal on every card — give them weight.
          height: compact ? 8 : 12,
          backgroundColor: COLORS.roundIdle,
        }}
      >
        <Animated.View
          style={[{ height: "100%", borderRadius: 999, backgroundColor: color }, fill]}
        />
      </View>
    </View>
  );
}
