// Politics → Your office, to its mock look (owner, Oct 29: "So they're not blocks of text
// anymore with random buttons"): a rail of tabs over one plate-built page at a time, so the
// menu fits its panel and never scrolls as a page. The screen builds each tab's nodes (fact
// plates, paged plates, the draft card on its own plate) and hands them here with the words.
import { el } from "./dom.mjs";
import { tabBar, chooseTab } from "./tab.mjs";

/**
 * `tabs`: [{ key, label, nodes }] (a tab with no nodes is left off); `active`: the key shown
 * first; `onTab(key)`: told when another is chosen, so the screen can remember it.
 */
export function officeScreen({ tabs, active, onTab }) {
  const shown = tabs.filter((tab) => tab.nodes.length);
  let at = shown.some((tab) => tab.key === active) ? active : shown[0]?.key;
  const body = el("div", { className: "office-body" });
  const draw = () =>
    body.replaceChildren(...(shown.find((tab) => tab.key === at)?.nodes ?? []));
  const bar = tabBar({
    tabs: shown.map((tab) => ({
      key: tab.key,
      label: tab.label,
      onSelect: () => {
        at = tab.key;
        chooseTab(bar, "office", at);
        onTab?.(at);
        draw();
      },
    })),
    active: at,
    attr: "office",
    className: "office-tabs",
  });
  // One page needs no rail.
  bar.hidden = shown.length < 2;
  draw();
  return el("div", { className: "office-screen" }, bar, body);
}
