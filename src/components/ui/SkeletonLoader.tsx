import { useEffect } from "react";
import type { ViewStyle } from "react-native";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { GLASS, SPACING } from "@/theme";

/**
 * Skeletons rather than a spinner. Every read in this app is a local SQLite call,
 * so the wait is short and the shape of what is coming is already known: a spinner
 * would only say "something is happening", while a skeleton says "your terms are
 * about to be right here" and the screen never visibly reflows when they land.
 *
 * The real bug these fix: `useAsync` starts at `data: null`, so a list screen spent
 * its first frames rendering the *empty* state — the editor showed a lone "Add term"
 * button, as if the set had no terms, and then the terms popped in on top of it.
 */

const PULSE_MS = 900;

/** Staggers a list so it breathes down the screen instead of strobing in unison. */
const stagger = (index: number) => index * 90;

type Props = {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  delay?: number;
  style?: ViewStyle;
};

export function SkeletonLoader({
  width = "100%",
  height,
  borderRadius = 8,
  delay = 0,
  style,
}: Props) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [opacity, delay]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          // A wash of white over the navy base — the same material as a glass card,
          // so a placeholder reads as the card it stands in for. This was #E1E9EE,
          // a light-mode grey that on this dark UI glows like a hole in the screen.
          backgroundColor: "rgba(255,255,255,0.10)",
        },
        animated,
        style,
      ]}
    />
  );
}

/** The glass shell the shaped skeletons below sit in — matches `Card`. */
function GlassShell({
  children,
  radius = 24,
  padding = 20,
}: {
  children: React.ReactNode;
  radius?: number;
  padding?: number;
}) {
  return (
    <View
      style={{
        borderRadius: radius,
        padding,
        backgroundColor: GLASS.fill,
        borderWidth: 1,
        borderColor: GLASS.border,
      }}
    >
      {children}
    </View>
  );
}

/** Mirrors `TermRow` in the term editor: header row, term line, definition lines. */
export function TermRowSkeleton({ index = 0 }: { index?: number }) {
  const delay = stagger(index);

  return (
    <GlassShell padding={16}>
      <View className="mb-3 flex-row items-center justify-between">
        <SkeletonLoader width={12} height={12} borderRadius={4} delay={delay} />
        <View className="flex-row items-center gap-3">
          <SkeletonLoader width={44} height={16} borderRadius={999} delay={delay} />
          <SkeletonLoader width={16} height={16} borderRadius={4} delay={delay} />
        </View>
      </View>

      <SkeletonLoader width="62%" height={15} delay={delay} />
      <View className="mt-3 gap-2">
        <SkeletonLoader width="100%" height={11} delay={delay} />
        <SkeletonLoader width="78%" height={11} delay={delay} />
      </View>
    </GlassShell>
  );
}

/** Mirrors `SetCard` / `FolderCard`: icon tile plus a title and meta line. */
export function SetCardSkeleton({ index = 0 }: { index?: number }) {
  const delay = stagger(index);

  return (
    <GlassShell>
      <View className="flex-row items-center gap-4">
        <SkeletonLoader width={44} height={44} borderRadius={16} delay={delay} />
        <View className="flex-1 gap-2">
          <SkeletonLoader width="70%" height={14} delay={delay} />
          <SkeletonLoader width="35%" height={10} delay={delay} />
        </View>
      </View>
    </GlassShell>
  );
}

/** Mirrors `RecentRow` on Home — the compact 16px-radius row, not the big card. */
export function RecentRowSkeleton({ index = 0 }: { index?: number }) {
  const delay = stagger(index);

  return (
    <GlassShell radius={16} padding={12}>
      <View className="flex-row items-center gap-4">
        <SkeletonLoader width={48} height={48} borderRadius={16} delay={delay} />
        <View className="flex-1 gap-2">
          <SkeletonLoader width="65%" height={14} delay={delay} />
          <SkeletonLoader width="40%" height={10} delay={delay} />
        </View>
      </View>
    </GlassShell>
  );
}

export function SetListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }, (_, i) => (
        <SetCardSkeleton key={i} index={i} />
      ))}
    </View>
  );
}

export function TermListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }, (_, i) => (
        <TermRowSkeleton key={i} index={i} />
      ))}
    </View>
  );
}

/** The set detail screen: flashcard carousel, title block, progress card, actions. */
export function SetDetailSkeleton() {
  return (
    <View
      style={{
        paddingHorizontal: SPACING.gutter,
        paddingTop: SPACING.headerTop + 40,
        gap: SPACING.headerGap,
      }}
    >
      <SkeletonLoader width="100%" height={200} borderRadius={24} />

      <View className="gap-3">
        <SkeletonLoader width="65%" height={24} delay={stagger(1)} />
        <SkeletonLoader width="25%" height={12} delay={stagger(1)} />
        <SkeletonLoader width={120} height={30} borderRadius={999} delay={stagger(1)} />
      </View>

      <GlassShell>
        <View className="gap-4">
          <SkeletonLoader width="100%" height={14} delay={stagger(2)} />
          <SkeletonLoader width="100%" height={14} delay={stagger(2)} />
        </View>
      </GlassShell>

      <View className="gap-3">
        {[0, 1, 2].map((i) => (
          <GlassShell key={i} radius={16} padding={12}>
            <View className="flex-row items-center gap-4">
              <SkeletonLoader
                width={44}
                height={44}
                borderRadius={16}
                delay={stagger(i + 3)}
              />
              <View className="flex-1 gap-2">
                <SkeletonLoader width="45%" height={14} delay={stagger(i + 3)} />
                <SkeletonLoader width="60%" height={10} delay={stagger(i + 3)} />
              </View>
            </View>
          </GlassShell>
        ))}
      </View>
    </View>
  );
}

/** The folder detail screen: title block, one action row, then the lesson list. */
export function FolderDetailSkeleton() {
  return (
    <View
      style={{
        paddingHorizontal: SPACING.gutter,
        paddingTop: SPACING.headerTop + 40,
        gap: SPACING.headerGap,
      }}
    >
      <View className="gap-3">
        <SkeletonLoader width="55%" height={24} />
        <SkeletonLoader width="40%" height={12} />
      </View>

      <GlassShell radius={16} padding={12}>
        <View className="flex-row items-center gap-4">
          <SkeletonLoader width={44} height={44} borderRadius={16} delay={stagger(1)} />
          <View className="flex-1 gap-2">
            <SkeletonLoader width="50%" height={14} delay={stagger(1)} />
            <SkeletonLoader width="70%" height={10} delay={stagger(1)} />
          </View>
        </View>
      </GlassShell>

      <View className="gap-2">
        <SkeletonLoader width={60} height={10} delay={stagger(2)} />
        <View className="mt-1 gap-3">
          {[0, 1, 2].map((i) => (
            <SetCardSkeleton key={i} index={i + 2} />
          ))}
        </View>
      </View>
    </View>
  );
}
