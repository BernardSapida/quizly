import { zodResolver } from "@hookform/resolvers/zod";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Button,
  Card,
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
} from "heroui-native";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { z } from "zod";

import { PasswordInput } from "@/components/ui/PasswordInput";
import { Screen } from "@/components/ui/Screen";
import { AccountLockedError } from "@/features/auth";
import { useSignIn } from "@/features/auth/mutations";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInForm = z.infer<typeof schema>;

export default function SignInScreen() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);
  const signIn = useSignIn();

  useFocusEffect(
    useCallback(() => {
      const handler = BackHandler.addEventListener("hardwareBackPress", () => {
        BackHandler.exitApp();
        return true;
      });
      return () => handler.remove();
    }, [])
  );

  const ping = async () => {
    setPinging(true);
    setPingResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/auth/get-session`,
        { signal: controller.signal }
      );
      setPingResult(`${res.status} — server reachable!`);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setPingResult("FAILED: timed out after 5s");
      } else {
        setPingResult(`FAILED: ${e instanceof Error ? e.message : String(e)}`);
      }
    } finally {
      clearTimeout(timeout);
      setPinging(false);
    }
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: SignInForm) => {
    setServerError(null);
    try {
      await signIn.mutateAsync({ email: data.email, password: data.password });
      // AuthGate detects session and redirects
    } catch (err) {
      if (err instanceof AccountLockedError) {
        router.replace({
          pathname: "/(auth)/account-locked",
          params: { reason: err.reason ?? "" },
        });
      } else {
        setServerError(
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        );
      }
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
          {/* Logo mark */}
          <View className="items-center gap-4">
            <View className="w-16 h-16 rounded-2xl bg-accent items-center justify-center">
              <Text className="text-accent-foreground text-3xl font-bold">Z</Text>
            </View>
            <View className="items-center gap-2">
              <Text className="text-2xl font-bold text-foreground tracking-tight">
                My App
              </Text>
              <Text className="text-muted text-sm">
                Track your money, live your life
              </Text>
            </View>
          </View>

          {/* Sign-in card */}
          <Card>
            <Card.Header>
              <View className="gap-1">
                <Card.Title>Welcome back</Card.Title>
                <Card.Description>Sign in to your account</Card.Description>
              </View>
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

              <TextField isRequired isInvalid={!!errors.password}>
                <Label>Password</Label>
                <Controller
                  control={control}
                  name="password"
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
                {errors.password && (
                  <FieldError>{errors.password.message}</FieldError>
                )}
              </TextField>

              <Pressable
                onPress={() => router.push("/(auth)/forgot-password")}
                className="self-end"
              >
                <Text className="text-sm text-accent">Forgot password?</Text>
              </Pressable>

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
                  <Button.Label>Sign in</Button.Label>
                )}
              </Button>
              <View className="flex-row justify-center gap-1">
                <Text className="text-sm text-muted">
                  Don't have an account?
                </Text>
                <Pressable onPress={() => router.push("/(auth)/sign-up")}>
                  <Text className="text-sm text-accent font-medium">Sign up</Text>
                </Pressable>
              </View>
            </Card.Footer>
          </Card>

          {/* Dev: server ping — never ships in production */}
          {__DEV__ && (
            <Card variant="tertiary">
              <Card.Header>
                <Card.Title>Server ping</Card.Title>
                <Card.Description>
                  {process.env.EXPO_PUBLIC_API_URL}
                </Card.Description>
              </Card.Header>
              <Card.Footer className="mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  isDisabled={pinging}
                  onPress={ping}
                >
                  {pinging ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Button.Label>Ping server</Button.Label>
                  )}
                </Button>
              </Card.Footer>
              {pingResult && (
                <Card.Body>
                  <Text
                    className={
                      pingResult.startsWith("FAILED")
                        ? "text-danger text-sm"
                        : "text-success text-sm"
                    }
                  >
                    {pingResult}
                  </Text>
                </Card.Body>
              )}
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
