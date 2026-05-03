import type { BuzzButtonName } from "@shared/buzz-constants";

export type DongleId = number;
export type ControllerSlot = 0 | 1 | 2 | 3;
export type ButtonIndex = 0 | 1 | 2 | 3 | 4;
export type BuzzEventKind = "press" | "release";

export interface BuzzEventPayload {
  dongleId: DongleId;
  controllerIndex: ControllerSlot;
  buttonIndex: ButtonIndex;
  buttonName: BuzzButtonName;
}

export type BuzzEventListener = (
  payload: BuzzEventPayload,
  kind: BuzzEventKind,
) => void;
