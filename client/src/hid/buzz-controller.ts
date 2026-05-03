import {
  BUTTON_NAMES,
  BUTTONS_PER_CONTROLLER,
  CONTROLLERS_PER_DONGLE,
} from "@shared/buzz-constants";
import { BIT_POSITIONS } from "./buzz-bit-layout";
import type {
  BuzzEventListener,
  BuzzEventPayload,
  ButtonIndex,
  ControllerSlot,
} from "./buzz-types";

const TOTAL_BUTTONS = CONTROLLERS_PER_DONGLE * BUTTONS_PER_CONTROLLER;

// Wraps a single Buzz dongle (HIDDevice). Parses 6-byte input reports into
// per-button press/release events by diffing against last known state.
//
// LED control: 8-byte unnumbered output report, byte 0 = 0x00 header,
// bytes 1-4 = 0xFF/0x00 per controller's red LED, bytes 5-7 padding.
export class BuzzController {
  private state: boolean[] = new Array(TOTAL_BUTTONS).fill(false);
  private ledState: boolean[] = new Array(CONTROLLERS_PER_DONGLE).fill(false);
  private listeners = new Set<BuzzEventListener>();
  private inputReportListener: ((e: HIDInputReportEvent) => void) | null = null;

  constructor(
    public readonly device: HIDDevice,
    public readonly dongleId: number,
  ) {}

  async attach(): Promise<void> {
    if (!this.device.opened) await this.device.open();
    this.inputReportListener = (e) => this.handleInputReport(e.data);
    this.device.addEventListener("inputreport", this.inputReportListener);
  }

  async detach(): Promise<void> {
    if (this.inputReportListener) {
      this.device.removeEventListener("inputreport", this.inputReportListener);
      this.inputReportListener = null;
    }
    if (this.device.opened) {
      try {
        await this.device.close();
      } catch {
        // device may already be gone (unplug); ignore.
      }
    }
  }

  on(cb: BuzzEventListener): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  isPressed(controllerIndex: ControllerSlot, buttonIndex: ButtonIndex): boolean {
    return this.state[controllerIndex * BUTTONS_PER_CONTROLLER + buttonIndex];
  }

  isLedOn(controllerIndex: ControllerSlot): boolean {
    return this.ledState[controllerIndex];
  }

  async setLed(controllerIndex: ControllerSlot, on: boolean): Promise<void> {
    this.ledState[controllerIndex] = on;
    await this.flushLeds();
  }

  async setLeds(states: readonly boolean[]): Promise<void> {
    for (let i = 0; i < CONTROLLERS_PER_DONGLE; i++) {
      this.ledState[i] = !!states[i];
    }
    await this.flushLeds();
  }

  async clearAllLeds(): Promise<void> {
    await this.setLeds([false, false, false, false]);
  }

  private async flushLeds(): Promise<void> {
    // 8-byte unnumbered output report.
    const buf = new Uint8Array(8);
    buf[0] = 0x00;
    for (let i = 0; i < CONTROLLERS_PER_DONGLE; i++) {
      buf[i + 1] = this.ledState[i] ? 0xff : 0x00;
    }
    // bytes 5..7 left as 0
    try {
      await this.device.sendReport(0, buf);
    } catch (err) {
      console.warn(`[buzz] sendReport failed for dongle ${this.dongleId}`, err);
    }
  }

  private handleInputReport(data: DataView): void {
    if (data.byteLength < 5) return; // safety: malformed/short report
    for (let c = 0; c < CONTROLLERS_PER_DONGLE; c++) {
      const buttonsForController = BIT_POSITIONS[c];
      for (let b = 0; b < BUTTONS_PER_CONTROLLER; b++) {
        const { byte, bit } = buttonsForController[b];
        if (byte >= data.byteLength) continue;
        const isPressed = ((data.getUint8(byte) >> bit) & 1) === 1;
        const idx = c * BUTTONS_PER_CONTROLLER + b;
        if (isPressed === this.state[idx]) continue;
        this.state[idx] = isPressed;
        const payload: BuzzEventPayload = {
          dongleId: this.dongleId,
          controllerIndex: c as ControllerSlot,
          buttonIndex: b as ButtonIndex,
          buttonName: BUTTON_NAMES[b],
        };
        for (const cb of this.listeners) cb(payload, isPressed ? "press" : "release");
      }
    }
  }
}
