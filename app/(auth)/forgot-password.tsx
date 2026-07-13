import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import {
  Button,
  Card,
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
} from "heroui-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { z } from "zod";

import { Screen } from "@/components/ui/Screen";
import { useForgotPassword } from "@/features/auth/mutations";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

type ForgotPasswordForm = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const forgotPassword = useForgotPassword();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setServerError(null);
    try {
      await forgotPassword.mutateAsync(data.email);
      router.push({ pathname: "/(auth)/otp", params: { email: data.email } });
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Could not send reset email. Try again."
      );
    }
  };

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
                Forgot password?
              </Text>
              <Text className="text-muted text-sm text-center">
                Enter your email and we'll send you a code to reset your password.
              </Text>
            </View>
          </View>

          <Card>
            <Card.Header>
              <Card.Title>Reset password</Card.Title>
            </Card.Header>

            <Card.Body className="gap-4">
              <TextField isRequired isInvalid={!!errors.email}>
                <Label>Email</Label>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      placeholder="you@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors.email && (
                  <FieldError>{errors.email.message}</FieldError>
                )}
              </TextField>

              {serverError && (
                <Text className="text-sm text-danger text-center">
                  {serverError}
                </Text>
              )}
            </Card.Body>

            <Card.Footer className="flex-col gap-3 mt-4">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                isDisabled={isSubmitting}
                onPress={handleSubmit(onSubmit)}
              >
                {isSubmitting ? (
                  <Spinner size="sm" />
                ) : (
                  <Button.Label>Send reset code</Button.Label>
                )}
              </Button>
              <Pressable onPress={() => router.back()} className="self-center">
                <Text className="text-sm text-accent font-medium">
                  Back to sign in
                </Text>
              </Pressable>
            </Card.Footer>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
