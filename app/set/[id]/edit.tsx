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
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { AddTermSheet, type AddTermSheetRef } from "@/components/ui/AddTermSheet";
import { Screen } from "@/components/ui/Screen";
import { TermListSkeleton } from "@/components/ui/SkeletonLoader";
import { useConfirm } from "@/components/ui/useConfirm";
import { useToast } from "@/components/ui/Toast";
import { repo, type Term, type TermKind } from "@/db";
import { MIN_POOL_FOR_CHOICE } from "@/features/study/engine";
import { parseAnswers } from "@/features/study/grading";
import { useAsync } from "@/lib/use-async";
import { COLORS, SPACING } from "@/theme";

export default function TermEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const toast = useToast();
  const addSheet = useRef<AddTermSheetRef>(null);

  // Every TermRow autosaves on blur, but leaving this screen — the header
  // buttons, a swipe-back, the Android hardware button — does not reliably blur
  // the focused input first, so the last edit could be silently dropped. Each row
  // registers a flush() here; we call them all before navigating away.
  const flushers = useRef(new Map<string, () => Promise<boolean>>());

  const registerFlush = useCallback(
    (termId: string, fn: (() => Promise<boolean>) | null) => {
      if (fn) flushers.current.set(termId, fn);
      else flushers.current.delete(termId);
    },
    [],
  );

  const flushAll = useCallback(async () => {
    const wrote = await Promise.all(
      [...flushers.current.values()].map((fn) => fn().catch(() => false)),
    );
    return wrote.some(Boolean);
  }, []);

  const leave = useCallback(async () => {
    const wrote = await flushAll();
    if (wrote) toast.show("Changes saved");
    router.back();
  }, [flushAll, router, toast]);

  // Safety net for the exits that skip `leave` — swipe-back and the hardware
  // button. The writes still land; only the toast is skipped on those paths.
  useEffect(() => {
    return () => {
      void flushAll();
    };
  }, [flushAll]);

  const load = useCallback(() => repo.listTerms(id), [id]);
  const { data, loading, refetch } = useAsync(load);
  const terms = data ?? [];

  // `data` is null until the first read returns. Without this the editor renders its
  // empty state for the first frames — a lone "Add term" button on a set that
  // actually has 40 terms — and then the list pops in over it.
  const isLoading = loading && data === null;

  const openAddSheet = () => {
    // Flush whatever row is being edited before the list refetches under it.
    void flushAll();
    addSheet.current?.present();
  };

  const onTermAdded = () => {
    refetch();
    toast.show("Term added");
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
          <Pressable onPress={leave} hitSlop={12} className="-ml-1">
            <ChevronLeft color={COLORS.dark.muted} size={26} />
          </Pressable>
          <Text className="text-app-text text-lg font-semibold">
            Edit terms
          </Text>
          <Pressable onPress={leave} hitSlop={12}>
            <Check color={COLORS.correct} size={24} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SPACING.gutter,
            paddingTop: SPACING.headerGap,
            gap: 12,
            paddingBottom: 24,
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
                      onDelete={removeTerm}
                      registerFlush={registerFlush}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* Pinned, so adding a term never means scrolling to the end of a long
            list first. Opens a bottom sheet rather than appending a blank card. */}
        <View
          style={{
            paddingHorizontal: SPACING.gutter,
            paddingTop: 10,
            paddingBottom: 14,
            borderTopWidth: 1,
            borderTopColor: COLORS.dark.border,
            backgroundColor: COLORS.dark.base,
          }}
        >
          <Button variant="primary" size="lg" onPress={openAddSheet}>
            <Button.Label>
              <View className="flex-row items-center gap-2">
                <Plus color="#FFFFFF" size={18} />
                <Text className="font-semibold" style={{ color: "#FFFFFF" }}>
                  Add term
                </Text>
              </View>
            </Button.Label>
          </Button>
        </View>
      </KeyboardAvoidingView>
      {dialog}
      <AddTermSheet ref={addSheet} setId={id} onAdded={onTermAdded} />
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

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Autosaves on blur, and — via the flush() it registers with the parent — again
 * when the screen is left, so the last edit is never lost to an exit that did not
 * blur the input first. There is no save button and no way to lose work by
 * backing out, the most common way a note-taking UI betrays someone.
 */
