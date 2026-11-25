// The campaign board's header strip (the 2026-11-04 campaign board mock): the
// race's office and the day it is decided at the left, the money raised at the
// right, over the board's columns. The screen hands it worded labels and
// values; it computes nothing.
import { el } from "./dom.mjs";
import { moneyFigure } from "./strips.mjs";

/**
 * `title` is the race's office; `facts` its worded rows (each a node, such as
 * a fact row for the day it is decided); `raisedLabel` and `raised` the money
 * line; `board` the board it heads.
 */
export function campaignPage({
  title,
  facts = [],
  raisedLabel,
  raised,
  board,
}) {
  return el(
    "div",
    { className: "campaign-page" },
    el(
      "header",
      { className: "campaign-head" },
      el(
        "div",
        { className: "campaign-race" },
        el("h2", { textContent: title }),
        ...facts,
      ),
      el(
        "div",
        { className: "campaign-raised" },
        el("span", { textContent: raisedLabel }),
        moneyFigure(raised),
      ),
    ),
    board,
  );
}
