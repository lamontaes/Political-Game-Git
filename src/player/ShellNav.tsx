import { InterruptionChecklist } from "./InterruptionChecklist";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

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
  options: {
    label: "Guide and options",
    hint: "What the words mean, settings and this build",
  },
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

// PLACEHOLDER(overnight): Verify these shortcut keys against desktop and
// browser bindings during cloud validation.
const GROUP_SHORTCUTS: readonly ShellDestinationGroup[] = [
  "calendar",
  "people",
  "politics",
  "news",
  "journal",
  "personal",
  "travel",
];

function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? "";
  const last = words.length > 1 ? (words.at(-1)?.charAt(0) ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

const MENU_KEYS: Readonly<Record<string, -1 | 1 | "first" | "last">> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
  Home: "first",
  End: "last",
};

/** Which submenu a group opens when it holds several destinations. */
function submenuFor(
  group: ShellDestinationGroup,
): "personal" | "politics" | "options" {
  // The submenu shows the group the player pressed. Folding every group but
  // Politics into "personal" was how the Guide's arrival silently sent the
  // Options chip to the Personal list.
  if (group === "politics") return "politics";
  if (group === "options") return "options";
  return "personal";
}

/**
 * The labeled section bar, its corner menu, and the day controls.
 *
 * Closed, it is your own portrait, small, with who you are, when, and where
 * as its label — plus two quiet controls that move the day or the week
 * through the existing clock. The portrait grows as the pointer approaches or
 * the keyboard arrives. The seven labeled sections stay visible. The portrait
 * opens a corner menu for Save, Guide, Options, and Return to title. A section
 * with several destinations opens one submenu. Returning to the title asks
 * about saving first.
 */