function TermRow({
  term,
  index,
  onDelete,
  registerFlush,
}: {
  term: Term;
  index: number;
  onDelete: (term: Term, label: string, hasContent: boolean) => void;
  registerFlush: (
    termId: string,
    fn: (() => Promise<boolean>) | null,
  ) => void;
}) {
  const [termText, setTermText] = useState(term.term);
  const [defText, setDefText] = useState(term.definition);
  const [kind, setKind] = useState<TermKind>(term.kind);
  const [items, setItems] = useState<string[]>(() => {
    const parsed = parseAnswers(term.answers);
    return parsed.length > 0 ? parsed : ["", ""];
  });

  // Current field values, readable synchronously from flush() — it can run
  // before a blur or re-render has propagated the newest keystroke into state.
  const latest = useRef({ termText, defText, kind, items });
  latest.current = { termText, defText, kind, items };

  // What is actually on disk for this row. Seeded from the loaded term and moved
  // forward on every write, so flush() only ever sends genuine diffs and is a
  // cheap no-op when nothing changed.
  const saved = useRef({
    term: term.term,
    definition: term.definition,
    kind: term.kind,
    answers: parseAnswers(term.answers),
  });

  // Persists everything that changed since the last write in a single UPDATE.
  // Returns whether it wrote. Safe to call from every onBlur and again on exit.
  const flush = useCallback(async (): Promise<boolean> => {
    const cur = latest.current;
    const patch: Parameters<typeof repo.updateTerm>[1] = {};

    if (cur.termText !== saved.current.term) patch.term = cur.termText;
    if (cur.defText !== saved.current.definition)
      patch.definition = cur.defText;
    if (cur.kind !== saved.current.kind) patch.kind = cur.kind;

    if (cur.kind === "enumeration") {
      const answers = cur.items.map((i) => i.trim()).filter(Boolean);
      if (!sameList(answers, saved.current.answers)) patch.answers = answers;
    } else if (saved.current.kind === "enumeration") {
      // Just switched away from a list — drop the now-stale answer JSON.
      patch.answers = null;
    }

    if (Object.keys(patch).length === 0) return false;

    await repo.updateTerm(term.id, patch);
    saved.current = {
      term: cur.termText,
      definition: cur.defText,
      kind: cur.kind,
      answers:
        patch.answers === undefined
          ? saved.current.answers
          : (patch.answers ?? []),
    };
    return true;
  }, [term.id]);

  useEffect(() => {
    registerFlush(term.id, flush);
    return () => registerFlush(term.id, null);
  }, [term.id, flush, registerFlush]);

  const saveField = () => {
    void flush();
  };

  const toggleKind = async () => {
    const next: TermKind = kind === "standard" ? "enumeration" : "standard";
    setKind(next);
    // Persist right away rather than waiting for flush: this toggles which study
    // modes the set unlocks, and there may be no blur before the user leaves.
    const answers =
      next === "enumeration"
        ? latest.current.items.map((i) => i.trim()).filter(Boolean)
        : null;
    // Keep the refs ahead of the pending re-render so a flush() racing this
    // write (e.g. from a fast navigate-away) does not send the old kind back.
    latest.current = { ...latest.current, kind: next };
    await repo.updateTerm(term.id, { kind: next, answers });
    saved.current = { ...saved.current, kind: next, answers: answers ?? [] };
  };

  const removeItem = (target: number) => {
    const next = items.filter((_, j) => j !== target);
    setItems(next);
    latest.current = { ...latest.current, items: next };
    const answers = next.map((i) => i.trim()).filter(Boolean);
    void repo.updateTerm(term.id, { answers });
    saved.current = { ...saved.current, answers };
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
        onBlur={saveField}
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
                onBlur={saveField}
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
                  onPress={() => removeItem(i)}
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
          onBlur={saveField}
          placeholder="Definition — e.g. Most known as a friendly family dog"
          placeholderTextColor={COLORS.dark.muted}
          multiline
          className="pt-1 text-app-text"
        />
      )}
    </View>
  );
}
