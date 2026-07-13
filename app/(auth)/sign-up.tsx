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

import { PasswordInput } from "@/components/ui/PasswordInput";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Screen } from "@/components/ui/Screen";
import { AccountLockedError } from "@/features/auth";
import { useSignUp } from "@/features/auth/mutations";

const schema = z
  .object({
    firstname: z.string().min(1, "First name is required").max(50),
    lastname: z.string().min(1, "Last name is required").max(50),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

type SignUpForm = z.infer<typeof schema>;

export default function SignUpScreen() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const signUp = useSignUp();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstname: "",
      lastname: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignUpForm) => {
    setServerError(null);
    try {
      await signUp.mutateAsync({
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        password: data.password,
      });
      setShowSuccess(true);
    } catch (err) {
      if (err instanceof AccountLockedError) {
        router.replace({
          pathname: "/(auth)/account-locked",
          params: { reason: err.reason ?? "" },
        });
      } else {
        setServerError(
          err instanceof Error ? err.message : "Registration failed. Please try again."
        );
      }
    }
  };

  return (
    <Screen>
      <AlertDialog
        isOpen={showSuccess}
        onOpenChange={setShowSuccess}
        title="Account created"
        description="Welcome! Your account has been created successfully."
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
                Create account
              </Text>
              <Text className="text-muted text-sm">
                Sign up to get started
              </Text>
            </View>
          </View>

          <Card>
            <Card.Header>
              <View className="gap-1">
                <Card.Title>Sign up</Card.Title>
                <Card.Description>Fill in your details below</Card.Description>
              </View>
            </Card.Header>

            <Card.Body className="gap-4">
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <TextField isRequired isInvalid={!!errors.firstname}>
                    <Label>First name</Label>
                    <Controller
                      control={control}
                      name="firstname"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          placeholder="Juan"
                          autoComplete="given-name"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                        />
                      )}
                    />
                    {errors.firstname && (
                      <FieldError>{errors.firstname.message}</FieldError>
                    )}
                  </TextField>
                </View>
                <View className="flex-1">
                  <TextField isRequired isInvalid={!!errors.lastname}>
                    <Label>Last name</Label>
                    <Controller
                      control={control}
                      name="lastname"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <Input
                          placeholder="Dela Cruz"
                          autoComplete="family-name"
                          onBlur={onBlur}
                          onChangeText={onChange}
                          value={value}
                        />
                      )}
                    />
                    {errors.lastname && (
                      <FieldError>{errors.lastname.message}</FieldError>
                    )}
                  </TextField>
                </View>
              </View>

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

              <TextField isRequired isInvalid={!!errors.password}>
                <Label>Password</Label>
                <Controller
                  control={control}
                  name="password"
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
                {errors.password && (
                  <FieldError>{errors.password.message}</FieldError>
                )}
              </TextField>

              <TextField isRequired isInvalid={!!errors.confirmPassword}>
                <Label>Confirm password</Label>
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
                  <Button.Label>Create account</Button.Label>
                )}
              </Button>
              <View className="flex-row justify-center gap-1">
                <Text className="text-sm text-muted">
                  Already have an account?
                </Text>
                <Pressable onPress={() => router.back()}>
                  <Text className="text-sm text-accent font-medium">Sign in</Text>
                </Pressable>
              </View>
            </Card.Footer>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
