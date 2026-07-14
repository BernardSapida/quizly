import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "heroui-native";
import { FolderOpen, Plus, Share2, Target, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ActionRow, countLine, SetCard } from "@/components/ui/Cards";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { FolderDetailSkeleton } from "@/components/ui/SkeletonLoader";
import { useConfirm } from "@/components/ui/useConfirm";
import { repo } from "@/db";
import { shareExport } from "@/features/share/transfer";
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
  const { data, loading } = useAsync(load);

  const folder = data?.folder;
  const sets = data?.sets ?? [];

  // Two different nothings that used to render as the same blank navy screen:
  // still reading, versus read and the folder is gone.
  if (loading && data === null) {
    return (
      <Screen>
        <FolderDetailSkeleton />
      </Screen>
    );
  }
  if (!folder) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <FolderOpen color={COLORS.roundIdle} size={48} />
          <Text className="text-app-text text-lg font-semibold">Folder not found</Text>
          <Text className="text-app-muted text-center text-sm">
            It may have been deleted. Any lessons inside it are still on your Home.
          </Text>
          <View className="w-full pt-2">
            <Button variant="secondary" size="lg" onPress={() => router.back()}>
              <Button.Label>Go back</Button.Label>
            </Button>
          </View>
        </View>
      </Screen>
    );
  }

  const total = folder.term_count;

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
          } · ${countLine(total, folder.enum_count)}`}
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

        {/* A folder is a list of lessons — you study inside a lesson, not here. The
            one thing this screen can do that no lesson can is pool the whole subject
            into a single exam, which is the reason folders exist rather than being
            mere tidiness. So: exactly one action, and it is that one. */}
        {total > 0 && (
          <ActionRow
            Icon={Target}
            title={`Test all ${total} terms`}
            subtitle="Every lesson, once through, then a score"
            onPress={() => router.push(`/test?folderId=${id}`)}
          />
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
