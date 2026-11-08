// The bill page's figures, in the look of The Political Process's pages: each budget line
// the bill sets with its amount and last year's beside it, real figures on dotted rows,
// no bar graph. The screen hands it the page view (/api/bill/page: sections with
// amountMinor and lastYearMinor), the section's words and the money wording; nothing
// here computes.
import { el } from "./dom.mjs";
import { stripSection, typedRow } from "./strips.mjs";

/**
 * `view`: the bill page view. `textOf(index)`: a section's words. `money(minor)`: a
 * figure said. `percent(value)`: a share said. `words`: { figures, thisYear, lastYear,
 * sinceLastYear, increased, decreased, unchanged, totalChange }. Returns the strips, or none
 * when the bill sets no budget line.
 */
export function billFigures({ view, textOf, money, percent, words }) {
  const lines = view.sections.filter(
    (section) => section.kind === "budget-line" && section.amountMinor !== null,
  );
  if (!lines.length) return [];
  // The change comes with the view (changeMinor, changePct; null where there is no base).
  const changeOf = (label, record) => {
    if (record.changeMinor === null || record.changeMinor === undefined)
      return [];
    const how =
      record.changeMinor === 0
        ? words.unchanged
        : (record.changeMinor > 0 ? words.increased : words.decreased)
            .replace("{amount}", money(Math.abs(record.changeMinor)))
            .replace(
              "{pct}",
              record.changePct === null || record.changePct === undefined
                ? ""
                : percent(Math.abs(record.changePct)),
            )
            .replace(" ()", "");
    return [typedRow(label, how)];
  };
  // The strips are styled inside a strip screen; the bill paper is not one.
  return [
    el(
      "div",
      { className: "strip-screen strips bill-figures" },
      stripSection(
        2,
        words.figures,
        ...lines.flatMap((section) => [
          typedRow(
            `${textOf(section.index)} · ${words.thisYear}`,
            money(section.amountMinor),
          ),
          ...(section.lastYearMinor !== null
            ? [typedRow(words.lastYear, money(section.lastYearMinor))]
            : []),
          ...changeOf(words.sinceLastYear, section),
        ]),
        ...(view.totalChangeMinor !== null &&
        view.totalChangeMinor !== undefined
          ? changeOf(words.totalChange, { changeMinor: view.totalChangeMinor })
          : []),
      ),
    ),
  ];
}
