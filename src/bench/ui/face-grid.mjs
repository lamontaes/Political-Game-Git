// A body's members as a grid of headshots (a legislature of forty or seventy
// seats fits one screen as faces where it never would as rows): each face a
// control opening the person's card, ringed in the party's color, named on
// hover. No initials (owner, Oct 28, points 12 and 22).
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { headshot } from "./headshot.mjs";
import { partyClass } from "./map.mjs";

/**
 * `people`: [{ name, party, face, detail?, onOpen }]; `wordTitle` words the
 * hover title from a person ("Jane Doe, Democratic, District 4").
 */
export function faceGrid(people, wordTitle) {
  return el(
    "div",
    { className: "face-grid" },
    ...people.map((person) => {
      const picture = person.face
        ? headshot(person.face)
        : el("span", { className: "headshot" });
      picture.classList.add("face-cell-face");
      const cell = makeButton(
        {
          className: `face-cell ${partyClass(person.party)}`,
          title: wordTitle(person),
          ariaLabel: wordTitle(person),
        },
        picture,
      );
      if (person.onOpen) cell.addEventListener("click", person.onOpen);
      return cell;
    }),
  );
}
