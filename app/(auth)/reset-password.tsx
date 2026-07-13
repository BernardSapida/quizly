import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Button,
  Card,
  FieldError,
  Label,
  Spinner,
  TextField,
} from "heroui-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { z } from "zod";

type StrengthLevel = "weak" | "fair" | "strong" | "very-strong";

function getPasswordStrength(password: string): StrengthLevel {
  if (password.length < 8) return "weak";
  let score = 0;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;
  if (score <= 1) return "weak";
  if (score === 2) return "fair";
  if (score === 3) return "strong";
  return "very-strong";
}

const STRENGTH_CONFIG: Record<StrengthLevel, { label: string; bars: number; color: string }> = {
  weak: { label: "Weak", bars: 1, color: "#ef4444" },
  fair: { label: "Fair", bars: 2, color: "#f97316" },
  strong: { label: "Strong", bars: 3, color: "#22c55e" },
  "very-strong": { label: "Very strong", bars: 4, color: "#16a34a" },
};

function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null;
  const level = getPasswordStrength(password);
  const { label, bars, color } = STRENGTH_CONFIG[level];
  return (
    <View className="gap-1">
      <View className="flex-row gap-1">
        {[1, 2, 3, 4].map((n) => (
          <View
            key={n}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: n <= bars ? color : "#e5e7eb",
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 12, color }}>{label}</Text>
    </View>
  );
}

import { AlertDialog } from "@/components/ui/AlertDialog";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Screen } from "@/components/ui/Screen";
import { useResetPassword } from "@/features/auth/mutations";

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

type ResetPasswordForm = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { resetToken } = useLocalSearchParams<{ resetToken: string }>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const resetPassword = useResetPassword();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const newPasswordValue = watch("newPassword");

  const onSubmit = async (data: ResetPasswordForm) => {
    setServerError(null);
    try {
      await resetPassword.mutateAsync({
        resetToken: resetToken!,
        newPassword: data.newPassword,
      });
      setShowSuccess(true);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Reset failed. Your link may have expired."
      );
    }
  };

  return (
    <Screen>
      <AlertDialog
        isOpen={showSuccess}
        onOpenChange={setShowSuccess}
        title="Password reset"
        description="Your password has been reset successfully. You can now sign in with your new password."
        onConfirm={() => router.replace("/(auth)/sign-in")}
      />
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
                Set new password
              </Text>
              <Text className="text-muted text-sm text-center">
                Choose a strong password for your account.
              </Text>
            </View>
          </View>

          <Card>
            <Card.Header>
              <Card.Title>New password</Card.Title>
            </Card.Header>

            <Card.Body className="gap-4">
              <TextField isRequired isInvalid={!!errors.newPassword}>
                <Label>New password</Label>
                <Controller
                  control={control}
                  name="newPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <PasswordInput
                      placeholder="••••••••"
                      autoComplete="new-password"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors.newPassword && (
                  <FieldError>{errors.newPassword.message}</FieldError>
                )}
              </TextField>

              <PasswordStrengthIndicator password={newPasswordValue} />

              <TextField isRequired isInvalid={!!errors.confirmPassword}>
                <Label>Confirm new password</Label>
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <PasswordInput
                      placeholder="••••••••"
                      autoComplete="new-password"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors.confirmPassword && (
                  <FieldError>{errors.confirmPassword.message}</FieldError>
                )}
              </TextField>

              {serverError && (
                <Text className="text-sm text-danger text-center">
                  {serverError}
                </Text>
              )}
            </Card.Body>

            <Card.Footer className="mt-4">
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                isDisabled={isSubmitting}
                onPress={handleSubmit(onSubmit)}
              >
                {isSubmitting ? (
                  <Spinner size="sm" />
                ) : (
                  <Button.Label>Reset password</Button.Label>
                )}
              </Button>
            </Card.Footer>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
