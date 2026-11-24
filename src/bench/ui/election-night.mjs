// Election night (owner, Oct 26: "its own pop-up menu kind of thing"; mock pl-night): the
// title, then strips: the count as the places report (names and votes), what the narrator
// says of it, and the way on. A step is { lines: [{ text }], totals: [{ name, votes }] } or,
// last, { nation: { lines, races } }.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { stripSection, introText, dotRows } from "./strips.mjs";

/**
 * `step`; `title`; `labels`: { count, nation, vote, votes, marginBy, points, next, close };
 * `last`: whether Next ends the night; `onNext()`.
 */
export function electionNight({ title, step, labels, last, onNext }) {
  const rows = step.nation
    ? step.nation.races.map((race) => ({
        label: race.state,
        value: `${race.winnerParty} · ${labels.marginBy} ${race.marginPoints} ${labels.points}`,
      }))
    : step.totals.map((entry) => ({
        label: entry.name,
        value: `${entry.votes.toLocaleString("en-US")} ${entry.votes === 1 ? labels.vote : labels.votes}`,
      }));
  const lines = (step.nation ?? step).lines.map((line) => introText(line.text));
  const next = makeButton({
    className: "action",
    textContent: last ? labels.close : labels.next,
  });
  next.id = "returns-next";
  next.addEventListener("click", onNext);
  return el(
    "div",
    { className: "night-board strip-screen strips" },
    el("h2", { className: "night-title", textContent: title }),
    el(
      "div",
      { className: "night-cols" },
      stripSection(
        1,
        step.nation ? labels.nation : labels.count,
        dotRows(rows),
      ),
      stripSection(2, labels.call, ...lines),
    ),
    next,
  );
}
