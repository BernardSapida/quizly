import { useRouter } from "expo-router";
import { Button, Card, useThemeColor } from "heroui-native";
import {
  ChevronRight,
  KeyRound,
  Moon,
  Pencil,
  ShieldCheck,
  Sun,
  SunMoon,
  Trash2,
} from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { signOut as signOutApi } from "@/features/auth/api";
import logger from "@/lib/logger";
import { useAuthStore, usePreferencesStore, type Theme } from "@/store";

function initials(firstname: string, lastname: string) {
  return `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase();
}

type MenuRowProps = {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
};

function MenuRow({ label, icon, onPress, destructive }: MenuRowProps) {
  const [muted] = useThemeColor(["muted"]);
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-4 px-1"
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View className="w-8 items-center">{icon}</View>
      <Text
        className={`flex-1 text-base ${
          destructive ? "text-danger" : "text-foreground"
        }`}
      >
        {label}
      </Text>
      <ChevronRight size={18} color={muted} />
    </Pressable>
  );
}

const THEME_OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: SunMoon },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { session, clearAuth, token } = useAuthStore();
  const { theme, setTheme } = usePreferencesStore();
  const [accent, muted, accentForeground, danger] = useThemeColor([
    "accent",
    "muted",
    "accent-foreground",
    "danger",
  ]);

  const user = session?.user;

  const handleSignOut = async () => {
    try {
      await signOutApi(token);
    } catch (error) {
      logger.error("signOut error", error);
    }
    clearAuth();
  };

  return (
    <Screen noTopInset>
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name */}
        <Card>
          <Card.Body className="items-center gap-3 py-6">
            <View className="w-20 h-20 rounded-full bg-accent items-center justify-center">
              <Text className="text-accent-foreground text-2xl font-bold">
                {user ? initials(user.firstname, user.lastname) : "?"}
              </Text>
            </View>
            <View className="items-center gap-1">
              <Text className="text-lg font-semibold text-foreground">
                {user ? `${user.firstname} ${user.lastname}` : ""}
              </Text>
              <Text className="text-sm text-muted">{user?.email}</Text>
            </View>
          </Card.Body>
        </Card>

        {/* Account actions */}
        <Card>
          <Card.Body className="px-4 py-0">
            <MenuRow
              label="Edit Profile"
              icon={<Pencil size={18} color={accent} />}
              onPress={() => router.push("/(app)/profile/edit")}
            />
            <View className="h-px bg-border" />
            <MenuRow
              label="Change Password"
              icon={<KeyRound size={18} color={accent} />}
              onPress={() => router.push("/(app)/profile/change-password")}
            />
            <View className="h-px bg-border" />
            <MenuRow
              label="Security"
              icon={<ShieldCheck size={18} color={accent} />}
              onPress={() => router.push("/(app)/profile/security")}
            />
            <View className="h-px bg-border" />
            <MenuRow
              label="Delete Account"
              icon={<Trash2 size={18} color={danger} />}
              onPress={() => router.push("/(app)/profile/delete-account")}
              destructive
            />
          </Card.Body>
        </Card>

        {/* Appearance */}
        <Card>
          <Card.Body className="px-4 py-4 gap-3">
            <Text className="text-sm font-medium text-muted">Appearance</Text>
            <View className="flex-row gap-2">
              {THEME_OPTIONS.map(({ value, label, Icon }) => {
                const active = theme === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setTheme(value)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: 10,
                      borderRadius: 12,
                      gap: 6,
                      backgroundColor: active ? accent : undefined,
                    }}
                    className={active ? "" : "bg-default"}
                  >
                    <Icon size={18} color={active ? accentForeground : muted} />
                    <Text
                      style={{ color: active ? accentForeground : muted }}
                      className="text-xs font-medium"
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card.Body>
        </Card>

        {/* Sign out */}
        <Button
          variant="danger"
          size="lg"
          className="w-full"
          onPress={handleSignOut}
        >
          <Button.Label>Sign out</Button.Label>
        </Button>
      </ScrollView>
    </Screen>
  );
}
