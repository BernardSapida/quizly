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
  ScrollView,
  Text,
} from "react-native";
import { z } from "zod";

import { AlertDialog } from "@/components/ui/AlertDialog";
import { Screen } from "@/components/ui/Screen";
import { updateProfile } from "@/features/auth/api";
import { useAuthStore } from "@/store";

const schema = z.object({
  firstname: z.string().min(1, "Required").max(50),
  lastname: z.string().min(1, "Required").max(50),
});

type EditProfileForm = z.infer<typeof schema>;

export default function EditProfileScreen() {
  const router = useRouter();
  const { session, token, setAuth } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstname: session?.user.firstname ?? "",
      lastname: session?.user.lastname ?? "",
    },
  });

  const onSubmit = async (data: EditProfileForm) => {
    setServerError(null);
    try {
      const result = await updateProfile(token!, data);
      if (!result) {
        setServerError("Could not update profile. Try again.");
        return;
      }
      setAuth({ user: { ...session!.user, ...data } }, token!);
      setShowSuccess(true);
    } catch {
      setServerError("Could not update profile. Try again.");
    }
  };

  return (
    <Screen noTopInset>
      <AlertDialog
        isOpen={showSuccess}
        onOpenChange={setShowSuccess}
        title="Profile updated"
        description="Your profile has been saved successfully."
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
              <Card.Title>Edit Profile</Card.Title>
              <Card.Description>Update your display name</Card.Description>
            </Card.Header>

            <Card.Body className="gap-4">
              {/* Email (read-only) */}
              <TextField isDisabled>
                <Label>Email</Label>
                <Input value={session?.user.email} />
              </TextField>

              <TextField isRequired isInvalid={!!errors.firstname}>
                <Label>First name</Label>
                <Controller
                  control={control}
                  name="firstname"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      placeholder="Juan"
                      autoCapitalize="words"
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

              <TextField isRequired isInvalid={!!errors.lastname}>
                <Label>Last name</Label>
                <Controller
                  control={control}
                  name="lastname"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      placeholder="Dela Cruz"
                      autoCapitalize="words"
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
                  <Button.Label>Save changes</Button.Label>
                )}
              </Button>
            </Card.Footer>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
