import { Image, View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

import { COLORS } from "@/theme";

/**
 * The brand moment. Shown while the app boots — it fills the window the content
 * sync already occupies rather than adding one, so on a warm launch it is gone
 * almost immediately.
 *
 * The native splash (an image on navy) cannot render text; anything written there
 * has to be baked into the PNG. This is where the wordmark and tagline live.
 *
 * It uses the SAME icon.png as the native splash and the launcher icon on purpose:
 * the handoff from one to the other is then invisible, rather than the mark
 * visibly changing shape mid-launch.
 */
export function LaunchScreen() {
  return (
    <View
      className="flex-1 items-center justify-center gap-5 px-10"
      style={{ backgroundColor: COLORS.dark.base }}
    >
      <Animated.View entering={FadeIn.duration(400)}>
        <Image
          source={require("../../../assets/images/icon.png")}
          style={{ width: 96, height: 96, borderRadius: 24 }}
        />
      </Animated.View>

      <Animated.Text
        entering={FadeInUp.delay(120).duration(400)}
        className="text-app-text text-4xl font-bold"
      >
        Quizly
      </Animated.Text>

      <Animated.Text
        entering={FadeInUp.delay(220).duration(400)}
        className="text-app-muted text-center text-base leading-6"
      >
        Your lessons, on your phone.{"\n"}Study anywhere and no signal needed.
      </Animated.Text>
    </View>
  );
}
