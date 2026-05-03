import { useEffect, useRef } from "react";
import { audioManager, type MusicTrack, type SfxName } from "./audio-manager";
import type { GameState } from "@shared/game-state";

// Maps each game phase to a music track + a one-shot SFX cue. Driven from
// HostClient so the host machine plays everything (phones stay silent).
//
// Tracks what was last fired to avoid retriggering on incidental re-renders.
export function usePhaseAudio(state: GameState | null): void {
  const last = useRef<{ phase: string; round: number; q: number } | null>(null);

  useEffect(() => {
    if (!state) return;
    const key = { phase: state.phase, round: state.currentRound, q: state.questionIndex };
    const prev = last.current;
    if (prev && prev.phase === key.phase && prev.round === key.round && prev.q === key.q) return;
    last.current = key;

    const music = musicForPhase(state);
    if (music) audioManager.playMusic(music);

    const sfx = sfxForPhase(state, prev?.phase);
    if (sfx) audioManager.playSfx(sfx);
  }, [state?.phase, state?.currentRound, state?.questionIndex]);
}

function musicForPhase(state: GameState): MusicTrack | null {
  switch (state.phase) {
    case "LOBBY":
      return "lobby";
    case "WINNER":
      return "win";
    case "BUZZ_OPEN":
    case "ANSWER_LOCK":
    case "FINAL_WAGER":
      return "tension";
    default:
      return "gameplay";
  }
}

function sfxForPhase(state: GameState, prevPhase: string | undefined): SfxName | null {
  switch (state.phase) {
    case "QUESTION_REVEAL":
      return "swoosh";
    case "REVEAL": {
      const reveal = state.lastReveal;
      if (!reveal) return null;
      const positive = Object.values(reveal.scoreDeltas).some((d) => d > 0);
      return positive ? "ding" : "honk";
    }
    case "ROUND_INTRO":
      return prevPhase === "LOBBY" ? null : "drumroll";
    default:
      return null;
  }
}
