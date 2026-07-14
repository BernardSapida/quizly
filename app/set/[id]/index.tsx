import { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "heroui-native";
import {
  ChevronLeft,
  FileText,
  Folder,
  FolderPlus,
  Layers,
  PartyPopper,
  Pencil,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react-native";

import { repo } from "@/db";
import { shareExport } from "@/features/share/transfer";
import { FlashcardCarousel } from "@/features/study/components/FlashcardCarousel";
import { MIN_POOL_FOR_CHOICE } from "@/features/study/engine";
import { useAsync } from "@/lib/use-async";
import { Screen } from "@/components/ui/Screen";
import { ActionRow, Card, IconTile } from "@/components/ui/Cards";
import { ModeProgress } from "@/components/ui/ModeProgress";
import { useConfirm } from "@/components/ui/useConfirm";
import { COLORS, GLASS, SPACING } from "@/theme";

export default function SetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  const load = useCallback(
    async () => ({
      set: await repo.getSet(id),
      terms: await repo.listTerms(id),
      folders: await repo.listFolders(),
    }),
    [id]
  );
  const { data, refetch } = useAsync(load);

  const set = data?.set;
  const terms = data?.terms ?? [];
  if (!set) return <Screen />;

  const folder = data?.folders.find((f) => f.id === set.folder_id) ?? null;

  const total = set.term_count;
  const choiceDone = total > 0 && set.choice_mastered === total;
  const canChoice = total >= MIN_POOL_FOR_CHOICE;

  const onExport = async () => {
    const result = await shareExport({ setId: id }, set.name);
    if (!result.shared && result.reason) {
      confirm({ title: "Can't export", description: result.reason });
    }
  };

  const confirmDelete = () => {
    confirm({
      title: "Delete this set?",
      description: `"${set.name}" and all ${total} terms will be gone for good. This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
      onConfirm: async () => {
        await repo.deleteSet(id);
        router.back();
      },
    });
  };

  const resetProgress = () => {
    confirm({
      title: "Reset progress?",
      description: "Your mastery for this set goes back to zero.",
      confirmLabel: "Reset",
      variant: "danger",
      onConfirm: async () => {
        await repo.resetProgress({ setId: id });
        refetch();
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
      >
        {/* The title sits below the carousel here, not in a ScreenHeader — browsing
            the cards is the point of this screen, so it gets the top slot. The nav
            row still matches ScreenHeader's height so it lines up with other screens. */}
        <View className="h-8 flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft color={COLORS.dark.text} size={26} />
          </Pressable>
          <View className="flex-row gap-5">
            <Pressable onPress={onExport} hitSlop={12}>
              <Share2 color={COLORS.dark.muted} size={20} />
            </Pressable>
            <Pressable onPress={() => router.push(`/set/${id}/edit`)} hitSlop={12}>
              <Pencil color={COLORS.dark.muted} size={20} />
            </Pressable>
            <Pressable onPress={confirmDelete} hitSlop={12}>
              <Trash2 color={COLORS.incorrect} size={20} />
            </Pressable>
          </View>
        </View>

        {/* Browse the set before committing to studying it: swipe the cards,
            tap one to flip between the definition and the term. */}
        <FlashcardCarousel terms={terms} />

        <View className="gap-2">
          <Text className="text-app-text text-2xl font-bold">{set.name}</Text>
          <Text className="text-app-muted">{total} terms</Text>

          {/* Tapping the folder chip is how you move the set — a set is never
              *required* to be in a folder, so "No folder" is a real state. */}
          <Pressable
            onPress={() => router.push(`/set/${id}/move`)}
            className="mt-1 flex-row items-center gap-2 self-start rounded-full px-3 py-1.5"
            style={{
              backgroundColor: GLASS.fill,
              borderWidth: 1,
              borderColor: GLASS.border,
            }}
          >
            {folder ? (
              <Folder color={COLORS.brand} size={14} />
            ) : (
              <FolderPlus color={COLORS.dark.muted} size={14} />
            )}
            <Text
              className="text-xs font-semibold"
              style={{ color: folder ? COLORS.dark.text : COLORS.dark.muted }}
            >
              {folder ? folder.name : "Add to a folder"}
            </Text>
          </Pressable>
        </View>

        {total === 0 ? (
          <View className="items-center gap-3 py-10">
            <Pencil color={COLORS.roundIdle} size={48} />
            <Text className="text-app-muted text-center">
              This set is empty. Add some terms to start studying.
            </Text>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onPress={() => router.push(`/set/${id}/edit`)}
            >
              <Button.Label>Add terms</Button.Label>
            </Button>
          </View>
        ) : (
          <>
            <View className="gap-4 rounded-3xl border border-app-glassline bg-app-glass p-5">
              <ModeProgress
                label="Familiarize"
                mastered={set.choice_mastered}
                total={total}
              />
              <ModeProgress
                label="Identify"
                mastered={set.written_mastered}
                total={total}
                color={COLORS.correct}
              />
            </View>

            {/* The exact moment a motivated student goes looking for the harder mode.
                Glass, like every other raised surface — the celebration reads through
                the solid green tile, not through a one-off tinted wash. */}
            {choiceDone && set.written_mastered < total && (
              <Card>
                <View className="flex-row items-start gap-4">
                  <IconTile Icon={PartyPopper} color={COLORS.correct} />
                  <View className="flex-1">
                    <Text className="text-app-text text-base font-bold">
                      Familiarize complete!
                    </Text>
                    <Text className="text-app-muted mt-1 text-xs leading-5">
                      Ready for a challenge? Try Identify — no choices, you type the
                      answer.
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            <View className="gap-3">
              <ActionRow
                Icon={Sparkles}
                title="Familiarize"
                subtitle="Multiple choice"
                isDisabled={!canChoice}
                onPress={() => router.push(`/study?setId=${id}&mode=choice`)}
              />
              <ActionRow
                Icon={Layers}
                iconColor={COLORS.correct}
                title="Identify"
                subtitle="Type the answer"
                onPress={() => router.push(`/study?setId=${id}&mode=written`)}
              />
              <ActionRow
                Icon={FileText}
                iconColor={COLORS.roundIdle}
                title="Test"
                subtitle="Coming soon"
                isDisabled
                onPress={() => {}}
              />
            </View>

            {!canChoice && (
              <Text className="text-app-muted -mt-2 text-xs">
                Multiple choice needs at least {MIN_POOL_FOR_CHOICE} terms — the wrong
                options come from the other cards in this set.
              </Text>
            )}

            <Pressable onPress={resetProgress} className="items-center py-2">
              <Text className="text-app-muted text-xs">Reset progress</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
      {dialog}
    </Screen>
  );
}
