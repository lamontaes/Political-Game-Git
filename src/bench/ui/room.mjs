// The room: the people standing in the scene, each a figure at its place with a soft
// shadow at their feet and, where furniture stands in front of them, the piece of the
// backdrop that covers them. Clicking someone (not the player) calls `onClick`.
import { el } from "./dom.mjs";

const place = (node, box) =>
  Object.assign(node.style, {
    left: `${box.leftPercent}%`,
    top: `${box.topPercent}%`,
    width: `${box.widthPercent}%`,
    height: `${box.heightPercent}%`,
  });

/** Soft contact shadows on the floor at each person's feet, under everyone. */
function shadowsOf(people) {
  return people
    .filter((person) => person.figure.shadow)
    .map(({ figure: { shadow } }) => {
      const node = el("div", { className: "shadow" });
      place(node, shadow);
      return node;
    });
}

/** The cut of the backdrop that stands in front of a figure (a counter, a desk). */
function occluderOf(o, backdropUrl) {
  const node = el("div", { className: "occluder" });
  const along = (start, size) =>
    size >= 100 ? 0 : (start / (100 - size)) * 100;
  place(node, o);
  Object.assign(node.style, {
    backgroundImage: `url("${backdropUrl}")`,
    backgroundSize: `${10000 / o.widthPercent}% ${10000 / o.heightPercent}%`,
    backgroundPosition: `${along(o.leftPercent, o.widthPercent)}% ${along(o.topPercent, o.heightPercent)}%`,
    maskImage: `url("${o.url}")`,
    webkitMaskImage: `url("${o.url}")`,
  });
  return node;
}

/** The nodes of everyone in the room, for the people layer. */
export function roomPeople(people, { selfId, backdropUrl, onClick }) {
  return [
    ...shadowsOf(people),
    ...people.flatMap((person) => {
      const f = person.figure;
      const img = el("img", { src: person.figureUrl, alt: person.name });
      // A whole figure turns to face the room.
      if (f.mirrored) img.style.transform = "scaleX(-1)";
      const box = el("div", { className: "figure" }, img);
      box.dataset.person = person.personId ?? "";
      place(box, f);
      if (onClick && person.personId !== selfId) {
        box.classList.add("talkable");
        box.tabIndex = 0;
        box.setAttribute("role", "button");
        box.setAttribute("aria-label", person.name);
        box.addEventListener("click", () => onClick(person));
        box.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onClick(person);
        });
      }
      return f.occluder ? [box, occluderOf(f.occluder, backdropUrl)] : [box];
    }),
  ];
}

/** The player card's clock: the date, and the time under it. */
export function clockLines(day, time) {
  return [day, el("br"), time];
}
