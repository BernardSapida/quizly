import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { ChevronRight, Folder, Layers } from "lucide-react-native";

import type { FolderWithProgress, SetWithProgress } from "@/db";
import { ModeProgress } from "@/components/ui/ModeProgress";
import { COLORS, GLASS } from "@/theme";

/**
 * One glass card surface for the whole app: a translucent white wash over the navy
 * base plus a hairline light border. The border is what sells it — a translucent
 * fill alone just looks like a slightly lighter rectangle.
 */
export function Card({
  children,
  onPress,
  className = "",
}: {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={animated}>
      <Pressable
        onPress={onPress}
        onPressIn={() => onPress && scale.set(withSpring(0.97, { damping: 15 }))}
        onPressOut={() => onPress && scale.set(withSpring(1, { damping: 15 }))}
        className={`rounded-3xl p-5 ${className}`}
        style={{
          backgroundColor: GLASS.fill,
          borderWidth: 1,
          borderColor: GLASS.border,
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/**
 * The tile every card leads with: a solid colour block with a white glyph. It is
 * the one opaque element on a glass card, which is exactly why it anchors the row —
 * a tinted-glass tile disappeared into the card behind it.
 */
export function IconTile({
  Icon,
  color = COLORS.brand,
  size = 44,
}: {
  Icon: typeof Folder;
  color?: string;
  size?: number;
}) {
  return (
    <View
      className="items-center justify-center rounded-2xl"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderWidth: 1,
        borderColor: GLASS.border,
      }}
    >
      <Icon color="#FFFFFF" size={size * 0.45} />
    </View>
  );
}

/**
 * The compact glass row — 16px radius, the design system's "compact row" size.
 * Every secondary, navigable action in the app is one of these. Settings used to
 * stack full-width pill buttons instead, which is what made it read as a different
 * app: a pill is the primary-action shape, and three of them means none of them.
 */
export function ActionRow({
  Icon,
  iconColor = COLORS.brand,
  title,
  subtitle,
  onPress,
  isDisabled = false,
}: {
  Icon: typeof Folder;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  isDisabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={animated}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={() => scale.set(withSpring(0.97, { damping: 15 }))}
        onPressOut={() => scale.set(withSpring(1, { damping: 15 }))}
        className="flex-row items-center gap-4 rounded-2xl p-3"
        style={{
          backgroundColor: GLASS.fill,
          borderWidth: 1,
          borderColor: GLASS.border,
          opacity: isDisabled ? 0.5 : 1,
        }}
      >
        <IconTile Icon={Icon} color={iconColor} size={44} />
        <View className="flex-1">
          <Text className="text-app-text text-base font-bold">{title}</Text>
          {subtitle && (
            <Text className="text-app-muted mt-0.5 text-xs">{subtitle}</Text>
          )}
        </View>
        <ChevronRight color={COLORS.dark.muted} size={20} />
      </Pressable>
    </Animated.View>
  );
}

export function SetCard({
  set,
  onPress,
  subtitle,
  showProgress = true,
}: {
  set: SetWithProgress;
  onPress: () => void;
  subtitle?: string;
  /** Off in the Library, where the list is for browsing rather than resuming. */
  showProgress?: boolean;
}) {
  return (
    <Card onPress={onPress}>
      <View className="flex-row items-center gap-4">
        <IconTile Icon={Layers} />
        <View className="flex-1">
          <Text className="text-app-text text-base font-bold" numberOfLines={2}>
            {set.name}
          </Text>
          <Text className="text-app-muted mt-0.5 text-xs">
            {subtitle ??
              `${set.term_count} ${set.term_count === 1 ? "term" : "terms"}`}
          </Text>
        </View>
      </View>

      {showProgress && set.term_count > 0 && (
        <View className="mt-4 gap-2">
          <ModeProgress
            label="Familiarize"
            mastered={set.choice_mastered}
            total={set.term_count}
            compact
          />
          <ModeProgress
            label="Identify"
            mastered={set.written_mastered}
            total={set.term_count}
            color={COLORS.correct}
            compact
          />
        </View>
      )}
    </Card>
  );
}

export function FolderCard({
  folder,
  onPress,
  showProgress = true,
}: {
  folder: FolderWithProgress;
  onPress: () => void;
  /** Off in the Library, where the list is for browsing rather than resuming. */
  showProgress?: boolean;
}) {
  return (
    <Card onPress={onPress}>
      <View className="flex-row items-center gap-4">
        <IconTile Icon={Folder} />
        <View className="flex-1">
          <Text className="text-app-text text-base font-bold">{folder.name}</Text>
          <Text className="text-app-muted mt-0.5 text-xs">
            {folder.set_count} {folder.set_count === 1 ? "lesson" : "lessons"} ·{" "}
            {folder.term_count} terms
          </Text>
        </View>
      </View>

      {showProgress && folder.term_count > 0 && (
        <View className="mt-4 gap-2">
          <ModeProgress
            label="Familiarize"
            mastered={folder.choice_mastered}
            total={folder.term_count}
            compact
          />
          <ModeProgress
            label="Identify"
            mastered={folder.written_mastered}
            total={folder.term_count}
            color={COLORS.correct}
            compact
          />
        </View>
      )}
    </Card>
  );
}
