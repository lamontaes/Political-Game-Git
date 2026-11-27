/* global document, localStorage, fetch */
// Dev mode as a setting: one flag on the body, remembered in the browser, off by default.
// Anything marked `.dev-only` shows while it is on. Options holds the checkbox.
// The play server answers dev mode's routes only while it has been told the setting is on, in the
// installed game as in the bench (handler.ts): the page tells it when the setting changes and when it loads.
const KEY = "ocd-dev-mode";
const listeners = new Set();

function remembered() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Tells the play server whether dev mode is on. A server that cannot be reached just keeps its last word. */
function tell(on) {
  fetch(`/api/devmode?on=${on ? 1 : 0}`, { method: "POST" }).catch(() => {});
}

export function devModeOn() {
  return document.body.classList.contains("dev");
}

/** Turns dev mode on or off, remembers it and tells whoever listens. */
export function setDevMode(on) {
  document.body.classList.toggle("dev", on);
  tell(on);
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* private window: the setting lasts until the page closes */
  }
  for (const fn of listeners) fn(on);
}

/** Calls `fn(on)` whenever dev mode changes. */
export function onDevMode(fn) {
  listeners.add(fn);
}

/** Restores the remembered setting when the page starts. */
export function restoreDevMode() {
  if (!remembered()) return;
  document.body.classList.add("dev");
  tell(true);
}
