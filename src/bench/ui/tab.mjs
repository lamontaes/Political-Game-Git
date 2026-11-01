import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

/**
 * The one tab part: a `.tab` button, `.on` while it is the chosen one. `attr` names the
 * data attribute that carries its key (`level`, `group`), so a bar can be read back and
 * the browser checks can find a tab by it.
 */
export function makeTab({
  key,
  label,
  attr = "tab",
  active = false,
  onSelect,
}) {
  const tab = makeButton({
    className: active ? "tab on" : "tab",
    textContent: label,
  });
  tab.dataset[attr] = key;
  tab.setAttribute("aria-pressed", String(active));
  if (onSelect) tab.addEventListener("click", onSelect);
  return tab;
}

/** Mark the tab in `bar` whose `attr` key is `key` as the chosen one. */
export function chooseTab(bar, attr, key) {
  for (const tab of bar.querySelectorAll(".tab")) {
    const on = tab.dataset[attr] === key;
    tab.classList.toggle("on", on);
    tab.setAttribute("aria-pressed", String(on));
  }
}

/**
 * A bar of tabs (`tabs`: { key, label, onSelect }), `active` chosen, keyed by `attr`, on
 * the rail every tab sits on (owner, Oct 29: buttons need "a railing to sit on" and a
 * clear mark on the chosen one).
 */
export function tabBar({ tabs, active, attr = "tab", className = "" }) {
  return el(
    "nav",
    { className: `tab-rail ${className}`.trim() },
    ...tabs.map((tab) => makeTab({ ...tab, attr, active: tab.key === active })),
  );
}
