// The strip of busts (owner, Nov 11, 2026: "I do like this strip when there's a
// scene and there's people to talk"): the people in a room as busts standing in
// a band of soft glass with their names on it, its ends fading into the room and
// a light along its top. It lies along the foot of the room to say who is here,
// and joins the top of the talk box in a talk, where whoever speaks is lit and a
// little larger. A room is its painting alone; nobody is drawn into it.
import { el } from "./dom.mjs";
import { bustStack } from "./bust.mjs";

/** One person on the strip: their bust, cut soft at the shoulders, and their name. */
function stripPerson(person, { speakingId, onClick }) {
  const bust = person.face.bust;
  const stack = bustStack(bust, person.name);
  // The head's middle sits over the middle of the person's place on the strip.
  stack.style.setProperty("--head-middle", String(bust.head[1] / bust.size));
  const cell = el(
    "div",
    { className: "busts-person" },
    el("div", { className: "busts-face" }, stack),
    el("span", { className: "busts-name", textContent: person.name }),
    // The office a scene names them by (an address cutting to officials).
    ...(person.role
      ? [el("span", { className: "busts-role", textContent: person.role })]
      : []),
  );
  cell.dataset.person = person.personId ?? "";
  if (speakingId !== undefined)
    cell.classList.add(person.personId === speakingId ? "speaking" : "quiet");
  // Someone with nothing to say is not clicked (owner, Nov 1: "If there's no
  // dialogue, you shouldn't be able to click on the person").
  if (onClick && person.talkable !== false) {
    cell.classList.add("talkable");
    cell.tabIndex = 0;
    cell.setAttribute("role", "button");
    cell.setAttribute("aria-label", person.name);
    cell.addEventListener("click", () => onClick(person));
    cell.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onClick(person);
    });
  }
  return cell;
}

/**
 * `people`: [{ personId, name, face: { bust }, talkable?, role? }]. `more`: how many
 * others are there, said after the busts in `words.more` ("and {count} more").
 * `words.label` names the strip at its left end. `speakingId` lights one person
 * and quiets the rest (a talk); left out, everyone is lit alike. `onClick`
 * makes each person with something to say a button.
 */
export function bustStrip({
  people,
  more = 0,
  words = {},
  speakingId,
  onClick,
}) {
  const strip = el("div", { className: "bust-strip" });
  // The busts' size follows how many stand on the strip (play.css).
  strip.dataset.count = String(Math.min(people.length, 4));
  strip.append(
    el("div", { className: "busts-glass" }),
    ...(words.label
      ? [el("span", { className: "busts-label", textContent: words.label })]
      : []),
    el(
      "div",
      { className: "busts-row" },
      ...people.map((person) => stripPerson(person, { speakingId, onClick })),
      ...(more > 0 && words.more
        ? [
            el("span", {
              className: "busts-more",
              textContent: words.more.replace(
                "{count}",
                more.toLocaleString("en-US"),
              ),
            }),
          ]
        : []),
    ),
  );
  return strip;
}
