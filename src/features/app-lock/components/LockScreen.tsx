import { Button } from "heroui-native";
import { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PinPad } from "@/features/app-lock/components/PinPad";
import {
  authenticateFingerprint,
  isFingerprintAvailable,
} from "@/features/app-lock/lib/biometric";
import {
  MAX_PIN_ATTEMPTS,
  PIN_LENGTH,
  recordFailedAttempt,
  resetPinAttempts,
  verifyPin,
} from "@/features/app-lock/lib/pin";
import { useLogout } from "@/features/auth/mutations";
import { useAuthStore, usePreferencesStore } from "@/store";

/**
 * Fullscreen lock overlay shown whenever the app is locked (cold start or
 * returning from the background). Unlocks via fingerprint (if enabled) or a
 * correct PIN; "Sign in instead" signs out as the escape hatch.
 */
export function LockScreen() {
  const insets = useSafeAreaInsets();
  const unlock = useAuthStore((s) => s.unlock);
  const biometricEnabled = usePreferencesStore((s) => s.biometricEnabled);
  const logout = useLogout();

  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);
  const [canUseFingerprint, setCanUseFingerprint] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const tryFingerprint = useCallback(async () => {
    const ok = await authenticateFingerprint("Unlock the app");
    if (ok) {
      await resetPinAttempts();
      unlock();
    }
  }, [unlock]);

  // On mount, see if fingerprint is usable and auto-prompt when enabled.
  useEffect(() => {
    let active = true;
    isFingerprintAvailable().then((available) => {
      if (!active) return;
      setCanUseFingerprint(available);
      if (available && biometricEnabled) tryFingerprint();
    });
    return () => {
      active = false;
    };
  }, [biometricEnabled, tryFingerprint]);

  const handleChange = async (next: string) => {
    setError(false);
    setEntry(next);
    if (next.length !== PIN_LENGTH) return;

    if (await verifyPin(next)) {
      await resetPinAttempts();
      unlock();
      return;
    }

    setError(true);
    setEntry("");
    const attempts = await recordFailedAttempt();
    const left = MAX_PIN_ATTEMPTS - attempts;
    if (left <= 0) {
      await resetPinAttempts();
      Alert.alert("Too many attempts", "Please sign in again.");
      logout();
    } else {
      setRemaining(left);
    }
  };

  return (
    <Modal animationType="fade" statusBarTranslucent visible>
      <View
        className="flex-1 bg-background"
        style={{
          paddingBottom: insets.bottom + 24,
          paddingTop: insets.top + 24,
        }}
      >
        <View className="flex-1 items-center justify-center gap-12 px-6">
          <View className="items-center gap-3">
            <Text className="text-xl font-semibold text-foreground">
              Enter passcode
            </Text>
            {remaining === null ? (
              <Text className="text-sm text-muted">Unlock to continue</Text>
            ) : (
              <Text className="text-sm text-danger">
                {`Incorrect passcode! You have ${remaining} ${
                  remaining === 1 ? "attempt" : "attempts"
                } left`}
              </Text>
            )}
          </View>

          <PinPad
            error={error}
            onBiometric={
              canUseFingerprint && biometricEnabled ? tryFingerprint : undefined
            }
            onChangeValue={handleChange}
            value={entry}
          />

          <Button onPress={() => logout()} variant="ghost">
            <Button.Label className="text-muted">Sign in instead</Button.Label>
          </Button>
        </View>
      </View>
    </Modal>
  );
}
