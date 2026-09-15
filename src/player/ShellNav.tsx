import { useEffect, useRef, useState, type RefObject } from "react";

import type {
  ShellAction,
  ShellSection,
  ShellState,
  ShellSurface,
} from "../presentation/shell-navigation";

/**
 * How close the pointer is to an element, as a state rather than as a number.
 *
 * The owner's own words for this, recovered from the ledger: the cluster is
 * "small and somewhat translucent ... there is a radius as your cursor
 * approaches that makes it get bigger and more solid". A plain `:hover` cannot
 * do that — hover begins at the edge, so the control is still small at the
 * moment you are aiming at it, which is exactly when being small hurts. The
 * approach zone reaches past the element, so it has already grown by the time
 * the pointer arrives.
 */
export function useProximity(
  ref: RefObject<HTMLElement | null>,
  radius: number,
): boolean {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!window.matchMedia("(hover: hover)").matches) return;

    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    const evaluate = () => {
      frame = 0;
      const point = pending;
      pending = null;
      if (!point) return;
      const rect = node.getBoundingClientRect();
      const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
      const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
      setNear(Math.hypot(dx, dy) <= radius);
    };

    const onMove = (event: PointerEvent) => {
      pending = { x: event.clientX, y: event.clientY };
      if (frame === 0) frame = window.requestAnimationFrame(evaluate);
    };
    const onLeave = () => setNear(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [ref, radius]);

  return near;
}

/**
 * One destination the menu can open.
 *
 * `group` is the accepted top-level entry it sits under. A top-level entry
 * with exactly one destination opens it directly; one with several opens a
 * single submenu level, never more.
 */
export interface ShellDestination {
  readonly surface: ShellSurface;
  readonly section?: ShellSection;
  readonly label: string;
  readonly hint: string;
  /** Stable identity for the browser proofs. */
  readonly testid: string;
  readonly open: boolean;
  readonly group: ShellDestinationGroup;
}

/** The accepted grouping, in reading order. Save and Quit follow. */
export type ShellDestinationGroup =
  | "calendar"
  | "people"
  | "politics"
  | "news"
  | "journal"
  | "personal"
  | "travel"
  | "options";

const GROUP_LABELS: Readonly<
  Record<ShellDestinationGroup, { label: string; hint: string }>
> = {
  calendar: { label: "Calendar", hint: "Today, what is next, and your time" },
  people: { label: "People", hint: "Who you know, and how" },
  politics: { label: "Politics", hint: "Office, elections and government" },
  news: { label: "News", hint: "What has been published" },
  journal: { label: "Journal", hint: "Your private notes and chapters" },
  personal: { label: "Personal", hint: "You, work and study, money" },
  travel: { label: "Travel", hint: "Where you are and where you can go" },
  options: { label: "Options", hint: "Settings and this build" },
};

const GROUP_ORDER: readonly ShellDestinationGroup[] = [
  "calendar",
  "people",
  "politics",
  "news",
  "journal",
  "personal",
  "travel",
  "options",
];

/** Which submenu a group opens when it holds several destinations. */
function submenuFor(group: ShellDestinationGroup): "personal" | "politics" {
  return group === "politics" ? "politics" : "personal";
}

/**
 * The corner cluster, its hidden-until-opened list, and the day controls.
 *
 * Closed, it is who you are, when, and where — plus two quiet controls that
 * move the day or the week through the existing clock. Open, it is the
 * accepted list: Calendar, People, Politics, News, Journal, Personal, Travel,
 * Save, Options, Quit. One submenu level at most, drawn darker than its
 * parent. Quit asks about saving first when the life is not saved.
 */
