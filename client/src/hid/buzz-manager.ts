import { BUZZ_PRODUCT_ID, BUZZ_VENDOR_ID } from "@shared/buzz-constants";
import { BuzzController } from "./buzz-controller";
import type { BuzzEventListener } from "./buzz-types";

type ChangeListener = () => void;

// Singleton aggregator over all attached Buzz dongles. Re-emits per-button
// press/release events with their dongleId. Tracks attach/detach so React
// hooks can re-render via useSyncExternalStore.
class BuzzManager {
  private controllers: BuzzController[] = [];
  private eventListeners = new Set<BuzzEventListener>();
  private changeListeners = new Set<ChangeListener>();
  private nextDongleId = 0;
  private disconnectHandlerInstalled = false;

  isSupported(): boolean {
    return typeof navigator !== "undefined" && "hid" in navigator;
  }

  get dongles(): readonly BuzzController[] {
    return this.controllers;
  }

  // Re-attaches to dongles already authorized in a previous session.
  async restoreAttached(): Promise<void> {
    if (!this.isSupported()) return;
    this.installDisconnectHandler();
    const devices = await navigator.hid.getDevices();
    const buzzes = devices.filter(
      (d) => d.vendorId === BUZZ_VENDOR_ID && d.productId === BUZZ_PRODUCT_ID,
    );
    for (const device of buzzes) {
      if (this.controllers.some((c) => c.device === device)) continue;
      await this.addDevice(device);
    }
  }

  // Prompts the user to authorize one (more) dongle. Requires a user gesture.
  async requestDongle(): Promise<BuzzController | null> {
    if (!this.isSupported()) return null;
    this.installDisconnectHandler();
    const devices = await navigator.hid.requestDevice({
      filters: [{ vendorId: BUZZ_VENDOR_ID, productId: BUZZ_PRODUCT_ID }],
    });
    if (devices.length === 0) return null;
    // The browser may have authorized multiple dongles in one prompt.
    let last: BuzzController | null = null;
    for (const device of devices) {
      if (this.controllers.some((c) => c.device === device)) continue;
      last = await this.addDevice(device);
    }
    return last;
  }

  on(cb: BuzzEventListener): () => void {
    this.eventListeners.add(cb);
    return () => {
      this.eventListeners.delete(cb);
    };
  }

  onChange(cb: ChangeListener): () => void {
    this.changeListeners.add(cb);
    return () => {
      this.changeListeners.delete(cb);
    };
  }

  private async addDevice(device: HIDDevice): Promise<BuzzController> {
    const controller = new BuzzController(device, this.nextDongleId++);
    await controller.attach();
    controller.on((p, kind) => {
      for (const cb of this.eventListeners) cb(p, kind);
    });
    this.controllers.push(controller);
    this.notifyChange();
    return controller;
  }

  private installDisconnectHandler(): void {
    if (this.disconnectHandlerInstalled || !this.isSupported()) return;
    this.disconnectHandlerInstalled = true;
    navigator.hid.addEventListener("disconnect", (e) => {
      const idx = this.controllers.findIndex((c) => c.device === e.device);
      if (idx === -1) return;
      const removed = this.controllers[idx];
      this.controllers.splice(idx, 1);
      removed.detach().catch(() => {});
      this.notifyChange();
    });
  }

  private notifyChange(): void {
    for (const cb of this.changeListeners) cb();
  }
}

export const buzzManager = new BuzzManager();
export type { BuzzManager };
