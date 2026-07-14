import { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "heroui-native";
import { Check, ChevronLeft, Folder, FolderMinus } from "lucide-react-native";

import { repo } from "@/db";
import { useAsync } from "@/lib/use-async";
import { Screen } from "@/components/ui/Screen";
import { COLORS, GLASS, SPACING } from "@/theme";

/**
 * Move a set into a folder, or pull it back out to the top level.
 *
 * `sets.folder_id` is nullable by design — a set is never *required* to live in a
 * folder, so "No folder" is a first-class choice here, not an escape hatch.
 */
export default function MoveSetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const load = useCallback(
    async () => ({
      set: await repo.getSet(id),
      folders: await repo.listFolders(),
    }),
    [id]
  );
  const { data } = useAsync(load);

  const set = data?.set;
  const folders = data?.folders ?? [];
  if (!set) return <Screen />;

  const move = async (folderId: string | null) => {
    await repo.updateSet(id, { folder_id: folderId });
    router.back();
  };

  return (
    <Screen>
      <View
        className="h-8 flex-row items-center gap-3"
        style={{
          paddingHorizontal: SPACING.gutter,
          marginTop: SPACING.headerTop,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} className="-ml-1">
          <ChevronLeft color={COLORS.dark.text} size={26} />
        </Pressable>
        <Text className="text-app-text text-lg font-semibold">Move to folder</Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SPACING.gutter,
          paddingTop: SPACING.headerGap,
          paddingBottom: SPACING.gutter,
          gap: 12,
        }}
      >
        <Text className="text-app-muted text-sm">
          “{set.name}” will move. Its terms and your progress come with it.
        </Text>

        <Row
          Icon={FolderMinus}
          label="No folder"
          hint="Keep it at the top level"
          selected={set.folder_id === null}
          onPress={() => move(null)}
        />

        {folders.map((folder) => (
          <Row
            key={folder.id}
            Icon={Folder}
            label={folder.name}
            hint={`${folder.set_count} ${folder.set_count === 1 ? "lesson" : "lessons"}`}
            selected={set.folder_id === folder.id}
            onPress={() => move(folder.id)}
          />
        ))}

        {folders.length === 0 && (
          <View className="items-center gap-3 py-10">
            <Folder color={COLORS.roundIdle} size={48} />
            <Text className="text-app-muted text-center">
              You don&apos;t have any folders yet.
            </Text>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onPress={() => router.replace("/create")}
            >
              <Button.Label>Create a folder</Button.Label>
            </Button>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({
  Icon,
  label,
  hint,
  selected,
  onPress,
}: {
  Icon: typeof Folder;
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-4 rounded-2xl p-4"
      style={{
        backgroundColor: GLASS.fill,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? COLORS.brand : GLASS.border,
      }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{
          backgroundColor: selected ? COLORS.brand : COLORS.roundIdle,
          borderWidth: 1,
          borderColor: GLASS.border,
        }}
      >
        <Icon color="#FFFFFF" size={18} />
      </View>
      <View className="flex-1">
        <Text className="text-app-text text-base font-semibold">{label}</Text>
        <Text className="text-app-muted text-xs">{hint}</Text>
      </View>
      {selected && <Check color={COLORS.brand} size={20} />}
    </Pressable>
  );
}
