// The newspaper's art and the reader: the engraved masthead art, a story's fixed picture, and
// the reader that opens a story (the news toast). The News screen itself is `news-board.mjs`.
import { el } from "./dom.mjs";

/**
 * The newspaper art (art/newspaper-mockups, owner Oct 28). Each paper keeps
 * one engraved masthead with its name set in the blank plate; `plate` is that
 * plate's left, top, width and height in percent of the strip.
 */
const MASTHEADS = {
  daily: [
    {
      file: "masthead-daily-1.jpg",
      size: [1287, 337],
      plate: [6.6, 32.6, 86.6, 34.1],
    },
    {
      file: "front-page-daily-1.jpg",
      size: [1225, 273],
      plate: [8.2, 51.3, 84.1, 32.2],
    },
  ],
  weekly: [
    {
      file: "masthead-weekly-1.jpg",
      size: [1210, 278],
      plate: [24.1, 13.7, 72.7, 57.6],
    },
    {
      file: "masthead-weekly-2.jpg",
      size: [1205, 241],
      plate: [34.9, 26.1, 62.2, 51.5],
    },
  ],
};
/** One of `list`, always the same one for the same record. */
const sameFor = (list, key) =>
  list[
    [...String(key)].reduce((sum, c) => sum + c.charCodeAt(0), 0) % list.length
  ];
/** Set a paper's name in its engraved masthead's plate. */
export function engraveMasthead(name, outlet) {
  const art = sameFor(
    outlet.layout === "weekly" ? MASTHEADS.weekly : MASTHEADS.daily,
    outlet.id ?? outlet.name ?? "",
  );
  const [width, height] = art.size;
  const [left, top, across, down] = art.plate;
  name.classList.add("engraved");
  Object.assign(name.style, {
    backgroundImage: `url(/art/newspaper/${art.file})`,
    aspectRatio: `${width} / ${height}`,
  });
  // The name sits in the plate, placed in percent of the strip.
  const plate = el("span", {
    className: "plate",
    textContent: name.textContent,
  });
  Object.assign(plate.style, {
    left: `${left}%`,
    top: `${top}%`,
    width: `${across}%`,
    height: `${down}%`,
  });
  name.replaceChildren(plate);
}

/** The reader's body: the lead story's photo, then whatever text it holds (printed, spoken, its lede, the address), else the worded reason it has none. */
export function readerBody({ lead, address, photo, none }) {
  const prose = (text, className = "prose") =>
    el("p", { className, textContent: text });
  const printed = lead.paragraphs ?? [];
  const spoken = (lead.broadcast ?? []).map((line) => line.text);
  const lede =
    lead.lede && lead.lede !== lead.headline && !printed.length
      ? [lead.lede]
      : [];
  const text = [
    ...printed.map((t) => prose(t)),
    ...(printed.length ? [] : spoken.map((t) => prose(t))),
    ...lede.map((t) => prose(t)),
    ...(printed.length
      ? []
      : (address ?? []).map((t) => prose(t, "speech quote"))),
  ];
  return [
    ...(photo
      ? [el("img", { className: "story-image", src: photo, alt: "" })]
      : []),
    ...(text.length ? text : none ? [prose(none)] : []),
  ];
}

/** The reader's other headlines, one line each. */
export function readerMore(headlines) {
  return headlines.map((text) =>
    el("p", { className: "prose", textContent: text }),
  );
}
