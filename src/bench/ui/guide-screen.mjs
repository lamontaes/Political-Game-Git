// The Guide (owner, Oct 28: its own menu entry; mock pl-guide): the civic words in a list at
// the left, the chosen word's article in header strips at the right: what it is, what it
// means here, and the words it is tied to. The list and the article are the glossary's own
// records; the screen hands them in.
import { el, viewHeight } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { pickHead, pickRow } from "./list-row.mjs";
import { pager } from "./pager.mjs";
import { searchBox } from "./fields.mjs";
import { stripSection, introText } from "./strips.mjs";

/**
 * `terms`: [{ key, term, short, explanation, contextNote, related: [name] }]; `labels`:
 * { title, search, none, resetLearned, whatItIs, here, related };
 * `query` the search text now; `onSearch(text) -> terms`; `onReset()`.
 */
export function guideScreen({ terms, labels, query, onSearch, onReset }) {
  let shown = terms;
  let chosen = terms[0]?.key;
  const roster = el("nav", { className: "pick-list guide-roster" });
  roster.setAttribute("aria-label", labels.title);
  const article = el("div", { className: "guide-article strip-screen strips" });
  const drawArticle = () => {
    const t = shown.find((x) => x.key === chosen) ?? shown[0];
    for (const b of roster.querySelectorAll(".term-row"))
      b.setAttribute("aria-pressed", String(b.dataset.term === t?.key));
    if (!t) return article.replaceChildren();
    const open = (name) => {
      const hit = shown.find(
        (x) => x.term.toLowerCase() === name.toLowerCase(),
      );
      if (!hit) return null;
      return () => {
        chosen = hit.key;
        drawRoster();
        drawArticle();
      };
    };
    const tied = t.related
      .map((name) => ({ name, go: open(name) }))
      .filter((x) => x.go);
    article.replaceChildren(
      el("h2", { className: "guide-term", textContent: t.term }),
      stripSection(
        1,
        labels.whatItIs,
        introText([t.short, t.explanation].filter(Boolean).join(" ")),
      ),
      ...(t.contextNote
        ? [stripSection(2, labels.here, introText(t.contextNote))]
        : []),
      ...(tied.length
        ? [
            stripSection(
              3,
              labels.related,
              el(
                "div",
                { className: "guide-related" },
                ...tied.map(({ name, go }) => {
                  const b = makeButton({ textContent: name });
                  b.addEventListener("click", go);
                  return b;
                }),
              ),
            ),
          ]
        : []),
    );
  };
  const drawRoster = () => {
    roster.replaceChildren(
      pickHead(labels.title),
      shown.length
        ? pager({
            items: shown,
            render: (t) => {
              const row = pickRow({ label: t.term, className: "term-row" });
              row.dataset.term = t.key;
              row.setAttribute("aria-pressed", String(t.key === chosen));
              row.addEventListener("click", () => {
                chosen = t.key;
                drawArticle();
              });
              return row;
            },
            rows: Math.max(
              6,
              Math.min(14, Math.floor((viewHeight() - 330) / 36)),
            ),
            columns: 1,
            rowHeight: 34,
            gap: 2,
            className: "guide-pages",
          })
        : el("p", { className: "guide-none", textContent: labels.none }),
    );
  };
  const search = searchBox({
    value: query,
    placeholder: labels.search,
    onInput: async (text) => {
      const found = await onSearch(text);
      if (!found) return;
      shown = found;
      if (!shown.some((t) => t.key === chosen)) chosen = shown[0]?.key;
      drawRoster();
      drawArticle();
    },
  });
  search.setAttribute("aria-label", labels.search);
  const reset = makeButton({
    className: "action small",
    textContent: labels.resetLearned,
  });
  reset.addEventListener("click", onReset);
  drawRoster();
  drawArticle();
  return [
    el(
      "div",
      { className: "guide-screen" },
      el("div", { className: "guide-controls" }, search, reset),
      el("div", { className: "guide-body" }, roster, article),
    ),
  ];
}
