import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

import { usePreferencesStore } from "@/store";

/**
 * The two cues a session has, and no more. There is deliberately no wrong-answer
 * sound: a miss already costs you a forced Continue tap, and anything played over
 * it reads as a buzzer. See mvps/design-system.md §5 — a wrong answer is never
 * punished with harsh colour or sound.
 */
const SOURCES = {
  correct: require("../../../assets/sound/correct-answer.mp3"),
  roundFinish: require("../../../assets/sound/round-finish.mp3"),
};

/**
 * The chime lands during the 800ms dwell, so it can sit forward. The round-finish
 * sound is fuller and arrives with the summary screen unannounced — at full volume
 * it startles rather than celebrates.
 */
const VOLUME = { correct: 0.9, roundFinish: 0.6 } as const;

type Cue = keyof typeof SOURCES;

let players: Record<Cue, AudioPlayer> | null = null;

/**
 * Built once and kept for the life of the process. Creating a player per answer
 * pays the decode cost on the very beat the sound is supposed to land on.
 */
function ensurePlayers(): Record<Cue, AudioPlayer> | null {
  if (players) return players;

  try {
    // A phone on silent is a phone in a lecture. Respecting the mute switch is the
    // same instinct as the Settings toggle, and it does not need to be found first.
    void setAudioModeAsync({ playsInSilentMode: false }).catch(() => {});

    const built: Record<Cue, AudioPlayer> = {
      correct: createAudioPlayer(SOURCES.correct),
      roundFinish: createAudioPlayer(SOURCES.roundFinish),
    };
    for (const cue of Object.keys(built) as Cue[]) {
      built[cue].volume = VOLUME[cue];
    }

    players = built;
    return players;
  } catch {
    // Audio is a flourish. A device that cannot give us a player still studies fine.
    return null;
  }
}

/**
 * Fire-and-forget, and never awaited by a caller. Sound must not sit on the
 * tap-to-next-question path — a chime that delays the next card by even a frame
 * makes the app feel laggy in the one place it currently feels instant.
 */
function play(cue: Cue) {
  if (!usePreferencesStore.getState().soundEnabled) return;

  const player = ensurePlayers()?.[cue];
  if (!player) return;

  try {
    // Rewind first: a player parked at the end of the clip plays nothing the second
    // time, which is every answer after the first one.
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Ignore — see above.
  }
}

/** Call on session mount so the first correct answer is not the one that pays for decoding. */
export function primeSound() {
  ensurePlayers();
}

export function playCorrect() {
  play("correct");
}

export function playRoundFinish() {
  play("roundFinish");
}
