/* global document */
import { makeButton } from "./button.mjs";
import { el } from "./dom.mjs";

/**
 * The one menu part: a column of named entries, one row each, with nothing written under
 * the name (owner, Oct 26: "Remove the subheadings from the menu"). Each entry is a
 * `.nav-item` button carrying its screen key in `data-tab`, so the play screen opens it
 * the way it opens a rail icon. `onPick` is for menus that are not screens (a choice menu).
 */
export function menuItem({ key, label, onPick }) {
  const item = makeButton(
    { className: "nav-item" },
    el("span", { className: "nl", textContent: label }),
  );
  item.dataset.tab = key;
  if (onPick) item.addEventListener("click", () => onPick(key));
  return item;
}

/** Replace the `[data-menu-items]` slot in the page with the menu's entries. */
export function mountMenu(entries, root = document) {
  const slot = root.querySelector("[data-menu-items]");
  slot.replaceWith(...entries.map(menuItem));
}
