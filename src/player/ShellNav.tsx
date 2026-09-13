import { useEffect, useRef, useState, type RefObject } from "react";

import type {
  ShellAction,
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
 *
 * Distance is measured to the RECTANGLE rather than to its centre, so a wide
 * control responds evenly along its whole length. The listener is passive and
 * coalesces into one animation frame: a pointermove handler doing layout work
 * on every event is a stutter, and a stuttering proximity effect is worse than
 * no proximity effect.
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
    /* A pointer that has left the window is not approaching anything. */
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

export interface ShellDestination {
  readonly surface: ShellSurface;
  readonly label: string;
  readonly hint: string;
  /**
   * The control's stable identity for proofs.
   *
   * Named rather than derived because several of these destinations existed
   * before the cluster did, under the names the browser proofs already use, and
   * moving a control into a menu is not a reason to silently drop the coverage
   * that was pointing at it.
   */
  readonly testid: string;
  /** True when this destination is the surface currently open. */
  readonly open: boolean;
  /** Which heading it sits under in the open menu. */
  readonly group: ShellDestinationGroup;
}

/**
 * The menu's headings, in the order they are read.
 *
 * A long ungrouped destination column made "the day", "the room" and "life
 * scenes" read as three names for one place and hid the real ones among them.
 * Grouped, the column says what kind of thing each entry is before the player
 * reads its name: what to do with the time, the people and places of the
 * world, the character's own record, and the game itself.
 */
export type ShellDestinationGroup =
  "now" | "world" | "politics" | "you" | "game";

const GROUP_HEADINGS: Readonly<Record<ShellDestinationGroup, string>> = {
  now: "Your time",
  world: "People and places",
  politics: "Politics",
  you: "You",
  game: "Game",
};

const GROUP_ORDER: readonly ShellDestinationGroup[] = [
  "now",
  "world",
  "politics",
  "you",
  "game",
];

/**
 * The quiet corner cluster and its upward-opening stack.
 *
 * One submenu level at most, and a submenu is DARKER SLATE with a brass edge
 * and an offset — never the near-white submenu that was expressly rejected.
 * Closed, it is the identity, the date and the place: who you are, then when,
 * then where, and nothing else competing with the room.
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
}) {
  const open = state.navigation !== "closed";
  const navRef = useRef<HTMLElement>(null);
  const [focusWithin, setFocusWithin] = useState(false);
  const near = useProximity(navRef, 190);

  /*
   * Three ways in, one state. Pointer approach, keyboard focus and the menu
   * being open all raise the cluster identically, so nothing here is reachable
   * only by hovering — which is the accessibility rule, and also just what a
   * keyboard player expects.
   */
  // An unmounted focused menu item does not emit blur. Recheck the live tree.
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
  }, [state.navigation]);
  const raised = open || near || focusWithin;
  const place = placeName ?? "Somewhere on record";

  /*
   * Personal is the one destination with children, so it is the one entry that
   * opens a submenu. Everything else — the journal included — stays a single
   * press from the closed cluster, because burying a major destination one
   * level down to tidy a list is how a menu stops being usable.
   */
  const primary = destinations.filter((entry) => entry.surface !== "personal");
  const personalAvailable = destinations.some(
    (entry) => entry.surface === "personal",
  );
  const journalAvailable = destinations.some(
    (entry) => entry.surface === "journal",
  );

  return (
    <nav
      className="pg-nav"
      ref={navRef}
      aria-label="Time, place and navigation"
      data-state={open ? "open" : raised ? "near" : "rest"}
      data-testid="shell-nav"
    >
      <button
        type="button"
        className="pg-nav-cluster"
        data-testid="shell-nav-cluster"
        aria-expanded={open}
        aria-controls={open ? "pg-nav-flyout" : undefined}
        aria-label={`${playerName}. ${dateLabel}. ${place}. Open navigation.`}
        onClick={() => dispatch({ type: "toggle-navigation" })}
      >
        {/*
          The button's own box stays at full size in every proximity state and
          only the surface inside it scales. That is what keeps the click target
          stable: the thing under the cursor never shrinks out from under a
          press, and nothing in the room reflows.
        */}
        <span className="pg-nav-cluster-inner" aria-hidden="true">
          <span className="pg-nav-emblem">✦</span>
          <span className="pg-nav-copy">
            <span className="pg-nav-identity" data-testid="shell-nav-identity">
              {playerName}
            </span>
            <span className="pg-nav-date">{dateLabel}</span>
            <span className="pg-nav-place">{place}</span>
          </span>
        </span>
      </button>

      {open ? (
        <div
          id="pg-nav-flyout"
          className="pg-nav-flyout"
          data-level={state.navigation === "primary" ? "primary" : "submenu"}
          data-testid="shell-nav-flyout"
          role="menu"
          aria-label={
            state.navigation === "primary" ? "Main navigation" : "Personal"
          }
        >
          {state.navigation === "primary" ? (
            <>
              {/*
                No "The room" entry.

                Every workspace frame already carries Back and Close, and Close
                dispatches exactly this. A menu entry that repeats the control
                sitting at the top of the surface the player is looking at is
                one more thing to read on the way to the thing they wanted, and
                from the room itself it did nothing at all. The owner's word for
                it was "a useless button". Returning to the room is unchanged.
              */}
              {GROUP_ORDER.map((group) => {
                const entries = primary.filter(
                  (entry) => entry.group === group,
                );
                const withPersonal = group === "you" && personalAvailable;
                if (entries.length === 0 && !withPersonal) return null;
                return (
                  <div
                    key={group}
                    role="group"
                    aria-label={GROUP_HEADINGS[group]}
                    className="pg-nav-group"
                    data-testid={`nav-group-${group}`}
                  >
                    <p className="pg-nav-heading" aria-hidden="true">
                      {GROUP_HEADINGS[group]}
                    </p>
                    {entries.map((entry) => (
                      <button
                        key={entry.surface}
                        type="button"
                        role="menuitem"
                        data-testid={entry.testid}
                        aria-pressed={entry.open}
                        onClick={() =>
                          dispatch({
                            type: "go-to-surface",
                            surface: entry.surface,
                          })
                        }
                      >
                        {entry.label}
                        <small>{entry.hint}</small>
                      </button>
                    ))}
                    {withPersonal ? (
                      <button
                        type="button"
                        role="menuitem"
                        data-testid="nav-personal-group"
                        onClick={() =>
                          dispatch({
                            type: "open-nav-submenu",
                            submenu: "personal",
                          })
                        }
                      >
                        Personal
                        <small>You, the household, money ••</small>
                      </button>
                    ) : null}
                  </div>
                );
              })}
              {canSave ? (
                <button
                  type="button"
                  role="menuitem"
                  data-testid={unsaved ? "keep-world" : "save-world"}
                  onClick={onSave}
                >
                  {unsaved ? "Keep this life" : "Save this life"}
                  {unsaved ? <small>Not saved yet</small> : null}
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                data-testid="leave-game"
                onClick={onLeave}
              >
                Main menu
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-submenu-back"
                onClick={() => dispatch({ type: "open-nav-primary" })}
              >
                ← Back
              </button>
              <p className="pg-nav-heading">Personal</p>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-personal"
                onClick={() =>
                  dispatch({
                    type: "go-to-surface",
                    surface: "personal",
                    section: "identity",
                  })
                }
              >
                Who you are
                <small>Identity, household, what you have done</small>
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-finances"
                onClick={() =>
                  dispatch({
                    type: "go-to-surface",
                    surface: "personal",
                    section: "finances",
                  })
                }
              >
                Money and property
                <small>
                  Yours, the household&rsquo;s, the committee&rsquo;s
                </small>
              </button>
              {journalAvailable ? (
                <button
                  type="button"
                  role="menuitem"
                  data-testid="nav-journal"
                  onClick={() =>
                    dispatch({ type: "go-to-surface", surface: "journal" })
                  }
                >
                  Journal
                  <small>Private notes, intentions and life history</small>
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </nav>
  );
}
