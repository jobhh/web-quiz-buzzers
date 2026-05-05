import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { SettingsProvider } from "./lib/settings-context";
import { ScanlineOverlay } from "./components/style/scanline-overlay";
import { SettingsPanel } from "./components/style/settings-panel";
import { ReducedMotionClass } from "./anim/reduced-motion-class";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root element");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <SettingsProvider>
      <ReducedMotionClass />
      <App />
      <SettingsPanel />
      <ScanlineOverlay />
    </SettingsProvider>
  </React.StrictMode>,
);
