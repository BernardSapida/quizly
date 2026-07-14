import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Tabs } from "heroui-native";
import { FolderOpen, Layers } from "lucide-react-native";

import { repo } from "@/db";
import { useAsync } from "@/lib/use-async";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useTabBarOverlap } from "@/components/ui/CustomTabBar";
import { FolderCard, SetCard } from "@/components/ui/Cards";
import { SetListSkeleton } from "@/components/ui/SkeletonLoader";
import { COLORS, GLASS, SPACING } from "@/theme";

type Tab = "sets" | "folders";

export default function LibraryScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sets");
  const tabBarOverlap = useTabBarOverlap();

  const load = useCallback(
    async () => ({
      sets: await repo.listAllSets(),
      folders: await repo.listFolders(),
    }),
    []
  );
  const { data, loading } = useAsync(load);

  const sets = data?.sets ?? [];
  const folders = data?.folders ?? [];
  const isLoading = loading && data === null;

  return (
    <Screen>
      {/* Header and tabs scroll with the list rather than being pinned: the screen
          has no opaque app bar, so a pinned header would have cards sliding visibly
          underneath its text. */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SPACING.gutter,
          paddingTop: SPACING.headerTop,
          paddingBottom: tabBarOverlap + SPACING.gutter,
          gap: SPACING.headerGap,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-5">
          <ScreenHeader
            title="Library"
            subtitle="Everything you have made, by set or by folder."
            inset={false}
          />

          {/* Full-width segmented control: the List spans the screen and each Trigger
              takes an equal share, so the indicator is a real half rather than a chip
              hugging its label. HeroUI's default greys are overridden with the brand
              indigo — grey-on-navy reads as disabled. */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <Tabs.List
              className="w-full flex-row rounded-full p-1"
              style={{
                backgroundColor: GLASS.fill,
                borderWidth: 1,
                borderColor: GLASS.border,
              }}
            >
              <Tabs.Indicator
                className="rounded-full"
                style={{ backgroundColor: COLORS.brand }}
              />
              <Tabs.Trigger value="sets" className="flex-1 items-center py-2.5">
                {({ isSelected }) => (
                  <Tabs.Label
                    className="text-sm font-bold"
                    style={{ color: isSelected ? "#FFFFFF" : COLORS.dark.muted }}
                  >
                    Sets
                  </Tabs.Label>
                )}
              </Tabs.Trigger>
              <Tabs.Trigger value="folders" className="flex-1 items-center py-2.5">
                {({ isSelected }) => (
                  <Tabs.Label
                    className="text-sm font-bold"
                    style={{ color: isSelected ? "#FFFFFF" : COLORS.dark.muted }}
                  >
                    Folders
                  </Tabs.Label>
                )}
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs>
        </View>

        <View className="gap-3">
          {/* Placeholder cards rather than an absent list: the tabs above stay put and
              the real cards land in the space already held for them. */}
          {isLoading ? (
            <SetListSkeleton count={5} />
          ) : tab === "sets" ? (
            sets.length === 0 ? (
              <Empty
                Icon={Layers}
                title="No sets yet"
                body="Create your first set, or import one a classmate sent you."
                action="Create a set"
                onAction={() => router.push("/create")}
              />
            ) : (
              sets.map((set) => (
                <SetCard
                  key={set.id}
                  set={set}
                  showProgress={false}
                  onPress={() => router.push(`/set/${set.id}`)}
                />
              ))
            )
          ) : folders.length === 0 ? (
            <Empty
              Icon={FolderOpen}
              title="No folders yet"
              body="A folder is a subject. Group your lesson sets inside it."
              action="Create a folder"
              onAction={() => router.push("/create")}
            />
          ) : (
            folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                showProgress={false}
                onPress={() => router.push(`/folder/${folder.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Empty({
  Icon,
  title,
  body,
  action,
  onAction,
}: {
  Icon: typeof Layers;
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <View className="items-center gap-3 py-16">
      <Icon color={COLORS.roundIdle} size={56} />
      <Text className="text-app-text text-lg font-semibold">{title}</Text>
      <Text className="text-app-muted text-center">{body}</Text>
      <View className="w-full pt-4">
        <Button variant="primary" size="lg" onPress={onAction}>
          <Button.Label>{action}</Button.Label>
        </Button>
      </View>
    </View>
  );
}
