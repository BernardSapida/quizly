import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import { Bell, Compass, Flag, Home, Plus, Shield, User } from "lucide-react-native";
import { getTabsForRole } from "@/navigation/tabs.config";
import { useAuthStore } from "@/store";
import { CustomTabBar } from "@/components/ui/CustomTabBar";

export default function AppLayout() {
  const role = useAuthStore((s) => s.session?.user.role ?? "user");
  const visibleTabs = new Set(getTabsForRole(role).map((t) => t.name));
  const [background] = useThemeColor(["background"]);

  const href = (name: string) => (visibleTabs.has(name) ? undefined : null);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      sceneContainerStyle={{ backgroundColor: background }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          href: href("index"),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: href("admin"),
          tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          href: href("reports"),
          tabBarIcon: ({ color, size }) => <Flag color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          href: href("explore"),
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          href: href("create"),
          tabBarIcon: ({ color, size }) => <Plus color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          href: href("notifications"),
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          href: href("profile"),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />

      {/* Accessible by navigation but not shown in tab bar */}
      <Tabs.Screen name="activity" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null }} />
    </Tabs>
  );
}
