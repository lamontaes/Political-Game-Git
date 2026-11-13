// News as the Nov 8 play mock draws it (pl-news): the outlets as tabs, the paper's name and the
// day, then the lead story with its text in two columns, the other stories beside it and the
// briefs in a strip, set in type on the dark panel (never a cream sheet: owner, Nov 7). The
// screen hands it the outlets with their stories in words, the labels, the day and how to name
// a story. Clicking a headline swaps that story into the lead's place.
import { el } from "./dom.mjs";
import { tabBar, chooseTab } from "./tab.mjs";
import { stripBoard, stripSection } from "./strips.mjs";
import { pager } from "./pager.mjs";
import { dateWords } from "../../english/plain-words.mjs";

/** A story's printed text: its written paragraphs, else its lede when it is not the headline again. */
const told = (story) =>
  story.paragraphs ??
  (story.lede && story.headline && story.lede !== story.headline
    ? [story.lede]
    : []);

export function newsBoard({
  outlets,
  labels,
  date,
  headlineOf,
  photoOf,
  chosenKey,
  onChoose,
  followsAny = true,
}) {
  let chosen = outlets.has(chosenKey) ? chosenKey : outlets.keys().next().value;
  // An empty page says why, from the record of what the player follows: they
  // follow no paper or station anywhere, or the one open is theirs and has
  // printed nothing yet. The two read differently (Fable A, Nov 12).
  const emptyPage = (outlet) =>
    !followsAny
      ? labels.followsNone
      : outlet.why === "follows" && outlet.name
        ? labels.printedNothing.replace("{name}", outlet.name)
        : labels.nothingYet;
  let opened = null;
  const holder = el("div", { className: "news-board" });
  const tabs = tabBar({
    attr: "outlet",
    active: chosen,
    tabs: [...outlets.entries()].map(([key, outlet]) => ({
      key,
      label: outlet.name ?? labels.title,
      onSelect: () => {
        chosen = key;
        onChoose?.(key);
        opened = null;
        chooseTab(tabs, "outlet", key);
        draw();
      },
    })),
  });
  const draw = () => {
    const outlet = outlets.get(chosen);
    holder.dataset.outlet = chosen;
    const stories = outlet.stories;
    const side = stories.filter((story) => story.brief);
    const front = stories.filter((story) => !story.brief);
    const lead = front.includes(opened)
      ? opened
      : front.reduce(
          (best, story) =>
            best && told(best).length >= told(story).length ? best : story,
          undefined,
        );
    const rest = front.filter((story) => story !== lead);
    const withText = rest.filter((story) => told(story).length);
    const briefs = [...side, ...rest.filter((story) => !told(story).length)];
    const headline = (story, className) => {
      const node = el("h3", {
        className: `news-headline ${className}`,
        textContent: headlineOf(story),
      });
      node.tabIndex = 0;
      node.setAttribute("role", "button");
      const open = () => {
        opened = story === lead ? null : story;
        draw();
      };
      node.addEventListener("click", open);
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
      return node;
    };
    // The lead of a government acting carries that room's front-page photo, when the record has one.
    const photo = (story, className) => {
      const url = className === "lead" ? photoOf?.(story) : undefined;
      return url
        ? [el("img", { className: "story-image", src: url, alt: "" })]
        : [];
    };
    const storyNode = (story, className) =>
      el(
        "article",
        { className: `news-story ${className}` },
        headline(story, className),
        ...photo(story, className),
        el(
          "div",
          { className: "news-text" },
          ...told(story).map((text) =>
            el("p", { className: "intro", textContent: text }),
          ),
        ),
      );
    // One paper needs no tab over its own masthead.
    holder.replaceChildren(
      ...(outlets.size > 1 ? [tabs] : []),
      el(
        "header",
        { className: "news-masthead" },
        // A paper with no name of its own (or the sheet's own) would repeat the title.
        ...(outlet.name && outlet.name !== labels.title
          ? [el("h2", { textContent: outlet.name })]
          : []),
        el("span", {
          textContent: dateWords(date, { weekday: true }),
        }),
      ),
      stripBoard({
        columns: [
          lead
            ? [storyNode(lead, "lead")]
            : stories.length
              ? []
              : [
                  el("p", {
                    className: "intro",
                    textContent: emptyPage(outlet),
                  }),
                ],
          withText.map((story) => storyNode(story, "side")),
          briefs.length
            ? [
                stripSection(
                  3,
                  labels.briefs,
                  pager({
                    items: briefs,
                    render: (story) =>
                      el("p", {
                        className: `intro ${story.brief ? "news-brief" : "news-line"}`,
                        textContent: told(story).length
                          ? `${headlineOf(story)}. ${told(story).join(" ")}`
                          : headlineOf(story),
                      }),
                    rows: 5,
                    columns: 1,
                    rowHeight: 86,
                    // A long brief takes the room it needs; the box scrolls
                    // and no brief is printed over the next.
                    growRows: true,
                    gap: 6,
                    className: "news-briefs",
                  }),
                ),
              ]
            : [],
        ].filter((column) => column.length),
      }),
    );
  };
  draw();
  return holder;
}
