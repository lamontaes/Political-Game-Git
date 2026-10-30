// The one member card: a person who holds a seat, as a control that opens
// their card. Face, name, the seat under it, the party's badge at the right,
// and a mark for how they feel about you when your character knows them
// (owner, Oct 29). `large` is the executive's card (the mock's Mayor).
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { headshot } from "./headshot.mjs";
import { partyClass } from "./map.mjs";

/**
 * `person`: { name, line, party, badge, face, feeling, feelingLabel, onOpen }.
 * `line` is the seat or post in words, `badge` the party's letter, `feeling`
 * one of "warm", "known", "cool" or null, `feelingLabel` its words.
 */
export function memberCard(person, { large = false } = {}) {
  const face = person.face
    ? headshot(person.face)
    : el("span", { className: "headshot" });
  face.classList.add("member-face");
  const card = makeButton(
    {
      className: `member-card ${partyClass(person.party)}${large ? " large" : ""}`,
      title: [person.name, person.line].filter(Boolean).join(", "),
    },
    face,
    el(
      "span",
      { className: "member-text" },
      el("span", { className: "member-name", textContent: person.name }),
      ...(person.line
        ? [el("span", { className: "member-line", textContent: person.line })]
        : []),
    ),
    ...(person.feeling
      ? [
          el("span", {
            className: `member-feeling ${person.feeling}`,
            title: person.feelingLabel ?? "",
            ariaLabel: person.feelingLabel ?? "",
          }),
        ]
      : []),
    ...(person.badge
      ? [
          el("span", {
            className: "member-badge",
            textContent: person.badge,
            title: person.party ?? "",
          }),
        ]
      : []),
  );
  if (person.onOpen) card.addEventListener("click", person.onOpen);
  return card;
}
