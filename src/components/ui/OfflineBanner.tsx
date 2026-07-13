import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WifiOff } from "lucide-react-native";

const CONTENT_HEIGHT = 40;

interface Props {
  visible: boolean;
}

export function OfflineBanner({ visible }: Props) {
  const insets = useSafeAreaInsets();
  const bannerHeight = insets.top + CONTENT_HEIGHT;
  const translateY = useSharedValue(-bannerHeight);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : -bannerHeight, {
      duration: 300,
    });
  }, [visible, bannerHeight]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.banner,
        animStyle,
        { paddingTop: insets.top, height: bannerHeight },
      ]}
    >
      <WifiOff size={14} color="white" />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    zIndex: 1000,
  },
  text: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
});
