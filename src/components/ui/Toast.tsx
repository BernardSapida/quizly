import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Check } from "lucide-react-native";

import { COLORS, GLASS } from "@/theme";

/**
 * A single, transient confirmation banner — "Changes saved", "Set created".
 *
 * Deliberately minimal: one toast at a time (a new one replaces the current),
 * auto-dismisses, tap to dismiss early. It is a reassurance, not a queue of
 * notifications, so there is nothing to stack.
 */
type ToastContextValue = {
  show: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VISIBLE_MS = 2200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null,
  );
  const nextId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const show = useCallback(
    (message: string) => {
      clearTimer();
      // A fresh id every time so re-showing the same text still remounts the
      // banner and replays its entrance.
      nextId.current += 1;
      setToast({ id: nextId.current, message });
      timer.current = setTimeout(() => setToast(null), VISIBLE_MS);
    },
    [clearTimer],
  );

  useEffect(() => clearTimer, [clearTimer]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <ToastBanner
          key={toast.id}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </ToastContext.Provider>
  );
}

function ToastBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(1, { duration: 200 }));
  }, [progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * -12 }],
  }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: "absolute",
          top: insets.top + 8,
          left: 0,
          right: 0,
          alignItems: "center",
        },
        animated,
      ]}
    >
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        className="flex-row items-center gap-2 rounded-full px-4 py-2.5"
        style={{
          backgroundColor: COLORS.dark.surface2,
          borderWidth: 1,
          borderColor: GLASS.border,
        }}
      >
        <Check color={COLORS.correct} size={16} />
        <Text className="text-app-text text-sm font-semibold">{message}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
