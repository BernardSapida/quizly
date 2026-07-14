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
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "heroui-native";
import { Check, ChevronLeft, List, Plus, Trash2 } from "lucide-react-native";

import { repo, type Term, type TermKind } from "@/db";
import { MIN_POOL_FOR_CHOICE } from "@/features/study/engine";
import { parseAnswers } from "@/features/study/grading";
import { useAsync } from "@/lib/use-async";
import { Screen } from "@/components/ui/Screen";
import { COLORS, SPACING } from "@/theme";

export default function TermEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const load = useCallback(() => repo.listTerms(id), [id]);
  const { data, refetch } = useAsync(load);
  const terms = data ?? [];

  const addTerm = async () => {
    await repo.createTerm(id);
    refetch();
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
          className="h-8 flex-row items-center justify-between"
          style={{
            paddingHorizontal: SPACING.gutter,
            marginTop: SPACING.headerTop,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={12} className="-ml-1">
            <ChevronLeft color={COLORS.dark.muted} size={26} />
          </Pressable>
          <Text className="text-app-text text-lg font-semibold">Edit terms</Text>
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
        >
          {terms.length > 0 && terms.length < MIN_POOL_FOR_CHOICE && (
            <View
              className="rounded-xl p-3"
              style={{ backgroundColor: COLORS.encourage + "22" }}
            >
              <Text className="text-xs" style={{ color: COLORS.encourage }}>
                Add at least {MIN_POOL_FOR_CHOICE} terms to unlock multiple choice — the
                wrong options are drawn from the other cards in this set.
              </Text>
            </View>
          )}

          {terms.map((term, i) => (
            <TermRow
              key={term.id}
              term={term}
              index={i}
              onDeleted={refetch}
            />
          ))}

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
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/**
 * Autosaves on blur. There is no save button and no way to lose work by backing
 * out — the most common way a note-taking UI betrays someone.
 */
function TermRow({
  term,
  index,
  onDeleted,
}: {
  term: Term;
  index: number;
  onDeleted: () => void;
}) {
  const [termText, setTermText] = useState(term.term);
  const [defText, setDefText] = useState(term.definition);
  const [kind, setKind] = useState<TermKind>(term.kind);
  const [items, setItems] = useState<string[]>(() => {
    const parsed = parseAnswers(term.answers);
    return parsed.length > 0 ? parsed : ["", ""];
  });

  const saveTerm = () => {
    if (termText !== term.term) void repo.updateTerm(term.id, { term: termText });
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
      answers: next === "enumeration" ? items.map((i) => i.trim()).filter(Boolean) : null,
    });
  };

  const remove = async () => {
    await repo.deleteTerm(term.id);
    onDeleted();
  };

  const isEnum = kind === "enumeration";

  return (
    <View className="gap-2 rounded-2xl border border-app-glassline bg-app-glass p-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-app-muted text-xs font-semibold">{index + 1}</Text>
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={toggleKind}
            hitSlop={8}
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
          <Pressable onPress={remove} hitSlop={10}>
            <Trash2 color={COLORS.roundIdle} size={16} />
          </Pressable>
        </View>
      </View>

      <TextInput
        value={termText}
        onChangeText={setTermText}
        onBlur={saveTerm}
        placeholder={isEnum ? "Prompt — e.g. Types of retrievers" : "Term — e.g. Golden Retriever"}
        placeholderTextColor={COLORS.dark.muted}
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
            <View key={i} className="flex-row items-center gap-2">
              <Text className="text-app-muted text-xs">{i + 1}.</Text>
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
                className="flex-1 rounded-lg bg-app-base px-3 py-2 text-app-text"
              />
              {items.length > 2 && (
                <Pressable
                  onPress={() => saveItems(items.filter((_, j) => j !== i))}
                  hitSlop={8}
                >
                  <Trash2 color={COLORS.roundIdle} size={14} />
                </Pressable>
              )}
            </View>
          ))}
          <Pressable onPress={() => setItems([...items, ""])} hitSlop={8}>
            <Text className="text-xs font-semibold" style={{ color: COLORS.brand }}>
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
