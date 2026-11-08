/* global document, localStorage */
// The color-blind palette as one global setting (owner, Nov 5: every menu reads one shared
// place, colors are never set per screen): a class on the body, remembered in the browser, off
// by default. The shared colors are tokens in play.css; this class swaps them for the
// Okabe-Ito set and gives each color-only signal a second cue (a ring's stroke).
const KEY = "ocd-color-blind";

function remembered() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function colorBlindOn() {
  return document.body.classList.contains("color-blind");
}

/** Turns the palette on or off and remembers it. */
export function setColorBlind(on) {
  document.body.classList.toggle("color-blind", on);
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* private window: the setting lasts until the page closes */
  }
}

/** Restores the remembered setting when the page starts. */
export function restoreColorBlind() {
  if (remembered()) document.body.classList.add("color-blind");
}
