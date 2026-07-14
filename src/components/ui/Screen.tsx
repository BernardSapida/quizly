import type { ViewStyle } from "react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/theme";

type Props = {
  children?: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  // Pass true on screens nested inside a stack navigator that already renders
  // a header — the navigator handles the top safe area, so adding it again
  // via insets.top would create a double gap.
  noTopInset?: boolean;
};

// SafeAreaView from react-native-safe-area-context is not patched by Uniwind,
// so className (including flex-1) is silently ignored on it. Use a regular View
// with manual inset padding instead.
export function Screen({
  children,
  className,
  style,
  noTopInset = false,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`flex-1 ${className ?? ""}`}
      style={[
        {
          // Pinned rather than themed: Quizly is dark-only and must not follow
          // the phone's light/dark setting.
          backgroundColor: COLORS.dark.base,
          paddingTop: noTopInset ? 0 : insets.top,
          paddingBottom: insets.bottom,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
