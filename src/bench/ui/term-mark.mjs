/* global document, MutationObserver, window, NodeFilter */
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

/** One pattern for every term, longest first so "Veto override" wins over "Veto". */
function patternOf(keys) {
  const sorted = [...keys].sort((a, b) => b.length - a.length);
  if (!sorted.length) return null;
  const escaped = sorted.map((key) =>
    key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"),
  );
  return new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
}

/**
 * Underline each term in `root`'s text. `terms` is the Map of lower-case term to its row;
 * `learned` the Set of keys the player marked learned; `hooks` the hover, leave and open
 * handlers (the screen's own tip and Guide).
 */
export function markTerms(root, { terms, learned, hooks }) {
  const pattern = patternOf(terms.keys());
  if (!pattern) return;
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
          at.dataset?.noTerms !== undefined
        )
          return NodeFilter.FILTER_REJECT;
        if (at.classList?.contains("term")) return NodeFilter.FILTER_REJECT;
      }
      pattern.lastIndex = 0;
      return pattern.test(node.nodeValue)
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
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index > last) parts.push(text.slice(last, match.index));
      const key = match[0].toLowerCase().replace(/\s+/g, " ");
      const word = termWord({
        text: match[0],
        isTerm: terms.has(key),
        learned: learned.has(key),
        onHover: (b) => hooks.onHover(b, key),
        onLeave: hooks.onLeave,
        onOpen: () => hooks.onOpen(match[0]),
      });
      // Inside a sentence the term is a word in it, not a bold label.
      word.style.fontWeight = "inherit";
      parts.push(word);
      last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    node.replaceWith(...parts);
  }
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
