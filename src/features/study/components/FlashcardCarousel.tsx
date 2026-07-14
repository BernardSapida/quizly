import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { Term } from "@/db";
import { parseAnswers } from "@/features/study/grading";
import { COLORS, GLASS } from "@/theme";

const CARD_HEIGHT = 220;
const GAP = 12;

/**
 * The set preview: swipe through every term, tap a card to flip it between the
 * definition and the term. No grading, no progress — this is for browsing what is
 * in the set before you commit to studying it.
 */
export function FlashcardCarousel({ terms }: { terms: Term[] }) {
  const { width } = useWindowDimensions();
  const cardWidth = width - 40; // matches the screen's 20px horizontal padding
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + GAP));
    if (next !== index) setIndex(next);
  };

  if (terms.length === 0) return null;

  return (
    <View className="gap-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + GAP}
        decelerationRate="fast"
        onMomentumScrollEnd={onScroll}
        contentContainerStyle={{ gap: GAP }}
      >
        {terms.map((term) => (
          <Flashcard key={term.id} term={term} width={cardWidth} />
        ))}
      </ScrollView>

      <View className="flex-row items-center justify-center gap-1.5">
        {terms.slice(0, 8).map((term, i) => (
          <View
            key={term.id}
            style={{
              width: i === index ? 8 : 6,
              height: i === index ? 8 : 6,
              borderRadius: 999,
              backgroundColor: i === index ? COLORS.dark.text : COLORS.roundIdle,
            }}
          />
        ))}
        {terms.length > 8 && (
          <Text className="text-app-muted ml-1 text-xs">+{terms.length - 8}</Text>
        )}
      </View>
    </View>
  );
}

function Flashcard({ term, width }: { term: Term; width: number }) {
  const flip = useSharedValue(0);
  const [flipped, setFlipped] = useState(false);

  const toggle = () => {
    const next = flipped ? 0 : 1;
    flip.set(withTiming(next, { duration: 320 }));
    setFlipped(!flipped);
  };

  // Two stacked faces, each rotated on Y. backfaceVisibility hides whichever is
  // facing away, so the card reads as one object turning over.
  const front = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(flip.get(), [0, 1], [0, 180])}deg` }],
    opacity: flip.get() < 0.5 ? 1 : 0,
  }));

  const back = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(flip.get(), [0, 1], [180, 360])}deg` }],
    opacity: flip.get() < 0.5 ? 0 : 1,
  }));

  const isList = term.kind === "enumeration";
  const answer = isList ? parseAnswers(term.answers).join("\n") : term.term;
  // Enumeration terms have no definition — the prompt itself is the front.
  const prompt = isList ? term.term : term.definition;

  return (
    <Pressable onPress={toggle} style={{ width, height: CARD_HEIGHT }}>
      <Face style={front} width={width} label={isList ? "PROMPT" : "DEFINITION"} text={prompt} />
      <Face
        style={back}
        width={width}
        label={isList ? "ANSWERS" : "TERM"}
        text={answer}
        accent
      />
    </Pressable>
  );
}

function Face({
  style,
  width,
  label,
  text,
  accent = false,
}: {
  style: object;
  width: number;
  label: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width,
          height: CARD_HEIGHT,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: accent ? COLORS.brand : GLASS.border,
          backgroundColor: GLASS.fillStrong,
          padding: 20,
          justifyContent: "center",
          alignItems: "center",
          backfaceVisibility: "hidden",
        },
        style,
      ]}
    >
      <Text
        style={{
          position: "absolute",
          top: 16,
          left: 20,
          fontSize: 10,
          fontWeight: "700",
          color: accent ? COLORS.brand : COLORS.dark.muted,
        }}
      >
        {label}
      </Text>
      <Text
        className="text-app-text text-center text-xl font-semibold"
        style={{ lineHeight: 30 }}
      >
        {text}
      </Text>
      <Text
        style={{
          position: "absolute",
          bottom: 14,
          fontSize: 11,
          color: COLORS.dark.muted,
        }}
      >
        Tap to flip
      </Text>
    </Animated.View>
  );
}
