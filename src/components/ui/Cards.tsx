import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Switch } from "heroui-native";
import { ChevronRight, Folder, Layers } from "lucide-react-native";

import type { FolderWithProgress, SetWithProgress } from "@/db";
import { MasteryChip } from "@/components/ui/Mastery";
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
 * The navigable glass row. Every secondary action in the app is one of these.
 * Settings used to stack full-width pill buttons instead, which is what made it read
 * as a different app: a pill is the primary-action shape, and three of them means
 * none of them.
 *
 * It carries Row's metrics, not Card's. It used to match Card — back when a list of
 * sets was a stack of big SetCards and a taller row was what agreed with them. The
 * lists are compact rows now, so matching Card is what would make it the odd one out.
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
        className="flex-row items-start gap-4 rounded-2xl p-3"
        style={{
          backgroundColor: GLASS.fill,
          borderWidth: 1,
          borderColor: GLASS.border,
          opacity: isDisabled ? 0.5 : 1,
        }}
      >
        <IconTile Icon={Icon} color={iconColor} size={48} />
        <View className="flex-1">
          <Text className="text-app-text text-base font-bold">{title}</Text>
          {subtitle && (
            <Text className="text-app-muted mt-0.5 text-xs">{subtitle}</Text>
          )}
        </View>
        {/* The tile is pinned to the top of the row, but the chevron is not: it points
            at the row as a whole, so it rides its middle regardless of how tall it is. */}
        <ChevronRight
          color={COLORS.dark.muted}
          size={20}
          style={{ alignSelf: "center" }}
        />
      </Pressable>
    </Animated.View>
  );
}

/**
 * ActionRow's shape with a switch where the chevron goes. The whole row is the hit
 * target, not just the switch — a 50px toggle is a mean thing to ask a thumb to find
 * when the row it sits on is already under it.
 */
export function ToggleRow({
  Icon,
  iconColor = COLORS.brand,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  Icon: typeof Folder;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={animated}>
      <Pressable
        onPress={() => onValueChange(!value)}
        onPressIn={() => scale.set(withSpring(0.97, { damping: 15 }))}
        onPressOut={() => scale.set(withSpring(1, { damping: 15 }))}
        className="flex-row items-start gap-4 rounded-2xl p-3"
        style={{
          backgroundColor: GLASS.fill,
          borderWidth: 1,
          borderColor: GLASS.border,
        }}
      >
        <IconTile Icon={Icon} color={iconColor} size={48} />
        <View className="flex-1">
          <Text className="text-app-text text-base font-bold">{title}</Text>
          {subtitle && (
            <Text className="text-app-muted mt-0.5 text-xs">{subtitle}</Text>
          )}
        </View>
        <View style={{ alignSelf: "center" }}>
          <Switch isSelected={value} onSelectedChange={onValueChange} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * "32 terms · 4 to enumerate". The enumeration half is dropped entirely when there
 * are none, rather than rendering a "· 0 to enumerate" that every set without them
 * would have to carry.
 */
export function countLine(terms: number, enums: number): string {
  const base = `${terms} ${terms === 1 ? "term" : "terms"}`;
  return enums > 0 ? `${base} · ${enums} to enumerate` : base;
}

/**
 * "18 cards · History of Culinary Arts". The folder half is dropped for a set that is
 * not in one, rather than spelling out an absence nobody needs told about.
 */
export function folderLine(set: SetWithProgress): string {
  const base = `${set.term_count} ${set.term_count === 1 ? "card" : "cards"}`;
  return set.folder_name ? `${base} · ${set.folder_name}` : base;
}

/**
 * The compact glass row: tile, name, meta line. Used wherever sets and folders are a
 * list you scan — Home's Recents and the Library — rather than a shelf you browse,
 * which is what SetCard below is for. Sets and folders share it so a flick between
 * the Library's two tabs does not resize every row on screen.
 */
function Row({
  Icon,
  title,
  subtitle,
  onPress,
}: {
  Icon: typeof Folder;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-4 rounded-2xl p-3"
      style={{
        backgroundColor: GLASS.fill,
        borderWidth: 1,
        borderColor: GLASS.border,
      }}
    >
      <IconTile Icon={Icon} size={48} />
      <View className="flex-1">
        <Text className="text-app-text text-base font-bold" numberOfLines={2}>
          {title}
        </Text>
        <Text className="text-app-muted mt-0.5 text-xs">{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export function SetRow({
  set,
  onPress,
  subtitle,
}: {
  set: SetWithProgress;
  onPress: () => void;
  subtitle?: string;
}) {
  return (
    <Row
      Icon={Layers}
      title={set.name}
      subtitle={subtitle ?? folderLine(set)}
      onPress={onPress}
    />
  );
}

export function FolderRow({
  folder,
  onPress,
}: {
  folder: FolderWithProgress;
  onPress: () => void;
}) {
  return (
    <Row
      Icon={Folder}
      title={folder.name}
      subtitle={`${folder.set_count} ${
        folder.set_count === 1 ? "lesson" : "lessons"
      } · ${countLine(folder.term_count, folder.enum_count)}`}
      onPress={onPress}
    />
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
      {/* Top-aligned, not centred: a lesson name that wraps to two lines used to drag
          the tile down with it, so no two cards in a list agreed on where the icon sat. */}
      <View className="flex-row items-start gap-4">
        <IconTile Icon={Layers} />
        <View className="flex-1 gap-1.5">
          <Text className="text-app-text text-base font-bold" numberOfLines={2}>
            {set.name}
          </Text>
          <Text className="text-app-muted text-xs">
            {subtitle ?? countLine(set.term_count, set.enum_count)}
          </Text>
        </View>
        {/* Pinned to the top-right corner rather than left under the title. Down there
            it moved with the name's line count; up here it lands in the same place on
            every card, which is what lets you scan a list of twelve for the unfinished
            ones without reading any of them. */}
        {showProgress && <MasteryChip stats={set} />}
      </View>
    </Card>
  );
}