export function ShellNav({
  state,
  dispatch,
  playerName,
  portrait = null,
  dateLabel,
  placeName,
  destinations,
  canSave,
  unsaved,
  onSave,
  onSaveAndLeave,
  onLeave,
  onAskLeave,
  leaving = false,
  leaveProblem = null,
  onPassDays,
  onPassUntilNeeded,
  passTargets,
  passing = false,
}: {
  readonly state: ShellState;
  readonly dispatch: (action: ShellAction) => void;
  readonly playerName: string;
  /**
   * The player's own portrait, as the shared portrait component draws it.
   * Absent when there is no person record to draw; initials stand in.
   */
  readonly portrait?: ReactNode;
  readonly dateLabel: string;
  readonly placeName: string | null;
  readonly destinations: readonly ShellDestination[];
  readonly canSave: boolean;
  readonly unsaved: boolean;
  readonly onSave: () => void;
  readonly onSaveAndLeave?: () => void;
  readonly onLeave: () => void;
  readonly onAskLeave?: () => void;
  readonly leaving?: boolean;
  readonly leaveProblem?: string | null;
  /** Day and week through the canonical clock, including during childhood. */
  readonly onPassDays?: (days: 1 | 7) => void;
  /** Run the existing quiet-stretch command until the next protected need. */
  readonly onPassUntilNeeded?: () => void;
  /** Where each skip would land, said before it is pressed. */
  readonly passTargets?: {
    readonly day: string;
    readonly week: string;
    readonly untilNeeded?: string | null;
  };
  /** A time command is running; the controls keep focus but take no click. */
  readonly passing?: boolean;
}) {
  const open = state.navigation !== "closed";
  // The interrupt checklist, opened beside Day and Week so what a skip stops
  // for is in reach at the moment time is passed.
  const [stopsOpen, setStopsOpen] = useState(false);
  useEffect(() => {
    if (open || state.confirmingLeave) setStopsOpen(false);
  }, [open, state.confirmingLeave]);
  const [visibleNavigation, setVisibleNavigation] = useState(state.navigation);
  if (open && visibleNavigation !== state.navigation)
    setVisibleNavigation(state.navigation);
  const closing = !open && visibleNavigation !== "closed";
  useEffect(() => {
    if (open) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timer = window.setTimeout(
      () => setVisibleNavigation("closed"),
      reduced ? 0 : 220,
    );
    return () => window.clearTimeout(timer);
  }, [open]);
  const navRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  /*
   * Workspaces end above the corner cluster. Its height changes with the Day
   * and Week targets, so it is measured and published rather than guessed;
   * a fixed reservation let the controls cover a workspace's last row.
   */
  useEffect(() => {
    const row = rowRef.current;
    if (!row || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const publish = () =>
      root.style.setProperty(
        "--pg-nav-reserve",
        `${Math.ceil(row.getBoundingClientRect().height) + 12}px`,
      );
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(row);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--pg-nav-reserve");
    };
  }, []);
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
  const clusterRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (closing && flyoutRef.current?.contains(document.activeElement))
      clusterRef.current?.focus();
  }, [closing]);
  useEffect(() => {
    if (!open) return;
    const first =
      flyoutRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
  }, [open, state.navigation]);

  /*
   * Escape leaves the layer the keyboard is actually in.
   *
   * The menu opens over the room and puts the keyboard inside itself, and
   * there was no way back out of it from the keyboard at all: the only thing
   * that closed it was clicking the portrait again. From a submenu Escape
   * goes up one level, which is the same move as its own Back; from the top
   * level it closes the menu and gives the portrait the focus it took, so
   * the keyboard is left somewhere rather than nowhere. It is handled on this
   * element rather than on the document, so Escape anywhere else in the game
   * still belongs to whatever layer the player is in.
   */
  const onNavKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape") return;
    if (state.confirmingLeave) {
      event.preventDefault();
      event.stopPropagation();
      if (leaving) return;
      dispatch({ type: "cancel-leave" });
      clusterRef.current?.focus();
      return;
    }
    if (!open) return;
    event.preventDefault();
    event.stopPropagation();
    if (state.navigation === "primary") {
      dispatch({ type: "toggle-navigation" });
      clusterRef.current?.focus();
      return;
    }
    const trigger = navRef.current?.querySelector<HTMLButtonElement>(
      `[data-testid="nav-group-${state.navigation}"]`,
    );
    dispatch({ type: "close-navigation" });
    trigger?.focus();
  };

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

  // The open submenu IS the navigation level, for every group that can nest.
  // Listing the levels by hand is how "options" opened nothing at all once the
  // Guide gave that group a second member.
  const submenuGroup: ShellDestinationGroup | null =
    visibleNavigation === "personal" ||
    visibleNavigation === "politics" ||
    visibleNavigation === "options"
      ? visibleNavigation
      : null;

  const primaryGroups = GROUP_ORDER.filter(
    (group) => group !== "options",
  ).flatMap((group) => {
    const entries = destinations.filter((entry) => entry.group === group);
    return entries.length === 0 ? [] : [{ group, entries }];
  });
  const menuOptions = destinations.filter((entry) => entry.group === "options");
  const submenuEntries = submenuGroup
    ? destinations.filter((entry) => entry.group === submenuGroup)
    : [];

  useEffect(() => {
    const onShortcut = (event: globalThis.KeyboardEvent) => {
      if (
        !event.altKey ||
        !event.shiftKey ||
        event.ctrlKey ||
        event.metaKey ||
        state.confirmingLeave
      )
        return;
      const match = /^Digit([1-7])$/.exec(event.code);
      if (!match) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select"))
      )
        return;
      const group = GROUP_SHORTCUTS[Number(match[1]) - 1];
      const entries = destinations.filter((entry) => entry.group === group);
      if (entries.length === 0) return;
      event.preventDefault();
      if (entries.length === 1) {
        const entry = entries[0]!;
        dispatch({
          type: "go-to-surface",
          surface: entry.surface,
          ...(entry.section ? { section: entry.section } : {}),
        });
      } else {
        dispatch({ type: "open-nav-submenu", submenu: submenuFor(group!) });
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [destinations, dispatch, state.confirmingLeave]);

  /* Arrow keys, Home and End move through the entries, in reading order. */
  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const move = MENU_KEYS[event.key];
    if (move === undefined) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next =
      move === "first"
        ? 0
        : move === "last"
          ? items.length - 1
          : current < 0
            ? move === 1
              ? 0
              : items.length - 1
            : (current + move + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <nav
      className="pg-nav pg-nav--bar"
      ref={navRef}
      aria-label="Time, place and navigation"
      data-state={open ? "open" : raised ? "near" : "rest"}
      data-testid="shell-nav"
      onKeyDown={onNavKeyDown}
    >
      <div className="pg-nav-row" ref={rowRef}>
        <button
          type="button"
          className="pg-nav-cluster"
          ref={clusterRef}
          data-testid="shell-nav-cluster"
          aria-expanded={open}
          aria-controls={open ? "pg-nav-flyout" : undefined}
          aria-label={`${playerName}. ${dateLabel}. ${place}. Open game menu.`}
          onClick={() => dispatch({ type: "toggle-navigation" })}
        >
          <span className="pg-nav-cluster-inner" aria-hidden="true">
            <span className="pg-nav-avatar-slot" />
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
        {/*
          The portrait sits over the button's reserved circle rather than
          inside the button, because a portrait is a figure and a button may
          only hold phrasing content. It takes no pointer events, so a press on
          the face is a press on the button beneath it.
        */}
        <div
          className="pg-nav-avatar"
          data-testid="shell-nav-portrait"
          data-fallback={portrait ? undefined : "initials"}
          aria-hidden="true"
        >
          {portrait ?? (
            <span className="pg-nav-initials">{initialsOf(playerName)}</span>
          )}
        </div>
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
              aria-disabled={passing || undefined}
              aria-describedby={passTargets ? "pg-nav-day-target" : undefined}
              title={
                passTargets
                  ? `${passTargets.day}. Your routine runs; stops early for anything protected.`
                  : "Let the day run through your routine. Stops for anything that needs you."
              }
              onClick={() => {
                if (!passing) onPassDays(1);
              }}
            >
              Day <span aria-hidden="true">›</span>
            </button>
            <button
              type="button"
              className="pg-nav-day"
              data-testid="shell-pass-week"
              aria-disabled={passing || undefined}
              aria-describedby={passTargets ? "pg-nav-week-target" : undefined}
              title={
                passTargets
                  ? `${passTargets.week}. Your routine runs; stops early for anything protected.`
                  : "Let the week run through your routine. Stops for anything that needs you."
              }
              onClick={() => {
                if (!passing) onPassDays(7);
              }}
            >
              Week <span aria-hidden="true">»</span>
            </button>
            {onPassUntilNeeded ? (
              <button
                type="button"
                className="pg-nav-day"
                data-testid="shell-pass-until-needed"
                aria-disabled={
                  passing || !passTargets?.untilNeeded || undefined
                }
                aria-describedby="pg-nav-until-target"
                title={
                  passTargets?.untilNeeded
                    ? `${passTargets.untilNeeded}. Your routine stops for the next thing that needs you.`
                    : "Resolve the decision under Work before another quiet stretch."
                }
                onClick={() => {
                  if (!passing && passTargets?.untilNeeded) onPassUntilNeeded();
                }}
              >
                Until needed <span aria-hidden="true">»</span>
              </button>
            ) : null}
            <button
              type="button"
              className="pg-nav-day pg-nav-stops-toggle"
              data-testid="shell-stops-toggle"
              aria-expanded={stopsOpen}
              aria-controls="pg-nav-stops"
              onClick={() => {
                dispatch({ type: "close-navigation" });
                setStopsOpen((value) => !value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setStopsOpen(false);
              }}
            >
              Stops
            </button>
            {stopsOpen && !open && !state.confirmingLeave ? (
              <div
                id="pg-nav-stops"
                className="pg-nav-stops"
                role="dialog"
                aria-label="What passing time stops for"
                data-testid="shell-stops"
                onKeyDown={(event) => {
                  if (event.key === "Escape") setStopsOpen(false);
                }}
              >
                <p className="pg-nav-stops-title">
                  What passing time stops for
                </p>
                <InterruptionChecklist
                  interruptions={state.preferences.interruptions}
                  onChange={(key, value) =>
                    dispatch({ type: "set-interruption", key, value })
                  }
                  testIdPrefix="shell-stop"
                />
                <button
                  type="button"
                  className="ui-action ui-action--subtle"
                  onClick={() => setStopsOpen(false)}
                >
                  Done
                </button>
              </div>
            ) : null}
            {passTargets && raised && !stopsOpen ? (
              <small
                className="pg-nav-days-target"
                aria-hidden="true"
                data-testid="shell-pass-targets"
              >
                Day: {passTargets.day.replace(/^Skip to /, "")}
                <br />
                Week: {passTargets.week.replace(/^Skip to /, "")}
                {onPassUntilNeeded ? (
                  <>
                    <br />
                    Until needed:{" "}
                    {passTargets.untilNeeded ?? "Work needs you now"}
                  </>
                ) : null}
              </small>
            ) : null}
            {passTargets ? (
              <>
                <span className="sr-only" id="pg-nav-day-target">
                  {passTargets.day}
                </span>
                <span className="sr-only" id="pg-nav-week-target">
                  {passTargets.week}
                </span>
                {onPassUntilNeeded ? (
                  <span className="sr-only" id="pg-nav-until-target">
                    {passTargets.untilNeeded ??
                      "Resolve the decision under Work before another quiet stretch."}
                  </span>
                ) : null}
              </>
            ) : null}
            {passing ? (
              <span
                className="sr-only"
                role="status"
                data-testid="shell-time-pending"
              >
                Time is passing…
              </span>
            ) : null}
          </div>
        ) : null}
        <div
          className="pg-nav-main"
          role="group"
          aria-label="Game sections"
          data-testid="shell-menu-bar"
        >
          {primaryGroups.map(({ group, entries }) => {
            const label = GROUP_LABELS[group].label;
            const shortcut = GROUP_SHORTCUTS.indexOf(group) + 1;
            const selected = entries.some((entry) => entry.open);
            return entries.length === 1 ? (
              <button
                key={group}
                type="button"
                className="pg-nav-section"
                data-testid={entries[0]!.testid}
                aria-pressed={selected}
                aria-keyshortcuts={`Alt+Shift+${shortcut}`}
                title={`${label} (Alt+Shift+${shortcut})`}
                onClick={() => go(entries[0]!)}
              >
                {label}
              </button>
            ) : (
              <button
                key={group}
                type="button"
                className="pg-nav-section"
                data-testid={`nav-group-${group}`}
                aria-pressed={selected}
                aria-expanded={state.navigation === submenuFor(group)}
                aria-controls="pg-nav-flyout"
                aria-keyshortcuts={`Alt+Shift+${shortcut}`}
                title={`${label} (Alt+Shift+${shortcut})`}
                onClick={() =>
                  dispatch({
                    type: "open-nav-submenu",
                    submenu: submenuFor(group),
                  })
                }
              >
                {label}
                <span aria-hidden="true">⌄</span>
              </button>
            );
          })}
        </div>
      </div>

      {!state.confirmingLeave && (open || closing) ? (
        <div
          key={visibleNavigation}
          id="pg-nav-flyout"
          className="pg-nav-flyout"
          data-motion={closing ? "closing" : "open"}
          inert={closing}
          aria-hidden={closing || undefined}
          data-level={submenuGroup ? "submenu" : "primary"}
          data-testid="shell-nav-flyout"
          role="menu"
          aria-label={
            submenuGroup
              ? `${GROUP_LABELS[submenuGroup].label} choices`
              : "Game menu"
          }
          ref={flyoutRef}
          onKeyDown={onMenuKeyDown}
        >
          {submenuGroup ? (
            <>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-submenu-back"
                onClick={() => {
                  const trigger =
                    navRef.current?.querySelector<HTMLButtonElement>(
                      `[data-testid="nav-group-${submenuGroup}"]`,
                    );
                  dispatch({ type: "close-navigation" });
                  trigger?.focus();
                }}
              >
                ← Back
              </button>
              <p className="pg-nav-heading">
                {GROUP_LABELS[submenuGroup].label}
              </p>
              {submenuEntries.map((entry) => renderEntry(entry))}
            </>
          ) : (
            <>
              <p className="pg-nav-heading">Game menu</p>
              {menuOptions.map((entry) => renderEntry(entry))}
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
                    onAskLeave ? onAskLeave() : dispatch({ type: "ask-leave" })
                  }
                >
                  Return to title
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
            Save before returning to the title?
          </p>
          <p className="pg-nav-confirm-copy">
            {unsaved
              ? "This life has not been saved yet."
              : "Save your latest progress before returning. Earlier autosaves will remain available."}
          </p>
          <button
            type="button"
            className="ui-action ui-action--primary"
            data-testid="leave-save-first"
            autoFocus
            disabled={!canSave || leaving}
            onClick={onSaveAndLeave ?? onSave}
          >
            {leaving ? "Saving…" : "Save and return"}
          </button>
          <button
            type="button"
            className="ui-action"
            data-testid="leave-without-saving"
            disabled={leaving}
            onClick={() => {
              dispatch({ type: "cancel-leave" });
              onLeave();
            }}
          >
            Return without saving
          </button>
          <button
            type="button"
            className="ui-action ui-action--subtle"
            data-testid="leave-cancel"
            disabled={leaving}
            onClick={() => dispatch({ type: "cancel-leave" })}
          >
            Cancel
          </button>
          {leaveProblem ? <p role="alert">{leaveProblem}</p> : null}
          {!canSave ? (
            <p role="alert">
              Saving is unavailable. You can stay in this life or return without
              saving.
            </p>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
