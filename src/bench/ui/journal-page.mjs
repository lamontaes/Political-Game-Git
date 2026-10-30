// The journal, to its mock (MOCKS journal.png): one cream page, "My life" over the chapter's
// place, then the chapter as a story in indented paragraphs. A life with more than one chapter
// pages by chapter with arrows under the page, never a scroll (owner, Oct 29: a menu does not
// scroll as a page). The screen hands it the chapters and the words from the controls file.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

/**
 * `chapters`: [{ title, from, through, lines: [{ text }] }]; `labels`: { title, chapter:
 * "Chapter {n}", numbers: ["one", ...], years: "{from} to {through}", previous, next,
 * page: "{page} of {pages}" }; `yearOf`: iso date to its year, in words the screen chooses.
 */
export function journalPage({ chapters, labels, yearOf }) {
  let at = chapters.length - 1;
  const paper = el("article", { className: "journal-page" });
  const where = el("span", { className: "pager-where" });
  const previous = makeButton({
    className: "pager-arrow",
    textContent: "‹",
    title: labels.previous,
  });
  const next = makeButton({
    className: "pager-arrow",
    textContent: "›",
    title: labels.next,
  });
  previous.setAttribute("aria-label", labels.previous);
  next.setAttribute("aria-label", labels.next);
  const controls = el(
    "nav",
    { className: "pager-controls journal-pager" },
    previous,
    where,
    next,
  );
  controls.hidden = chapters.length < 2;
  const draw = () => {
    const chapter = chapters[at];
    const number = labels.numbers[at] ?? String(at + 1);
    const span = yearOf(chapter.from);
    const through = yearOf(chapter.through);
    const years = span === through ? span : `${span}–${through}`;
    paper.replaceChildren(
      el("h2", { textContent: labels.title }),
      el("p", {
        className: "journal-chapter",
        textContent: [
          labels.chapter.replace("{n}", number),
          chapter.title,
          years,
        ]
          .filter(Boolean)
          .join(" · "),
      }),
      el("hr"),
      ...chapter.lines.map((line) => el("p", { textContent: line.text })),
    );
    where.textContent = labels.page
      .replace("{page}", String(at + 1))
      .replace("{pages}", String(chapters.length));
    previous.disabled = at === 0;
    next.disabled = at >= chapters.length - 1;
  };
  previous.addEventListener("click", () => {
    at = Math.max(0, at - 1);
    draw();
  });
  next.addEventListener("click", () => {
    at = Math.min(chapters.length - 1, at + 1);
    draw();
  });
  draw();
  return el("div", { className: "journal-screen" }, paper, controls);
}
