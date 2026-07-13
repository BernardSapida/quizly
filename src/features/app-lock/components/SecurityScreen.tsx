import { useFocusEffect } from "expo-router";
import { Button, Card, Switch, useThemeColor } from "heroui-native";
import {
  ChevronRight,
  FingerprintPattern,
  KeyRound,
  ShieldCheck,
  Trash2,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen } from "@/components/ui/Screen";
import { PinPad } from "@/features/app-lock/components/PinPad";
import {
  authenticateFingerprint,
  isFingerprintAvailable,
} from "@/features/app-lock/lib/biometric";
import {
  clearPin,
  isPinSet,
  PIN_LENGTH,
  setPin,
  verifyPin,
} from "@/features/app-lock/lib/pin";
import { useAuthStore, usePreferencesStore } from "@/store";

type Mode = "menu" | "create" | "confirm" | "verify";
type PendingAction = "change" | "remove" | null;

type MenuRowProps = {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
  chevron?: boolean;
  right?: React.ReactNode;
};

function MenuRow({
  label,
  icon,
  onPress,
  destructive,
  chevron = true,
  right,
}: MenuRowProps) {
  const [muted] = useThemeColor(["muted"]);
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-4 px-1"
      style={({ pressed }) => ({ minHeight: 56, opacity: pressed ? 0.6 : 1 })}
    >
      <View className="w-8 items-center">{icon}</View>
      <Text
        className={`flex-1 text-base ${
          destructive ? "text-danger" : "text-foreground"
        }`}
      >
        {label}
      </Text>
      {right ?? (chevron && <ChevronRight size={18} color={muted} />)}
    </Pressable>
  );
}

