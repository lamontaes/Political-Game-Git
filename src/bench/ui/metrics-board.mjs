// Politics > Metrics as the approved Layout A (docs/mocks/2026-11-12-metrics, owner, Nov 12:
// "go with A plus the years table"): the areas listed at the left, and the chosen area's
// figures at the right, its first four large, then a years table. A row of the table opens
// its timeline, one thin brass line over the years with each value written on it, closed
// with a click. Everything shown is the record's: the screen hands over each row's years
// and figures, and this part only lays them out.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { rosterScreen } from "./roster-screen.mjs";
import { trendLine } from "./trend-line.mjs";

/** How many figures stand large at the top of an area, as the mock has them. */
const LARGE = 4;
/** How many years the table shows at most, the newest last. */
const YEARS_SHOWN = 6;
/** How many years a timeline draws at most, the newest last: each value is written on it, so more would not read. */
const TIMELINE_YEARS = 10;

/**
 * `sections`: [{ key, title, rows: [{ key, label, now, before, years: [{ year, value }] }] }].
 * `figure(row, value)` and `change(row)` say a figure and its change from last year in words;
 * `words`: { lastYear, close }.
 */
export function metricsBoard({ title, sections, figure, change, words }) {
  return rosterScreen({
    title,
    className: "metrics-board",
    groups: [
      {
        entries: sections.map((section) => ({
          key: section.key,
          label: section.title,
          section,
        })),
      },
    ],
    render: ({ section }, show) => {
      const page = () => [areaPage(section)];
      const areaPage = (area) => {
        const large = el(
          "div",
          { className: "metrics-figures" },
          ...area.rows.slice(0, LARGE).map((row) =>
            el(
              "div",
              { className: "metrics-figure" },
              el("b", {
                className: "metrics-big",
                textContent: figure(row, row.now),
              }),
              el("span", { className: "metrics-what", textContent: row.label }),
              ...(row.before === null
                ? []
                : [
                    el("span", {
                      className: "metrics-was",
                      textContent: `${words.lastYear} ${figure(row, row.before)}`,
                    }),
                    el("span", {
                      className: "metrics-change",
                      textContent: change(row),
                    }),
                  ]),
            ),
          ),
        );
        const years = [
          ...new Set(area.rows.flatMap((r) => r.years.map((y) => y.year))),
        ]
          .sort((a, b) => a - b)
          .slice(-YEARS_SHOWN);
        const head = el(
          "div",
          { className: "metrics-yrow metrics-yhead" },
          el("span", { className: "metrics-ylabel" }),
          ...years.map((year, at) =>
            el("span", {
              className: `metrics-ycell${at === years.length - 1 ? " now" : ""}`,
              textContent: String(year),
            }),
          ),
        );
        const rows = area.rows.map((row) => {
          const byYear = new Map(row.years.map((y) => [y.year, y.value]));
          const button = makeButton({ className: "metrics-yrow pick" });
          button.dataset.measure = row.key;
          button.append(
            el("span", { className: "metrics-ylabel", textContent: row.label }),
            ...years.map((year, at) =>
              el("span", {
                className: `metrics-ycell${at === years.length - 1 ? " now" : ""}`,
                textContent: byYear.has(year)
                  ? figure(row, byYear.get(year))
                  : "",
              }),
            ),
          );
          // A row with two years or more opens its timeline; one with a single year has no line to draw.
          if (row.years.length > 1)
            button.addEventListener("click", () => show(timeline(row)));
          else button.disabled = true;
          return button;
        });
        return el(
          "div",
          { className: "metrics-area" },
          large,
          el("div", { className: "metrics-years" }, head, ...rows),
        );
      };
      const timeline = (row) => {
        const close = makeButton({
          className: "metrics-tl-close",
          textContent: "×",
        });
        close.setAttribute("aria-label", words.close);
        close.addEventListener("click", () => show(...page()));
        const line = trendLine(
          row.years.slice(-TIMELINE_YEARS).map((y) => ({
            fiscalYear: y.year,
            minor: y.value,
            value: y.value,
          })),
          {
            width: 1100,
            height: 480,
            written: { value: (point) => figure(row, point.value) },
          },
        );
        line.setAttribute("aria-label", row.label);
        return el(
          "div",
          { className: "metrics-timeline" },
          el("h3", { className: "metrics-tl-title", textContent: row.label }),
          close,
          line,
        );
      };
      return page();
    },
  });
}
