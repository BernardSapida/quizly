import { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Button } from "heroui-native";

import { NotificationPermissionPrimer } from "@/components/ui/NotificationPermissionPrimer";
import { Screen } from "@/components/ui/Screen";
import { usePreferencesStore } from "@/store";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    index: 0,
    title: "Welcome",
    description: "Placeholder slide 1 — replace with your app value prop",
  },
  {
    index: 1,
    title: "Stay in control",
    description: "Placeholder slide 2",
  },
  {
    index: 2,
    title: "Get started",
    description: "Placeholder slide 3 with CTA",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { setHasSeenOnboarding } = usePreferencesStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPrimer, setShowPrimer] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const finish = () => {
    setHasSeenOnboarding(true);
    setShowPrimer(true);
  };

  const goToSlide = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      finish();
    }
  };

  // Android back button: previous slide on slide >0, exit app on slide 0
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (currentIndex > 0) {
          goToSlide(currentIndex - 1);
          return true;
        }
        return false;
      }
    );
    return () => subscription.remove();
  }, [currentIndex]);

  return (
    <>
    <NotificationPermissionPrimer
      visible={showPrimer}
      onDone={() => router.replace("/(auth)/sign-in")}
    />
    <Screen>
      {/* Skip */}
      <View className="flex-row justify-end px-4 pt-2">
        <Pressable onPress={finish} hitSlop={12} className="py-2 px-3">
          <Text className="text-muted text-sm font-medium">Skip</Text>
        </Pressable>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / width
          );
          setCurrentIndex(index);
        }}
        keyExtractor={(item) => String(item.index)}
        renderItem={({ item }) => (
          <View
            style={{ width }}
            className="flex-1 items-center justify-center px-10 gap-8"
          >
            <View className="w-24 h-24 rounded-3xl bg-accent items-center justify-center">
              <Text className="text-accent-foreground text-4xl font-bold">
                {item.index + 1}
              </Text>
            </View>
            <View className="items-center gap-3">
              <Text className="text-2xl font-bold text-foreground text-center">
                {item.title}
              </Text>
              <Text className="text-muted text-center text-base leading-6">
                {item.description}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Dot indicators */}
      <View className="flex-row justify-center gap-2 py-6">
        {SLIDES.map((_, i) => (
          <Pressable key={i} onPress={() => goToSlide(i)}>
            <View
              className={`h-2 rounded-full transition-all ${
                i === currentIndex
                  ? "w-6 bg-accent"
                  : "w-2 bg-default-300"
              }`}
            />
          </Pressable>
        ))}
      </View>

      {/* CTA */}
      <View className="px-6 pb-8">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onPress={handleNext}
        >
          <Button.Label>
            {currentIndex === SLIDES.length - 1 ? "Get started" : "Next"}
          </Button.Label>
        </Button>
      </View>
    </Screen>
    </>
  );
}
