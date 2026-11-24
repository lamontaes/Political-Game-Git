// The strip of busts (owner, Nov 11, 2026: "I do like this strip when there's a
// scene and there's people to talk"): the people in a room as busts standing in
// a band of soft glass with their names on it, its ends fading into the room and
// a light along its top. It lies along the foot of the room to say who is here,
// and joins the top of the talk box in a talk, where whoever speaks is lit and a
// little larger. A room is its painting alone; nobody is drawn into it.
import { el } from "./dom.mjs";
import { face } from "./face.mjs";

/** One person on the strip: their bust, cut soft at the shoulders, and their name. */
function stripPerson(person, { speakingId, onClick, onCard }) {
  const stack = face(person.face, { shape: "strip", alt: person.name });
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
  // Someone with nothing to say is not a way into a talk (owner, Nov 1: "If
  // there's no dialogue, you shouldn't be able to click on the person"); but
  // anyone on the strip opens their card (owner, Nov 23, P9: "I can't click on
  // any of these people").
  const action =
    onClick && person.talkable !== false
      ? { handler: onClick, className: "talkable" }
      : onCard
        ? { handler: onCard, className: "openable" }
        : null;
  if (action) {
    cell.classList.add(...action.className.split(" "));
    cell.tabIndex = 0;
    cell.setAttribute("role", "button");
    cell.setAttribute("aria-label", person.name);
    cell.addEventListener("click", () => action.handler(person));
    cell.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      action.handler(person);
    });
  }
  return cell;
}

/**
 * `people`: [{ personId, name, face: { bust }, talkable?, role? }]. `more`: how many
 * others are there, said after the busts in `words.more` ("and {count} more").
 * `words.label` names the strip at its left end. `speakingId` lights one person
 * and quiets the rest (a talk); left out, everyone is lit alike. `onClick`
 * makes each person with something to say a button; `onCard` is what a click
 * does for the rest, opening that person's card. `speakingId: null` is a talk where nobody
 * on the strip speaks (the narrator does): everyone stands small.
 */
export function bustStrip({
  people,
  more = 0,
  words = {},
  speakingId,
  onClick,
  onCard,
}) {
  const strip = el("div", { className: "bust-strip" });
  // The busts' size follows how many stand on the strip (play.css).
  strip.dataset.count = String(Math.min(people.length, 4));
  // Someone speaks: the rest stand back, small and dimmed (play.css).
  strip.dataset.speaker = speakingId ? "1" : "0";
  strip.append(
    el("div", { className: "busts-glass" }),
    ...(words.label
      ? [el("span", { className: "busts-label", textContent: words.label })]
      : []),
    el(
      "div",
      { className: "busts-row" },
      ...people.map((person) =>
        stripPerson(person, { speakingId, onClick, onCard }),
      ),
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
