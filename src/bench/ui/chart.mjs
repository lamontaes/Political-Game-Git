// The charts a screen draws from record amounts: bars that compare amounts side by side.
// No invented historical series; every bar is a record's own value.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

/**
 * One bar per item, scaled to the largest; `format` words each amount. An item's
 * `steps` ({ glyph, label, onClick }) are buttons at the end of its line (the
 * executive's budget priorities).
 */
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
        ...(item.steps ?? []).map((step) => {
          const b = makeButton({ textContent: step.glyph, title: step.title });
          b.setAttribute("aria-label", step.label);
          b.onclick = async () => {
            b.disabled = true;
            try {
              await step.onClick();
            } finally {
              b.disabled = false;
            }
          };
          return b;
        }),
      );
    }),
  );
}

/**
 * Columns side by side, one per item, scaled to the largest, its amount over it
 * and its label under it (the Money mock's six months of balances); `label`
 * names the chart for a screen reader and is said under it.
 */
export function columnChart(items, label, format = (value) => String(value)) {
  const max = Math.max(0, ...items.map((i) => Math.abs(i.value)));
  return el(
    "figure",
    { className: "column-chart", role: "img", ariaLabel: label },
    el(
      "div",
      { className: "column-chart-columns" },
      ...items.map((item) => {
        const column = el("span", { className: "column-chart-bar" });
        column.style.height = `${max ? (Math.abs(item.value) / max) * 100 : 0}%`;
        if (item.value < 0) column.classList.add("below");
        return el(
          "div",
          { className: "column-chart-item", title: format(item.value) },
          el("span", {
            className: "column-chart-value",
            textContent: format(item.value),
          }),
          el("div", { className: "column-chart-well" }, column),
          el("span", {
            className: "column-chart-label",
            textContent: item.label,
          }),
        );
      }),
    ),
    el("figcaption", { textContent: label }),
  );
}

/**
 * A ring of the parts of a whole, largest first, the whole in its middle and a
 * key beside it with each part's share (the Money mock's "where the month
 * went"). Parts are colored in order from the kit's chart colors.
 */
export function donutChart(parts, centerText, label) {
  const total = parts.reduce((n, p) => n + Math.max(0, p.value), 0);
  const ring = 2 * Math.PI * 40;
  let at = 0;
  const arcs = parts.map((part, index) => {
    const share = total ? Math.max(0, part.value) / total : 0;
    const arc = `<circle cx="50" cy="50" r="40" class="donut-part c${index % 8}" stroke-dasharray="${share * ring} ${ring}" stroke-dashoffset="${-at * ring}" />`;
    at += share;
    return arc;
  });
  const svg = el("div", { className: "donut-ring" });
  svg.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" class="donut-track" />${arcs.join("")}</svg>`;
  return el(
    "figure",
    { className: "donut-chart", role: "img", ariaLabel: label },
    el(
      "div",
      { className: "donut-center" },
      svg,
      el("strong", { className: "donut-total", textContent: centerText }),
    ),
    el(
      "ul",
      { className: "donut-key" },
      ...parts.map((part, index) =>
        el(
          "li",
          {},
          el("span", { className: `donut-swatch c${index % 8}` }),
          el("span", { className: "donut-name", textContent: part.label }),
          el("span", {
            className: "donut-share",
            textContent: `${total ? Math.round((Math.max(0, part.value) / total) * 100) : 0}%`,
          }),
        ),
      ),
    ),
  );
}
