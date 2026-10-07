import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import {
  annotateGuideTerms,
  guideTerm,
  guideTermByLabel,
} from "../presentation/guide-terms";
import type { GuideTermEntry } from "../presentation/guide-terms";

import "./guide.css";

/**
 * Inline help on a word the game has already decided to say.
 *
 * A surface that shows "President pro tempore" or "Sponsor of record" should
 * not have to grow an explanation of its own, and it should not have to be
 * rewritten to gain one. It wraps the word it was already rendering; the help
 * arrives from the shell through context. Where the shell has not provided it
 * — a panel mounted somewhere the Guide is not reachable, a test rendering one
 * component alone — the wrapper is the plain text it wrapped, which is the
 * same screen as before rather than a dead control.
 *
 * A term the player has marked learned ("Got it") is ordinary text again
 * everywhere; the Guide keeps its entry. Nothing here is knowledge in the
 * world. The character does not learn anything because the player pressed
 * this, and nothing that decides an outcome may read it.
 */

export interface GuideHelp {
  readonly learnedKeys: readonly string[];
  readonly setLearned: (semanticKey: string, learned: boolean) => void;
  readonly openGuide: (semanticKey: string) => void;
}

export const GuideHelpContext = createContext<GuideHelp | null>(null);

export function GuideHelpProvider({
  help,
  children,
}: {
  readonly help: GuideHelp;
  readonly children: ReactNode;
}) {
  return (
    <GuideHelpContext.Provider value={help}>
      {children}
    </GuideHelpContext.Provider>
  );
}

export interface GuideTermProps {
  /** The catalog entry by key. Use this when the call site knows the term. */
  readonly semanticKey?: string;
  /**
   * A label the surface is about to render, matched against the catalog as a
   * whole string. A label that is not a term renders unchanged.
   */
  readonly label?: string;
  readonly children?: ReactNode;
}

function resolve(props: GuideTermProps): GuideTermEntry | null {
  if (props.semanticKey) return guideTerm(props.semanticKey);
  if (props.label) return guideTermByLabel(props.label);
  return null;
}

/* How long a pointer must rest on a word before its card opens, and how long
   the card waits after the pointer leaves, so crossing the gap to the card or
   brushing past a word does not flicker it. */
const HOVER_OPEN_MS = 250;
const HOVER_CLOSE_MS = 180;

