import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  FieldError,
  Label,
  Spinner,
  TextField,
} from "heroui-native";
import { TriangleAlert } from "lucide-react-native";
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

import { AlertDialog } from "@/components/ui/AlertDialog";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Screen } from "@/components/ui/Screen";
import { deleteAccount } from "@/features/auth/api";
import { useAuthStore } from "@/store";

const schema = z.object({
  password: z.string().min(8, "Minimum 8 characters"),
});

type DeleteAccountForm = z.infer<typeof schema>;

export default function DeleteAccountScreen() {
  const { token, clearAuth } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingData, setPendingData] = useState<DeleteAccountForm | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DeleteAccountForm>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" },
  });

  const onSubmit = (data: DeleteAccountForm) => {
    setPendingData(data);
    setShowConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingData) return;
    setServerError(null);
    const result = await deleteAccount(token!, { password: pendingData.password });
    if (!result) {
      setServerError("Incorrect password or deletion failed.");
      return;
    }
    setShowSuccess(true);
  };

  return (
    <Screen noTopInset>
      <AlertDialog
        isOpen={showConfirm}
        onOpenChange={setShowConfirm}
        title="Delete account"
        description="This is permanent and cannot be undone. Continue?"
        variant="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        showCancel
        onConfirm={handleDeleteConfirm}
      />
      <AlertDialog
        isOpen={showSuccess}
        onOpenChange={setShowSuccess}
        title="Account deleted"
        description="Your account has been permanently deleted."
        onConfirm={clearAuth}
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
          {/* Warning */}
          <Card variant="secondary">
            <Card.Body className="flex-row items-start gap-3">
              <TriangleAlert size={20} className="text-danger mt-0.5" />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground mb-1">
                  This action is permanent
                </Text>
                <Text className="text-sm text-muted leading-5">
                  Deleting your account removes all your data and cannot be
                  undone. Enter your password below to confirm.
                </Text>
              </View>
            </Card.Body>
          </Card>

          {/* Password confirmation */}
          <Card>
            <Card.Header>
              <Card.Title>Confirm deletion</Card.Title>
            </Card.Header>

            <Card.Body className="gap-4">
              <TextField isRequired isInvalid={!!errors.password}>
                <Label>Enter your password to confirm</Label>
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

              {serverError && (
                <Text className="text-sm text-danger text-center">
                  {serverError}
                </Text>
              )}
            </Card.Body>

            <Card.Footer className="mt-4 gap-3 flex-col">
              <Button
                variant="danger"
                size="lg"
                className="w-full"
                isDisabled={isSubmitting}
                onPress={handleSubmit(onSubmit)}
              >
                {isSubmitting ? (
                  <Spinner size="sm" />
                ) : (
                  <Button.Label>Delete my account</Button.Label>
                )}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                isDisabled={isSubmitting}
                onPress={() => router.back()}
              >
                <Button.Label>Cancel</Button.Label>
              </Button>
            </Card.Footer>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
