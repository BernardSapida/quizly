import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "heroui-native";
import {
  Check,
  ChevronLeft,
  List,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "@/components/ui/Screen";
import { TermListSkeleton } from "@/components/ui/SkeletonLoader";
import { useConfirm } from "@/components/ui/useConfirm";
import { repo, type Term, type TermKind } from "@/db";
import { MIN_POOL_FOR_CHOICE } from "@/features/study/engine";
import { parseAnswers } from "@/features/study/grading";
import { useAsync } from "@/lib/use-async";
import { COLORS, SPACING } from "@/theme";

export default function TermEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  // The row to open the keyboard on — set to whatever "Add term" just created, so
  // adding a term lands you typing in it rather than staring at a new empty card.
  const [focusId, setFocusId] = useState<string | null>(null);

  const load = useCallback(() => repo.listTerms(id), [id]);
  const { data, loading, refetch } = useAsync(load);
  const terms = data ?? [];

  // `data` is null until the first read returns. Without this the editor renders its
  // empty state for the first frames — a lone "Add term" button on a set that
  // actually has 40 terms — and then the list pops in over it.
  const isLoading = loading && data === null;

  const addTerm = async () => {
    const newId = await repo.createTerm(id);
    setFocusId(newId);
    refetch();
  };

  const removeTerm = (term: Term, label: string, hasContent: boolean) => {
    const drop = async () => {
      await repo.deleteTerm(term.id);
      refetch();
    };

    // A blank row is a mistake being cleaned up, not work you could lose — asking
    // "are you sure?" about nothing is the kind of dialog people learn to tap through.
    if (!hasContent) {
      void drop();
      return;
    }

    confirm({
      title: "Delete this term?",
      description: label
        ? `"${label}" will be removed from this set. This cannot be undone.`
        : "This term will be removed from this set. This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
      onConfirm: drop,
    });
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* A compact title bar rather than a ScreenHeader: this is a working screen
            you leave as soon as you're done, so the terms get the vertical space. */}
        <View
          className="h-8 flex-row items-center justify-between my-4"
          style={{
            paddingHorizontal: SPACING.gutter,
            marginTop: SPACING.headerTop,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="-ml-1"
          >
            <ChevronLeft color={COLORS.dark.muted} size={26} />
          </Pressable>
          <Text className="text-app-text text-lg font-semibold">
            Edit terms
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Check color={COLORS.correct} size={24} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SPACING.gutter,
            paddingTop: SPACING.headerGap,
            gap: 12,
            paddingBottom: 120,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <TermListSkeleton count={5} />
          ) : (
            <>
              {terms.length > 0 && terms.length < MIN_POOL_FOR_CHOICE && (
                <View
                  className="rounded-xl p-3"
                  style={{ backgroundColor: COLORS.encourage + "22" }}
                >
                  <Text className="text-xs" style={{ color: COLORS.encourage }}>
                    Add at least {MIN_POOL_FOR_CHOICE} terms to unlock multiple
                    choice — the wrong options are drawn from the other cards in
                    this set.
                  </Text>
                </View>
              )}

              {terms.length === 0 ? (
                <EmptyTerms />
              ) : (
                <>
                  <Text className="text-app-muted text-xs font-semibold">
                    {terms.length} {terms.length === 1 ? "TERM" : "TERMS"}
                  </Text>
                  {terms.map((term, i) => (
                    <TermRow
                      key={term.id}
                      term={term}
                      index={i}
                      autoFocus={term.id === focusId}
                      onDelete={removeTerm}
                    />
                  ))}
                </>
              )}

              <Button variant="secondary" size="lg" onPress={addTerm}>
                <Button.Label>
                  <View className="flex-row items-center gap-2">
                    <Plus color={COLORS.brandTint} size={18} />
                    <Text
                      style={{ color: COLORS.brandTint }}
                      className="font-semibold"
                    >
                      Add term
                    </Text>
                  </View>
                </Button.Label>
              </Button>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {dialog}
    </Screen>
  );
}

/** Shown only once the read has actually come back empty — never while loading. */
function EmptyTerms() {
  return (
    <View className="items-center gap-3 py-14">
      <Pencil color={COLORS.roundIdle} size={48} />
      <Text className="text-app-text text-base font-semibold">
        No terms yet
      </Text>
      <Text className="text-app-muted px-4 text-center text-sm leading-5">
        Add your first card below. Everything you type saves itself — there is
        no save button to forget.
      </Text>
    </View>
  );
}

/**
 * Autosaves on blur. There is no save button and no way to lose work by backing
 * out — the most common way a note-taking UI betrays someone.
 */
function TermRow({
  term,
  index,
  autoFocus,
  onDelete,
}: {
  term: Term;
  index: number;
  autoFocus: boolean;
  onDelete: (term: Term, label: string, hasContent: boolean) => void;
}) {
  const [termText, setTermText] = useState(term.term);
  const [defText, setDefText] = useState(term.definition);
  const [kind, setKind] = useState<TermKind>(term.kind);
  const [items, setItems] = useState<string[]>(() => {
    const parsed = parseAnswers(term.answers);
    return parsed.length > 0 ? parsed : ["", ""];
  });

  const saveTerm = () => {
    if (termText !== term.term)
      void repo.updateTerm(term.id, { term: termText });
  };
  const saveDef = () => {
    if (defText !== term.definition)
      void repo.updateTerm(term.id, { definition: defText });
  };

  const saveItems = (next: string[]) => {
    setItems(next);
    void repo.updateTerm(term.id, {
      answers: next.map((i) => i.trim()).filter(Boolean),
    });
  };

  const toggleKind = () => {
    const next: TermKind = kind === "standard" ? "enumeration" : "standard";
    setKind(next);
    void repo.updateTerm(term.id, {
      kind: next,
      // Standard terms carry no answer list; enumeration ones need it seeded.
      answers:
        next === "enumeration"
          ? items.map((i) => i.trim()).filter(Boolean)
          : null,
    });
  };

  const remove = () => {
    const hasContent = Boolean(
      termText.trim() || defText.trim() || items.some((i) => i.trim()),
    );
    onDelete(term, termText.trim(), hasContent);
  };

  const isEnum = kind === "enumeration";

  return (
    <View className="gap-2 rounded-2xl border border-app-glassline bg-app-glass p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-app-muted text-xs font-semibold">
          {index + 1}
        </Text>
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={toggleKind}
            hitSlop={8}
            accessibilityRole="switch"
            accessibilityState={{ checked: isEnum }}
            accessibilityLabel="List answer"
            className="flex-row items-center gap-1 rounded-full px-2 py-1"
            style={{
              backgroundColor: isEnum ? COLORS.brand + "33" : "transparent",
            }}
          >
            <List color={isEnum ? COLORS.brand : COLORS.roundIdle} size={13} />
            <Text
              className="text-[10px] font-semibold"
              style={{ color: isEnum ? COLORS.brand : COLORS.roundIdle }}
            >
              LIST
            </Text>
          </Pressable>
          <Pressable
            onPress={remove}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Delete term ${index + 1}`}
          >
            <Trash2 color={COLORS.roundIdle} size={16} />
          </Pressable>
        </View>
      </View>

      <TextInput
        value={termText}
        onChangeText={setTermText}
        onBlur={saveTerm}
        autoFocus={autoFocus}
        placeholder={
          isEnum
            ? "Prompt — e.g. Types of retrievers"
            : "Term — e.g. Golden Retriever"
        }
        placeholderTextColor={COLORS.dark.muted}
        multiline
        className="border-b border-app-border pb-2 text-app-text font-semibold"
      />

      {isEnum ? (
        /* The gap Quizlet never filled: a real list answer, graded item by item
           and order-independently, instead of cramming the list into a definition. */
        <View className="gap-2 pt-1">
          <Text className="text-app-muted text-[10px] font-semibold">
            ANSWERS — ORDER DOESN&apos;T MATTER
          </Text>
          {items.map((item, i) => (
            <View key={i} className="flex-row items-start gap-2">
              <Text className="text-app-muted pt-2.5 text-xs">{i + 1}.</Text>
              <TextInput
                value={item}
                onChangeText={(text) => {
                  const next = [...items];
                  next[i] = text;
                  setItems(next);
                }}
                onBlur={() => saveItems(items)}
                placeholder="Golden Retriever"
                placeholderTextColor={COLORS.dark.muted}
                // Answers here run long — "Transport system (roads, airports, seaports…)"
                // — and a single-line input silently scrolled the text out of sight, so
                // you could not read back the answer you had written. Let them wrap.
                multiline
                className="flex-1 rounded-lg bg-app-base px-3 py-2 text-app-text"
              />
              {items.length > 2 && (
                <Pressable
                  onPress={() => saveItems(items.filter((_, j) => j !== i))}
                  hitSlop={8}
                  className="pt-2.5"
                  accessibilityRole="button"
                  accessibilityLabel={`Delete answer ${i + 1}`}
                >
                  <Trash2 color={COLORS.roundIdle} size={14} />
                </Pressable>
              )}
            </View>
          ))}
          <Pressable onPress={() => setItems([...items, ""])} hitSlop={8}>
            <Text
              className="text-xs font-semibold"
              style={{ color: COLORS.brand }}
            >
              + Add answer
            </Text>
          </Pressable>
        </View>
      ) : (
        <TextInput
          value={defText}
          onChangeText={setDefText}
          onBlur={saveDef}
          placeholder="Definition — e.g. Most known as a friendly family dog"
          placeholderTextColor={COLORS.dark.muted}
          multiline
          className="pt-1 text-app-text"
        />
      )}
    </View>
  );
}