export function GuideTerm(props: GuideTermProps) {
  const { children, label } = props;
  const help = useContext(GuideHelpContext);
  const entry = resolve(props);
  /*
   * "hover": opened by resting the pointer or keyboard focus on the word; the
   * card reads alongside the sentence and takes no focus. "pinned": opened by
   * a click or Enter; focus moves into the card so its buttons are reachable
   * from the keyboard, and Escape brings it back to the word.
   */
  const [open, setOpen] = useState<"closed" | "hover" | "pinned">("closed");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef(false);
  const timer = useRef<number | null>(null);
  const popoverId = useId();
  const definitionId = useId();
  const text = children ?? label ?? entry?.term ?? null;

  useEffect(() => {
    if (open === "pinned") {
      popoverRef.current?.focus();
    } else if (open === "closed" && returnFocus.current) {
      returnFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  /*
   * Where the explanation goes.
   *
   * A card pinned under the word covers the next two lines, which is the
   * sentence the player was reading when the word stopped them. So it opens
   * below only when there is room below, flips above when there is not, and
   * slides sideways rather than off the edge of a narrow screen. It is drawn
   * at the top of the page, not inside the sentence's own panel, so a
   * scrolling conversation or a clipped dossier cannot cut it off.
   */
  useLayoutEffect(() => {
    if (open === "closed") return;
    const place = (): void => {
      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (!trigger || !popover) return;
      const anchor = trigger.getBoundingClientRect();
      const card = popover.getBoundingClientRect();
      const margin = 8;
      const below = window.innerHeight - anchor.bottom;
      const above = below < card.height + margin && anchor.top > below;
      popover.dataset.placement = above ? "above" : "below";
      const top = above
        ? Math.max(margin, anchor.top - card.height - 6)
        : anchor.bottom + 6;
      const left = Math.max(
        margin,
        Math.min(anchor.left, window.innerWidth - card.width - margin),
      );
      popover.style.top = `${Math.round(top)}px`;
      popover.style.left = `${Math.round(left)}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  if (!entry || !help) return <>{text}</>;

  /*
   * A term the player has said they know is ordinary text again, everywhere
   * it appears. The Guide still lists it, and can take the mark back.
   */
  if (help.learnedKeys.includes(entry.semanticKey)) return <>{text}</>;

  function later(action: () => void, delay: number): void {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      action();
    }, delay);
  }

  function cancelLater(): void {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }

  function close(): void {
    cancelLater();
    returnFocus.current = true;
    setOpen("closed");
  }

  const hoverIn = (): void => {
    if (open === "closed")
      later(
        () => setOpen((now) => (now === "closed" ? "hover" : now)),
        HOVER_OPEN_MS,
      );
    else cancelLater();
  };
  const hoverOut = (): void => {
    later(
      () => setOpen((now) => (now === "hover" ? "closed" : now)),
      HOVER_CLOSE_MS,
    );
  };

  const card =
    open === "closed" ? null : (
      <div
        ref={popoverRef}
        id={popoverId}
        className="pg-guide-popover"
        data-testid={`guide-term-card-${entry.semanticKey}`}
        role="dialog"
        aria-modal="false"
        aria-label={`${entry.term}: what it means`}
        tabIndex={-1}
        onPointerEnter={cancelLater}
        onPointerLeave={hoverOut}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (next && popoverRef.current?.contains(next)) return;
          if (next && triggerRef.current?.contains(next)) return;
          setOpen("closed");
        }}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          close();
        }}
      >
        <p className="pg-guide-popover-term">{entry.term}</p>
        <p className="pg-guide-popover-definition" id={definitionId}>
          <GuideTermText
            text={entry.shortDefinition}
            except={entry.semanticKey}
          />
        </p>
        <div className="pg-guide-popover-actions">
          <button
            type="button"
            className="pg-guide-popover-got-it"
            data-testid={`guide-term-learned-${entry.semanticKey}`}
            onClick={() => {
              cancelLater();
              setOpen("closed");
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
              cancelLater();
              setOpen("closed");
              help.openGuide(entry.semanticKey);
            }}
          >
            More in the Guide
          </button>
        </div>
      </div>
    );

  return (
    <span
      className="pg-guide-term"
      data-guide-term={entry.semanticKey}
      onPointerEnter={hoverIn}
      onPointerLeave={hoverOut}
    >
      <button
        ref={triggerRef}
        type="button"
        className="pg-guide-term-trigger"
        data-learned="false"
        data-testid={`guide-term-${entry.semanticKey}`}
        aria-expanded={open !== "closed"}
        aria-controls={open === "closed" ? undefined : popoverId}
        aria-describedby={open === "closed" ? undefined : definitionId}
        onFocus={() => {
          if (open === "closed") setOpen("hover");
        }}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (next && popoverRef.current?.contains(next)) return;
          if (open === "hover") setOpen("closed");
        }}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || open === "closed") return;
          event.preventDefault();
          event.stopPropagation();
          cancelLater();
          setOpen("closed");
        }}
        onClick={(event) => {
          /*
           * Shift-click is a shortcut for "Got it". Everything it does is also
           * a labeled button inside the card and in the Guide, so a keyboard
           * or a touchscreen reaches it without a modifier key.
           */
          if (event.shiftKey) {
            help.setLearned(entry.semanticKey, true);
            return;
          }
          cancelLater();
          setOpen((now) => (now === "pinned" ? "closed" : "pinned"));
        }}
      >
        {text}
        <span className="sr-only">{` — what ${entry.term} means`}</span>
      </button>
      {card && typeof document !== "undefined"
        ? createPortal(card, document.body)
        : null}
    </span>
  );
}

/**
 * A sentence the game assembled elsewhere, with its terms explained in place.
 *
 * The producers keep writing whole sentences, which is what makes them read
 * like a person wrote them, and the words a player might not know still carry
 * their explanation. Which words those are is declared in the catalog, not
 * guessed here, and the text is rendered exactly as it was written.
 */
export function GuideTermText({
  text,
  except,
}: {
  readonly text: string;
  /** A term not to mark here: a card's own definition never links to itself. */
  readonly except?: string;
}) {
  const segments = annotateGuideTerms(text).map((segment) =>
    segment.semanticKey === except
      ? { ...segment, semanticKey: null }
      : segment,
  );
  return (
    <>
      {segments.map((segment, index) =>
        segment.semanticKey ? (
          <GuideTerm key={index} semanticKey={segment.semanticKey}>
            {segment.text}
          </GuideTerm>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}
