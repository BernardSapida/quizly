import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
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
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import { z } from "zod";

import { AlertDialog } from "@/components/ui/AlertDialog";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Screen } from "@/components/ui/Screen";
import { changePassword } from "@/features/auth/api";
import { useAuthStore } from "@/store";

const schema = z
  .object({
    currentPassword: z.string().min(8, "Minimum 8 characters"),
    newPassword: z.string().min(8, "Minimum 8 characters").max(128),
    confirmPassword: z.string().min(8, "Minimum 8 characters"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordForm = z.infer<typeof schema>;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ChangePasswordForm) => {
    setServerError(null);
    const result = await changePassword(token!, {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    if (!result) {
      setServerError("Current password is incorrect.");
      return;
    }
    reset();
    setShowSuccess(true);
  };

  return (
    <Screen noTopInset>
      <AlertDialog
        isOpen={showSuccess}
        onOpenChange={setShowSuccess}
        title="Password changed"
        description="Your password has been updated successfully."
        onConfirm={() => router.back()}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, gap: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card>
            <Card.Header>
              <Card.Title>Change Password</Card.Title>
              <Card.Description>
                Enter your current password to set a new one
              </Card.Description>
            </Card.Header>

            <Card.Body className="gap-4">
              <TextField isRequired isInvalid={!!errors.currentPassword}>
                <Label>Current password</Label>
                <Controller
                  control={control}
                  name="currentPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <PasswordInput
                      placeholder="••••••••"
                      autoComplete="password"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors.currentPassword && (
                  <FieldError>{errors.currentPassword.message}</FieldError>
                )}
              </TextField>

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
                  <Button.Label>Change password</Button.Label>
                )}
              </Button>
            </Card.Footer>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
