// The Guide (owner, Oct 28: its own menu entry; mock pl-guide): the civic words in a list at
// the left, the chosen word's article in header strips at the right: what it is, what it
// means here, and the words it is tied to, on the one list-beside-detail part
// (`rosterScreen`). The list and the article are the glossary's own records; the screen
// hands them in.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { searchBox } from "./fields.mjs";
import { rosterScreen } from "./roster-screen.mjs";
import { stripSection, introText } from "./strips.mjs";

/**
 * `terms`: [{ key, term, short, explanation, contextNote, related: [name] }]; `labels`:
 * { title, search, none, resetLearned, whatItIs, here, related };
 * `query` the search text now; `onSearch(text) -> terms`; `onReset()`.
 */
export function guideScreen({ terms, labels, query, onSearch, onReset }) {
  let shown = terms;
  let chosen = terms[0]?.key;
  const body = el("div", { className: "guide-body" });
  // The roster of the words shown, with `chosenKey` open beside it.
  const drawBody = (chosenKey) => {
    if (!shown.length)
      return body.replaceChildren(
        el("p", { className: "guide-none", textContent: labels.none }),
      );
    body.replaceChildren(
      ...rosterScreen({
        title: labels.title,
        className: "guide",
        chosenKey,
        groups: [
          {
            entries: shown.map((t) => ({ key: t.key, label: t.term, t })),
          },
        ],
        render: (entry) => {
          chosen = entry.key;
          return article(entry.t);
        },
      }),
    );
  };
  // A word's article; a tied word opens its own.
  const article = (t) => {
    const tied = t.related
      .map((name) => ({
        name,
        hit: shown.find((x) => x.term.toLowerCase() === name.toLowerCase()),
      }))
      .filter((x) => x.hit);
    return [
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
                ...tied.map(({ name, hit }) => {
                  const b = makeButton({ textContent: name });
                  b.addEventListener("click", () => drawBody(hit.key));
                  return b;
                }),
              ),
            ),
          ]
        : []),
    ];
  };
  const search = searchBox({
    value: query,
    placeholder: labels.search,
    onInput: async (text) => {
      const found = await onSearch(text);
      if (!found) return;
      shown = found;
      if (!shown.some((t) => t.key === chosen)) chosen = shown[0]?.key;
      drawBody(chosen);
    },
  });
  search.setAttribute("aria-label", labels.search);
  const reset = makeButton({
    className: "action small",
    textContent: labels.resetLearned,
  });
  reset.addEventListener("click", onReset);
  drawBody(chosen);
  return [
    el(
      "div",
      { className: "guide-screen" },
      el("div", { className: "guide-controls" }, search, reset),
      body,
    ),
  ];
}
