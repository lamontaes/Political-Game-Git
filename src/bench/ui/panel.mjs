/* global document */
// Shared panel behavior and close controls. A panel is
// the `.panel` frame in play.css; this file is how the play screen opens and closes it
// and where every panel's close control comes from.
const $ = (id) => document.getElementById(id);

/**
 * The panels that are a scene the player is in: a meeting, a desk (and the floor vote, the
 * nominations and the orders that use it), election day, its returns and the ballot. While one
 * is open the game is in scene mode, which hides the rail and the card (`#game.cinema`).
 */
export const SCENE_PANELS = [
  "meeting",
  "desk",
  "election-day",
  "returns",
  "ballot",
];

/** Open or close a panel (or any element) by id; a scene panel also sets the scene mode. */
export function show(id, on) {
  $(id).hidden = !on;
  if (SCENE_PANELS.includes(id))
    $("game").classList.toggle(
      "cinema",
      SCENE_PANELS.some((scene) => $(scene) && !$(scene).hidden),
    );
}

/** The thin X every panel closes with. */
export function closeButton({ id, testid }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "glyph close";
  button.setAttribute("aria-label", "Close");
  if (id) button.id = id;
  if (testid) button.dataset.testid = testid;
  return button;
}

/** Replace each `[data-close]` slot in the page with the shared close button. */
export function mountCloseButtons(root = document) {
  for (const slot of root.querySelectorAll("[data-close]")) {
    slot.replaceWith(
      closeButton({ id: slot.dataset.close, testid: slot.dataset.testid }),
    );
  }
}

/**
 * The head every sheet-like panel carries: its title, and the close control at its right.
 * One builder for the sheet and the race menu (and any panel after them).
 */
export function panelHead({ titleId, closeId, testid }) {
  const head = document.createElement("header");
  head.className = "sheet-head";
  const title = document.createElement("h2");
  title.className = "heading";
  if (titleId) title.id = titleId;
  const acts = document.createElement("div");
  acts.className = "acts";
  acts.append(closeButton({ id: closeId, testid }));
  head.append(title, acts);
  return head;
}

/** Replace each `[data-panel-head]` slot in the page with the shared panel head. */
export function mountPanelHeads(root = document) {
  for (const slot of root.querySelectorAll("[data-panel-head]")) {
    slot.replaceWith(
      panelHead({
        titleId: slot.dataset.titleId,
        closeId: slot.dataset.closeId,
        testid: slot.dataset.testid,
      }),
    );
  }
}
