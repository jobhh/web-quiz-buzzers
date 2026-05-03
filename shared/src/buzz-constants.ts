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

// Maps the 4 colored answer buttons to multiple-choice answer indices A..D.
// (Yellow=A, Green=B, Orange=C, Blue=D — matches PSEye/Buzz-game conventions.)
export const ANSWER_BUTTON_TO_CHOICE: Record<number, number> = {
  1: 0, // yellow → A
  2: 1, // green  → B
  3: 2, // orange → C
  4: 3, // blue   → D
};
