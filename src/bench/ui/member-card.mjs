// The one member card: a person who holds a seat, as a control that opens
// their card. Face, name and the seat under it, the party in its color;
// no letter in a circle (owner, Nov 8); never a mark for how they feel about you (owner, Oct 29: no scale of
// what someone thinks of you). `large` is the executive's card (the mock's
// Mayor).
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { headshot } from "./headshot.mjs";
import { partyClass } from "./map.mjs";

/**
 * `person`: { name, line, party, face, onOpen }. `line` is the seat or
 * post in words (or a node: a post underlined as a Guide term),
 */
export function memberCard(person, { large = false } = {}) {
  const face = person.face
    ? headshot(person.face)
    : el("span", { className: "headshot" });
  face.classList.add("member-face");
  const card = makeButton(
    {
      className: `member-card ${partyClass(person.party)}${large ? " large" : ""}`,
      title: [
        person.name,
        person.party,
        typeof person.line === "string"
          ? person.line
          : person.line?.textContent,
      ]
        .filter(Boolean)
        .join(", "),
    },
    face,
    el(
      "span",
      { className: "member-text" },
      el("span", { className: "member-name", textContent: person.name }),
      // The seat or post in words, or a part another screen drew (a post
      // underlined as a Guide term).
      ...(person.line
        ? [
            typeof person.line === "string"
              ? el("span", {
                  className: "member-line",
                  textContent: person.line,
                })
              : el("span", { className: "member-line" }, person.line),
          ]
        : []),
    ),
  );
  if (person.onOpen) card.addEventListener("click", person.onOpen);
  return card;
}
