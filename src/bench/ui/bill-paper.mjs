// The bill on paper: the document menu type. The designation, the title, the sponsor,
// each section a control in plain words, the floor and vote lines, and beside it the
// estimate for the chosen section (the first one to start). The screen hands it the
// words and each section's estimate lines; nothing here computes.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { makeCard } from "./card.mjs";
import { bold, line, prose, heading } from "./text.mjs";
import { stripSection, typedRow } from "./strips.mjs";
import { noteLine } from "./list-row.mjs";
import { tabBar, chooseTab } from "./tab.mjs";

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

// The column's strip already carries the label, so the estimate starts at its words.
const estimateOf = (estimate) => [
  ...(estimate.prose ? [prose(estimate.prose)] : []),
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
 * (figures under the estimate), where: { heading, rows: [{ label, value }] }, views: { clean, compare }
 * (the toggle's names), amendsLabel, and each section's `inserted`, `struck` and `amends` (the
 * citation text) }. An estimate may carry `compare`: { todayLabel, today, newLabel,
 * proposed }.
 */
export function billPaper(paper) {
  // A phase-in is one bill with a step to a section: its estimate lists every step
  // with its day, in order, whichever section is chosen.
  const dated = paper.sections.filter((section) => section.estimate.dated);
  const estimates = (section) =>
    dated.length > 1
      ? dated.map((step) =>
          el("div", { className: "bill-step" }, ...estimateOf(step.estimate)),
        )
      : estimateOf(section.estimate);
  const aside = makeCard(
    "bill-estimate",
    {},
    ...(paper.sections[0]
      ? estimates(paper.sections[0])
      : estimateOf(paper.blank)),
  );
  const showEstimate = (section) =>
    aside.replaceChildren(...estimates(section));
  // The bill as typed: Compare strikes the clause the law in force holds and inserts the bill's;
  // Clean copy shows the bill's alone (the views are the same records, drawn two ways).
  const views = paper.views;
  const changes = el("div", { className: "bill-changes" });
  const drawChanges = (compare) =>
    changes.replaceChildren(
      ...paper.sections.flatMap((section) => {
        if (!section.inserted) return [];
        // The typed clause is the section: clicking it shows its estimate.
        const clause = el(
          "p",
          { className: "bill-clause", tabIndex: 0 },
          ...(compare && section.struck
            ? [el("s", { textContent: section.struck }), " "]
            : []),
          el("u", { textContent: section.inserted }),
        );
        clause.setAttribute("role", "button");
        clause.addEventListener("click", () => showEstimate(section));
        clause.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          showEstimate(section);
        });
        return [
          clause,
          ...(section.amends
            ? [typedRow(paper.amendsLabel, section.amends)]
            : []),
        ];
      }),
    );
  let viewBar = "";
  if (views) {
    drawChanges(true);
    viewBar = tabBar({
      active: "compare",
      attr: "view",
      tabs: [
        {
          key: "clean",
          label: views.clean,
          onSelect: () => {
            chooseTab(viewBar, "view", "clean");
            drawChanges(false);
          },
        },
        {
          key: "compare",
          label: views.compare,
          onSelect: () => {
            chooseTab(viewBar, "view", "compare");
            drawChanges(true);
          },
        },
      ],
    });
  }
  const listed = paper.sections.filter(
    (section) => !views || !section.inserted,
  );
  const typed = el(
    "div",
    { className: "bill-doc ink" },
    ...(viewBar ? [viewBar] : []),
    heading(paper.spoken, "h2"),
    prose(paper.title),
    line(paper.sponsor),
    ...(views ? [changes] : []),
    // A section the paper has typed above is not listed again; one with no
    // typed clause is listed here, so every section can be clicked once.
    ...(listed.length ? [bold(paper.sectionsLabel)] : []),
    ...listed.map((section) => {
      const open = makeButton({
        className: "action bill-section",
        textContent: section.text,
      });
      open.addEventListener("click", () => showEstimate(section));
      return open;
    }),
  );
  const where = [
    ...(paper.where?.heading
      ? [el("p", { className: "lbig", textContent: paper.where.heading })]
      : []),
    ...(paper.where?.rows ?? []).map((row) => typedRow(row.label, row.value)),
    ...paper.lines.filter(Boolean).map((text) => line(text)),
  ];
  const votes = (paper.votes ?? []).flatMap((vote) => [
    el("p", { className: "lbig", textContent: vote.big }),
    ...(vote.text ? [line(vote.text)] : []),
    ...(vote.rows ?? []).map((row) => typedRow(row.label, row.value)),
    // The player's own members: a small label, then each name with their vote.
    ...(vote.members?.rows.length
      ? [
          noteLine(vote.members.label),
          ...vote.members.rows.map((row) => typedRow(row.label, row.value)),
        ]
      : []),
  ]);
  return el(
    "div",
    { className: "strip-screen strip-board strips ol-g bill-board" },
    // The body's room under the bill's number and the body's name, when the body has a room picture.
    ...(paper.band?.picture
      ? [
          el(
            "header",
            { className: "bill-band" },
            el("img", { src: paper.band.picture, alt: "" }),
            el("h2", { textContent: paper.band.title }),
          ),
        ]
      : []),
    el(
      "div",
      { className: "board-cols" },
      el(
        "div",
        { className: "mx3col" },
        stripSection(1, paper.whereLabel, ...where),
        // Where the bill stands and what the player may do about it (the
        // committee, the floor, staff, their vote), under where it is.
        ...(paper.stage ?? []),
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
