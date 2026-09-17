import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { guideTerm, guideTermByLabel } from "../presentation/guide-terms";
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
 * A term the player has marked learned keeps the link into the Guide and drops
 * the nudge: no dotted underline, no hint. Nothing here is knowledge in the
 * world. The character does not learn anything because the player pressed
 * this, and nothing that decides an outcome may read it.
 */

export interface GuideHelp {
  readonly learnedKeys: readonly string[];
  readonly setLearned: (semanticKey: string, learned: boolean) => void;
  readonly openGuide: (semanticKey: string) => void;
}

const GuideHelpContext = createContext<GuideHelp | null>(null);

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

export function GuideTerm(props: GuideTermProps) {
  const { children, label } = props;
  const help = useContext(GuideHelpContext);
  const entry = resolve(props);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef(false);
  const popoverId = useId();
  const text = children ?? label ?? entry?.term ?? null;

  useEffect(() => {
    if (open) {
      popoverRef.current?.focus();
    } else if (returnFocus.current) {
      returnFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  if (!entry || !help) return <>{text}</>;

  const learned = help.learnedKeys.includes(entry.semanticKey);

  function close(): void {
    returnFocus.current = true;
    setOpen(false);
  }

  return (
    <span className="pg-guide-term" data-guide-term={entry.semanticKey}>
      <button
        ref={triggerRef}
        type="button"
        className="pg-guide-term-trigger"
        data-learned={learned ? "true" : "false"}
        data-testid={`guide-term-${entry.semanticKey}`}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        title={
          learned ? `${entry.term} — in the Guide` : `What ${entry.term} means`
        }
        onClick={(event) => {
          /*
           * Shift-click is the shortcut, not the only way. Everything it does
           * is also a labelled control inside the popover and in the Guide, so
           * a keyboard or a touchscreen reaches it without a modifier key.
           */
          if (event.shiftKey) {
            help.setLearned(entry.semanticKey, !learned);
            return;
          }
          setOpen((current) => !current);
        }}
      >
        {text}
        <span className="pg-guide-term-mark" aria-hidden="true">
          ?
        </span>
        <span className="sr-only">
          {learned
            ? ` — ${entry.term}, marked learned. Open its explanation.`
            : ` — what ${entry.term} means`}
        </span>
      </button>
      {open ? (
        <div
          ref={popoverRef}
          id={popoverId}
          className="pg-guide-popover civic-glass"
          role="dialog"
          aria-modal="false"
          aria-label={`${entry.term}: what it means`}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            close();
          }}
        >
          <p className="pg-guide-popover-term">{entry.term}</p>
          <p className="pg-guide-popover-definition">{entry.shortDefinition}</p>
          <div className="pg-guide-popover-actions">
            <button
              type="button"
              className="ui-action ui-action--subtle"
              data-testid={`guide-term-open-${entry.semanticKey}`}
              onClick={() => {
                setOpen(false);
                help.openGuide(entry.semanticKey);
              }}
            >
              Read more in the Guide
            </button>
            <button
              type="button"
              className="ui-action ui-action--rail"
              aria-pressed={learned}
              data-testid={`guide-term-learned-${entry.semanticKey}`}
              onClick={() => help.setLearned(entry.semanticKey, !learned)}
            >
              {learned ? "Marked learned" : "Mark learned"}
            </button>
            <button
              type="button"
              className="ui-action ui-action--subtle"
              data-testid={`guide-term-close-${entry.semanticKey}`}
              onClick={close}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </span>
  );
}
