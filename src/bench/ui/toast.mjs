/* global document, MutationObserver, setTimeout, clearTimeout */
// The one toast part (owner, Oct 26: a toast that never leaves is a defect). A toast is a
// `.toast` panel at a screen corner that holds for `seconds`, fades over its last second
// and goes, and goes at once on its close control (a `[data-close]` slot, see panel.mjs).
const timers = new Map();
// While a scene or talk is on screen a toast waits, and shows once the scene ends (owner, Nov 7:
// "News pop-ups wait until the scene ends"): its seconds start when it shows, never before.
const waiting = new Map();
let watching = false;
const sceneOpen = () => {
  const talk = document.getElementById("talk");
  return Boolean(talk && !talk.hidden);
};
function watchScene() {
  if (watching) return;
  const talk = document.getElementById("talk");
  if (!talk) return;
  watching = true;
  new MutationObserver(() => {
    if (sceneOpen()) return;
    for (const [node, [seconds, onGone]] of [...waiting]) {
      waiting.delete(node);
      showToast(node, seconds, onGone);
    }
  }).observe(talk, { attributes: true, attributeFilter: ["hidden"] });
}

export function hideToast(node) {
  waiting.delete(node);
  clearTimeout(timers.get(node));
  timers.delete(node);
  node.hidden = true;
  node.classList.remove("fading");
}

export function showToast(node, seconds, onGone) {
  if (sceneOpen()) {
    watchScene();
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
  timers.set(
    node,
    setTimeout(() => {
      hideToast(node);
      onGone?.();
    }, seconds * 1000),
  );
}
