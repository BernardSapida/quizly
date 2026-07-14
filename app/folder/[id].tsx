import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "heroui-native";
import { Plus, Share2, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { SetCard } from "@/components/ui/Cards";
import { ModeProgress } from "@/components/ui/ModeProgress";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useConfirm } from "@/components/ui/useConfirm";
import { repo } from "@/db";
import { shareExport } from "@/features/share/transfer";
import { MIN_POOL_FOR_CHOICE } from "@/features/study/engine";
import { useAsync } from "@/lib/use-async";
import { COLORS, SPACING } from "@/theme";

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const load = useCallback(
    async () => ({
      folder: await repo.getFolder(id),
      sets: await repo.listSetsInFolder(id),
    }),
    [id],
  );
  const { data, refetch } = useAsync(load);

  const folder = data?.folder;
  const sets = data?.sets ?? [];
  if (!folder) return <Screen />;

  const total = folder.term_count;
  const canChoice = total >= MIN_POOL_FOR_CHOICE;

  const addLesson = async () => {
    if (!newName.trim()) return;
    const setId = await repo.createSet(newName.trim(), id);
    setNewName("");
    setAdding(false);
    router.push(`/set/${setId}/edit`);
  };

  /** Bundles every lesson in the folder into one file. */
  const onExport = async () => {
    const result = await shareExport({ folderId: id }, folder.name);
    if (!result.shared && result.reason) {
      confirm({ title: "Can't export", description: result.reason });
    }
  };

  const confirmDelete = () => {
    confirm({
      title: "Delete this folder?",
      description: `The ${folder.set_count} lesson${folder.set_count === 1 ? "" : "s"} inside will NOT be deleted — they move back to your Home.`,
      confirmLabel: "Delete folder",
      variant: "danger",
      onConfirm: async () => {
        await repo.deleteFolder(id);
        router.back();
      },
    });
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SPACING.gutter,
          paddingTop: SPACING.headerTop,
          paddingBottom: 40,
          gap: SPACING.headerGap,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={folder.name}
          subtitle={`${folder.set_count} ${
            folder.set_count === 1 ? "lesson" : "lessons"
          } · ${total} terms`}
          onBack={() => router.back()}
          inset={false}
          actions={
            <>
              <Pressable onPress={onExport} hitSlop={12}>
                <Share2 color={COLORS.dark.muted} size={20} />
              </Pressable>
              <Pressable onPress={confirmDelete} hitSlop={12}>
                <Trash2 color={COLORS.incorrect} size={20} />
              </Pressable>
            </>
          }
        />

        {total > 0 && (
          <>
            <View className="gap-4 rounded-3xl border border-app-glassline bg-app-glass p-5">
              <ModeProgress
                label="Familiarize"
                mastered={folder.choice_mastered}
                total={total}
              />
              <ModeProgress
                label="Identify"
                mastered={folder.written_mastered}
                total={total}
                color={COLORS.correct}
              />
            </View>

            {/* The reason folders exist rather than just being tidy: one pooled
                session across every lesson. This is midterm review. */}
            <View className="gap-3">
              <Text className="text-app-muted text-xs font-semibold">
                STUDY THE WHOLE SUBJECT
              </Text>
              <Button
                variant="primary"
                size="lg"
                isDisabled={!canChoice}
                onPress={() => router.push(`/study?folderId=${id}&mode=choice`)}
              >
                <Button.Label>Familiarize all {total} terms</Button.Label>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onPress={() =>
                  router.push(`/study?folderId=${id}&mode=written`)
                }
              >
                <Button.Label>Identify all {total} terms</Button.Label>
              </Button>
            </View>
          </>
        )}

        <View className="gap-2">
          <Text className="text-app-muted text-xs font-semibold">LESSONS</Text>

          {sets.map((set) => (
            <SetCard
              key={set.id}
              set={set}
              onPress={() => router.push(`/set/${set.id}`)}
            />
          ))}

          {sets.length === 0 && !adding && (
            <Text className="text-app-muted py-4 text-center text-sm">
              No lessons yet. Add your first one below.
            </Text>
          )}

          {adding ? (
            <View className="gap-2">
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Lesson 1: Introduction"
                placeholderTextColor={COLORS.dark.muted}
                autoFocus
                onSubmitEditing={addLesson}
                returnKeyType="done"
                className="rounded-2xl border border-app-glassline bg-app-glass px-4 py-4 text-app-text"
              />
              <Button variant="primary" size="md" onPress={addLesson}>
                <Button.Label>Create lesson</Button.Label>
              </Button>
            </View>
          ) : (
            <Button
              variant="secondary"
              size="md"
              onPress={() => setAdding(true)}
            >
              <Button.Label>
                <View className="flex-row items-center gap-2">
                  <Plus color={COLORS.brandTint} size={16} />
                  <Text
                    style={{ color: COLORS.brandTint }}
                    className="font-semibold"
                  >
                    Add lesson
                  </Text>
                </View>
              </Button.Label>
            </Button>
          )}
        </View>
      </ScrollView>
      {dialog}
    </Screen>
  );
}