export function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const [accent, danger, muted] = useThemeColor([
    "accent",
    "danger",
    "muted",
  ]);
  const { biometricEnabled, setBiometricEnabled } = usePreferencesStore();
  const { setPinEnabled, unlock } = useAuthStore();

  const [pinSet, setPinSet] = useState(false);
  const [fingerprintAvailable, setFingerprintAvailable] = useState(false);

  const [mode, setMode] = useState<Mode>("menu");
  const [pending, setPending] = useState<PendingAction>(null);
  const [entry, setEntry] = useState("");
  const [firstEntry, setFirstEntry] = useState("");
  const [error, setError] = useState(false);

  const refreshStatus = useCallback(() => {
    isPinSet().then(setPinSet);
    isFingerprintAvailable().then(setFingerprintAvailable);
  }, []);

  useFocusEffect(refreshStatus);

  const resetFlow = () => {
    setMode("menu");
    setPending(null);
    setEntry("");
    setFirstEntry("");
    setError(false);
  };

  // ---- PIN entry flows -----------------------------------------------------

  const startSetup = () => {
    setMode("create");
    setEntry("");
    setFirstEntry("");
    setError(false);
  };

  const startVerify = (action: PendingAction) => {
    setPending(action);
    setMode("verify");
    setEntry("");
    setError(false);
  };

  const handleEntryChange = async (next: string) => {
    setError(false);
    setEntry(next);
    if (next.length !== PIN_LENGTH) return;

    if (mode === "create") {
      setFirstEntry(next);
      setEntry("");
      setMode("confirm");
      return;
    }

    if (mode === "confirm") {
      if (next === firstEntry) {
        await setPin(next);
        setPinSet(true);
        setPinEnabled(true);
        resetFlow();
        Alert.alert(
          "Passcode set",
          "The app will ask for your passcode each time you open it.",
        );
      } else {
        setError(true);
        setEntry("");
        setFirstEntry("");
        setMode("create");
        Alert.alert("Passcodes did not match", "Please try again.");
      }
      return;
    }

    if (mode === "verify") {
      const ok = await verifyPin(next);
      if (!ok) {
        setError(true);
        setEntry("");
        return;
      }
      if (pending === "remove") {
        await clearPin();
        setBiometricEnabled(false);
        setPinEnabled(false);
        unlock();
        setPinSet(false);
        resetFlow();
        Alert.alert(
          "Passcode removed",
          "The app will no longer ask for a passcode.",
        );
      } else {
        // change → go straight into creating a new PIN
        setPending(null);
        startSetup();
      }
    }
  };

  // ---- Biometric toggle ----------------------------------------------------

  const handleBiometricToggle = async (value: boolean) => {
    if (!value) {
      setBiometricEnabled(false);
      return;
    }
    if (!fingerprintAvailable) {
      Alert.alert(
        "Fingerprint unavailable",
        "Enroll a fingerprint in your device settings first.",
      );
      return;
    }
    if (!pinSet) {
      Alert.alert(
        "Set up a passcode first",
        "Fingerprint needs a passcode as a backup.",
      );
      return;
    }
    const ok = await authenticateFingerprint("Enable fingerprint unlock");
    if (ok) {
      setBiometricEnabled(true);
      Alert.alert(
        "Fingerprint enabled",
        "You can now unlock the app with your fingerprint.",
      );
    } else {
      Alert.alert(
        "Could not verify",
        "Fingerprint check was cancelled or failed.",
      );
    }
  };

  // ---- Render --------------------------------------------------------------

  const inFlow = mode !== "menu";
  const flowTitle =
    mode === "create"
      ? pinSet
        ? "Enter a new passcode"
        : "Create a passcode"
      : mode === "confirm"
        ? "Confirm your passcode"
        : pending === "remove"
          ? "Enter passcode to remove"
          : "Enter current passcode";

  return (
    <>
      {/* Fullscreen PIN entry — a native Modal sits above the header & tab bar. */}
      <Modal
        animationType="fade"
        onRequestClose={resetFlow}
        statusBarTranslucent
        visible={inFlow}
      >
        <View
          className="flex-1 bg-background"
          style={{ paddingBottom: insets.bottom + 24, paddingTop: insets.top }}
        >
          <View className="flex-1 items-center justify-center gap-12 px-6">
            <View className="items-center gap-2">
              <Text className="text-xl font-semibold text-foreground">
                {flowTitle}
              </Text>
              <Text className="text-base text-muted">
                {`Enter your ${PIN_LENGTH}-digit passcode`}
              </Text>
            </View>
            <PinPad
              error={error}
              onChangeValue={handleEntryChange}
              value={entry}
            />
            <Button className="w-full" onPress={resetFlow} variant="outline">
              <Button.Label>Cancel</Button.Label>
            </Button>
          </View>
        </View>
      </Modal>

      <Screen noTopInset>
        <ScrollView
          contentContainerStyle={{ gap: 20, padding: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* PIN */}
          <View className="gap-2">
            <Text className="text-sm font-medium text-muted px-1">
              App Lock Passcode
            </Text>
            <Card>
              <Card.Body className="px-4 py-0">
                {pinSet ? (
                  <>
                    <MenuRow
                      icon={<KeyRound color={accent} size={18} />}
                      label="Change Passcode"
                      onPress={() => startVerify("change")}
                    />
                    <View className="h-px bg-border" />
                    <MenuRow
                      destructive
                      icon={<Trash2 color={danger} size={18} />}
                      label="Remove Passcode"
                      onPress={() => startVerify("remove")}
                    />
                  </>
                ) : (
                  <MenuRow
                    icon={<ShieldCheck color={accent} size={18} />}
                    label="Set Up Passcode"
                    onPress={startSetup}
                  />
                )}
              </Card.Body>
            </Card>
            <Text className="text-xs text-muted px-1">
              A 6-digit passcode to unlock the app.
            </Text>
          </View>

          {/* Fingerprint */}
          <View className="gap-2">
            <Text className="text-sm font-medium text-muted px-1">
              Fingerprint Unlock
            </Text>
            <Card>
              <Card.Body className="px-4 py-0">
                <MenuRow
                  chevron={false}
                  icon={
                    <FingerprintPattern
                      color={fingerprintAvailable ? accent : muted}
                      size={18}
                    />
                  }
                  label="Fingerprint"
                  onPress={() => handleBiometricToggle(!biometricEnabled)}
                  right={
                    <Switch
                      isDisabled={!fingerprintAvailable || !pinSet}
                      isSelected={biometricEnabled}
                      onSelectedChange={handleBiometricToggle}
                    />
                  }
                />
              </Card.Body>
            </Card>
            <Text className="text-xs text-muted px-1">
              {fingerprintAvailable
                ? "Scan your fingerprint to unlock, falling back to your passcode."
                : "No fingerprint is enrolled on this device."}
            </Text>
          </View>
        </ScrollView>
      </Screen>
    </>
  );
}
