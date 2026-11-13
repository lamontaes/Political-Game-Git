// Advanced, Play as (the Nov 8 front mock, fr-playas): the people who hold an office,
// grouped by the body they sit in, a bust and a button for the one chosen.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { stripSection } from "./strips.mjs";
import { personCard } from "./person-card.mjs";

/** The body a holder sits in, as the list's heading. */
const bodyOf = (holder, levels) =>
  holder.government ? holder.government : (levels?.[holder.level] ?? "");

/**
 * Sections down the list, one a body, a row a person: name left, office right.
 * `onSelect(holder)` runs on a click; the chosen row is marked.
 */
export function playAsList(holders, { levels, onSelect, selected }) {
  const groups = new Map();
  for (const holder of holders) {
    const body = bodyOf(holder, levels);
    if (!groups.has(body)) groups.set(body, []);
    groups.get(body).push(holder);
  }
  return [...groups].map(([body, rows], at) =>
    stripSection(
      (at % 3) + 1,
      body,
      ...rows.map((holder) => {
        const row = makeButton(
          {
            className: "pick-row",
            ariaPressed: String(holder.personId === selected),
          },
          el("span", { className: "pick-name", textContent: holder.name }),
          el("span", { className: "pick-role", textContent: holder.title }),
        );
        row.dataset.record = holder.termId;
        row.addEventListener("click", () => onSelect(holder));
        return row;
      }),
    ),
  );
}

/** The chosen person: their bust, their office and body, and the button that steps in. */
export function playAsDetail(holder, { face, labels, levels, onPlay }) {
  const body = bodyOf(holder, levels);
  const play = makeButton({
    id: "pick-play",
    className: "action primary small",
    textContent: labels.playAs.replace("{name}", holder.name),
  });
  play.addEventListener("click", onPlay);
  return personCard(
    {
      name: holder.name,
      face,
      line: [holder.title, body, holder.party].filter(Boolean).join(" · "),
    },
    { layout: "section", heading: labels.heading, actions: [play] },
  );
}
