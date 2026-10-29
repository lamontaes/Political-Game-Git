// The one framed plate: what a menu's content sits on, never the bare panel
// (owner, Oct 29: "I don't like... the black or gray just background, like
// stuff sitting on it"; he chose framed plates). A soft gradient, a thin brass
// edge, an inner shadow and small brass corners, all from play.css. Every
// record section is one (section.mjs); a screen asks for a plate by itself
// for anything else.
import { el } from "./dom.mjs";

/** A plate under its title, when it has one, around `content`. */
export function plate(title, ...content) {
  return el(
    "section",
    { className: "plate" },
    ...(title ? [el("h3", { className: "label", textContent: title })] : []),
    ...content,
  );
}

/**
 * Small plates side by side, one per fact (Work, Home, School): its label,
 * the fact in bold, and a second line under it when there is one.
 * `facts`: [{ title?, value, note?, record? }], or [{ node, wide? }] for a
 * plate holding another part (a meter), two columns wide when `wide`.
 */
export function factPlates(facts) {
  return el(
    "div",
    { className: "fact-plates" },
    ...facts.map((fact) => {
      const node = fact.node
        ? el("div", { className: "plate fact-plate" }, fact.node)
        : el(
            "div",
            { className: "plate fact-plate" },
            ...(fact.title
              ? [el("span", { className: "label", textContent: fact.title })]
              : []),
            el("strong", { className: "fact-value", textContent: fact.value }),
            ...(fact.note
              ? [el("span", { className: "fact-note", textContent: fact.note })]
              : []),
          );
      if (fact.wide) node.classList.add("wide");
      if (fact.record) node.dataset.record = fact.record;
      return node;
    }),
  );
}

/**
 * Short words in rounded brass chips under a name (a party, what you share),
 * `words`: [{ text, record? }], each chip carrying the record it stands on.
 */
export function chips(words) {
  return el(
    "div",
    { className: "chips" },
    ...words.map(({ text, record }) => {
      const chip = el("span", { className: "chip", textContent: text });
      if (record) chip.dataset.record = record;
      return chip;
    }),
  );
}
