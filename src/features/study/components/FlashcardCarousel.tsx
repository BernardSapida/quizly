import { useMemo, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { Term } from "@/db";
import { parseAnswers } from "@/features/study/grading";
import { mask } from "@/features/study/mask";
import { COLORS, FLASHCARD, GLASS } from "@/theme";

const GAP = 12;
/** The answer list's number column. Fits "10" without wrapping, and every row's
 *  answer text starts at the same x whether it is item 1 or item 10. */
const INDEX_WIDTH = 18;
const FACE_PADDING = 20;

/** Long definitions at 20px eat the card. Shrink rather than clip. */
const LONG_TEXT = 160;

type Side = "front" | "back";

/**
 * The set preview: swipe through every term, tap a card to flip it between the
 * definition and the term. No grading, no progress — this is for browsing what is
 * in the set before you commit to studying it.
 */
export function FlashcardCarousel({ terms }: { terms: Term[] }) {
  const { width, height: screenHeight } = useWindowDimensions();
  const cardWidth = width - 40; // matches the screen's 20px horizontal padding
  const [index, setIndex] = useState(0);

  // One height for every card, measured from the tallest face in the set. Cards of
  // differing heights in a horizontal snap row read as broken as you swipe, so the
  // set's worst case sets the height for all of them — and nothing more, or a set of
  // one-word terms would pay for a definition it doesn't have.
  const tallest = useRef(0);
  const seen = useRef(0);
  const [measure, setMeasure] = useState<{ key: string; height: number | null }>({
    key: "",
    height: null,
  });

  // What the measurement is *of*. This screen hands down a fresh `terms` array on
  // every render, so keying the reset on the array itself threw the result away as
  // fast as it arrived and every card stayed at the floor. These are the only inputs
  // that actually change a face's height.
  let stamp = 0;
  for (const t of terms) stamp = Math.max(stamp, t.updated_at);
  const key = `${cardWidth}|${terms.length}|${stamp}`;

  if (measure.key !== key) {
    tallest.current = 0;
    seen.current = 0;
    setMeasure({ key, height: null });
  }

  const onMeasure = (e: LayoutChangeEvent) => {
    tallest.current = Math.max(tallest.current, e.nativeEvent.layout.height);
    seen.current += 1;
    // Every face has reported: commit the max and let the measure pass unmount.
    if (seen.current >= terms.length * 2) {
      setMeasure({ key, height: Math.ceil(tallest.current) });
    }
  };

  const cardHeight = Math.min(
    Math.max(measure.height ?? FLASHCARD.minHeight, FLASHCARD.minHeight),
    Math.round(screenHeight * FLASHCARD.maxRatio)
  );

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
          <Flashcard key={term.id} term={term} width={cardWidth} height={cardHeight} />
        ))}
      </ScrollView>

      {/* The measure pass: the same faces at their natural height, out of flow and
          invisible, discarded the moment every one has reported. */}
      {measure.height === null && (
        <View
          style={{ position: "absolute", top: 0, left: 0, opacity: 0 }}
          pointerEvents="none"
        >
          {terms.map((term) =>
            (["front", "back"] as const).map((side) => (
              <View
                key={`${term.id}-${side}`}
                style={{ width: cardWidth, padding: FACE_PADDING }}
                onLayout={onMeasure}
              >
                <FaceContent term={term} side={side} scroll={false} />
              </View>
            ))
          )}
        </View>
      )}

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

function Flashcard({
  term,
  width,
  height,
}: {
  term: Term;
  width: number;
  height: number;
}) {
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

  return (
    // A plain View, NOT a Pressable. Wrapping the card in one is the obvious way to
    // spend a tap, and it silently costs you the scroll: a Pressable claims the JS
    // responder on touch-down, which blocks the native scroll view underneath it, so
    // a drag on a ten-item card became a flip instead of a scroll. The press lives
    // inside each face's scroller now, where a drag correctly cancels it.
    <View style={{ width, height }}>
      {/* The hidden face is not just invisible, it is untouchable. Both faces are
          stacked absolutely, so the back — declared last — sits on top of the front
          even at opacity 0, and opacity does not stop it eating touches: every drag
          on a front face was landing on the back face's scroller. */}
      <Face
        style={front}
        term={term}
        side="front"
        width={width}
        height={height}
        active={!flipped}
        onFlip={toggle}
      />
      <Face
        style={back}
        term={term}
        side="back"
        width={width}
        height={height}
        active={flipped}
        onFlip={toggle}
      />
    </View>
  );
}

function Face({
  style,
  term,
  side,
  width,
  height,
  active,
  onFlip,
}: {
  style: object;
  term: Term;
  side: Side;
  width: number;
  height: number;
  active: boolean;
  onFlip: () => void;
}) {
  // A gesture, not a Pressable. A Pressable takes the touch on finger-down and holds
  // it, which starves the scroller inside — the card body simply would not move. A tap
  // gesture gives up the moment the finger travels, so a drag reaches the scroll view
  // and only a real tap flips the card.
  const tap = useMemo(
    () => Gesture.Tap().runOnJS(true).onEnd(onFlip),
    [onFlip]
  );

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        pointerEvents={active ? "auto" : "none"}
        style={[
        {
          position: "absolute",
          width,
          height,
          borderRadius: FLASHCARD.radius,
          borderWidth: 1,
          borderColor: side === "back" ? COLORS.brand : GLASS.border,
          backgroundColor: GLASS.fillStrong,
          padding: FACE_PADDING,
          backfaceVisibility: "hidden",
          // iOS lets children paint outside a View by default; a card whose text
          // escapes its own border is worse than one that scrolls.
          overflow: "hidden",
          // The resting state, in the static style on purpose. Reanimated commits an
          // animated style after the first paint, so until the first tap both faces
          // painted at opacity 1 and the back — declared last — won the frame: every
          // card opened showing its answer instead of its question.
          opacity: side === "front" ? 1 : 0,
          transform: side === "front" ? undefined : [{ rotateY: "180deg" }],
        },
          style,
        ]}
      >
        <FaceContent term={term} side={side} scroll />
      </Animated.View>
    </GestureDetector>
  );
}

