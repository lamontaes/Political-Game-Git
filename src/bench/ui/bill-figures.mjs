// The bill page's figures, in the look of The Political Process's pages: each budget line
// the bill sets with its amount and last year's beside it, real figures on dotted rows,
// no bar graph. The screen hands it the page view (/api/bill/page: sections with
// amountMinor and lastYearMinor), the section's words and the money wording; nothing
// here computes.
import { stripSection, typedRow } from "./strips.mjs";

/**
 * `view`: the bill page view. `textOf(index)`: a section's words. `money(minor)`: a
 * figure said. `words`: { figures, thisYear, lastYear }. Returns the strips, or none
 * when the bill sets no budget line.
 */
export function billFigures({ view, textOf, money, words }) {
  const lines = view.sections.filter(
    (section) => section.kind === "budget-line" && section.amountMinor !== null,
  );
  if (!lines.length) return [];
  return [
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
      ]),
    ),
  ];
}
