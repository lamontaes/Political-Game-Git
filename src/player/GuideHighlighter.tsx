import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { annotateGuideTerms, guideTerm } from "../presentation/guide-terms";
import type { GuideTermEntry } from "../presentation/guide-terms";
import { GuideHelpContext } from "./GuideTerm";

/**
 * The civic words in every sentence on screen, underlined where they stand.
 *
 * Most of what a player reads is a sentence some producer assembled: a news
 * story, a journal line, a campaign row, a dossier fact. Wrapping each of
 * those at its own render point would leave the next new surface without
 * help, which is how the underlines were promised for months and never
 * arrived. So this reads the text the page already shows and marks the terms
 * with the browser's highlight ranges (the CSS Custom Highlight API). Nothing
 * in the page's own markup changes, so React's tree, focus and selection are
 * untouched, and a sentence reads exactly as its producer wrote it.
 *
 * Which words are terms comes from the catalog's inline phrases, never a
 * guess, and each term is marked once per paragraph. A word inside a button,
 * a link or a field is left alone, since pressing it already does something
 * else, and so is a word already wrapped by `GuideTerm`, which carries the
 * same help for the keyboard. A term the player marked with "Got it" is not
 * marked anywhere. Resting the pointer on a marked word opens the same card
 * `GuideTerm` opens.
 *
 * Where the browser has no highlight support the page is simply unmarked.
 */

const HIGHLIGHT = "pg-guide-term";
const HOVER_OPEN_MS = 250;
const HOVER_CLOSE_MS = 180;

/* Text inside these is left alone. */
const SKIP_SELECTOR = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "option",
  "script",
  "style",
  "code",
  "time",
  "[contenteditable]",
  "[aria-hidden='true']",
  ".sr-only",
  ".pg-guide-term",
  ".pg-guide-popover",
  "[data-guide-skip]",
].join(",");

/* The unit that gets each term once: the nearest paragraph-like element. */
const BLOCK_SELECTOR =
  "p,li,dd,dt,td,th,h1,h2,h3,h4,h5,h6,figcaption,blockquote,article,section,aside,dialog,[role='dialog']";

interface MarkedRange {
  readonly range: Range;
  readonly semanticKey: string;
}

interface HighlightRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): void;
}

function highlightSupport(): {
  readonly registry: HighlightRegistry;
  readonly Highlight: new (...ranges: Range[]) => unknown;
} | null {
  if (typeof window === "undefined" || typeof CSS === "undefined") return null;
  const registry = (CSS as unknown as { highlights?: HighlightRegistry })
    .highlights;
  const Highlight = (
    window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }
  ).Highlight;
  return registry && Highlight ? { registry, Highlight } : null;
}

function markRanges(
  root: Element,
  learned: ReadonlySet<string>,
): MarkedRange[] {
  const marked: MarkedRange[] = [];
  const usedByBlock = new Map<Element, Set<string>>();
  const usedIn = (block: Element): Set<string> => {
    let used = usedByBlock.get(block);
    if (!used) {
      used = new Set(
        Array.from(block.querySelectorAll("[data-guide-term]"), (node) =>
          node.getAttribute("data-guide-term"),
        ).filter((key): key is string => key !== null),
      );
      usedByBlock.set(block, used);
    }
    return used;
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.nodeValue;
      if (!text || text.trim().length < 3) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP_SELECTOR))
        return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (
    let node = walker.nextNode() as Text | null;
    node;
    node = walker.nextNode() as Text | null
  ) {
    const segments = annotateGuideTerms(node.data);
    if (segments.length === 1 && segments[0]?.semanticKey === null) continue;
    const block = node.parentElement?.closest(BLOCK_SELECTOR) ?? root;
    const used = usedIn(block);
    let offset = 0;
    for (const segment of segments) {
      const start = offset;
      offset += segment.text.length;
      const key = segment.semanticKey;
      if (key === null || learned.has(key) || used.has(key)) continue;
      used.add(key);
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, offset);
      marked.push({ range, semanticKey: key });
    }
  }
  return marked;
}

function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (
      x: number,
      y: number,
    ) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y);
    return position
      ? { node: position.offsetNode, offset: position.offset }
      : null;
  }
  const range = doc.caretRangeFromPoint?.(x, y);
  return range
    ? { node: range.startContainer, offset: range.startOffset }
    : null;
}

function rangeUnder(
  marked: readonly MarkedRange[],
  x: number,
  y: number,
): MarkedRange | null {
  const caret = caretAt(x, y);
  if (!caret) return null;
  for (const entry of marked) {
    if (entry.range.startContainer !== caret.node) continue;
    if (
      caret.offset < entry.range.startOffset ||
      caret.offset > entry.range.endOffset
    )
      continue;
    /* The caret snaps to the nearest letter; make sure the pointer is on it. */
    for (const rect of Array.from(entry.range.getClientRects())) {
      if (
        x >= rect.left - 1 &&
        x <= rect.right + 1 &&
        y >= rect.top - 2 &&
        y <= rect.bottom + 2
      )
        return entry;
    }
  }
  return null;
}