export function ShellNav({
  state,
  dispatch,
  playerName,
  dateLabel,
  placeName,
  destinations,
  canSave,
  unsaved,
  onSave,
  onLeave,
  onPassDays,
  passing = false,
}: {
  readonly state: ShellState;
  readonly dispatch: (action: ShellAction) => void;
  readonly playerName: string;
  readonly dateLabel: string;
  readonly placeName: string | null;
  readonly destinations: readonly ShellDestination[];
  readonly canSave: boolean;
  readonly unsaved: boolean;
  readonly onSave: () => void;
  readonly onLeave: () => void;
  /** Day and week through the canonical clock. Absent while growing up. */
  readonly onPassDays?: (days: 1 | 7) => void;
  readonly passing?: boolean;
}) {
  const open = state.navigation !== "closed";
  const navRef = useRef<HTMLElement>(null);
  const [focusWithin, setFocusWithin] = useState(false);
  const near = useProximity(navRef, 190);

  useEffect(() => {
    const check = () =>
      setFocusWithin(Boolean(navRef.current?.contains(document.activeElement)));
    check();
    document.addEventListener("focusin", check);
    document.addEventListener("focusout", check);
    return () => {
      document.removeEventListener("focusin", check);
      document.removeEventListener("focusout", check);
    };
  }, [state.navigation, state.confirmingLeave]);
  const raised = open || near || focusWithin || state.confirmingLeave;
  const place = placeName ?? "Somewhere on record";

  /*
   * Focus follows the list. Opening the menu puts the keyboard on its first
   * entry; opening a submenu puts it on the way back. Nothing here is reachable
   * only by hovering.
   */
  const flyoutRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const first =
      flyoutRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
  }, [open, state.navigation]);

  const go = (entry: ShellDestination) =>
    dispatch({
      type: "go-to-surface",
      surface: entry.surface,
      ...(entry.section ? { section: entry.section } : {}),
    });

  const renderEntry = (entry: ShellDestination, label = entry.label) => (
    <button
      key={`${entry.surface}:${entry.section ?? ""}`}
      type="button"
      role="menuitem"
      data-testid={entry.testid}
      aria-pressed={entry.open}
      onClick={() => go(entry)}
    >
      {label}
      <small>{entry.hint}</small>
    </button>
  );

  const submenuGroup: ShellDestinationGroup | null =
    state.navigation === "personal"
      ? "personal"
      : state.navigation === "politics"
        ? "politics"
        : null;

  return (
    <nav
      className="pg-nav"
      ref={navRef}
      aria-label="Time, place and navigation"
      data-state={open ? "open" : raised ? "near" : "rest"}
      data-testid="shell-nav"
    >
      <div className="pg-nav-row">
        <button
          type="button"
          className="pg-nav-cluster"
          data-testid="shell-nav-cluster"
          aria-expanded={open}
          aria-controls={open ? "pg-nav-flyout" : undefined}
          aria-label={`${playerName}. ${dateLabel}. ${place}. Open navigation.`}
          onClick={() => dispatch({ type: "toggle-navigation" })}
        >
          <span className="pg-nav-cluster-inner" aria-hidden="true">
            <span className="pg-nav-copy">
              <span
                className="pg-nav-identity"
                data-testid="shell-nav-identity"
              >
                <span className="life-identity-name" data-testid="story-who">
                  {playerName}
                </span>
                {unsaved ? (
                  <span
                    className="pg-nav-unsaved"
                    title="This life has not been saved yet."
                  >
                    unsaved
                  </span>
                ) : null}
              </span>
              <span className="pg-nav-date" data-testid="story-when">
                {dateLabel}
              </span>
              <span className="pg-nav-place">{place}</span>
            </span>
          </span>
        </button>
        {onPassDays ? (
          <div
            className="pg-nav-days"
            role="group"
            aria-label="Move time"
            data-testid="shell-day-controls"
          >
            <button
              type="button"
              className="pg-nav-day"
              data-testid="shell-pass-day"
              disabled={passing}
              title="Let the day run through your routine. Stops for anything that needs you."
              onClick={() => onPassDays(1)}
            >
              Day <span aria-hidden="true">›</span>
            </button>
            <button
              type="button"
              className="pg-nav-day"
              data-testid="shell-pass-week"
              disabled={passing}
              title="Let the week run through your routine. Stops for anything that needs you."
              onClick={() => onPassDays(7)}
            >
              Week <span aria-hidden="true">»</span>
            </button>
          </div>
        ) : null}
      </div>

      {open ? (
        <div
          id="pg-nav-flyout"
          className="pg-nav-flyout"
          data-level={submenuGroup ? "submenu" : "primary"}
          data-testid="shell-nav-flyout"
          role="menu"
          aria-label={
            submenuGroup ? GROUP_LABELS[submenuGroup].label : "Main navigation"
          }
          ref={flyoutRef}
        >
          {submenuGroup ? (
            <>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-submenu-back"
                onClick={() => dispatch({ type: "open-nav-primary" })}
              >
                ← Back
              </button>
              <p className="pg-nav-heading">
                {GROUP_LABELS[submenuGroup].label}
              </p>
              {destinations
                .filter((entry) => entry.group === submenuGroup)
                .map((entry) => renderEntry(entry))}
            </>
          ) : (
            <>
              {GROUP_ORDER.map((group) => {
                const entries = destinations.filter(
                  (entry) => entry.group === group,
                );
                if (entries.length === 0) return null;
                const meta = GROUP_LABELS[group];
                if (entries.length === 1) {
                  const only = entries[0]!;
                  return renderEntry(
                    { ...only, hint: only.hint || meta.hint },
                    meta.label,
                  );
                }
                return (
                  <button
                    key={group}
                    type="button"
                    role="menuitem"
                    aria-haspopup="menu"
                    data-testid={`nav-group-${group}`}
                    aria-pressed={entries.some((entry) => entry.open)}
                    onClick={() =>
                      dispatch({
                        type: "open-nav-submenu",
                        submenu: submenuFor(group),
                      })
                    }
                  >
                    {meta.label}
                    <small>{meta.hint} ••</small>
                  </button>
                );
              })}
              <div className="pg-nav-persist">
                {canSave ? (
                  <button
                    type="button"
                    role="menuitem"
                    data-testid={unsaved ? "keep-world" : "save-world"}
                    onClick={onSave}
                  >
                    Save
                    {unsaved ? <small>Not saved yet</small> : null}
                  </button>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  data-testid="leave-game"
                  onClick={() =>
                    unsaved && canSave
                      ? dispatch({ type: "ask-leave" })
                      : onLeave()
                  }
                >
                  Quit
                  <small>To the main menu</small>
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {state.confirmingLeave ? (
        <div
          className="pg-nav-flyout pg-nav-confirm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="pg-nav-confirm-title"
          data-testid="leave-confirm"
        >
          <p className="pg-nav-heading" id="pg-nav-confirm-title">
            Save before quitting?
          </p>
          <p className="pg-nav-confirm-copy">
            This life has not been saved. Quitting now leaves it behind.
          </p>
          <button
            type="button"
            className="ui-action ui-action--primary"
            data-testid="leave-save-first"
            autoFocus
            onClick={() => {
              onSave();
              dispatch({ type: "cancel-leave" });
            }}
          >
            Save first
          </button>
          <button
            type="button"
            className="ui-action"
            data-testid="leave-without-saving"
            onClick={() => {
              dispatch({ type: "cancel-leave" });
              onLeave();
            }}
          >
            Quit without saving
          </button>
          <button
            type="button"
            className="ui-action ui-action--subtle"
            data-testid="leave-cancel"
            onClick={() => dispatch({ type: "cancel-leave" })}
          >
            Stay
          </button>
        </div>
      ) : null}
    </nav>
  );
}
