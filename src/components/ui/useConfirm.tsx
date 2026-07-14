import { useCallback, useState } from "react";

import { AlertDialog } from "./AlertDialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  /** Omit for a plain acknowledgement — the dialog then shows only "Okay". */
  onConfirm?: () => void;
};

/**
 * In-app confirmation, on HeroUI's Dialog rather than the OS `Alert.alert`.
 *
 * The native alert is styled by Android, not by us — it lands as a light-grey box
 * in the middle of a dark navy app and breaks the illusion completely. This keeps
 * every destructive prompt inside Quizly's own design.
 *
 * Usage:
 *   const { confirm, dialog } = useConfirm();
 *   ...
 *   confirm({ title: "Delete this set?", variant: "danger", onConfirm: doIt });
 *   return <Screen>{...}{dialog}</Screen>;
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => setOptions(next), []);

  const dialog = (
    <AlertDialog
      isOpen={options !== null}
      onOpenChange={(open) => {
        if (!open) setOptions(null);
      }}
      title={options?.title ?? ""}
      description={options?.description}
      variant={options?.variant ?? "default"}
      confirmLabel={options?.confirmLabel ?? (options?.onConfirm ? "Confirm" : "Okay")}
      cancelLabel={options?.cancelLabel ?? "Cancel"}
      // No handler means it is an acknowledgement, not a decision — hide Cancel.
      showCancel={!!options?.onConfirm}
      onConfirm={options?.onConfirm}
    />
  );

  return { confirm, dialog };
}
