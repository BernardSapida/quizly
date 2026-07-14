import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "heroui-native";
import {
  Download,
  Info,
  Share2,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react-native";

import { repo } from "@/db";
import { saveExport, shareExport } from "@/features/share/transfer";
import { usePreferencesStore } from "@/store";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useTabBarOverlap } from "@/components/ui/CustomTabBar";
import { ActionRow, Card, IconTile } from "@/components/ui/Cards";
import { useConfirm } from "@/components/ui/useConfirm";
import { COLORS, SPACING } from "@/theme";

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-app-muted text-xs font-semibold uppercase tracking-widest">
      {children}
    </Text>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const tabBarOverlap = useTabBarOverlap();

  const setContentHash = usePreferencesStore((s) => s.setContentHash);
  const [deleting, setDeleting] = useState(false);

  /** The backup: a file the user can go and find again. */
  const exportAll = async () => {
    const result = await saveExport({ all: true }, "Quizly Backup");

    if (result.saved) {
      confirm({
        title: "Backup saved",
        description: `Quizly-Backup.json is now in ${result.folder ?? "the folder you picked"}. Keep it somewhere you can find it again.`,
      });
      return;
    }
    // No reason means the user backed out of the folder picker. Say nothing.
    if (result.reason) {
      confirm({ title: "Can't export", description: result.reason });
    }
  };

  /** The copy: for sending to a classmate, or off the phone to Drive or Gmail. */
  const sendCopy = async () => {
    const result = await shareExport({ all: true }, "Quizly Backup");
    if (!result.shared && result.reason) {
      confirm({ title: "Can't share", description: result.reason });
    }
  };

  /**
   * Empties the Library and leaves it empty. Re-seeding the bundled sets here would
   * put most of the library straight back, making the delete look like it silently
   * did nothing — and leaving nowhere clean to restore a backup into.
   *
   * Clearing the content hash re-arms the launch sync instead, so the starter sets
   * return the next time the app is opened, exactly as they would on a fresh install.
   */
  const deleteEverything = async () => {
    setDeleting(true);
    try {
      await repo.deleteAllData();
      setContentHash(null);
      router.replace("/(app)");
    } catch {
      confirm({
        title: "Couldn't delete",
        description: "Something went wrong. Your data is still here.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = () => {
    confirm({
      title: "Delete everything?",
      description:
        "Every set, folder and all your progress will be erased from this phone. " +
        "There is no undo. If you have not exported, it is gone for good.\n\n" +
        "The starter sets that ship with Quizly come back the next time you open " +
        "the app.",
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: () => void deleteEverything(),
    });
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SPACING.gutter,
          paddingTop: SPACING.headerTop,
          paddingBottom: tabBarOverlap + SPACING.gutter,
          gap: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Settings is reached from the Home header, not a tab — it needs its own back.
            The header scrolls with the content; pinning it would let the cards slide
            underneath its text. */}
        <ScreenHeader
          title="Settings"
          subtitle="Back up your sets, or start over."
          onBack={() => router.back()}
          inset={false}
        />
        {/* Backup is not a nicety here. There is no server and no cloud copy —
            uninstalling the app destroys every set and all progress, forever. */}
        <View className="gap-3">
          <SectionLabel>Backup</SectionLabel>

          {/* Glass, like every other raised surface. The warning reads as a warning
              through the solid encourage-tinted tile, not through a tinted panel —
              a one-off wash here is what made the screen look borrowed. */}
          <Card>
            <View className="flex-row items-start gap-4">
              <IconTile Icon={TriangleAlert} color={COLORS.encourage} />
              <View className="flex-1">
                <Text className="text-app-text text-base font-bold">
                  Your sets live only on this phone
                </Text>
                <Text className="text-app-muted mt-1 text-xs leading-5">
                  There is no cloud backup. If you uninstall Quizly, every set and all
                  your progress is gone for good. Export regularly and keep the file
                  somewhere safe.
                  {"\n\n"}
                  An export saves your sets and folders, but{" "}
                  <Text className="text-app-text font-semibold">
                    not your progress
                  </Text>
                  . Restoring one brings your sets back, but every set starts fresh.
                  {"\n\n"}
                  So when a new version of the app arrives,{" "}
                  <Text className="text-app-text font-semibold">
                    install over the top of it
                  </Text>
                  . Never uninstall first.
                </Text>
              </View>
            </View>
          </Card>

          {/* The one primary action on the screen, so the one pill. It saves rather
              than shares: a backup you cannot find later is not a backup. */}
          <Button variant="primary" size="lg" onPress={exportAll}>
            <Download color="#FFFFFF" size={18} />
            <Button.Label>Export my data</Button.Label>
          </Button>

          <ActionRow
            Icon={Share2}
            title="Send a copy"
            subtitle="Share the file to Drive, Gmail or a friend"
            onPress={sendCopy}
          />

          <ActionRow
            Icon={Upload}
            title="Import from a file"
            subtitle="Open a set a classmate sent you"
            onPress={() => router.push("/import")}
          />
        </View>

        <View className="gap-3">
          <SectionLabel>About</SectionLabel>
          <ActionRow
            Icon={Info}
            iconColor={COLORS.roundIdle}
            title="About Quizly"
            subtitle="Version and legal"
            onPress={() => router.push("/about")}
          />
        </View>

        {/* Last, and in its own section. A destructive action sitting next to Export
            invites the wrong tap on the way to the right one. */}
        <View className="gap-3">
          <SectionLabel>Danger zone</SectionLabel>
          <ActionRow
            Icon={Trash2}
            iconColor={COLORS.incorrect}
            title="Delete all my data"
            subtitle={deleting ? "Deleting…" : "Erase every set and start over"}
            onPress={confirmDelete}
            isDisabled={deleting}
          />
        </View>
      </ScrollView>
      {dialog}
    </Screen>
  );
}
