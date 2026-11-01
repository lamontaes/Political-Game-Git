// The one roll-call bar: a measure's name and date over one bar, its yes
// share in the yes color and its no share in the no color, each count worded
// inside (the mock's "Drainage bond, $1.2 million · Jan 21 | 4 yes | 2 no").
import { el } from "./dom.mjs";

/** `vote`: { title, when, yes, no, yesLabel, noLabel, outcome }; every string worded by the screen. */
export function voteBar(vote) {
  const part = (className, count, label) => {
    const piece = el(
      "span",
      { className: `vote-bar-part ${className}` },
      el("span", { className: "vote-bar-label", textContent: label }),
    );
    piece.style.flexGrow = String(count);
    return piece;
  };
  return el(
    "div",
    { className: "vote-bar" },
    el(
      "div",
      { className: "vote-bar-head" },
      el("span", { className: "vote-bar-title", textContent: vote.title }),
      el("span", { className: "vote-bar-when", textContent: vote.when }),
      ...(vote.outcome
        ? [
            el("span", {
              className: `vote-bar-outcome ${vote.passed ? "passed" : "failed"}`,
              textContent: vote.outcome,
            }),
          ]
        : []),
    ),
    el(
      "div",
      {
        className: "vote-bar-track",
        role: "img",
        ariaLabel: `${vote.yesLabel}, ${vote.noLabel}`,
      },
      ...(vote.yes ? [part("yes", vote.yes, vote.yesLabel)] : []),
      ...(vote.no ? [part("no", vote.no, vote.noLabel)] : []),
    ),
  );
}
