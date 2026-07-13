import { Check } from "lucide-react-native";
import { Card } from "heroui-native";
import { useThemeColor } from "heroui-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { usePreferencesStore, type Theme } from "@/store";

const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "System default" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsScreen() {
  const { theme, setTheme, language } = usePreferencesStore();
  const [accent, border] = useThemeColor(["accent", "border"]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <View className="gap-3">
          <Text className="text-xs font-semibold text-muted uppercase tracking-widest px-1">
            Appearance
          </Text>
          <Card>
            <Card.Body className="px-4 py-0">
              {THEMES.map((t, i) => (
                <View key={t.value}>
                  {i > 0 && <View className="h-px bg-border" />}
                  <Pressable
                    onPress={() => setTheme(t.value)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                    className="flex-row items-center justify-between py-4"
                  >
                    <Text className="text-base text-foreground">{t.label}</Text>
                    {theme === t.value && (
                      <Check size={18} color={accent} />
                    )}
                  </Pressable>
                </View>
              ))}
            </Card.Body>
          </Card>
        </View>

        {/* Language */}
        <View className="gap-3">
          <Text className="text-xs font-semibold text-muted uppercase tracking-widest px-1">
            Language
          </Text>
          <Card>
            <Card.Body className="px-4 py-0">
              <View className="flex-row items-center justify-between py-4">
                <Text className="text-base text-foreground">English</Text>
                <Check size={18} color={accent} />
              </View>
            </Card.Body>
          </Card>
          <Text className="text-xs text-default-400 px-1">
            Language switching is a placeholder — integrate an i18n library to
            enable this.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
