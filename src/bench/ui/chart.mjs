// The charts a screen draws from record amounts: bars that compare amounts side by side.
// No invented historical series; every bar is a record's own value.
import { el } from "./dom.mjs";

/** One bar per item, scaled to the largest; `format` words each amount. */
export function barChart(items, label, format = (value) => String(value)) {
  const max = Math.max(0, ...items.map((i) => Math.abs(i.value)));
  return el(
    "div",
    { className: "record-chart", role: "img", ariaLabel: label },
    ...items.map((item) => {
      const bar = el("span", { className: "record-bar" });
      bar.style.width = `${max ? (Math.abs(item.value) / max) * 100 : 0}%`;
      return el(
        "div",
        { className: "record-chart-line" },
        el("span", { textContent: item.label }),
        el("div", { className: "record-track" }, bar),
        el("strong", { textContent: format(item.value) }),
      );
    }),
  );
}
