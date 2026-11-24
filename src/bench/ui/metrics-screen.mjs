// The Metrics screen on the one list-beside-page part (`rosterScreen`): the areas down the left,
// the chosen area's measures beside them (this year, last year, the change), and the chosen
// measure's timeline: one thin line over the years with each value written on it, no bars and
// no pies (owner, Nov 12: "numbers stay the main view; a measure opens a timeline"). Every
// figure is the registry's; the screen only places them. Nothing scrolls as a page.
import { makeButton } from "./button.mjs";
import { el } from "./dom.mjs";
import { pickRow } from "./list-row.mjs";
import { metricsChange, metricsFigure } from "./metrics-change.mjs";
import { rosterScreen } from "./roster-screen.mjs";
import { trendLine } from "./trend-line.mjs";

/** How many years the table shows at most, the newest last (mock Layout A, owner, Nov 12: "A plus the years table"). */
const YEARS_SHOWN = 5;

/**
 * `sections`: the /api/metrics sections; `words`: controls.metrics; `title`: the list's heading.
 */
export function metricsScreen({ sections, words, title }) {
  const figure = (row, value) => metricsFigure(row, value, words.percent);
  return rosterScreen({
    title,
    className: "metrics",
    groups: [
      {
        entries: sections.map((section) => ({
          key: section.key,
          // A section that shows one government's books is headed by that government's name.
          label: section.name ?? words[section.key],
          section,
        })),
      },
    ],
    render: ({ section }, show) => {
      let chosen =
        section.rows.find((row) => row.history.length > 1) ?? section.rows[0];
      const draw = () => {
        const measures = section.rows.map((row) => {
          const change = metricsChange(row, words.points);
          const direction =
            change.direction === null ? "" : words[change.direction];
          const button = pickRow({
            label: words[row.key],
            // A small town's count shows the people behind it ("13 of 86").
            aside:
              row.of === undefined
                ? figure(row, row.now)
                : `${figure(row, row.now)} ${words.of} ${figure(row, row.of)}`,
            className: "metric-row",
          });
          button.dataset.key = row.key;
          button.setAttribute("aria-pressed", String(row === chosen));
          if (row.before !== null)
            button.append(
              el("small", {
                textContent: `${words.lastYear} ${figure(row, row.before)} · ${[direction, change.size, words.since].filter(Boolean).join(" ")}`,
              }),
            );
          button.addEventListener("click", () => {
            chosen = row;
            draw();
          });
          return button;
        });
        const line = chosen
          ? trendLine(chosen.history, {
              width: 520,
              height: 260,
              valueOf: (point) => point.value,
              labels: {
                value: (point) => figure(chosen, point.value),
                year: (point) => String(point.year),
              },
            })
          : null;
        // The years table: each measure's figure for the last few years; a row opens its timeline.
        const years = [
          ...new Set(section.rows.flatMap((r) => r.history.map((h) => h.year))),
        ]
          .sort((a, b) => a - b)
          .slice(-YEARS_SHOWN);
        const cell = (text, at) =>
          el("span", {
            className: `metrics-ycell${at === years.length - 1 ? " now" : ""}`,
            textContent: text,
          });
        const table = el(
          "div",
          { className: "metrics-years" },
          el(
            "div",
            { className: "metrics-yrow metrics-yhead" },
            el("span", { className: "metrics-ylabel" }),
            ...years.map((year, at) => cell(String(year), at)),
          ),
          ...section.rows.map((row) => {
            const byYear = new Map(row.history.map((h) => [h.year, h.value]));
            const button = makeButton({ className: "metrics-yrow" });
            button.dataset.measure = row.key;
            button.setAttribute("aria-pressed", String(row === chosen));
            button.append(
              el("span", {
                className: "metrics-ylabel",
                textContent: words[row.key],
              }),
              ...years.map((year, at) =>
                cell(byYear.has(year) ? figure(row, byYear.get(year)) : "", at),
              ),
            );
            button.addEventListener("click", () => {
              chosen = row;
              draw();
            });
            return button;
          }),
        );
        const page = el(
          "div",
          { className: "metrics-page" },
          el("div", { className: "pick-list metric-rows" }, ...measures),
          el(
            "div",
            { className: "metric-timeline" },
            ...(chosen
              ? [
                  el("h3", {
                    className: "sechead",
                    textContent: words[chosen.key],
                  }),
                ]
              : []),
            ...(line ? [line] : []),
            ...(years.length > 1 ? [table] : []),
          ),
        );
        // The page names the measure whose timeline it shows, for a reader to wait on.
        if (chosen) page.dataset.measure = chosen.key;
        show(page);
      };
      draw();
    },
  });
}
