import type { ReactNode } from "react";
import { TAB_NAMES } from "@/navigation/tabs.config";
import { BRAND, COLORS, GLASS } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BAR_HEIGHT = 64;
const BAR_TOP_PAD = 8;

/**
 * GLASS.fill pre-blended onto COLORS.dark.base — visually identical to the
 * translucent token, but opaque. The bar floats over the scene now, so a 6%-white
 * wash would let card text scroll straight through it; this occludes instead.
 */
const BAR_FILL = "#19183A";

/** insets.bottom is 0 on devices with no gesture bar, which would leave the bar
 *  flush against the screen edge. Floor it so there is always a real margin. */
function useBarBottomPad() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 16);
}

/**
 * How far the floating tab bar reaches up over a `Screen`'s content box.
 *
 * The bar is absolutely positioned against the scene, so it covers the bottom of
 * whatever the screen renders. Any scrollable content — and anything pinned to
 * the bottom, like Library's FAB — must offset by this much to stay clear of it.
 *
 * `Screen` already pads by insets.bottom, and the bar's own bottom pad is
 * measured from the true screen edge, so the inset is subtracted out rather than
 * counted twice.
 */
export function useTabBarOverlap() {
  const insets = useSafeAreaInsets();
  return BAR_TOP_PAD + BAR_HEIGHT + useBarBottomPad() - insets.bottom;
}

/**
 * Typed against the shape this component actually uses, not against
 * `BottomTabBarProps` from @react-navigation/bottom-tabs — expo-router passes its
 * own structurally-identical-but-nominally-different props, and importing the
 * react-navigation type produces an unfixable variance error.
 */
type TabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  descriptors: Record<
    string,
    {
      options: {
        title?: string;
        tabBarIcon?: (props: {
          color: string;
          size: number;
          focused: boolean;
        }) => ReactNode;
      };
    }
  >;
  navigation: {
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: never) => void;
  };
};

export function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const bottomPad = useBarBottomPad();

  // Dark-only: never read the system colour scheme.
  const muted = COLORS.dark.muted;

  const visibleRoutes = state.routes.filter((r) => TAB_NAMES.has(r.name));
  const gradientColors = BRAND.gradientDark;

  return (
    // Absolutely positioned, so it floats over the scene instead of taking a row
    // of layout below it: content scrolls under the glass bar rather than
    // stopping above an opaque band. Screens offset their bottom content by
    // useTabBarOverlap() to stay clear of it.
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "transparent",
        paddingHorizontal: 16,
        paddingBottom: bottomPad,
        paddingTop: BAR_TOP_PAD,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          backgroundColor: BAR_FILL,
          borderWidth: 1,
          borderColor: GLASS.border,
          borderRadius: 16,
          height: BAR_HEIGHT,
          alignItems: "center",
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          // The active tab fills its whole slot rather than floating a small square
          // inside it — a 48px box in a 100px column reads as misaligned. Filling the
          // slot also leaves room for the label, so the current tab is named, not
          // just coloured.
          if (isFocused) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityLabel={options.title ?? route.name}
                accessibilityRole="tab"
                accessibilityState={{ selected: true }}
                style={{ flex: 1, paddingHorizontal: 6 }}
              >
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flexDirection: "row",
                    height: 48,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {options.tabBarIcon?.({
                    color: "#FFFFFF",
                    size: 20,
                    focused: true,
                  })}
                  <Text
                    numberOfLines={1}
                    style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}
                  >
                    {options.title ?? route.name}
                  </Text>
                </LinearGradient>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityLabel={options.title ?? route.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {options.tabBarIcon?.({
                color: muted,
                size: 22,
                focused: false,
              })}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
