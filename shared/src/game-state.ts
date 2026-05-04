// Shared between server (authoritative writer) and client (read-only renderer).

// Note: a separate "QUESTION_REVEAL" phase used to sit between ROUND_INTRO
// and BUZZ_OPEN, but it caused two problems: phones rendered the buzz UI
// during it (since BUZZ_OPEN was visually identical) and the host had to
// click an extra "Open Buzzers" button. The question text + answer cards
// now stagger in client-side during BUZZ_OPEN itself — buzzes are accepted
// from the moment the screen mounts.
export type GamePhase =
  | "LOBBY"
  | "ROUND_INTRO"
  | "BUZZ_OPEN"
  | "ANSWER_LOCK"
  | "REVEAL"
  | "SCOREBOARD"
  | "FINAL_WAGER"
  | "WINNER";

export type DeviceType = "phone" | "buzz";

export type RoundIndex = 1 | 2 | 3 | 4; // 4 = final

export interface BuzzSlot {
  dongleId: number;
  controllerIndex: number; // 0..3
}

export interface Player {
  id: string;
  name: string;
  deviceType: DeviceType;
  buzzSlot?: BuzzSlot;
  score: number;
  connected: boolean;
  joinedAt: number;
}

// Public projection of a question — `correct` is omitted until phase = REVEAL
// to prevent clients from snooping the answer in devtools.
export interface QuestionPublic {
  text: string;
  answers: [string, string, string, string];
  category?: string;
  media?: { type: "image" | "audio"; src: string } | null;
}

export interface SpeedRoundAnswer {
  choice: number; // 0..3
  timestamp: number;
}

export interface RevealResult {
  correctIndex: number;
  scoreDeltas: Record<string, number>;
  buzzedPlayerId?: string;
  buzzedAnswer?: number;
  buzzedCorrect?: boolean;
}

export interface GameState {
  roomCode: string;
  hostId: string;
  phase: GamePhase;
  players: Player[];
  packId?: string;
  currentRound: RoundIndex;
  questionIndex: number;
  currentQuestion?: QuestionPublic;
  buzzedPlayerId?: string;
  buzzWindowEndsAt?: number;
  lockedOutPlayerIds: string[];
  speedRoundAnswers?: Record<string, SpeedRoundAnswer>;
  wagers?: Record<string, number>;
  lastReveal?: RevealResult;
  startedAt?: number;
}
