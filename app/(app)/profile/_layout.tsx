import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useColorScheme } from "react-native";

export default function ProfileLayout() {
  const colorScheme = useColorScheme();
  const [rawBg, rawFg] = useThemeColor(["background", "foreground"]);

  const isDark = colorScheme === "dark";
  const background =
    rawBg && rawBg !== "invalid" ? rawBg : isDark ? "#18181b" : "#fafafa";
  const foreground =
    rawFg && rawFg !== "invalid" ? rawFg : isDark ? "#fafafa" : "#18181b";

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: background },
        headerTintColor: foreground,
        headerShadowVisible: false,
        animation: "fade",
        backgroundColor: background,
        contentStyle: { backgroundColor: background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Profile" }} />
      <Stack.Screen name="edit" options={{ title: "Edit Profile" }} />
      <Stack.Screen
        name="change-password"
        options={{ title: "Change Password" }}
      />
      <Stack.Screen name="security" options={{ title: "Security" }} />
      <Stack.Screen
        name="delete-account"
        options={{ title: "Delete Account" }}
      />
    </Stack>
  );
}
