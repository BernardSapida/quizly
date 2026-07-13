import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Card, Spinner } from "heroui-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "@/components/ui/Screen";
import { useForgotPassword, useVerifyOtp } from "@/features/auth/mutations";

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [serverError, setServerError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const verifyOtp = useVerifyOtp();
  const forgotPassword = useForgotPassword();

  const startTimer = useCallback(() => {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const handleChangeText = (text: string, index: number) => {
    // Handle paste: fill all slots
    if (text.length > 1) {
      const pasted = text.replace(/\D/g, "").slice(0, OTP_LENGTH);
      const newDigits = Array(OTP_LENGTH).fill("");
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const digit = text.replace(/\D/g, "");
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: { nativeEvent: { key: string } },
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otp = digits.join("");
    if (otp.length < OTP_LENGTH) return;
    setServerError(null);
    setIsSubmitting(true);
    try {
      const resetToken = await verifyOtp.mutateAsync({ email: email!, otp });
      router.push({
        pathname: "/(auth)/reset-password",
        params: { resetToken },
      });
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Invalid code. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setServerError(null);
    try {
      await forgotPassword.mutateAsync(email!);
      startTimer();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Could not resend code. Try again."
      );
    }
  };

  const otpFilled = digits.every((d) => d !== "");

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: 72, gap: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center gap-4">
            <View className="w-16 h-16 rounded-2xl bg-accent items-center justify-center">
              <Text className="text-accent-foreground text-3xl font-bold">Z</Text>
            </View>
            <View className="items-center gap-2">
              <Text className="text-2xl font-bold text-foreground tracking-tight">
                Check your email
              </Text>
              <Text className="text-muted text-sm text-center">
                We sent a 6-digit code to{" "}
                <Text className="text-foreground font-medium">{email}</Text>
              </Text>
            </View>
          </View>

          <Card>
            <Card.Header>
              <Card.Title>Enter OTP code</Card.Title>
            </Card.Header>

            <Card.Body className="gap-6">
              <View className="flex-row justify-between gap-2">
                {digits.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    value={digit}
                    onChangeText={(text) => handleChangeText(text, index)}
                    onKeyPress={(e) => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH}
                    selectTextOnFocus
                    style={[
                      styles.digitInput,
                      digit ? styles.digitInputFilled : styles.digitInputEmpty,
                    ]}
                  />
                ))}
              </View>

              {serverError && (
                <Text className="text-sm text-danger text-center">
                  {serverError}
                </Text>
              )}

              <View className="flex-row justify-center items-center gap-1">
                <Text className="text-sm text-muted">
                  Didn't receive a code?
                </Text>
                <Pressable onPress={handleResend} disabled={countdown > 0}>
                  <Text
                    className={`text-sm font-medium ${
                      countdown > 0 ? "text-default-400" : "text-accent"
                    }`}
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : "Resend"}
                  </Text>
                </Pressable>
              </View>
            </Card.Body>

            <Card.Footer className="mt-4">
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                isDisabled={!otpFilled || isSubmitting}
                onPress={handleVerify}
              >
                {isSubmitting ? (
                  <Spinner size="sm" />
                ) : (
                  <Button.Label>Verify code</Button.Label>
                )}
              </Button>
            </Card.Footer>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  digitInput: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "600",
  },
  digitInputEmpty: {
    borderColor: "#d1d5db",
  },
  digitInputFilled: {
    borderColor: "#6366f1",
  },
});
