/* global document, MutationObserver */
// The one toast part. A toast is a `.toast` panel at a screen corner. It
// never times out: it stays until the player opens or closes it (a
// `[data-close]` slot, see panel.mjs), and until then it waits behind
// whatever the player has open: a scene, a talk, a person's card or a menu,
// and shows when that closes.
import { SCENE_PANELS } from "./panel.mjs";
// What is waiting for the stage to clear.
const waiting = new Set();
// The toasts on screen now: a scene, a card or a menu that opens takes them down to wait.
const shown = new Set();
let watching = false;
// The panels that take the stage: the talk, a person's card, a menu, and the scenes and held
// decisions (the meeting, the desk, the floor vote, nominations and orders, election day, its
// returns and the ballot).
const STAGE = ["talk", "person", "sheet", ...SCENE_PANELS];
const stagePanels = () =>
  STAGE.map((id) => document.getElementById(id)).filter(Boolean);
const stageTaken = () => stagePanels().some((panel) => !panel.hidden);
function watchStage() {
  if (watching) return;
  const panels = stagePanels();
  if (!panels.length) return;
  watching = true;
  const observer = new MutationObserver(() => {
    if (stageTaken()) {
      // A toast already up comes down and waits like one asked for during it.
      for (const node of [...shown]) {
        shown.delete(node);
        node.hidden = true;
        waiting.add(node);
      }
      return;
    }
    for (const node of [...waiting]) {
      waiting.delete(node);
      showToast(node);
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
  node.hidden = true;
}

export function showToast(node) {
  watchStage();
  if (stageTaken()) {
    node.hidden = true;
    waiting.add(node);
    return;
  }
  node.hidden = false;
  shown.add(node);
}
