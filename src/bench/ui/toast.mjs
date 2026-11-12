/* global document, MutationObserver, setTimeout, clearTimeout */
// The one toast part (owner, Oct 26: a toast that never leaves is a defect). A toast is a
// `.toast` panel at a screen corner that holds for `seconds`, fades over its last second
// and goes, and goes at once on its close control (a `[data-close]` slot, see panel.mjs).
import { SCENE_PANELS } from "./panel.mjs";
const timers = new Map();
// While a scene, a talk, a meeting or a desk decision is on screen a toast waits, and shows once the scene ends (owner, Nov 7:
// "News pop-ups wait until the scene ends"): its seconds start when it shows, never before.
const waiting = new Map();
// The toasts on screen now, with what shows them again: a scene that opens takes them down to wait.
const shown = new Map();
let watching = false;
// The panels a scene or a held decision takes the stage with: the talk, the meeting, the desk
// (also the floor vote, nominations and orders), election day, its returns and the ballot.
const SCENES = ["talk", ...SCENE_PANELS];
const scenePanels = () =>
  SCENES.map((id) => document.getElementById(id)).filter(Boolean);
const sceneOpen = () => scenePanels().some((panel) => !panel.hidden);
function watchScene() {
  if (watching) return;
  const panels = scenePanels();
  if (!panels.length) return;
  watching = true;
  const observer = new MutationObserver(() => {
    if (sceneOpen()) {
      // A toast already up when a scene opens comes down and waits like one asked for during it.
      for (const [node, args] of [...shown]) {
        shown.delete(node);
        clearTimeout(timers.get(node));
        timers.delete(node);
        node.hidden = true;
        node.classList.remove("fading");
        waiting.set(node, args);
      }
      return;
    }
    for (const [node, [seconds, onGone]] of [...waiting]) {
      waiting.delete(node);
      showToast(node, seconds, onGone);
    }
  });
  for (const panel of panels)
    observer.observe(panel, {
      attributes: true,
      attributeFilter: ["hidden"],
    });
}

export function hideToast(node) {
  waiting.delete(node);
  shown.delete(node);
  clearTimeout(timers.get(node));
  timers.delete(node);
  node.hidden = true;
  node.classList.remove("fading");
}

export function showToast(node, seconds, onGone) {
  watchScene();
  if (sceneOpen()) {
    node.hidden = true;
    waiting.set(node, [seconds, onGone]);
    return;
  }
  clearTimeout(timers.get(node));
  node.style.setProperty("--toast-seconds", `${seconds}s`);
  // Restart the fade when a new line replaces an old one.
  node.classList.remove("fading");
  void node.offsetWidth;
  node.classList.add("fading");
  node.hidden = false;
  shown.set(node, [seconds, onGone]);
  timers.set(
    node,
    setTimeout(() => {
      hideToast(node);
      onGone?.();
    }, seconds * 1000),
  );
}
