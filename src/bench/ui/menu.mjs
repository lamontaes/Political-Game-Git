import { makeButton } from "./button.mjs";
import { el } from "./dom.mjs";

/**
 * A menu of choices for when there are too many for the talk box (owner, Oct 26: "If
 * there's this many options, it should open an actual menu. It shouldn't just be in the
 * chat"). One row per choice: its name, and under it the facts that tell it from the
 * others. `host` is a `.panel` holding an `h2` and a `[data-menu-rows]` list.
 */
export function fillChoiceMenu(host, { title, rows, onPick, paged }) {
  host.querySelector("h2").textContent = title;
  // Nothing in a menu scrolls: `paged` turns the rows into pages with Back and Continue.
  const items = rows.map((row) => {
    const item = makeButton(
      { className: "nav-item choice" },
      el("span", { className: "nl", textContent: row.label }),
      el("span", { className: "choice-facts", textContent: row.facts }),
    );
    item.dataset.choice = row.key;
    item.addEventListener("click", () => onPick(row.key));
    return item;
  });
  host
    .querySelector("[data-menu-rows]")
    .replaceChildren(...(paged ? [paged(items)] : items));
}
