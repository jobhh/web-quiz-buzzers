// Bit positions in the 6-byte input report for each (controller, button).
// Source: https://gist.github.com/Lewiscowles1986/eef220dac6f0549e4702393a7b9351f6
//
// Report bytes 0,1 are constant 0x7F. Byte 5 is constant 0xF0. Bits live in bytes 2-4.
// Order per controller is fixed: [red, yellow, green, orange, blue].
// Total 20 bits = 5 buttons × 4 controllers, packed sequentially starting at byte 2 bit 0.
//
// HARDWARE VERIFICATION: This layout is taken from a published reverse-engineering of the
// PS2 EU "Buzz" dongle. Hardware re-verification recommended before shipping a real game
// (run `/?debug=hid`, press each button, confirm the right cell lights up).

export interface BitPosition {
  byte: number;
  bit: number;
}

// Indexed as BIT_POSITIONS[controllerIndex][buttonIndex].
export const BIT_POSITIONS: readonly (readonly BitPosition[])[] = [
  // controller 0
  [
    { byte: 2, bit: 0 }, // red
    { byte: 2, bit: 1 }, // yellow
    { byte: 2, bit: 2 }, // green
    { byte: 2, bit: 3 }, // orange
    { byte: 2, bit: 4 }, // blue
  ],
  // controller 1
  [
    { byte: 2, bit: 5 },
    { byte: 2, bit: 6 },
    { byte: 2, bit: 7 },
    { byte: 3, bit: 0 },
    { byte: 3, bit: 1 },
  ],
  // controller 2
  [
    { byte: 3, bit: 2 },
    { byte: 3, bit: 3 },
    { byte: 3, bit: 4 },
    { byte: 3, bit: 5 },
    { byte: 3, bit: 6 },
  ],
  // controller 3
  [
    { byte: 3, bit: 7 },
    { byte: 4, bit: 0 },
    { byte: 4, bit: 1 },
    { byte: 4, bit: 2 },
    { byte: 4, bit: 3 },
  ],
];
