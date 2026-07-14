import { useEffect, useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { HeroUINativeProvider } from "heroui-native";
import * as SplashScreen from "expo-splash-screen";
import "react-native-reanimated";
import "../global.css";

import { syncContentIfChanged } from "@/features/share/content";
import { LaunchScreen } from "@/components/ui/LaunchScreen";
import { usePreferencesStore } from "@/store";
import { COLORS } from "@/theme";

SplashScreen.preventAutoHideAsync();

/**
 * How long the branded launch view is guaranteed to stay up. Without a floor it
 * flashes past on a warm launch (the content sync is a no-op when the hash has not
 * changed), which looks like a glitch rather than a brand.
 *
 * Set to 0 to make boot as fast as it can possibly be and skip the brand moment.
 */
const LAUNCH_MIN_MS = 900;

export default function RootLayout() {
  const { _hasHydrated, contentHash, setContentHash } = usePreferencesStore();
  const [booted, setBooted] = useState(false);

  // Boot is entirely local: rehydrate preferences, sync the bundled contents/ if it
  // changed, then render. No network, no auth, no remote config.
  //
  // Rendering must wait for the sync to FINISH, not just start. Home reads SQLite on
  // mount, so letting it render mid-sync shows "No sets yet" and only corrects
  // itself once you happen to switch tabs.
  useEffect(() => {
    if (!_hasHydrated || booted) return;

    (async () => {
      // Hand off from the native splash (a bare icon — it cannot render text) to
      // our own launch view, which carries the wordmark and tagline.
      await SplashScreen.hideAsync().catch(() => {});

      await Promise.all([
        syncContentIfChanged(contentHash, setContentHash),
        new Promise((r) => setTimeout(r, LAUNCH_MIN_MS)),
      ]);

      setBooted(true);
    })();
  }, [_hasHydrated, booted, contentHash, setContentHash]);

  if (!booted) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <LaunchScreen />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false } }}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: COLORS.dark.base }}>
          {/* Detail and study screens live outside (app) so they push over the
              tab bar rather than swapping a tab's content. The study session is
              fullscreen — the tab bar has no business being there. */}
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: COLORS.dark.base },
            }}
          >
            <Stack.Screen name="(app)" />
            <Stack.Screen name="folder/[id]" />
            <Stack.Screen name="set/[id]/index" />
            <Stack.Screen name="set/[id]/edit" />
            <Stack.Screen name="set/[id]/move" options={{ presentation: "modal" }} />
            <Stack.Screen
              name="study"
              options={{ animation: "fade", gestureEnabled: false }}
            />
            {/* Same treatment as study: fullscreen, and no swipe-back. Backing out
                of an exam by accident is worse than backing out of a session. */}
            <Stack.Screen
              name="test"
              options={{ animation: "fade", gestureEnabled: false }}
            />
            <Stack.Screen name="import" options={{ presentation: "modal" }} />
          </Stack>
        </View>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
