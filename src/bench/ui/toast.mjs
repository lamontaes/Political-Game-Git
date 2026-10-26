/* global setTimeout, clearTimeout */
// The one toast part (owner, Oct 26: a toast that never leaves is a defect). A toast is a
// `.toast` panel at a screen corner that holds for `seconds`, fades over its last second
// and goes, and goes at once on its close control (a `[data-close]` slot, see panel.mjs).
const timers = new Map();

export function hideToast(node) {
  clearTimeout(timers.get(node));
  timers.delete(node);
  node.hidden = true;
  node.classList.remove("fading");
}

export function showToast(node, seconds, onGone) {
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
