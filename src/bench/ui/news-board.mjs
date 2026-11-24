// News (play mock pl-news, on the owner's Nov 16 ruling that every story opens on a click): the
// outlets as tabs, the paper's name and the day, then every story as a headline in a list at the
// left and the chosen story at the right, set in type on the dark panel (never a cream sheet:
// owner, Nov 7). The screen hands it the outlets with their stories in words, the labels, the day and how to name
// a story. Every story is a headline in a list at the left; clicking one opens it at the right.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { tabBar, chooseTab } from "./tab.mjs";
import { pickRow } from "./list-row.mjs";
import { dateWords } from "../../english/plain-words.mjs";

/** A story's printed text: its written paragraphs, else its lede when it is not the headline again. */
const told = (story) =>
  story.paragraphs ??
  (story.lede && story.headline && story.lede !== story.headline
    ? [story.lede]
    : []);

/**
 * What an empty News page says, from the record of what the player follows:
 * they follow no paper or station anywhere; the outlet open is one they
 * follow and it has nothing yet; or it is one they do not follow. The three
 * read differently (Fable A, Nov 12).
 */
export function emptyNewsLine(outlet, followsAny, labels) {
  if (!followsAny) return labels.followsNone;
  return outlet.why === "follows" && outlet.name
    ? labels.printedNothing.replace("{name}", outlet.name)
    : labels.nothingYet;
}

export function newsBoard({
  outlets,
  labels,
  date,
  headlineOf,
  photoOf,
  chosenKey,
  onChoose,
  followsAny = true,
  actionOf,
  followed,
  onFollow,
}) {
  let chosen = outlets.has(chosenKey) ? chosenKey : outlets.keys().next().value;
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
  // The control reads the record's answer, which the screen refreshes after each press.
  const followControl = (key) => {
    const on = followed.get(key);
    return makeButton({
      className: "action news-follow",
      textContent: on ? labels.unfollow : labels.follow,
      onclick: () => onFollow?.(key, !on),
    });
  };
  const draw = () => {
    const outlet = outlets.get(chosen);
    holder.dataset.outlet = chosen;
    const stories = outlet.stories;
    // Every story is a headline in the list at the left and opens at the right when clicked
    // (owner, Nov 16: "News stories open on click"). The page opens on its fullest story.
    const lead = stories.includes(opened)
      ? opened
      : stories.reduce(
          (best, story) =>
            best && told(best).length >= told(story).length ? best : story,
          undefined,
        );
    // The day the story ran, as a paper says it ("February 21"); the year
    // only when it is another year. A clipping keeps its own day.
    const when = (story) =>
      story.date ? dateWords(story.date, { year: date }) : undefined;
    const rows = stories.map((story) => {
      const row = pickRow({
        label: headlineOf(story),
        aside: when(story),
        className: "news-row",
      });
      row.querySelector("b").classList.add("news-headline");
      row.dataset.key = story.id;
      row.setAttribute("aria-pressed", String(story === lead));
      row.addEventListener("click", () => {
        opened = story;
        draw();
      });
      return row;
    });
    // The lead carries the picture of the place its record is about, when the art has painted it.
    const photoUrl = lead ? photoOf?.(lead) : undefined;
    const page = lead
      ? el(
          "article",
          { className: "news-story lead" },
          el("h3", {
            className: "news-headline lead",
            textContent: headlineOf(lead),
          }),
          ...(when(lead)
            ? [
                el("span", {
                  className: "news-dateline",
                  textContent: when(lead),
                }),
              ]
            : []),
          ...(photoUrl
            ? [el("img", { className: "story-image", src: photoUrl, alt: "" })]
            : []),
          el(
            "div",
            { className: "news-text" },
            ...told(lead).map((text) =>
              el("p", { className: "intro", textContent: text }),
            ),
          ),
          // What the story's record opens (another state's change: its roll call).
          ...(actionOf?.(lead) ? [actionOf(lead)] : []),
        )
      : el("p", {
          className: "intro",
          textContent: emptyNewsLine(outlet, followsAny, labels),
        });
    if (lead) page.dataset.key = lead.id;
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
        // Follow or stop following this paper or station (an outlet the press engine keeps).
        ...(followed?.has(chosen) ? [followControl(chosen)] : []),
      ),
      el(
        "div",
        { className: "news-screen" },
        ...(rows.length
          ? [el("div", { className: "pick-list news-list" }, ...rows)]
          : []),
        el("div", { className: "news-page" }, page),
      ),
    );
  };
  draw();
  return holder;
}
