import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Button } from "heroui-native";
import { ChevronLeft, FileWarning, PartyPopper } from "lucide-react-native";

import { repo, type ImportPlan } from "@/db";
import { ImportError } from "@/features/share/format";
import { pickExportFile } from "@/features/share/transfer";
import type { ExportFile } from "@/features/share/format";
import { Screen } from "@/components/ui/Screen";
import { COLORS, SPACING } from "@/theme";

type Stage =
  | { kind: "picking" }
  | { kind: "preview"; file: ExportFile; plan: ImportPlan }
  | { kind: "importing" }
  | { kind: "done"; plan: ImportPlan }
  | { kind: "error"; message: string }
  | { kind: "cancelled" };

export default function ImportScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "picking" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const file = await pickExportFile();
        if (cancelled) return;

        if (!file) {
          setStage({ kind: "cancelled" });
          return;
        }

        const plan = await repo.planImport(file);
        if (!cancelled) setStage({ kind: "preview", file, plan });
      } catch (error) {
        if (cancelled) return;
        setStage({
          kind: "error",
          message:
            error instanceof ImportError
              ? error.message
              : "Something went wrong reading that file.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing was picked — bounce straight back rather than showing a dead screen.
  useEffect(() => {
    if (stage.kind === "cancelled") router.back();
  }, [stage.kind, router]);

  const confirm = async () => {
    if (stage.kind !== "preview") return;
    const { file, plan } = stage;
    setStage({ kind: "importing" });
    await repo.applyImport(file);
    setStage({ kind: "done", plan });
  };

  return (
    <Screen>
      <View
        className="h-8 flex-row items-center"
        style={{
          paddingHorizontal: SPACING.gutter,
          marginTop: SPACING.headerTop,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} className="-ml-1">
          <ChevronLeft color={COLORS.dark.muted} size={26} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SPACING.gutter,
          paddingTop: SPACING.headerGap,
          paddingBottom: SPACING.gutter,
          gap: 20,
          flexGrow: 1,
        }}
      >
        {stage.kind === "picking" && (
          <Text className="text-app-muted text-center">Opening your files…</Text>
        )}

        {stage.kind === "importing" && (
          <Text className="text-app-muted text-center">Importing…</Text>
        )}

        {stage.kind === "error" && (
          <View className="flex-1 items-center justify-center gap-4">
            <FileWarning color={COLORS.incorrect} size={56} />
            <Text className="text-app-text text-center text-lg font-semibold">
              Couldn&apos;t import that
            </Text>
            <Text className="text-app-muted text-center">{stage.message}</Text>
            <View className="w-full pt-4">
              <Button variant="secondary" size="lg" onPress={() => router.back()}>
                <Button.Label>Back</Button.Label>
              </Button>
            </View>
          </View>
        )}

        {stage.kind === "preview" && (
          <View className="gap-6">
            <View>
              <Text className="text-app-text text-3xl font-bold">
                {titleFor(stage.plan, stage.file)}
              </Text>
              <Text className="text-app-muted mt-1">
                {stage.file.sets.length}{" "}
                {stage.file.sets.length === 1 ? "set" : "sets"} in this file
              </Text>
            </View>

            <View className="gap-3 rounded-3xl border border-app-glassline bg-app-glass p-5">
              <PlanRow
                label="New terms"
                value={stage.plan.newTerms}
                color={COLORS.correct}
              />
              <PlanRow
                label="Updated terms"
                value={stage.plan.updatedTerms}
                color={COLORS.encourage}
              />
              <PlanRow
                label="Unchanged"
                value={stage.plan.unchangedTerms}
                color={COLORS.dark.muted}
              />
              {stage.plan.newSets > 0 && (
                <PlanRow
                  label="New sets"
                  value={stage.plan.newSets}
                  color={COLORS.brand}
                />
              )}
              {stage.plan.newFolders > 0 && (
                <PlanRow
                  label="New folders"
                  value={stage.plan.newFolders}
                  color={COLORS.brand}
                />
              )}
              {stage.plan.removedTerms > 0 && (
                <PlanRow
                  label="Removed terms"
                  value={stage.plan.removedTerms}
                  color={COLORS.incorrect}
                />
              )}
              {stage.plan.removedSets > 0 && (
                <PlanRow
                  label="Removed sets"
                  value={stage.plan.removedSets}
                  color={COLORS.incorrect}
                />
              )}
            </View>

            <Text className="text-app-muted text-xs">
              {stage.file.contentPack
                ? "This is a content pack — it replaces the sets that came with Quizly, so cards it no longer carries are deleted. Sets you made yourself are not touched. Study progress never travels in a file: the progress you already have stays as it is."
                : "Your own terms won't be touched, and only terms that are genuinely newer get overwritten. Study progress never travels in a file — imported sets start fresh, and the progress you already have stays as it is."}
            </Text>

            <View className="gap-3">
              <Button variant="primary" size="lg" onPress={confirm}>
                <Button.Label>Import</Button.Label>
              </Button>
              <Button variant="secondary" size="lg" onPress={() => router.back()}>
                <Button.Label>Cancel</Button.Label>
              </Button>
            </View>
          </View>
        )}

        {stage.kind === "done" && (
          <View className="flex-1 items-center justify-center gap-3">
            <Animated.View entering={FadeInUp.duration(300)} className="pb-2">
              <PartyPopper color={COLORS.correct} size={56} />
            </Animated.View>
            <Animated.Text
              entering={FadeInUp.delay(80).duration(300)}
              className="text-app-text text-center text-2xl font-bold"
            >
              Imported!
            </Animated.Text>
            <Text className="text-app-muted text-center">
              {stage.plan.newTerms} new · {stage.plan.updatedTerms} updated
              {stage.plan.removedTerms > 0 && ` · ${stage.plan.removedTerms} removed`}
            </Text>
            <View className="w-full pt-6">
              <Button
                variant="primary"
                size="lg"
                onPress={() => router.replace("/(app)")}
              >
                <Button.Label>Go to Library</Button.Label>
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

/**
 * Name the file after the most specific thing in it. One folder or one set has an
 * obvious name; a whole-library file has none, so say what it is instead.
 */
function titleFor(plan: ImportPlan, file: ExportFile): string {
  // Checked before the counts: a pack covering one subject is still a content update,
  // and calling it "Heritage Tourism" would hide that it can delete.
  if (file.contentPack) return "Quizly Content";
  if (plan.folderNames.length === 1) return plan.folderNames[0];
  if (file.sets.length === 1) return file.sets[0].name;
  return "Quizly Backup";
}

function PlanRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-app-muted text-sm">{label}</Text>
      <Text className="text-lg font-bold" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}
