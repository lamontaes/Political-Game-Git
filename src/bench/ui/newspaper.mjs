// The newspaper: the menu type of News. A front page per outlet (its engraved masthead,
// the date, the lead story with its text and photo, the next stories beside it, briefs
// below, principle 9), a story opened to read, and the outlet tabs. The screen hands it
// the outlets with their stories in words, the labels, the day, and how to name a story
// and find its photo.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { makeTab, chooseTab } from "./tab.mjs";

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
  let page = 0;
  const paper = el("section", { className: "paper" });
  const outletPicker = el("nav", { className: "outlet-picker" });
  const button = (label, fn) => {
    const b = makeButton({ textContent: label });
    b.onclick = fn;
    return b;
  };
  const dateWords = (iso) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
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
  const article = (story) => {
    let articlePage = 0;
    const text =
      story.paragraphs ??
      story.broadcast?.map((line) => line.text) ??
      [story.lede].filter(Boolean);
    const chunks = text.flatMap((paragraph) => {
      const tokens = paragraph.split(/\s+/);
      const result = [];
      for (let i = 0; i < tokens.length; i += 100)
        result.push(tokens.slice(i, i + 100).join(" "));
      return result;
    });
    const drawArticle = () => {
      const back = button(labels.back, draw);
      const body = el(
        "div",
        { className: "article-body" },
        ...chunks
          .slice(articlePage * 2, articlePage * 2 + 2)
          .map((text) => el("p", { textContent: text })),
      );
      const prev = button(labels.previous, () => {
        articlePage--;
        drawArticle();
      });
      prev.disabled = articlePage === 0;
      const next = button(labels.next, () => {
        articlePage++;
        drawArticle();
      });
      next.disabled = (articlePage + 1) * 2 >= chunks.length;
      paper.replaceChildren(
        back,
        el("h2", {
          className: "article-title",
          textContent: story.headline ?? story.lede,
        }),
        body,
        ...(chunks.length > 2
          ? [el("nav", { className: "paper-pager" }, prev, next)]
          : []),
      );
    };
    drawArticle();
  };
  const draw = () => {
    const outlet = outlets.get(chosen);
    const layout = ["broadsheet", "modern", "tabloid", "weekly"].includes(
      outlet.layout,
    )
      ? outlet.layout
      : "broadsheet";
    paper.className = `paper paper-${layout}`;
    // A front page (owner, Oct 27: "News is a newspaper with story text"):
    // the lead story with its text, the next stories with theirs beside it,
    // and stories with only a headline as briefs. Every word is the English
    // engine's; record rows with kinds and series names are not printed.
    // Print takes the story's written paragraphs, else its lede; a
    // newscast's spoken lines (greetings, hand-offs) are not print.
    const told = (story) =>
      story.paragraphs ?? (story.lede && story.headline ? [story.lede] : []);
    const pageStories = outlet.stories.slice(page * 6, page * 6 + 6);
    const [lead, ...rest] = pageStories;
    const withText = rest.filter((story) => told(story).length);
    const briefs = rest.filter((story) => !told(story).length);
    const storyBlock = (story, className, paragraphs) => {
      const headline = button(headlineOf(story), () => article(story));
      headline.className = "story-headline";
      return el(
        "article",
        { className: `paper-story ${className}` },
        headline,
        ...(className === "lead" ? imageFor(story) : []),
        ...told(story)
          .slice(0, paragraphs)
          .map((text, at) =>
            el("p", {
              className: at === 0 ? "story-lede" : "story-text",
              textContent: text,
            }),
          ),
      );
    };
    const name = el("h2", { textContent: outlet.name ?? labels.title });
    engraveMasthead(name, outlet);
    paper.replaceChildren(
      el(
        "header",
        { className: "paper-masthead" },
        name,
        el("span", {
          className: "paper-date",
          textContent: dateWords(date),
        }),
      ),
      el(
        "div",
        { className: "paper-stories" },
        ...(lead ? [storyBlock(lead, "lead", 4)] : []),
        el(
          "div",
          { className: "paper-column" },
          ...withText.map((story) => storyBlock(story, "second", 2)),
          ...briefs.map((story) => storyBlock(story, "brief", 0)),
        ),
      ),
    );
    if (outlet.stories.length > 6) {
      const back = button(labels.previous, () => {
        page--;
        draw();
      });
      back.disabled = page === 0;
      const next = button(labels.next, () => {
        page++;
        draw();
      });
      next.disabled = (page + 1) * 6 >= outlet.stories.length;
      paper.append(el("nav", { className: "paper-pager" }, back, next));
    }
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
            page = 0;
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
