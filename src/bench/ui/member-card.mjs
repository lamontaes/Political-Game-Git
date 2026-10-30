// The one member card: a person who holds a seat, as a control that opens
// their card. Face, name, the seat under it and the party's badge at the
// right; never a mark for how they feel about you (owner, Oct 29: no scale of
// what someone thinks of you). `large` is the executive's card (the mock's
// Mayor).
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { headshot } from "./headshot.mjs";
import { partyClass } from "./map.mjs";

/**
 * `person`: { name, line, party, badge, face, onOpen }. `line` is the seat or
 * post in words, `badge` the party's letter.
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
