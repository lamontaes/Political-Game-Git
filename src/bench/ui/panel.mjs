/* global document */
// Shared panel behavior and close controls. A panel is
// the `.panel` frame in play.css; this file is how the play screen opens and closes it
// and where every panel's close control comes from.
const $ = (id) => document.getElementById(id);

/** Open or close a panel (or any element) by id. */
export function show(id, on) {
  $(id).hidden = !on;
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
