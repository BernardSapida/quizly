import { ScrollView, Text, View } from "react-native";
import { Screen } from "@/components/ui/Screen";

export default function NotificationsScreen() {
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 32, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-foreground">Notifications</Text>
        <Text className="text-base text-muted leading-relaxed">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip
          ex ea commodo consequat. Duis aute irure dolor in reprehenderit in
          voluptate velit esse cillum dolore eu fugiat nulla pariatur.
        </Text>
      </ScrollView>
    </Screen>
  );
}
