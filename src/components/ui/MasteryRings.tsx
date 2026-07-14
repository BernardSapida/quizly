import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Check, Layers, Sparkles } from "lucide-react-native";

import { PROGRESS_EASING } from "@/features/study/components/OptionRow";
import { COLORS } from "@/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 104;
const STROKE = 9;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Identify's ring is offset so the two never sweep in lockstep — one leads, one
 *  follows, which is what makes the card feel like it is dealing you your progress
 *  rather than just painting it. */
const STAGGER = 140;

type RingProps = {
  label: string;
  Icon: typeof Sparkles;
  mastered: number;
  total: number;
  color: string;
  delay: number;
};

function Ring({ label, Icon, mastered, total, color, delay }: RingProps) {
  const pct = total === 0 ? 0 : Math.min(mastered / total, 1);
  const done = total > 0 && mastered >= total;

  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  // Only the *transition* into done earns the pop. Opening a set you finished last
  // week should show a closed ring, not throw a party at you every time.
  const wasDone = useRef(done);

  useEffect(() => {
    progress.set(withDelay(delay, withTiming(pct, PROGRESS_EASING)));
  }, [pct, delay, progress]);

  useEffect(() => {
    if (done && !wasDone.current) {
      scale.set(
        withDelay(
          delay + PROGRESS_EASING.duration,
          withSequence(
            withTiming(1.12, { duration: 140 }),
            withSpring(1, { damping: 10, stiffness: 180 })
          )
        )
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasDone.current = done;
  }, [done, delay, scale]);

  // strokeDashoffset, not width: the arc has to grow along the circle, and the dash
  // gap is the only handle SVG gives you for that.
  const arc = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.get()),
  }));

  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <View className="flex-1 items-center gap-2.5">
      <Animated.View style={[{ width: SIZE, height: SIZE }, pop]}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={COLORS.roundIdle}
            strokeWidth={STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={arc}
            // Start the arc at 12 o'clock. An SVG circle otherwise starts at 3.
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>

        <View className="absolute inset-0 items-center justify-center">
          {done ? (
            <Check color={color} size={32} strokeWidth={3} />
          ) : (
            <View className="flex-row items-baseline">
              <Text className="text-app-text text-2xl font-bold">{mastered}</Text>
              <Text className="text-app-muted text-xs font-semibold">/{total}</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* The glyph rides the label rather than the ring: inside, it was competing with
          the count for the same 40pt of centre. Out here it reads as the mode's mark. */}
      <View
        className="flex-row items-center gap-1.5"
        accessibilityLabel={`${label}, ${mastered} of ${total} mastered`}
      >
        <Icon color={color} size={13} />
        <Text className="text-[11px] font-bold" style={{ color, letterSpacing: 0.6 }}>
          {label.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

/**
 * How the set is going, in two dials. Familiarize and Identify are separate tracks
 * rather than stages of one, so neither ring is "ahead" of the other — you close
 * them in whatever order you like, and the card is only finished when both are shut.
 *
 * The bars this replaced were honest and completely inert. A ring reads as a thing
 * you close, which is the whole point: it gives the count somewhere to be going.
 */
export function MasteryRings({
  choiceMastered,
  writtenMastered,
  total,
}: {
  choiceMastered: number;
  writtenMastered: number;
  total: number;
}) {
  return (
    <View className="gap-4 rounded-3xl border border-app-glassline bg-app-glass p-5 pt-6">
      <View className="flex-row">
        <Ring
          label="Familiarize"
          Icon={Sparkles}
          mastered={choiceMastered}
          total={total}
          color={COLORS.brand}
          delay={0}
        />
        <Ring
          label="Identify"
          Icon={Layers}
          mastered={writtenMastered}
          total={total}
          color={COLORS.correct}
          delay={STAGGER}
        />
      </View>

      {/* One line, and it is the only place on this screen that talks back to you.
          It names the next move so the rings are never just a scoreboard. */}
      <View className="items-center border-t border-app-glassline pt-3.5">
        <Text className="text-app-muted text-center text-xs leading-5">
          {cheer(choiceMastered, writtenMastered, total)}
        </Text>
      </View>
    </View>
  );
}

/** Brand blue is unreadable as text on navy — see COLORS.brandTint. Rings stroke in
 *  brand; this copy stays muted rather than trying to be a third colour. */
function cheer(choice: number, written: number, total: number): string {
  const left = total - choice;

  if (total === 0) return "Add some terms to start closing rings.";
  if (written >= total) return "Both rings closed. This set is yours. 🏆";
  if (choice >= total) return `Blue ring's shut. ${total - written} left to fully master.`;
  if (choice === 0 && written === 0)
    return "Two empty rings. Familiarize is the easy one. Start there.";
  if (choice / total >= 0.5) return `Past halfway. ${left} more and the blue ring shuts.`;
  return `${choice} down, ${left} to go. The blue ring is waiting.`;
}
