# Phase 2 — WebHID Buzz Controller Layer

## Context Links
- Plan: [plan.md](plan.md)
- Prev: [phase-01-foundation-and-tooling.md](phase-01-foundation-and-tooling.md)
- Next: [phase-03-game-state-server-and-rooms.md](phase-03-game-state-server-and-rooms.md)

## Overview
- **Priority**: P1 (blocks lobby + claim flow)
- **Status**: pending
- **Effort**: ~4h
- Build `BuzzController` TS class wrapping WebHID. Parse 6-byte input reports, diff state to derive press/release events, control LEDs via 8-byte output report. Support multiple dongles.

## Key Insights
- VID 0x054C (Sony), PID 0x0002 (Buzz dongle). One dongle = 4 controllers.
- Input report: 6 bytes. Bytes 0,1 = 0x7F constant. Byte 5 = 0xF0 constant. Bytes 2,3,4 hold 20 button bits packed (5 buttons × 4 controllers).
- **Critical quirk**: simultaneous presses don't OR into one report — they arrive as separate frames. So we MUST diff against last known state to fire correct press/release events.
- LED output: 8 bytes. Byte 0 = 0x00 header. Bytes 1-4 = 0xFF (on) or 0x00 (off) for each controller's red LED. Bytes 5-7 padding 0x00.
- WebHID: Chrome/Edge only. `requestDevice` requires user gesture. To support 2 dongles: button to "Add another Buzz dongle" calling `requestDevice` again.
- Button layout per controller: index 0 = big red buzz, indices 1-4 = colored Y/G/O/B (map directly to multiple-choice answers A/B/C/D).

## Requirements
**Functional**
- Singleton `BuzzManager` lazily attaches to Buzz devices on user gesture
- Emits typed events: `press`, `release` with `{ dongleId, controllerIndex, buttonIndex }`
- Maintains current button-state map for polling-style queries
- LED setter API: `setLed(dongleId, controllerIndex, on)` and bulk `setLeds(dongleId, [bool, bool, bool, bool])`
- Auto-reconnect on disconnect/replug (WebHID `disconnect` event + `requestDevice` re-prompt is the only recovery — surface state)
- Debug overlay accessible at `/?debug=hid` showing live state + a button to toggle each LED

**Non-functional**
- Press-to-event latency <5ms (just diff + dispatch — no async work in hot path)
- Zero allocations per input report (reuse internal byte buffer for diffing)

## Architecture
- `BuzzController` class per device (1 dongle). Owns 4 logical controllers (slot 0-3).
- `BuzzManager` registry of all attached `BuzzController`s. Aggregates events via EventTarget.
- Input parser: byte layout from research → bit positions per (controller, button). Implement as lookup table for speed/clarity.
- Diff loop: prev[20] vs new[20] → fire events for changed bits.
- LED writer: build 8-byte output array, call `device.sendReport(0, buffer)`.

## Bit Layout (verify on hardware in step 6)

Byte 2: `[c0_btn1, c0_btn2, c0_btn3, c0_btn4, c0_red, c1_btn1, c1_btn2, c1_btn3]` (LSB → MSB or reverse — verify)
Byte 3: `[c1_btn4, c1_red, c2_btn1, c2_btn2, c2_btn3, c2_btn4, c2_red, c3_btn1]`
Byte 4: `[c3_btn2, c3_btn3, c3_btn4, c3_red, ...padding]`

(Document the empirically verified bit map in code as a const lookup table once hardware-tested.)

## Related Code Files

**Create**
- `client/src/hid/buzz-controller.ts` — single-device wrapper class
- `client/src/hid/buzz-manager.ts` — multi-device aggregator + EventTarget
- `client/src/hid/buzz-types.ts` — `BuzzEvent`, `ButtonIndex`, `ControllerSlot` types
- `client/src/hid/buzz-bit-layout.ts` — bit-position lookup table (one source of truth)
- `client/src/hid/buzz-debug-overlay.tsx` — `/?debug=hid` UI: live grid of (dongle × controller × button) state, LED toggle buttons
- `client/src/hooks/use-buzz-events.ts` — React hook to subscribe to BuzzManager
- `shared/src/buzz-constants.ts` — VID/PID, button counts (shared so server can reason about them later if needed)

**Modify**
- `client/src/App.tsx` — add `?debug=hid` route guard