export function GuideHighlighter({
  root,
}: {
  /** Where to look; the play screen. Portaled overlays are found by selector. */
  readonly root: () => Element | null;
}) {
  const help = useContext(GuideHelpContext);
  const marked = useRef<MarkedRange[]>([]);
  const [shown, setShown] = useState<{
    readonly entry: GuideTermEntry;
    readonly anchor: DOMRect;
  } | null>(null);
  const timer = useRef<number | null>(null);
  const hovering = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const learnedKey = help?.learnedKeys.join("|") ?? "";

  /* Mark the page, and mark it again whenever its text changes. */
  useEffect(() => {
    const support = highlightSupport();
    if (!support || !help) return;
    const learned = new Set(help.learnedKeys);
    let frame: number | null = null;
    const refresh = (): void => {
      frame = null;
      const scope = root();
      if (!scope) return;
      const next = markRanges(scope, learned);
      marked.current = next;
      support.registry.set(
        HIGHLIGHT,
        new support.Highlight(...next.map((entry) => entry.range)),
      );
    };
    const schedule = (): void => {
      if (frame === null) frame = window.setTimeout(refresh, 120);
    };
    refresh();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => {
      observer.disconnect();
      if (frame !== null) window.clearTimeout(frame);
      support.registry.delete(HIGHLIGHT);
      marked.current = [];
    };
  }, [learnedKey, root, help !== null]); // learnedKey stands for help.learnedKeys

  /* Resting the pointer on a marked word opens its card. */
  useEffect(() => {
    if (!help || !highlightSupport()) return;
    const later = (action: () => void, delay: number): void => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        action();
      }, delay);
    };
    const onMove = (event: PointerEvent): void => {
      if (event.pointerType === "touch") return;
      const target = event.target as Element | null;
      if (target && cardRef.current?.contains(target)) {
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = null;
        return;
      }
      const hit = rangeUnder(marked.current, event.clientX, event.clientY);
      const key = hit?.semanticKey ?? null;
      if (key === hovering.current) return;
      hovering.current = key;
      if (hit) {
        const entry = guideTerm(hit.semanticKey);
        if (!entry) return;
        later(
          () => setShown({ entry, anchor: hit.range.getBoundingClientRect() }),
          HOVER_OPEN_MS,
        );
      } else {
        later(() => setShown(null), HOVER_CLOSE_MS);
      }
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [help]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!shown || !card) return;
    const box = card.getBoundingClientRect();
    const margin = 8;
    const below = window.innerHeight - shown.anchor.bottom;
    const above = below < box.height + margin && shown.anchor.top > below;
    card.dataset.placement = above ? "above" : "below";
    card.style.top = `${Math.round(
      above
        ? Math.max(margin, shown.anchor.top - box.height - 6)
        : shown.anchor.bottom + 6,
    )}px`;
    card.style.left = `${Math.round(
      Math.max(
        margin,
        Math.min(shown.anchor.left, window.innerWidth - box.width - margin),
      ),
    )}px`;
  }, [shown]);

  useEffect(() => {
    if (!shown) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setShown(null);
    };
    const onScroll = (): void => setShown(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [shown]);

  if (!help || !shown || typeof document === "undefined") return null;
  const { entry } = shown;
  return createPortal(
    <div
      ref={cardRef}
      className="pg-guide-popover"
      data-testid={`guide-term-card-${entry.semanticKey}`}
      role="dialog"
      aria-modal="false"
      aria-label={`${entry.term}: what it means`}
      onPointerLeave={() => {
        hovering.current = null;
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setShown(null), HOVER_CLOSE_MS);
      }}
    >
      <p className="pg-guide-popover-term">{entry.term}</p>
      <p className="pg-guide-popover-definition">{entry.shortDefinition}</p>
      <div className="pg-guide-popover-actions">
        <button
          type="button"
          className="pg-guide-popover-got-it"
          data-testid={`guide-term-learned-${entry.semanticKey}`}
          onClick={() => {
            setShown(null);
            hovering.current = null;
            help.setLearned(entry.semanticKey, true);
          }}
        >
          Got it
        </button>
        <button
          type="button"
          className="pg-guide-popover-more"
          data-testid={`guide-term-open-${entry.semanticKey}`}
          onClick={() => {
            setShown(null);
            hovering.current = null;
            help.openGuide(entry.semanticKey);
          }}
        >
          More in the Guide
        </button>
      </div>
    </div>,
    document.body,
  );
}
