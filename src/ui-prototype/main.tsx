import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { PrototypeApp } from "./App";

/**
 * Entry point for the development-only UI prototype.
 *
 * Mounted ONLY by `ui-prototype.html`. The production entry (`index.html` ->
 * `src/main.tsx`) has no import path to this file, and `vite build` takes only
 * `index.html` as its input, so nothing here can reach a production bundle.
 */

const rootElement = document.getElementById("ui-prototype-root");

if (!rootElement) {
  throw new Error("The UI prototype root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <PrototypeApp />
  </StrictMode>,
);
