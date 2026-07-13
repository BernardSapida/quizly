import { Button, Dialog } from "heroui-native";
import { View } from "react-native";
import { useUniwind } from "uniwind";

type AlertDialogVariant = "default" | "danger";

interface AlertDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: AlertDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
}

export function AlertDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  variant = "default",
  confirmLabel = "Okay",
  cancelLabel = "Cancel",
  onConfirm,
  showCancel = false,
}: AlertDialogProps) {
  // Subscribe to theme changes so the Portal children update when theme switches.
  // Without this, dialogs rendered in FullWindowOverlay (iOS) stay on the old theme.
  useUniwind();

  const handleConfirm = () => {
    onOpenChange(false);
    setTimeout(() => {
      onConfirm?.();
    }, 300);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          isCloseOnPress={!showCancel}
          className="bg-black/50"
        />
        <Dialog.Content
          isSwipeable={false}
          className="mx-6 rounded-2xl bg-background p-6 gap-3"
        >
          <Dialog.Title className="text-lg font-semibold text-foreground">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="text-sm text-muted leading-5">
              {description}
            </Dialog.Description>
          )}
          <View className="flex-row gap-3 mt-2">
            {showCancel && (
              <Button
                variant="ghost"
                size="md"
                className="flex-1"
                onPress={handleCancel}
              >
                <Button.Label>{cancelLabel}</Button.Label>
              </Button>
            )}
            <Button
              variant={variant === "danger" ? "danger" : "primary"}
              size="md"
              className="flex-1"
              onPress={handleConfirm}
            >
              <Button.Label>{confirmLabel}</Button.Label>
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
