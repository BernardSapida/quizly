import { useLocalSearchParams } from "expo-router";
import { Card } from "heroui-native";
import { useCallback } from "react";
import {
  BackHandler,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";

import { Screen } from "@/components/ui/Screen";

const SUPPORT_EMAIL = "support@example.com";

export default function AccountLockedScreen() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  // Block Android back button — user cannot bypass this screen
  useFocusEffect(
    useCallback(() => {
      const handler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true
      );
      return () => handler.remove();
    }, [])
  );

  const openSupport = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Account%20Locked`);
  };

  return (
    <Screen>
      {/* Disable iOS swipe-to-go-back */}
      <Stack.Screen options={{ gestureEnabled: false }} />

      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingTop: 72,
          gap: 24,
          flexGrow: 1,
          justifyContent: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-4">
          <View className="w-20 h-20 rounded-full bg-danger-100 items-center justify-center">
            <Text className="text-4xl">🔒</Text>
          </View>
          <View className="items-center gap-2">
            <Text className="text-2xl font-bold text-foreground tracking-tight text-center">
              Account Locked
            </Text>
            <Text className="text-muted text-sm text-center">
              {reason
                ? reason
                : "Your account has been locked. Please contact support for assistance."}
            </Text>
          </View>
        </View>

        <Card variant="secondary">
          <Card.Header>
            <Card.Title>Need help?</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Description>
              Our support team can help you regain access to your account.
            </Card.Description>
          </Card.Body>
          <Card.Footer className="mt-4">
            <Pressable
              onPress={openSupport}
              className="flex-1 bg-accent rounded-xl py-3 items-center"
            >
              <Text className="text-accent-foreground font-semibold">
                Contact Support
              </Text>
            </Pressable>
          </Card.Footer>
        </Card>
      </ScrollView>
    </Screen>
  );
}
