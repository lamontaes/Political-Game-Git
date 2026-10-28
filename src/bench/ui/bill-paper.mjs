// The bill on paper: the document menu type. The designation, the title, the sponsor,
// each section a control in plain words, the floor and vote lines, and beside it the
// estimate for the chosen section (the first one to start). The screen hands it the
// words and each section's estimate lines; nothing here computes.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { makeCard } from "./card.mjs";
import { bold, line, prose, heading } from "./text.mjs";

const estimateOf = (label, estimate) => [
  bold(label),
  prose(estimate.prose),
  ...estimate.lines.filter(Boolean).map((text) => line(text)),
];

/**
 * The paper and its estimate card. `paper`: { spoken, title, sponsor, sectionsLabel,
 * sections: [{ text, estimate: { prose, lines } }], lines: [text], estimateLabel,
 * blank: { prose, lines } } (the estimate shown when the bill has no sections).
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
