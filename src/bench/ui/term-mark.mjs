/* global document, MutationObserver, window, NodeFilter, setTimeout, clearTimeout */
// Inline glossary help (owner, Nov 8: "I've never seen any of the inline helping stuff for the
// glossary"). A civic term is underlined wherever it appears in player text, not only when it
// is a whole label: hover shows its short definition with Mark as learned, a click opens the
// Guide there. One walker over the game's text, run again whenever a screen draws.
import { termWord } from "./term.mjs";

const SKIP = new Set([
  "BUTTON",
  "INPUT",
  "SELECT",
  "OPTION",
  "TEXTAREA",
  "SCRIPT",
  "STYLE",
  "H1",
  "H2",
  "H3",
]);

/** A term and the plurals a sentence uses for it: aldermen, vetoes, council members. */
function variantsOf(key) {
  return [
    key,
    `${key}s`,
    `${key}es`,
    ...(key.endsWith("man") ? [`${key.slice(0, -3)}men`] : []),
    ...(key.endsWith("y") ? [`${key.slice(0, -1)}ies`] : []),
  ];
}

/** One pattern for every term and its plurals, longest first so "Veto override" wins over "Veto". */
function patternOf(keys) {
  const variants = new Map();
  for (const key of keys)
    for (const variant of variantsOf(key)) variants.set(variant, key);
  const sorted = [...variants.keys()].sort((a, b) => b.length - a.length);
  if (!sorted.length) return null;
  const escaped = sorted.map((word) =>
    word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"),
  );
  return {
    variants,
    regex: new RegExp(`\\b(${escaped.join("|")})\\b`, "gi"),
  };
}

/** How long a pointer rests on a term before its card opens (Sept 29 hand-back: about 250 ms). */
const REST_MS = 250;

/**
 * Underline each term in `root`'s text. `terms` is the Map of lower-case term to its row;
 * `learned` the Set of keys the player marked learned; `hooks` the hover, leave and open
 * handlers (the screen's own tip and Guide).
 */
export function markTerms(root, { terms, learned, hooks }) {
  const pattern = patternOf(terms.keys());
  if (!pattern) return;
  const { regex, variants } = pattern;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      for (
        let at = node.parentElement;
        at && at !== root.parentElement;
        at = at.parentElement
      ) {
        if (
          SKIP.has(at.tagName) ||
          at.id === "tip" ||
          at.dataset?.noTerms !== undefined ||
          at.dataset?.termKey !== undefined
        )
          return NodeFilter.FILTER_REJECT;
      }
      regex.lastIndex = 0;
      return regex.test(node.nodeValue)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  const found = [];
  while (walker.nextNode()) found.push(walker.currentNode);
  for (const node of found) {
    const text = node.nodeValue;
    const parts = [];
    let last = 0;
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      if (match.index > last) parts.push(text.slice(last, match.index));
      const key = variants.get(match[0].toLowerCase().replace(/\s+/g, " "));
      parts.push(wordFor(match[0], key, learned.has(key), hooks));
      last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    node.replaceWith(...parts);
  }
}

/**
 * One term in a sentence: underlined until learned, its card after the pointer rests about
 * 250 ms or at once on keyboard focus, Enter or a click opening the Guide there, Escape and
 * leaving closing the card.
 */
function wordFor(text, key, isLearned, hooks) {
  const word = termWord({ text, isTerm: true, learned: isLearned });
  // Inside a sentence the term is a word in it, not a bold label.
  word.style.fontWeight = "inherit";
  word.dataset.termKey = key;
  word.tabIndex = 0;
  word.setAttribute("role", "button");
  word.setAttribute("aria-describedby", "tip");
  let rest;
  word.addEventListener("mouseenter", () => {
    clearTimeout(rest);
    rest = setTimeout(() => {
      if (word.classList.contains("term") && word.matches(":hover"))
        hooks.onHover(word, key);
    }, REST_MS);
  });
  word.addEventListener("mouseleave", () => {
    clearTimeout(rest);
    hooks.onLeave();
  });
  word.addEventListener("focus", () => {
    if (word.classList.contains("term")) hooks.onHover(word, key);
  });
  word.addEventListener("blur", () => hooks.onLeave());
  word.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      // The term's card is the top thing open: this press closes it and no more.
      event.stopPropagation();
      hooks.onClose?.();
    }
    if (event.key === "Enter") hooks.onOpen(text);
  });
  word.addEventListener("click", () => hooks.onOpen(text));
  return word;
}

/** Keep `root` marked as it changes: runs once per frame after any text arrives. */
export function watchTerms(root, options) {
  let queued = false;
  const run = () => {
    queued = false;
    markTerms(root, options);
  };
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(run);
  });
  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  run();
}
