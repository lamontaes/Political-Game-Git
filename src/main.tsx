import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { initializeRuntimeArt } from "./presentation/runtime-art";
import { setDeepTransitionInputGuard } from "./simulation/future-transitions";
import "./styles.css";
import "./player/player.css";
import "./player/shell.css";
import "./player/docket.css";
import "./player/front-door.css";

// The whole-save mutation proof runs in tests and development; a player's
// clock keeps only the cheap shape check (see future-transitions.ts).
setDeepTransitionInputGuard(import.meta.env.DEV);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Application root element was not found.");
}

rootElement.textContent = "Loading your game…";

initializeRuntimeArt(import.meta.env.VITE_RUNTIME_CONTENT === "1")
  .then(async () => {
    const { App } = await import("./App");
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    rootElement.textContent =
      error instanceof Error
        ? error.message
        : "The game could not start. Your saves are unchanged.";
  });
