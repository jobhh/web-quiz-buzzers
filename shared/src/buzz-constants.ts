// PlayStation Buzz dongle USB IDs and device topology.
// 1 dongle exposes 4 controllers; each controller has 5 buttons:
//   index 0 = big red BUZZ button
//   index 1 = yellow (answer A)
//   index 2 = green  (answer B)
//   index 3 = orange (answer C)
//   index 4 = blue   (answer D)

export const BUZZ_VENDOR_ID = 0x054c;
export const BUZZ_PRODUCT_ID = 0x0002;

export const CONTROLLERS_PER_DONGLE = 4;
export const BUTTONS_PER_CONTROLLER = 5;

export const BUTTON_NAMES = ["red", "yellow", "green", "orange", "blue"] as const;
export type BuzzButtonName = (typeof BUTTON_NAMES)[number];

export const BUTTON_INDEX = {
  red: 0,
  yellow: 1,
  green: 2,
  orange: 3,
  blue: 4,
} as const;

export type AnswerChoice = 0 | 1 | 2 | 3;

// Maps the 4 colored answer buttons (1..4 = Y/G/O/B) to multiple-choice
// answer indices A..D. The mapping matches physical button colors to
// on-screen answer colors: A=blue, B=orange, C=green, D=yellow.
const ANSWER_MAP = { 1: 3, 2: 2, 3: 1, 4: 0 } as const;

export function buttonToChoice(buttonIndex: number): AnswerChoice | undefined {
  return (ANSWER_MAP as Record<number, AnswerChoice>)[buttonIndex];
}
