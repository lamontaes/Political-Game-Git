// The bill on paper: the document menu type. The designation, the title, the sponsor,
// each section a control in plain words, the floor and vote lines, and beside it the
// estimate for the chosen section (the first one to start). The screen hands it the
// words and each section's estimate lines; nothing here computes.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { makeCard } from "./card.mjs";
import { bold, line, prose, heading } from "./text.mjs";

/**
 * Today's amount beside the new one: two cells and an arrow, the law in force as it stands
 * and what the bill makes it (the owner, Oct 29: "the bill ... with today's amount beside
 * the new one").
 */
const compareOf = (compare) =>
  compare
    ? el(
        "div",
        { className: "bill-compare" },
        el(
          "span",
          { className: "bill-compare-cell" },
          el("small", { textContent: compare.todayLabel }),
          el("strong", { textContent: compare.today }),
        ),
        el("span", { className: "bill-compare-arrow", textContent: "→" }),
        el(
          "span",
          { className: "bill-compare-cell new" },
          el("small", { textContent: compare.newLabel }),
          el("strong", { textContent: compare.proposed }),
        ),
      )
    : "";

const estimateOf = (label, estimate) => [
  bold(label),
  prose(estimate.prose),
  compareOf(estimate.compare),
  ...estimate.lines.filter(Boolean).map((text) => line(text)),
];

/**
 * The paper and its estimate card. `paper`: { spoken, title, sponsor, sectionsLabel,
 * sections: [{ text, estimate: { prose, lines } }], lines: [text], estimateLabel,
 * blank: { prose, lines } } (the estimate shown when the bill has no sections). An estimate may
 * carry `compare`: { todayLabel, today, newLabel, proposed }.
 */
export function billPaper(paper) {
  const aside = makeCard(
    "bill-estimate",
    {},
    ...estimateOf(
      paper.estimateLabel,
      paper.sections[0]?.estimate ?? paper.blank,
    ),
  );
  const doc = el(
    "div",
    { className: "bill-doc" },
    heading(paper.spoken, "h2"),
    prose(paper.title),
    line(paper.sponsor),
    bold(paper.sectionsLabel),
    ...paper.sections.map((section) => {
      const open = makeButton({
        className: "action bill-section",
        textContent: section.text,
      });
      open.addEventListener("click", () =>
        aside.replaceChildren(
          ...estimateOf(paper.estimateLabel, section.estimate),
        ),
      );
      return open;
    }),
    ...paper.lines.filter(Boolean).map((text) => line(text)),
  );
  return el("div", { className: "bill-paper" }, doc, aside);
}
