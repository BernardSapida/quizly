import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Tabs } from "heroui-native";
import { FolderOpen, Layers } from "lucide-react-native";

import { repo } from "@/db";
import { useAsync } from "@/lib/use-async";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useTabBarOverlap } from "@/components/ui/CustomTabBar";
import { FolderRow, SetRow } from "@/components/ui/Cards";
import { SearchField } from "@/components/ui/SearchField";
import { RecentRowSkeleton } from "@/components/ui/SkeletonLoader";
import { COLORS, GLASS, SPACING } from "@/theme";

type Tab = "sets" | "folders";

export default function LibraryScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sets");
  const [query, setQuery] = useState("");
  const tabBarOverlap = useTabBarOverlap();

  const load = useCallback(
    async () => ({
      sets: await repo.listAllSets(),
      folders: await repo.listFolders(),
    }),
    []
  );
  const { data, loading } = useAsync(load);

  const allSets = useMemo(() => data?.sets ?? [], [data]);
  const allFolders = useMemo(() => data?.folders ?? [], [data]);

  // Filtered client-side, like Home's search: the whole Library is already in memory,
  // and a LIKE query for thirty sets would be ceremony. A set matches on its folder's
  // name too — "Culinary" should find the lessons inside Culinary, not just a set that
  // happens to be called that.
  const q = query.trim().toLowerCase();
  const sets = useMemo(
    () =>
      q
        ? allSets.filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              (s.folder_name?.toLowerCase().includes(q) ?? false)
          )
        : allSets,
    [allSets, q]
  );
  const folders = useMemo(
    () => (q ? allFolders.filter((f) => f.name.toLowerCase().includes(q)) : allFolders),
    [allFolders, q]
  );

  const isLoading = loading && data === null;
  const isSearching = q.length > 0;

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
        keyboardShouldPersistTaps="handled"
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

          {/* Under the tabs rather than above them: it filters whichever tab is
              open, so it belongs to the list, not to the screen. */}
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder={tab === "sets" ? "Search your sets" : "Search your folders"}
          />
        </View>

        <View className="gap-3">
          {/* Placeholder cards rather than an absent list: the tabs above stay put and
              the real cards land in the space already held for them. */}
          {isLoading ? (
            [0, 1, 2, 3, 4].map((i) => <RecentRowSkeleton key={i} index={i} />)
          ) : tab === "sets" ? (
            sets.length === 0 ? (
              isSearching ? (
                <NoMatches query={query} />
              ) : (
                <Empty
                  Icon={Layers}
                  title="No sets yet"
                  body="Create your first set, or import one a classmate sent you."
                  action="Create a set"
                  onAction={() => router.push("/create")}
                />
              )
            ) : (
              sets.map((set) => (
                <SetRow
                  key={set.id}
                  set={set}
                  onPress={() => router.push(`/set/${set.id}`)}
                />
              ))
            )
          ) : folders.length === 0 ? (
            isSearching ? (
              <NoMatches query={query} />
            ) : (
              <Empty
                Icon={FolderOpen}
                title="No folders yet"
                body="A folder is a subject. Group your lesson sets inside it."
                action="Create a folder"
                onAction={() => router.push("/create")}
              />
            )
          ) : (
            folders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                onPress={() => router.push(`/folder/${folder.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

/** A search that found nothing is not an empty Library — it must not offer to create. */
function NoMatches({ query }: { query: string }) {
  return (
    <Text className="text-app-muted py-8 text-center">
      Nothing matches “{query}”.
    </Text>
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