/**
 * Shared by the real card and the measure pass, so the height we measure is the
 * height we render. The only difference is the escape hatch: on a real card the body
 * scrolls when the set's tallest term still exceeds the ceiling.
 */
function FaceContent({
  term,
  side,
  scroll,
}: {
  term: Term;
  side: Side;
  scroll: boolean;
}) {
  const isList = term.kind === "enumeration";
  const items = isList ? parseAnswers(term.answers) : [];
  const accent = side === "back";

  const label = isList
    ? side === "front"
      ? "ENUMERATION"
      : "ANSWERS"
    : side === "front"
      ? "DEFINITION"
      : "TERM";

  const body = <Body term={term} side={side} items={items} />;

  return (
    <>
      {/* Real rows, not absolute overlays. The label and footer used to be pinned to
          the card's edges over a centred text block, so tall text ran underneath them.
          They stay out of the scroller: which card this is, and how to turn it over,
          are not facts that should scroll away. */}
      <View className="flex-row items-start justify-between">
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: accent ? COLORS.brand : COLORS.dark.muted,
          }}
        >
          {label}
        </Text>
        {isList && (
          <Text style={{ fontSize: 10, fontWeight: "700", color: COLORS.dark.muted }}>
            {items.length === 1 ? "1 item" : `${items.length} items`}
          </Text>
        )}
      </View>

      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingVertical: 12 }}
          // Without this Android hands every vertical drag straight to the screen's
          // own ScrollView, which is the parent of this one: a ten-item enumeration
          // simply clipped, with no way to reach item ten. iOS ignores the prop.
          nestedScrollEnabled
          // On, unlike everywhere else in the app: this is the one scroller whose
          // existence is not obvious from its content, and the bar only paints when
          // there is actually something below the fold.
          showsVerticalScrollIndicator
        >
          {/* Grows to fill the viewport so a short body still centres, which the
              centring below is a no-op for once the body overflows — by then the
              content is taller than the box doing the centring. */}
          <View style={{ flexGrow: 1, justifyContent: "center" }}>{body}</View>
        </ScrollView>
      ) : (
        <View style={{ paddingVertical: 12 }}>{body}</View>
      )}

      <Text style={{ fontSize: 11, textAlign: "center", color: COLORS.dark.muted }}>
        Tap to flip
      </Text>
    </>
  );
}

function Body({
  term,
  side,
  items,
}: {
  term: Term;
  side: Side;
  items: string[];
}) {
  const isList = term.kind === "enumeration";

  // An enumeration's answers used to be join("\n")'d into one centred string, which
  // is exactly how you make four answers read as one sentence. Centred text with soft
  // wrapping has no left edge to count down, so the list boundary disappears.
  if (isList && side === "back") {
    return (
      <View className="gap-2">
        {items.map((item, i) => (
          <View
            key={i}
            className="flex-row items-center gap-3 rounded-xl px-3 py-2"
            style={{ backgroundColor: GLASS.fill, borderWidth: 1, borderColor: GLASS.border }}
          >
            {/* Wide enough for two digits on one line. At 12 the tenth item wrapped
                into a "1" stacked over a "0" — and every list of ten has a tenth. */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: COLORS.dark.muted,
                width: INDEX_WIDTH,
                textAlign: "right",
              }}
            >
              {i + 1}
            </Text>
            <Text className="text-app-text flex-1 text-base font-semibold">{item}</Text>
          </View>
        ))}
      </View>
    );
  }

  // Enumeration terms have no definition — the prompt itself is the front. The masked
  // slots say "this is a five-item recall" before you flip, which the bare prompt
  // never did, and reuse the study session's hint shape so the two agree.
  if (isList && side === "front") {
    return (
      <View className="gap-3">
        <Prose text={term.term} />
        <View className="flex-row flex-wrap justify-center gap-2">
          {items.map((item, i) => (
            // The pill is a View wrapping the Text, not a padded Text. A Text paints
            // its background across the whole line box — font ascent and descent
            // included — so the mask, which is a capital and a row of middle dots and
            // so never reaches the descent, sat pinned to the top of its own chip with
            // the leftover space pooling underneath it.
            <View
              key={i}
              style={{
                backgroundColor: GLASS.fill,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  lineHeight: 14,
                  includeFontPadding: false,
                  color: COLORS.dark.muted,
                  letterSpacing: 1,
                }}
              >
                {mask(item)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return <Prose text={side === "front" ? term.definition : term.term} />;
}

function Prose({ text }: { text: string }) {
  const long = text.length > LONG_TEXT;
  return (
    <Text
      className="text-app-text text-center font-semibold"
      style={{ fontSize: long ? 16 : 20, lineHeight: long ? 24 : 30 }}
    >
      {text}
    </Text>
  );
}
