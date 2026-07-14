import { ChevronLeft } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { COLORS, SPACING } from "@/theme";

type Props = {
  title: string;
  subtitle?: string;
  /** Renders the back chevron. Omit on tab screens, which have nowhere to go back to. */
  onBack?: () => void;
  /** Trailing actions (share, delete, settings…). Spaced as a row for you. */
  actions?: React.ReactNode;
  /**
   * Pass false when the header sits inside a ScrollView that already applies the
   * gutter, so the padding isn't added twice.
   */
  inset?: boolean;
};

/**
 * The one header for every screen: same gutter, same distance below the safe area,
 * same title size, same subtitle offset. Screens should not hand-roll these values
 * — that is how the title ended up at a different height on each tab.
 */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  actions,
  inset = true,
}: Props) {
  const hasNavRow = Boolean(onBack || actions);

  return (
    <View
      style={
        inset
          ? { paddingHorizontal: SPACING.gutter, paddingTop: SPACING.headerTop }
          : undefined
      }
      className="gap-4"
    >
      {hasNavRow && (
        // Fixed height so the title sits at the same y whether or not the screen
        // has actions on the right.
        <View className="h-8 flex-row items-center justify-between">
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12} className="-ml-1">
              <ChevronLeft color={COLORS.dark.text} size={26} />
            </Pressable>
          ) : (
            <View />
          )}
          {actions ? (
            <View className="flex-row items-center gap-5">{actions}</View>
          ) : (
            <View />
          )}
        </View>
      )}

      <View>
        <Text className="text-app-text text-3xl font-bold">{title}</Text>
        {subtitle ? (
          <Text className="text-app-muted mt-1">{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}
