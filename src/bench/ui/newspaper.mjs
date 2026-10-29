// The newspaper: the menu type of News. The sheet is the paper itself (owner, Oct 28,
// point 25: "the page, the type, the columns, every story on it"): a front page per
// outlet (its masthead, the dateline, the lead story with its text and photo, the next
// stories beside it, the briefs across the foot), a story opened in place on the same page
// as its lead, and the outlet tabs. Nothing pages: every story's whole text is printed. The screen hands it the outlets with their stories in
// words, the labels, the day, and how to name a story and find its photo.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { makeTab, chooseTab } from "./tab.mjs";
import { dateWords } from "../../english/plain-words.mjs";

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
const LAYOUTS = ["broadsheet", "modern", "tabloid", "weekly"];
/** One of `list`, always the same one for the same record. */
export const sameFor = (list, key) =>
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

/** The outlet tabs and the paper, for the sheet's body. */
export function newspaperScreen({
  outlets,
  labels,
  date,
  headlineOf,
  photoOf,
}) {
  let chosen = outlets.keys().next().value;
  // A story the player opened: it takes the lead's place on the same page.
  let opened = null;
  const paper = el("section", { className: "paper" });
  const outletPicker = el("nav", { className: "outlet-picker" });
  const imageFor = (story) => {
    const url =
      story.presentation?.imageUrl ?? story.imageUrl ?? photoOf(story);
    if (!url) return [];
    const image = el("img", {
      className: "story-image",
      src: url,
      alt: story.presentation?.imageAlt ?? "",
    });
    image.onerror = () => image.remove();
    return [image];
  };
  // A story's printed text: its written paragraphs, else its lede when the
  // lede is not the headline said again; a newscast's spoken lines (greetings,
  // hand-offs) are not print, and a headline is never its own body.
  const told = (story) =>
    story.paragraphs ??
    (story.lede && story.headline && story.lede !== story.headline
      ? [story.lede]
      : []);
  // The masthead: the paper's name (clicking it returns to the front page), the
  // dateline under it. A broadsheet or weekly sets its name in the engraved
  // plate of the mockups' art; a modern paper or a tabloid runs it on a bar.
  const masthead = (outlet, layout) => {
    const name = makeButton({
      className: "paper-masthead-name",
      textContent: outlet.name ?? labels.title,
    });
    name.onclick = () => {
      opened = null;
      draw();
    };
    if (layout === "broadsheet" || layout === "weekly")
      engraveMasthead(name, outlet);
    return [
      el("header", { className: "paper-masthead" }, name),
      el(
        "div",
        { className: "paper-dateline" },
        el("span", { textContent: dateWords(date, { weekday: true }) }),
      ),
    ];
  };
  const layoutOf = (outlet) =>
    LAYOUTS.includes(outlet.layout) ? outlet.layout : "broadsheet";
  const draw = () => {
    const outlet = outlets.get(chosen);
    const layout = layoutOf(outlet);
    paper.className = `paper paper-${layout}`;
    // The front page, every story on it: the lead with its text and photo,
    // the next stories with text beside it, and the stories with only a
    // headline as briefs across the foot. Every word is the English engine's;
    // record rows with kinds and series names are not printed.
    // The lead is the story with the most to print (the paper's written
    // story before a one-line notice); the rest keep their order, newest first.
    const lead = outlet.stories.includes(opened)
      ? opened
      : outlet.stories.reduce(
          (best, story) =>
            best && told(best).length >= told(story).length ? best : story,
          undefined,
        );
    const rest = outlet.stories.filter((story) => story !== lead);
    const withText = rest.filter((story) => told(story).length);
    const briefs = rest.filter((story) => !told(story).length);
    const storyBlock = (story, className) => {
      const headline = makeButton({
        className: "story-headline",
        textContent: headlineOf(story),
      });
      headline.onclick = () => {
        opened = story === lead ? null : story;
        draw();
        document.getElementById("sheet-body")?.scrollTo(0, 0);
      };
      const text = told(story);
      return el(
        "article",
        { className: `paper-story ${className}` },
        headline,
        ...(text.length && className === "lead"
          ? [el("p", { className: "story-lede", textContent: text[0] })]
          : []),
        ...(className === "lead" ? imageFor(story) : []),
        ...(className === "lead"
          ? text.length > 1
            ? [
                el(
                  "div",
                  { className: "story-body" },
                  ...text
                    .slice(1)
                    .map((line) =>
                      el("p", { className: "story-text", textContent: line }),
                    ),
                ),
              ]
            : []
          : text.map((line, at) =>
              el("p", {
                className: at === 0 ? "story-lede" : "story-text",
                textContent: line,
              }),
            )),
      );
    };
    paper.replaceChildren(
      ...masthead(outlet, layout),
      el(
        "div",
        { className: "paper-stories" },
        ...(lead ? [storyBlock(lead, "lead")] : []),
        ...(withText.length
          ? [
              el(
                "div",
                { className: "paper-column" },
                ...withText.map((story) => storyBlock(story, "second")),
              ),
            ]
          : []),
        ...(briefs.length
          ? [
              el(
                "div",
                { className: "paper-briefs" },
                ...briefs.map((story) => storyBlock(story, "brief")),
              ),
            ]
          : []),
      ),
    );
    chooseTab(outletPicker, "outlet", chosen);
  };
  if (outlets.size > 1)
    for (const [key, outlet] of outlets) {
      outletPicker.append(
        makeTab({
          key,
          attr: "outlet",
          label: outlet.name,
          onSelect: () => {
            chosen = key;
            opened = null;
            draw();
          },
        }),
      );
    }
  draw();
  return [outletPicker, paper];
}

/** The reader's body: the lead story's photo, its printed or spoken text, the address. */
export function readerBody({ lead, address, photo }) {
  return [
    ...(photo
      ? [el("img", { className: "story-image", src: photo, alt: "" })]
      : []),
    // A story the paper prints (lede, figures, one quote) reads as printed;
    // otherwise the broadcast, then the address as the record quotes it.
    ...(lead.paragraphs
      ? lead.paragraphs.map((text) =>
          el("p", { className: "prose", textContent: text }),
        )
      : [
          ...lead.broadcast.map((line) =>
            el("p", { className: "prose", textContent: line.text }),
          ),
          ...address.map((text) =>
            el("p", { className: "speech quote", textContent: text }),
          ),
        ]),
  ];
}

/** The reader's other headlines, one line each. */
export function readerMore(headlines) {
  return headlines.map((text) =>
    el("p", { className: "prose", textContent: text }),
  );
}
