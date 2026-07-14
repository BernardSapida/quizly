import { Check } from "lucide-react-native";
import { Text, View } from "react-native";

import { COLORS } from "@/theme";

/** Anything the mastery aggregates in repo.ts hang off — a set, a folder. */
export type MasteryStats = {
  term_count: number;
  choice_mastered: number;
  written_mastered: number;
};

type State = "empty" | "not-started" | "learning" | "familiar" | "mastered";

export type Mastery = {
  state: State;
  label: string;
  color: string;
  /** Progress toward the next milestone, not a total — see `masteryOf`. */
  done: number;
  goal: number;
  /** The full picture in words. The chip is a glance; this is the read. */
  detail: string;
};

/**
 * A bar answers "how far along am I". It does not answer "am I done with this",
 * which is the only question worth asking when you are scanning a list of twelve
 * lessons the night before an exam. So: one state per lesson, and a number that
 * counts down to the *next* thing standing between you and mastered.
 *
 * The ladder is the app's own colour language, unchanged: blue is Familiarize,
 * green is Identify. Clearing Familiarize turns you blue; clearing Identify on top
 * of it turns you green. Orange keeps its meaning from the answer screen — "not
 * yet", never "wrong".
 */
export function masteryOf({
  term_count,
  choice_mastered,
  written_mastered,
}: MasteryStats): Mastery {
  const familiar = choice_mastered >= term_count;
  const identified = written_mastered >= term_count;
  const detail = `${choice_mastered} of ${term_count} familiarized · ${written_mastered} of ${term_count} identified`;

  if (term_count === 0) {
    return { state: "empty", label: "EMPTY", color: COLORS.dark.muted, done: 0, goal: 0, detail: "No terms yet" };
  }
  if (familiar && identified) {
    return { state: "mastered", label: "MASTERED", color: COLORS.correct, done: term_count, goal: term_count, detail };
  }
  // Recognising every term is the milestone worth calling out on its own: it is the
  // point where the remaining work changes shape, from "learn these" to "produce these".
  if (familiar) {
    return { state: "familiar", label: "FAMILIAR", color: COLORS.brand, done: written_mastered, goal: term_count, detail };
  }
  if (choice_mastered === 0 && written_mastered === 0) {
    return { state: "not-started", label: "NOT STARTED", color: COLORS.roundIdle, done: 0, goal: term_count, detail };
  }
  return { state: "learning", label: "LEARNING", color: COLORS.encourage, done: choice_mastered, goal: term_count, detail };
}

/** #RRGGBB -> rgba(). Chips are tinted washes of their colour, never solid fills:
 *  a solid chip competes with the IconTile, which is the card's one opaque anchor. */
const tint = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/**
 * Floored, not rounded. 31 of 32 rounds to 100%, and a chip reading LEARNING 100%
 * is a bug report waiting to happen — the only thing allowed to say 100 is a state
 * that has actually cleared, and those states show a label, not a number.
 */
const percent = (done: number, goal: number) =>
  goal === 0 ? 0 : Math.floor((done / goal) * 100);

export function MasteryChip({ stats, size = "sm" }: { stats: MasteryStats; size?: "sm" | "md" }) {
  const m = masteryOf(stats);
  if (m.state === "empty") return null;

  const showPct = m.state === "learning" || m.state === "familiar";
  const big = size === "md";

  return (
    <View
      accessibilityLabel={`${m.label.toLowerCase()}. ${m.detail}`}
      className={`flex-row items-center self-start rounded-full ${big ? "gap-2 px-3.5 py-2" : "gap-1.5 px-2.5 py-1"}`}
      style={{
        backgroundColor: tint(m.color, 0.16),
        borderWidth: 1,
        borderColor: tint(m.color, 0.35),
      }}
    >
      <Text
        className={`font-bold ${big ? "text-xs" : "text-[10px]"}`}
        style={{ color: m.color, letterSpacing: 0.6 }}
      >
        {m.label}
      </Text>

      {showPct && (
        <Text className={`font-semibold ${big ? "text-xs" : "text-[10px]"}`} style={{ color: m.color, opacity: 0.85 }}>
          {percent(m.done, m.goal)}%
        </Text>
      )}

      {m.state === "mastered" && <Check color={m.color} size={big ? 14 : 12} strokeWidth={3} />}
    </View>
  );
}
