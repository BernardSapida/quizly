import { Stack } from "expo-router";
import { useEffect } from "react";
import { Linking } from "react-native";
import { useUIStore } from "@/store";
import { validateDeepLink } from "@/lib/security/deep-link-validator";

export default function AuthLayout() {
  const { setPendingDeepLink } = useUIStore();

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url && validateDeepLink(url)) {
        setPendingDeepLink(url);
      }
    });
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