## Implementation Steps
1. Create `shared/src/buzz-constants.ts`: `VID = 0x054C`, `PID = 0x0002`, `BUTTONS_PER_CONTROLLER = 5`, `CONTROLLERS_PER_DONGLE = 4`
2. Create `client/src/hid/buzz-types.ts`: type defs for `BuzzPressEvent`, `BuzzReleaseEvent`, button index enum (RED=0, YELLOW=1, GREEN=2, ORANGE=3, BLUE=4)
3. Create `client/src/hid/buzz-bit-layout.ts`: const `BIT_POSITIONS: { byte: number, bit: number }[][]` indexed by `[controller][button]` — initial guess from research, MUST verify on hardware
4. Create `client/src/hid/buzz-controller.ts`: class wrapping `HIDDevice`. Constructor takes device + dongleId. `attach()`: subscribe to `inputreport` event. `parseReport(data: DataView)`: reads bytes 2-4, computes 20-bit state vector via lookup. `diff(newState)`: compares prev → emits press/release. `setLeds(states: boolean[4])`: builds 8-byte buffer, `sendReport(0, buffer)`.
5. Create `client/src/hid/buzz-manager.ts`: singleton extending `EventTarget`. `requestDongle()`: calls `navigator.hid.requestDevice({ filters: [{vendorId, productId}]})`, wraps each granted device in a `BuzzController`, assigns dongleId 0..N. Re-emits per-controller events with dongleId attached. Listens to `navigator.hid.disconnect` to remove controllers.
6. **Hardware verify**: run debug overlay, press each button on each controller, confirm bit layout. Adjust `BIT_POSITIONS` if wrong. Commit verified layout.
7. Create `client/src/hooks/use-buzz-events.ts`: hook returning `{ pressEvent, currentState, requestDongle, dongles[] }`. Uses `useSyncExternalStore` over BuzzManager.
8. Create `client/src/hid/buzz-debug-overlay.tsx`: full-screen grid showing each dongle, its 4 controllers, each button's lit/unlit dot. Buttons to toggle each red LED. "Add Dongle" button.
9. Wire `/?debug=hid` query param in `App.tsx` to render overlay
10. Manual test: 1 dongle plugged, all 5 buttons × 4 controllers responsive, LEDs toggle on/off, simultaneous presses (multiple controllers' big-red buzzed at once) all fire correctly thanks to diff
11. Stretch test: 2 dongles plugged, click "Add Dongle" twice, all 8 controllers responsive, no event cross-talk

## Todo List
- [ ] Define VID/PID constants in shared
- [ ] Define BuzzEvent / ButtonIndex types
- [ ] Implement bit-position lookup table (initial guess)
- [ ] Implement BuzzController class (parse + diff + LED)
- [ ] Implement BuzzManager (multi-device + EventTarget)
- [ ] Hardware verify bit layout, commit corrections
- [ ] Build `useBuzzEvents` hook
- [ ] Build debug overlay component
- [ ] Wire `?debug=hid` route
- [ ] Manual test single dongle (5 btns × 4 controllers)
- [ ] Manual test simultaneous presses
- [ ] Manual test 2-dongle setup

## Success Criteria
- Debug overlay correctly reflects every button press/release with no missed events
- Pressing the big red button on all 4 controllers within ~10ms shows 4 distinct press events
- LED toggle from UI lights/extinguishes the correct controller's red LED
- 2-dongle setup works without event cross-talk
- All this works in Chrome/Edge; Safari/Firefox shows graceful "WebHID not supported" message

## Risk Assessment
- **R**: Bit layout from research may be slightly wrong → **M**: hardware verify in step 6 before building anything that depends on it
- **R**: WebHID permission revoked / device unplugged mid-game → **M**: surface disconnect events, host gets clear UI prompt to re-grant
- **R**: 2 dongles with same VID/PID — `requestDevice` UX dialog only shows the new one → **M**: trust browser dialog, document this in setup notes

## Security Considerations
- WebHID API requires explicit user gesture and permission grant — no silent device access
- Only filter on Buzz VID/PID, never accept other HID devices
- LED output bytes are constant pattern — no injection vector
- Debug overlay only at `/?debug=hid` query — not linked from production UI

## Next Steps
- Phase 6 (lobby) consumes this for "claim a slot" interaction + LED feedback
- Phase 7 (round mechanics) consumes this for buzz-in detection + LED winner highlight
