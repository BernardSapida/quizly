import { Button, useThemeColor } from "heroui-native";
import { ArrowLeft, FingerprintPattern } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Animated, View } from "react-native";

import { PIN_LENGTH } from "@/features/app-lock/lib/pin";

type PinPadProps = {
  value: string;
  onChangeValue: (next: string) => void;
  length?: number;
  /** When true, the dots flash red and shake (e.g. wrong PIN / mismatch). */
  error?: boolean;
  /** When provided, a fingerprint key is shown in the bottom-left cell. */
  onBiometric?: () => void;
};

const ROWS: string[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["bio", "0", "del"],
];

export function PinPad({
  value,
  onChangeValue,
  length = PIN_LENGTH,
  error = false,
  onBiometric,
}: PinPadProps) {
  const [accent, muted, danger, foreground] = useThemeColor([
    "accent",
    "muted",
    "danger",
    "foreground",
  ] as const);
  const [shake] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!error) return;
    Animated.sequence([
      Animated.timing(shake, {
        duration: 50,
        toValue: 10,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        duration: 50,
        toValue: -10,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        duration: 50,
        toValue: 6,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        duration: 50,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [error, shake]);

  const press = (key: string) => {
    if (key === "del") {
      onChangeValue(value.slice(0, -1));
      return;
    }
    if (key === "" || key === "bio" || value.length >= length) return;
    onChangeValue(value + key);
  };

  const renderKey = (key: string) => {
    if (key === "bio") {
      if (!onBiometric) return <View key="bio" style={KEY_SIZE} />;
      return (
        <Button
          className="rounded-full"
          key="bio"
          onPress={onBiometric}
          style={KEY_SIZE}
          variant="ghost"
        >
          <FingerprintPattern color={foreground} size={30} />
        </Button>
      );
    }

    return (
      <Button
        className="rounded-full"
        key={key}
        onPress={() => press(key)}
        style={KEY_SIZE}
        variant="ghost"
      >
        {key === "del" ? (
          <ArrowLeft color={foreground} size={30} />
        ) : (
          <Button.Label className="text-4xl font-light text-foreground">
            {key}
          </Button.Label>
        )}
      </Button>
    );
  };

  return (
    <View className="items-center gap-14">
      {/* Dots */}
      <Animated.View
        className="flex-row gap-5"
        style={{ transform: [{ translateX: shake }] }}
      >
        {Array.from({ length }, (_, i) => `dot-${i}`).map((id, i) => {
          const filled = i < value.length;
          return (
            <View
              key={id}
              style={{
                backgroundColor: filled
                  ? error
                    ? danger
                    : accent
                  : muted,
                borderRadius: 9,
                height: 18,
                opacity: filled ? 1 : 0.4,
                width: 18,
              }}
            />
          );
        })}
      </Animated.View>

      {/* Keypad */}
      <View className="gap-6" style={{ width: 300 }}>
        {ROWS.map((row) => (
          <View className="flex-row justify-between" key={row.join("")}>
            {row.map(renderKey)}
          </View>
        ))}
      </View>
    </View>
  );
}

const KEY_SIZE = { height: 80, width: 80 } as const;
