import { useRouter } from "expo-router";
import { Heart } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useTabBarOverlap } from "@/components/ui/CustomTabBar";
import { Card, IconTile } from "@/components/ui/Cards";
import { COLORS, SPACING } from "@/theme";

/**
 * Not a version-and-legal screen. Quizly was built for one person to pass her exams,
 * and this screen says so — it is the one place in the app that is allowed to be
 * sentimental, because nobody taps it mid-question.
 */
export default function AboutScreen() {
  const tabBarOverlap = useTabBarOverlap();
  const router = useRouter();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SPACING.gutter,
          paddingTop: SPACING.headerTop,
          paddingBottom: tabBarOverlap + SPACING.gutter,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Reached from Settings, so it needs its own back: there is no navigator header.
            Navigating to Settings by name rather than router.back(), because About is a
            hidden screen inside the tab navigator and tabs keep no push history — back()
            unwinds to the first tab and lands you on Home. Settings is the only way in
            here, so naming it is exact, not a guess. */}
        <ScreenHeader
          title="About Quizly"
          subtitle="Why this app exists."
          onBack={() => router.navigate("/settings")}
          inset={false}
        />

        <Card>
          <View className="flex-row items-start gap-4">
            <IconTile Icon={Heart} color={COLORS.incorrect} />
            <View className="flex-1">
              <Text className="text-app-text text-base font-bold">
                Built by Bernard Sapida
              </Text>
              <Text className="text-app-muted mt-1 text-xs leading-5">
                I made Quizly for my girlfriend, so she would never have to face a quiz
                or an exam alone.
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text className="text-app-text text-base font-bold">You can do this.</Text>
          <Text className="text-app-muted mt-2 text-sm leading-6">
            Every card you turn over is a little more of the exam you already know the
            answer to. You do not have to master it all tonight. You only have to come
            back tomorrow.
            {"\n\n"}
            The rings do not care how slow you go. They only fill up. Miss one, laugh,
            and go again. That is how mastery is actually built, and it is the reason
            this app never punishes a wrong answer.
            {"\n\n"}
            <Text className="text-app-text font-semibold">
              Whatever grade comes back, you are already the kind of person who studies
              until it is done.
            </Text>{" "}
            I am proud of you. Now go pass that exam.
          </Text>
          <Text className="text-app-muted mt-4 text-xs italic">Bernard ❤️</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
