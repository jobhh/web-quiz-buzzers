import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { SettingsProvider } from "./lib/settings-context";
import { ScanlineOverlay } from "./components/style/scanline-overlay";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root element");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <SettingsProvider>
      <App />
      <ScanlineOverlay />
    </SettingsProvider>
  </React.StrictMode>,
);
