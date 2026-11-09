// The bill on paper: the document menu type. The designation, the title, the sponsor,
// each section a control in plain words, the floor and vote lines, and beside it the
// estimate for the chosen section (the first one to start). The screen hands it the
// words and each section's estimate lines; nothing here computes.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { makeCard } from "./card.mjs";
import { bold, line, prose, heading } from "./text.mjs";
import { stripSection } from "./strips.mjs";

/**
 * Today's amount beside the new one: two cells, the law in force as it stands
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
 * The paper as the legislation mock draws it (docs/mocks/2026-11-08-legislation/, "Following a
 * bill"): three columns, where it is on the left, the bill typed on the paper in the middle, the
 * estimate and the vote on the right. `paper`: { spoken, title, sponsor, sectionsLabel, whereLabel,
 * billLabel, estimateLabel, voteLabel, sections: [{ text, estimate: { prose, lines } }], lines:
 * [text] (where it is), votes: [{ big, text }] (each chamber's result, then its details),
 * blank: { prose, lines } (the estimate shown when the bill has no sections), extra: [node]
 * (figures under the estimate) }. An estimate may carry `compare`: { todayLabel, today, newLabel,
 * proposed }.
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
  const typed = el(
    "div",
    { className: "bill-doc ink" },
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
  );
  const where = paper.lines.filter(Boolean).map((text) => line(text));
  const votes = (paper.votes ?? []).flatMap((vote) => [
    el("p", { className: "lbig", textContent: vote.big }),
    ...(vote.text ? [line(vote.text)] : []),
  ]);
  return el(
    "div",
    { className: "strip-screen strip-board strips ol-g bill-board" },
    el(
      "div",
      { className: "board-cols" },
      el(
        "div",
        { className: "mx3col" },
        stripSection(1, paper.whereLabel, ...where),
      ),
      el(
        "div",
        { className: "mx3col" },
        stripSection(3, paper.billLabel, typed),
      ),
      el(
        "div",
        { className: "mx3col" },
        stripSection(4, paper.estimateLabel, aside),
        ...(paper.extra ?? []),
        ...(votes.length ? [stripSection(2, paper.voteLabel, ...votes)] : []),
      ),
    ),
  );
}
