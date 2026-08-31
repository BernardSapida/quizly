import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUniwind } from "uniwind";
import { Button } from "heroui-native";
import { List, Trash2 } from "lucide-react-native";

import { repo, type TermKind } from "@/db";
import { COLORS, GLASS } from "@/theme";

export type AddTermSheetRef = { present: () => void };

type Props = {
  setId: string;
  /** Fired after each insert so the editor list behind the sheet can refetch. */
  onAdded: () => void;
};

const inputStyle = {
  color: COLORS.dark.text,
  backgroundColor: COLORS.dark.base,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: GLASS.border,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
};

/**
 * Add a term without leaving the top of the editor. The old flow appended an
 * empty card at the bottom of the list and scrolled you to it — unusable once a
 * set had thirty terms. This is reachable from a pinned button and never moves.
 *
 * "Add another" keeps the sheet open with the fields cleared, so entering a run
 * of terms is type-tab-add, type-tab-add, with no travel.
 */
export const AddTermSheet = forwardRef<AddTermSheetRef, Props>(
  function AddTermSheet({ setId, onAdded }, ref) {
    const sheet = useRef<BottomSheetModal>(null);
    const insets = useSafeAreaInsets();
    // Keep uniwind's className styling live inside the bottom sheet's portal.
    useUniwind();

    const [term, setTerm] = useState("");
    const [definition, setDefinition] = useState("");
    const [kind, setKind] = useState<TermKind>("standard");
    const [items, setItems] = useState<string[]>(["", ""]);
    const [busy, setBusy] = useState(false);

    const reset = useCallback(() => {
      setTerm("");
      setDefinition("");
      setKind("standard");
      setItems(["", ""]);
    }, []);

    useImperativeHandle(ref, () => ({
      present: () => {
        reset();
        sheet.current?.present();
      },
    }));

    const isEnum = kind === "enumeration";
    const answers = items.map((i) => i.trim()).filter(Boolean);
    const canAdd =
      !busy &&
      term.trim().length > 0 &&
      (isEnum ? answers.length > 0 : definition.trim().length > 0);

    const add = async (keepOpen: boolean) => {
      if (!canAdd) return;
      setBusy(true);
      await repo.createTerm(setId, {
        term: term.trim(),
        definition: isEnum ? "" : definition.trim(),
        kind,
        answers: isEnum ? answers : null,
      });
      setBusy(false);
      onAdded();
      if (keepOpen) reset();
      else sheet.current?.dismiss();
    };

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={sheet}
        enableDynamicSizing
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: COLORS.dark.surface }}
        handleIndicatorStyle={{ backgroundColor: COLORS.roundIdle }}
      >
        <BottomSheetView
          style={{
            paddingHorizontal: 20,
            paddingTop: 4,
            paddingBottom: insets.bottom + 16,
            gap: 14,
          }}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-app-text text-base font-semibold">
              {isEnum ? "New list question" : "New term"}
            </Text>
            <Pressable
              onPress={() => setKind(isEnum ? "standard" : "enumeration")}
              hitSlop={8}
              accessibilityRole="switch"
              accessibilityState={{ checked: isEnum }}
              accessibilityLabel="List answer"
              className="flex-row items-center gap-1 rounded-full px-2.5 py-1.5"
              style={{
                backgroundColor: isEnum ? COLORS.brand + "33" : GLASS.fill,
              }}
            >
              <List
                color={isEnum ? COLORS.brand : COLORS.roundIdle}
                size={13}
              />
              <Text
                className="text-[10px] font-semibold"
                style={{ color: isEnum ? COLORS.brand : COLORS.roundIdle }}
              >
                LIST
              </Text>
            </Pressable>
          </View>

          <BottomSheetTextInput
            value={term}
            onChangeText={setTerm}
            autoFocus
            placeholder={
              isEnum ? "Prompt — e.g. Types of retrievers" : "Term"
            }
            placeholderTextColor={COLORS.dark.muted}
            style={inputStyle}
          />

          {isEnum ? (
            <View className="gap-2">
              <Text className="text-app-muted text-[10px] font-semibold">
                ANSWERS — ORDER DOESN&apos;T MATTER
              </Text>
              {items.map((item, i) => (
                <View key={i} className="flex-row items-center gap-2">
                  <Text className="text-app-muted text-xs">{i + 1}.</Text>
                  <BottomSheetTextInput
                    value={item}
                    onChangeText={(text) => {
                      const next = [...items];
                      next[i] = text;
                      setItems(next);
                    }}
                    placeholder="Golden Retriever"
                    placeholderTextColor={COLORS.dark.muted}
                    style={[inputStyle, { flex: 1 }]}
                  />
                  {items.length > 2 && (
                    <Pressable
                      onPress={() => setItems(items.filter((_, j) => j !== i))}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove answer ${i + 1}`}
                    >
                      <Trash2 color={COLORS.roundIdle} size={14} />
                    </Pressable>
                  )}
                </View>
              ))}
              <Pressable
                onPress={() => setItems([...items, ""])}
                hitSlop={8}
                className="self-start"
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: COLORS.brand }}
                >
                  + Add answer
                </Text>
              </Pressable>
            </View>
          ) : (
            <BottomSheetTextInput
              value={definition}
              onChangeText={setDefinition}
              placeholder="Definition"
              placeholderTextColor={COLORS.dark.muted}
              multiline
              style={[inputStyle, { minHeight: 64 }]}
            />
          )}

          <View className="flex-row gap-3 pt-1">
            <View className="flex-1">
              <Button
                variant="secondary"
                size="lg"
                isDisabled={!canAdd}
                onPress={() => add(true)}
              >
                <Button.Label>Add another</Button.Label>
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="primary"
                size="lg"
                isDisabled={!canAdd}
                onPress={() => add(false)}
              >
                <Button.Label>Add &amp; close</Button.Label>
              </Button>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
