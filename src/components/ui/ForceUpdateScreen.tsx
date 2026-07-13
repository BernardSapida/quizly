import { View, Text, StyleSheet, Linking, Platform } from "react-native";
import { Button } from "heroui-native";
import { ArrowUpCircle } from "lucide-react-native";
import Constants from "expo-constants";

export function ForceUpdateScreen() {
  function openStore() {
    const pkg =
      Constants.expoConfig?.android?.package ?? "com.bernardsapida.myApplication";

    if (Platform.OS === "android") {
      Linking.openURL(`market://details?id=${pkg}`).catch(() =>
        Linking.openURL(
          `https://play.google.com/store/apps/details?id=${pkg}`
        )
      );
    } else {
      Linking.openURL("https://apps.apple.com");
    }
  }

  return (
    <View className="bg-background" style={styles.container}>
      <ArrowUpCircle size={64} color="#6366f1" />
      <Text className="text-foreground" style={styles.title}>
        Update Required
      </Text>
      <Text className="text-default-500" style={styles.description}>
        A new version of the app is available. Please update to continue.
      </Text>
      <Text className="text-default-400" style={styles.version}>
        Current version: {Constants.expoConfig?.version ?? "—"}
      </Text>
      <Button onPress={openStore} className="mt-2">
        Update Now
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
    zIndex: 100,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    textAlign: "center",
  },
  version: {
    fontSize: 13,
  },
});
