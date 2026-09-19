import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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

/**
 * Where each entry of the open menu sits around the portrait.
 *
 * Entries fan out in rings over the quarter above and to the right of the
 * portrait, from straight up to a shallow angle that stays clear of the name
 * label and the day controls. Each ring holds only as many entries as fit
 * without touching, so a longer list opens a further ring rather than
 * crowding the first. Offsets are in pixels from the portrait's centre, y
 * negative upwards.
 */
export const FAN_RINGS: readonly { radius: number; capacity: number }[] = [
  { radius: 140, capacity: 3 },
  { radius: 250, capacity: 5 },
  { radius: 360, capacity: 7 },
  { radius: 480, capacity: 9 },
];
const FAN_FROM_DEGREES = 90;
const FAN_TO_DEGREES = 25;

export function fanLayout(
  count: number,
): readonly { x: number; y: number; ring: number }[] {
  const positions: { x: number; y: number; ring: number }[] = [];
  let remaining = count;
  for (const [ring, { radius, capacity }] of FAN_RINGS.entries()) {
    if (remaining <= 0) break;
    const here = Math.min(remaining, capacity);
    // A ring that is not full keeps the spacing of a full one, from the top.
    const step =
      (FAN_FROM_DEGREES - FAN_TO_DEGREES) / Math.max(capacity - 1, 1);
    for (let index = 0; index < here; index += 1) {
      const radians = ((FAN_FROM_DEGREES - step * index) * Math.PI) / 180;
      positions.push({
        x: Math.round(radius * Math.cos(radians)),
        y: -Math.round(radius * Math.sin(radians)),
        ring,
      });
    }
    remaining -= here;
  }
  return positions;
}

function fanStyle(
  layout: readonly { x: number; y: number }[],
  index: number,
): CSSProperties {
  const at = layout[index] ?? { x: 0, y: 0 };
  return {
    "--fan-x": `${at.x}px`,
    "--fan-y": `${at.y}px`,
    "--fan-order": index,
  } as CSSProperties;
}

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
 * The corner cluster, its hidden-until-opened menu, and the day controls.
 *
 * Closed, it is your own portrait, small, with who you are, when, and where
 * as its label — plus two quiet controls that move the day or the week
 * through the existing clock. The portrait grows as the pointer approaches or
 * the keyboard arrives. Open, the entries fan out around the portrait (a plain
 * list on narrow or short windows): Calendar, People, Politics, News, Journal, Personal, Travel,
 * Save, Options, Quit. One submenu level at most, drawn darker than its
 * parent. Quit asks about saving first when the life is not saved.
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
  onLeave,
  onPassDays,
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
  readonly onLeave: () => void;
  /** Day and week through the canonical clock. Absent while growing up. */
  readonly onPassDays?: (days: 1 | 7) => void;
  /** Where each skip would land, said before it is pressed. */
  readonly passTargets?: { readonly day: string; readonly week: string };
  /** A time command is running; the controls keep focus but take no click. */
  readonly passing?: boolean;
}) {
  const open = state.navigation !== "closed";
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
    dispatch({ type: "open-nav-primary" });
  };

  const go = (entry: ShellDestination) =>
    dispatch({
      type: "go-to-surface",
      surface: entry.surface,
      ...(entry.section ? { section: entry.section } : {}),
    });

  const renderEntry = (
    entry: ShellDestination,
    style: CSSProperties,
    label = entry.label,
  ) => (
    <button
      key={`${entry.surface}:${entry.section ?? ""}`}
      type="button"
      role="menuitem"
      style={style}
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

  const primaryGroups = GROUP_ORDER.flatMap((group) => {
    const entries = destinations.filter((entry) => entry.group === group);
    return entries.length === 0 ? [] : [{ group, entries }];
  });
  const submenuEntries = submenuGroup
    ? destinations.filter((entry) => entry.group === submenuGroup)
    : [];
  const layout = fanLayout(
    submenuGroup
      ? submenuEntries.length + 1
      : primaryGroups.length + (canSave ? 1 : 0) + 1,
  );

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
      className="pg-nav"
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
          aria-label={`${playerName}. ${dateLabel}. ${place}. Open navigation.`}
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
            {passTargets && raised ? (
              <small
                className="pg-nav-days-target"
                aria-hidden="true"
                data-testid="shell-pass-targets"
              >
                Day: {passTargets.day.replace(/^Skip to /, "")}
                <br />
                Week: {passTargets.week.replace(/^Skip to /, "")}
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
      </div>

      {open || closing ? (
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
            submenuGroup ? GROUP_LABELS[submenuGroup].label : "Main navigation"
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
                style={fanStyle(layout, 0)}
                onClick={() => dispatch({ type: "open-nav-primary" })}
              >
                ← Back
              </button>
              <p className="pg-nav-heading">
                {GROUP_LABELS[submenuGroup].label}
              </p>
              {submenuEntries.map((entry, index) =>
                renderEntry(entry, fanStyle(layout, index + 1)),
              )}
            </>
          ) : (
            <>
              {primaryGroups.map(({ group, entries }, index) => {
                const meta = GROUP_LABELS[group];
                const style = fanStyle(layout, index);
                if (entries.length === 1) {
                  const only = entries[0]!;
                  return renderEntry(
                    { ...only, hint: only.hint || meta.hint },
                    style,
                    meta.label,
                  );
                }
                return (
                  <button
                    key={group}
                    type="button"
                    role="menuitem"
                    aria-haspopup="menu"
                    style={style}
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
                    <small>{meta.hint}</small>
                    <span className="pg-nav-more" aria-hidden="true">
                      ›
                    </span>
                  </button>
                );
              })}
              <div className="pg-nav-persist">
                {canSave ? (
                  <button
                    type="button"
                    role="menuitem"
                    data-testid={unsaved ? "keep-world" : "save-world"}
                    style={fanStyle(layout, primaryGroups.length)}
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
                  style={fanStyle(
                    layout,
                    primaryGroups.length + (canSave ? 1 : 0),
                  )}
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
