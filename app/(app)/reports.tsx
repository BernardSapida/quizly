import { ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";

export default function ReportsScreen() {
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text className="text-2xl font-bold text-foreground">Reports</Text>
          <Text className="text-muted mt-2">
            Replace this screen with your moderator reports view.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
