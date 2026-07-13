import * as Notifications from "expo-notifications";
import { Bell } from "lucide-react-native";
import { Button, Card } from "heroui-native";
import { useThemeColor } from "heroui-native";
import { useEffect } from "react";
import { Modal, Platform, Text, View } from "react-native";

import { usePreferencesStore } from "@/store";

type Props = {
  visible: boolean;
  onDone: () => void;
};

export function NotificationPermissionPrimer({ visible, onDone }: Props) {
  const { hasSeenNotificationPrimer, setHasSeenNotificationPrimer } =
    usePreferencesStore();
  const [accent] = useThemeColor(["accent"]);

  // Skip immediately if already seen, not Android, or already granted
  useEffect(() => {
    if (!visible) return;

    if (hasSeenNotificationPrimer || Platform.OS !== "android") {
      onDone();
      return;
    }

    Notifications.getPermissionsAsync().then(({ granted }) => {
      if (granted) {
        setHasSeenNotificationPrimer(true);
        onDone();
      }
    });
  }, [visible]);

  const handleAllow = async () => {
    await Notifications.requestPermissionsAsync();
    setHasSeenNotificationPrimer(true);
    onDone();
  };

  const handleNotNow = () => {
    setHasSeenNotificationPrimer(true);
    onDone();
  };

  const shouldRender =
    visible && !hasSeenNotificationPrimer && Platform.OS === "android";

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="fade"
      onRequestClose={handleNotNow}
    >
      <View className="flex-1 justify-end bg-black/60">
        <Card className="m-4 mb-8">
          <Card.Body className="items-center gap-4 py-6 px-4">
            <View className="w-16 h-16 rounded-2xl bg-accent items-center justify-center">
              <Bell size={28} color={accent} />
            </View>
            <View className="items-center gap-2">
              <Text className="text-lg font-bold text-foreground text-center">
                Stay in the loop
              </Text>
              <Text className="text-sm text-default-500 text-center leading-5">
                Allow notifications to get real-time updates. You can change
                this anytime in Settings.
              </Text>
            </View>
            <View className="w-full gap-3 mt-2">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onPress={handleAllow}
              >
                <Button.Label>Allow notifications</Button.Label>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onPress={handleNotNow}
              >
                <Button.Label>Not now</Button.Label>
              </Button>
            </View>
          </Card.Body>
        </Card>
      </View>
    </Modal>
  );
}
