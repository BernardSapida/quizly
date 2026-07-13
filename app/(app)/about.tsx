import Constants from "expo-constants";
import { ExternalLink } from "lucide-react-native";
import { Card } from "heroui-native";
import { useThemeColor } from "heroui-native";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";

const version = Constants.expoConfig?.version ?? "1.0.0";

type LinkRowProps = { label: string; url: string };

function LinkRow({ label, url }: LinkRowProps) {
  const [accent] = useThemeColor(["accent"]);
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      className="flex-row items-center justify-between py-4"
    >
      <Text className="text-base text-foreground">{label}</Text>
      <ExternalLink size={16} color={accent} />
    </Pressable>
  );
}

export default function AboutScreen() {
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* App info */}
        <View className="gap-3">
          <Text className="text-xs font-semibold text-muted uppercase tracking-widest px-1">
            App
          </Text>
          <Card>
            <Card.Body className="px-4 py-0">
              <View className="flex-row items-center justify-between py-4">
                <Text className="text-base text-foreground">Version</Text>
                <Text className="text-base text-muted">{version}</Text>
              </View>
            </Card.Body>
          </Card>
        </View>

        {/* Legal */}
        <View className="gap-3">
          <Text className="text-xs font-semibold text-muted uppercase tracking-widest px-1">
            Legal
          </Text>
          <Card>
            <Card.Body className="px-4 py-0">
              <LinkRow label="Terms of Service" url="https://example.com/terms" />
              <View className="h-px bg-border" />
              <LinkRow label="Privacy Policy" url="https://example.com/privacy" />
            </Card.Body>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
