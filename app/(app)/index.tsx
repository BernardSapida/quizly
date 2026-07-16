import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Button } from "heroui-native";
import { Library, Settings as SettingsIcon } from "lucide-react-native";

import { repo, type SetWithProgress } from "@/db";
import { useAsync } from "@/lib/use-async";
import { Screen } from "@/components/ui/Screen";
import { useTabBarOverlap } from "@/components/ui/CustomTabBar";
import { Card, SetCard, SetRow } from "@/components/ui/Cards";
import { SearchField } from "@/components/ui/SearchField";
import { ModeProgress } from "@/components/ui/ModeProgress";
import { RecentRowSkeleton, SkeletonLoader } from "@/components/ui/SkeletonLoader";
import { COLORS, GLASS, SPACING } from "@/theme";

/** The mode a set is part-way through — what "Continue" should resume. */
function resumeMode(set: SetWithProgress): "choice" | "written" {
  const choiceDone = set.choice_mastered >= set.term_count;
  return choiceDone ? "written" : "choice";
}

function progressPct(set: SetWithProgress): number {
  if (set.term_count === 0) return 0;
  const done = set.choice_mastered + set.written_mastered;
  return Math.round((done / (set.term_count * 2)) * 100);
}

export default function HomeScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const load = useCallback(() => repo.listAllSets(), []);
  const { data, loading } = useAsync(load);
  const sets = useMemo(() => data ?? [], [data]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return sets.filter((s) => s.name.toLowerCase().includes(q));
  }, [sets, query]);

  // Started, but not finished — the sets you would actually want to pick up again.
  const inProgress = useMemo(
    () =>
      sets.filter(
        (s) =>
          s.term_count > 0 &&
          s.choice_mastered + s.written_mastered > 0 &&
          progressPct(s) < 100
      ),
    [sets]
  );

  const isLoading = loading && data === null;
  const isEmpty = !loading && sets.length === 0;
  const tabBarOverlap = useTabBarOverlap();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          // Home's header is the search row rather than a title, so it starts at
          // the same headerTop offset the titled screens use.
          paddingHorizontal: SPACING.gutter,
          paddingTop: SPACING.headerTop,
          paddingBottom: tabBarOverlap + SPACING.gutter,
          gap: 28,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center gap-3">
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="Search your sets"
            className="flex-1"
          />
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={10}
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{
              backgroundColor: GLASS.fill,
              borderWidth: 1,
              borderColor: GLASS.border,
            }}
          >
            <SettingsIcon color={COLORS.dark.text} size={20} />
          </Pressable>
        </View>

        {/* Search takes over the whole screen while it has a query. */}
        {results !== null ? (
          <View className="gap-3">
            <Text className="text-app-text text-lg font-bold">
              {results.length} {results.length === 1 ? "result" : "results"}
            </Text>
            {results.map((set) => (
              <SetCard
                key={set.id}
                set={set}
                onPress={() => router.push(`/set/${set.id}`)}
              />
            ))}
            {results.length === 0 && (
              <Text className="text-app-muted py-8 text-center">
                Nothing matches “{query}”.
              </Text>
            )}
          </View>
        ) : isLoading ? (
          /* Recents-shaped placeholders. Home is the launch screen, so the very first
             thing anyone sees must not be a bare search bar over an empty void. */
          <View className="gap-3">
            <SkeletonLoader width={90} height={18} />
            {[0, 1, 2, 3].map((i) => (
              <RecentRowSkeleton key={i} index={i} />
            ))}
          </View>
        ) : isEmpty ? (
          <EmptyHome
            onCreate={() => router.push("/create")}
            onImport={() => router.push("/import")}
          />
        ) : (
          /* 8, not the container's 28: the card above already carries 20 of inner
             padding, so this lands Recents the same 28 below it that "Jump back in"
             sits below the search row. */
          <View className="gap-2">
            {inProgress.length > 0 && (
              <View className="gap-3">
                <Text className="text-app-text text-lg font-bold">Jump back in</Text>
                <JumpBackIn
                  sets={inProgress}
                  onContinue={(set) =>
                    router.push(`/study?setId=${set.id}&mode=${resumeMode(set)}`)
                  }
                />
              </View>
            )}

            <View className="gap-3">
              <Text className="text-app-text text-lg font-bold">Recents</Text>
              {sets.map((set) => (
                <SetRow
                  key={set.id}
                  set={set}
                  onPress={() => router.push(`/set/${set.id}`)}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

/** A horizontal, snapping carousel of the sets you have started. */
function JumpBackIn({
  sets,
  onContinue,
}: {
  sets: SetWithProgress[];
  onContinue: (set: SetWithProgress) => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = width - 40;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardWidth + 12}
      decelerationRate="fast"
      contentContainerStyle={{ gap: 12 }}
    >
      {sets.map((set) => (
        <View key={set.id} style={{ width: cardWidth }}>
          <Card>
            <Text className="text-app-text text-xl font-bold" numberOfLines={2}>
              {set.name}
            </Text>

            <View className="mt-4 gap-2">
              <ModeProgress
                label=""
                mastered={set.choice_mastered + set.written_mastered}
                total={set.term_count * 2}
                color={COLORS.correct}
                compact
              />
              <Text className="text-app-muted text-xs">
                {progressPct(set)}% of questions completed
              </Text>
            </View>

            <View className="mt-5">
              <Button variant="primary" size="lg" onPress={() => onContinue(set)}>
                <Button.Label>Continue</Button.Label>
              </Button>
            </View>
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}

function EmptyHome({
  onCreate,
  onImport,
}: {
  onCreate: () => void;
  onImport: () => void;
}) {
  return (
    <View className="items-center gap-3 py-16">
      <Library color={COLORS.roundIdle} size={56} />
      <Text className="text-app-text text-lg font-semibold">No sets yet</Text>
      <Text className="text-app-muted text-center">
        Create a set, or import one a classmate sent you.
      </Text>
      <View className="w-full gap-3 pt-4">
        <Button variant="primary" size="lg" onPress={onCreate}>
          <Button.Label>Create a set</Button.Label>
        </Button>
        <Button variant="secondary" size="lg" onPress={onImport}>
          <Button.Label>Import a file</Button.Label>
        </Button>
      </View>
    </View>
  );
}
