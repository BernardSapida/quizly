import { ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";

export default function AdminScreen() {
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text className="text-2xl font-bold text-foreground">Admin</Text>
          <Text className="text-muted mt-2">
            Replace this screen with your admin dashboard.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
