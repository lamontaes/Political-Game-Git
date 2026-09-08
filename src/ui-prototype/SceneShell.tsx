import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { resolveBackdrop, sceneAnchors } from "./art";
import { FactList } from "./parts";
import {
  PROTOTYPE_NOW,
  PROTOTYPE_PLAYER,
  PROTOTYPE_ROOMS,
  findRoom,
  formatMinute,
  kindLabel,
  labelForRef,
  peopleInRoom,
  type EntityRef,
  type PrototypePerson,
} from "./data";
import {
  isPinned,
  type PinSize,
  type PrototypeAction,
  type PrototypeState,
} from "./state";

/**
 * The normal scene shell.
 *
 * DEVELOPMENT-ONLY. The scene fills the visual field and the chrome stays quiet
 * around it: a compact cluster in the lower left, floating pins on the right,
 * and nothing permanent in the centre. There is no left sidebar, no top ribbon,
 * and no people-only rail — the pins are mixed by design and say nothing about
 * who is physically present.
 */

interface CoverFrame {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Where the plate actually lands inside the frame.
 *
 * The backdrop is painted with `cover`, so a percentage of the plate is NOT a
 * percentage of the viewport — the picture is cropped on one axis. Person
 * markers are placed on the scene's own authored anchors, so the same crop has
 * to be computed here or every figure would drift off its floor line as the
 * window changes shape. Measuring it is the difference between placement that
 * is authored and placement that merely looks placed.
 */
function useCoverFrame(
  ref: React.RefObject<HTMLDivElement | null>,
  aspectRatio: number,
): CoverFrame | null {
  const [frame, setFrame] = useState<CoverFrame | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => {
      const { width, height } = node.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const frameRatio = width / height;
      const plateWidth =
        frameRatio > aspectRatio ? width : height * aspectRatio;
      const plateHeight =
        frameRatio > aspectRatio ? width / aspectRatio : height;
      setFrame({
        left: (width - plateWidth) / 2,
        top: (height - plateHeight) / 2,
        width: plateWidth,
        height: plateHeight,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, aspectRatio]);

  return frame;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

/* --------------------------------------------------------------- proximity */

/**
 * How close the pointer is to an element, as a state rather than as a number.
 *
 * U03-03 is a recovered requirement, in the owner's own words: the cluster is
 * "small and somewhat translucent ... there is a radius as your cursor
 * approaches that makes it get bigger and more solid". A plain `:hover` cannot
 * do that — hover begins at the edge, so the control is still small at the
 * moment you are aiming at it, which is exactly when being small hurts. The
 * approach zone reaches past the element so it has already grown by the time
 * the pointer arrives.
 *
 * Distance is measured to the RECTANGLE, not to its centre, so a wide control
 * responds evenly along its whole length instead of only in the middle. The
 * listener is passive and coalesces into one animation frame: a pointermove
 * handler that does layout work on every event is a stutter, and a stuttering
 * proximity effect is worse than none.
 */
function useProximity(
  ref: React.RefObject<HTMLElement | null>,
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

/* ------------------------------------------------------------ navigation */

interface NavProps {
  readonly state: PrototypeState;
  readonly dispatch: (action: PrototypeAction) => void;
  readonly locationLabel: string;
  readonly onGo: (
    surface:
      | "people"
      | "calendar"
      | "personal"
      | "offices"
      | "journal"
      | "patch-notes",
  ) => void;
  readonly onOptions: () => void;
}

/**
 * The compact bottom-left cluster and its upward-opening stack.
 *
 * One submenu level at most, and a submenu is a DARKER slate with a brass edge
 * and an offset — never the near-white submenu that was expressly rejected.
 * The closed state is the civic emblem plus the time and place, opened directly
 * without a separate arrow control.
 */
function NavCluster({
  state,
  dispatch,
  locationLabel,
  onGo,
  onOptions,
}: NavProps) {
  const open = state.navigation !== "closed";
  const navRef = useRef<HTMLElement>(null);
  const [focusWithin, setFocusWithin] = useState(false);
  const near = useProximity(navRef, 190);

  /*
   * Three ways in, one state. Pointer approach, keyboard focus and the menu
   * being open all raise the cluster identically, so nothing here is reachable
   * only by hovering it — which is the accessibility rule and also just the
   * behaviour a keyboard player expects.
   */
  const raised = open || near || focusWithin;

  return (
    <nav
      className="p-nav"
      ref={navRef}
      aria-label="Time, location and navigation"
      data-state={open ? "open" : raised ? "near" : "rest"}
      data-testid="nav-region"
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocusWithin(false);
        }
      }}
    >
      <button
        type="button"
        className="p-nav-cluster"
        data-testid="nav-cluster"
        aria-expanded={open}
        aria-controls={open ? "p-nav-flyout" : undefined}
        aria-label={`${PROTOTYPE_PLAYER.name}. ${formatMinute(
          PROTOTYPE_NOW.minuteOfDay,
        )}. ${PROTOTYPE_NOW.fullDateLabel}. ${locationLabel}. Open navigation.`}
        onClick={() => dispatch({ type: "toggle-navigation" })}
      >
        {/*
          The button's own box stays at its full size at every proximity state
          and only the surface inside it scales. That is what keeps the click
          target stable: the thing under the cursor never shrinks out from
          under a press, and nothing in the scene reflows.
        */}
        <span className="p-nav-cluster-inner" aria-hidden="true">
          <span className="p-nav-emblem">✦</span>
          <span className="p-nav-copy">
            {/* U03-06: the quiet identity route. Who, then when, then where. */}
            <span className="p-nav-identity">{PROTOTYPE_PLAYER.name}</span>
            <span className="p-nav-time">
              {formatMinute(PROTOTYPE_NOW.minuteOfDay)}
            </span>
            <span className="p-nav-date">{PROTOTYPE_NOW.fullDateLabel}</span>
            <span className="p-nav-place">{locationLabel}</span>
          </span>
        </span>
      </button>

      {open ? (
        <div
          id="p-nav-flyout"
          className="p-nav-flyout"
          data-level={state.navigation === "primary" ? "primary" : "submenu"}
          data-testid="nav-flyout"
          role="menu"
          aria-label={
            state.navigation === "primary"
              ? "Main navigation"
              : state.navigation === "places"
                ? "Places"
                : "Personal"
          }
        >
          {state.navigation === "primary" ? (
            <>
              <p className="p-nav-heading">Go to</p>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-scene"
                onClick={() => dispatch({ type: "go-to-scene" })}
              >
                Current scene
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-people"
                onClick={() => onGo("people")}
              >
                People / Friends
                <small>Family, friends, work, politics</small>
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-personal"
                onClick={() =>
                  dispatch({ type: "open-nav-submenu", submenu: "personal" })
                }
              >
                Personal
                <small>Money, household, history ••</small>
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-calendar"
                onClick={() => onGo("calendar")}
              >
                Calendar
                <small>Week and commitments</small>
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-offices"
                onClick={() => onGo("offices")}
              >
                Offices / Work
                <small>Your seat and what needs you</small>
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-journal"
                onClick={() => onGo("journal")}
              >
                Life history / Journal
                <small>Chapters, and what is still open</small>
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-places"
                onClick={() =>
                  dispatch({ type: "open-nav-submenu", submenu: "places" })
                }
              >
                Places
                <small>Where you can be ••</small>
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-options"
                onClick={onOptions}
              >
                Options
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-patch-notes"
                onClick={() => onGo("patch-notes")}
              >
                Patch notes
                <small>What has changed, read from the repository</small>
              </button>
              <button
                type="button"
                role="menuitem"
                disabled
                data-testid="nav-news"
              >
                News
                <small>Deferred from this review</small>
              </button>
              <button
                type="button"
                role="menuitem"
                disabled
                data-testid="nav-search"
              >
                Search
                <small>Deferred from this review</small>
              </button>
            </>
          ) : state.navigation === "personal" ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => dispatch({ type: "open-nav-primary" })}
                data-testid="nav-submenu-back"
              >
                ← Back
              </button>
              <p className="p-nav-heading">Personal</p>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-personal-overview"
                onClick={() => onGo("personal")}
              >
                Overview
                <small>Who you are, household, work</small>
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-finances"
                onClick={() => onGo("personal")}
              >
                Money and property
                <small>Household, campaign, public — kept apart</small>
              </button>
              <button
                type="button"
                role="menuitem"
                data-testid="nav-personal-journal"
                onClick={() => onGo("journal")}
              >
                Life history / Journal
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => dispatch({ type: "open-nav-primary" })}
                data-testid="nav-submenu-back"
              >
                ← Back
              </button>
              <p className="p-nav-heading">Places</p>
              {PROTOTYPE_ROOMS.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  role="menuitem"
                  data-testid={`nav-room-${room.id}`}
                  aria-current={state.roomId === room.id}
                  onClick={() =>
                    dispatch({ type: "change-room", roomId: room.id })
                  }
                >
                  {room.label}
                  {state.roomId === room.id ? <small>Current</small> : null}
                </button>
              ))}
            </>
          )}
        </div>
      ) : null}
    </nav>
  );
}

/* --------------------------------------------------------------- pin rail */

interface PinRailProps {
  readonly state: PrototypeState;
  readonly dispatch: (action: PrototypeAction) => void;
  readonly onOpen: (ref: EntityRef) => void;
}

/**
 * The mixed pin rail.
 *
 * People, commitments and measures share one rail. Clicking a pin OPENS the
 * record it points at; pin management lives on a separate control, because one
 * button cannot honestly be both. A pin says nothing about whether that person
 * is in the room, and nothing about the rail is a shared backing panel.
 */
function PinRail({ state, dispatch, onOpen }: PinRailProps) {
  const slotRefs = useRef(new Map<string, HTMLDivElement>());
  /**
   * The gesture in progress.
   *
   * `moved` is what separates a drag from a click. A press that never travels
   * past the threshold stays a click and opens the record, which is the
   * ordinary interaction and must not become harder to perform because
   * reordering exists.
   */
  const gesture = useRef<{
    key: string;
    pointerId: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  /* Set on pointerup so the click that follows the drag does not also open. */
  const suppressClick = useRef(false);

  const endGesture = useCallback(() => {
    gesture.current = null;
    setDragKey(null);
    setDropIndex(null);
  }, []);

  /** Which slot the pointer is currently over, by slot midpoints. */
  const indexForPoint = useCallback(
    (clientY: number): number => {
      let index = 0;
      state.pins.forEach((pin, position) => {
        const node = slotRefs.current.get(pin.key);
        if (!node) return;
        const rect = node.getBoundingClientRect();
        if (clientY > rect.top + rect.height / 2) index = position + 1;
      });
      return Math.min(index, Math.max(state.pins.length - 1, 0));
    },
    [state.pins],
  );

  /*
   * Escape cancels the drag and leaves the order exactly as it was.
   *
   * It listens in the capture phase and stops the event, because the app-level
   * Escape handler would otherwise also fire and close a pin menu the player
   * never asked to close. During a drag, Escape means "undo this gesture" and
   * nothing else.
   */
  useEffect(() => {
    if (!dragKey) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      suppressClick.current = true;
      endGesture();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [dragKey, endGesture]);

  if (state.pins.length === 0) return null;

  return (
    <aside className="p-pin-rail" aria-label="Pinned references">
      {state.pins.map((pin, index) => {
        const label = labelForRef(pin.ref);
        const menuOpen = state.activePinMenuKey === pin.key;
        const manageButton = (
          <button
            type="button"
            className="p-pin-manage"
            aria-label={`Manage the ${label ?? "unavailable"} pin`}
            aria-expanded={menuOpen}
            data-testid={`pin-manage-${pin.key}`}
            onClick={() => dispatch({ type: "toggle-pin-menu", key: pin.key })}
          >
            <span aria-hidden="true">⋯</span>
          </button>
        );

        return (
          <div
            className="p-pin-slot"
            key={pin.key}
            ref={(node) => {
              if (node) slotRefs.current.set(pin.key, node);
              else slotRefs.current.delete(pin.key);
            }}
            data-dragging={dragKey === pin.key ? "true" : "false"}
            data-drop-target={
              dragKey && dragKey !== pin.key && dropIndex === index
                ? "true"
                : "false"
            }
          >
            {pin.size !== "tiny" ? manageButton : null}
            <button
              type="button"
              className="p-pin"
              data-size={pin.size}
              data-testid={`pin-${pin.key}`}
              aria-label={`${label ?? "Unavailable reference"}. ${kindLabel(
                pin.ref.kind,
              )}. Open it. Use the pin menu to move or unpin it.`}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                gesture.current = {
                  key: pin.key,
                  pointerId: event.pointerId,
                  startY: event.clientY,
                  moved: false,
                };
              }}
              onPointerMove={(event) => {
                const active = gesture.current;
                if (!active || active.pointerId !== event.pointerId) return;
                if (!active.moved) {
                  if (Math.abs(event.clientY - active.startY) < 6) return;
                  active.moved = true;
                  setDragKey(active.key);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }
                setDropIndex(indexForPoint(event.clientY));
              }}
              onPointerUp={(event) => {
                const active = gesture.current;
                if (!active || active.pointerId !== event.pointerId) return;
                if (active.moved) {
                  suppressClick.current = true;
                  const target = indexForPoint(event.clientY);
                  dispatch({
                    type: "reorder-pin",
                    key: active.key,
                    toIndex: target,
                  });
                }
                endGesture();
              }}
              onPointerCancel={() => {
                if (gesture.current?.moved) suppressClick.current = true;
                endGesture();
              }}
              onClick={() => {
                /* A completed drag is not also an open. */
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                onOpen(pin.ref);
              }}
            >
              <span className="p-pin-monogram" aria-hidden="true">
                {label ? initials(label) : "?"}
              </span>
              {pin.size !== "tiny" ? (
                <span className="p-pin-copy">
                  <span className="p-pin-kind">{kindLabel(pin.ref.kind)}</span>
                  <strong>{label ?? "Unavailable reference"}</strong>
                  {pin.size === "expanded" ? (
                    <small>
                      {pin.ref.kind === "person"
                        ? "Pinned. Says nothing about where they are."
                        : "Pinned reference."}
                    </small>
                  ) : null}
                </span>
              ) : null}
            </button>

            {pin.size === "tiny" ? manageButton : null}

            {menuOpen ? (
              <div
                className="p-pin-menu"
                role="menu"
                aria-label={`${label ?? "Pin"} options`}
                data-testid={`pin-menu-${pin.key}`}
              >
                {(
                  [
                    ["tiny", "Compact"],
                    ["normal", "Standard"],
                    ["expanded", "Expanded"],
                  ] as const
                ).map(([size, sizeLabel]: readonly [PinSize, string]) => (
                  <button
                    key={size}
                    type="button"
                    role="menuitem"
                    aria-current={pin.size === size}
                    data-testid={`pin-size-${size}-${pin.key}`}
                    onClick={() =>
                      dispatch({ type: "set-pin-size", key: pin.key, size })
                    }
                  >
                    {sizeLabel}
                  </button>
                ))}
                {/*
                  Move up and down stay, and deliberately leave this menu open:
                  they are the keyboard route to the same reordering the pointer
                  does by dragging, and reordering is repeated, so closing the
                  menu after each step would make the keyboard path much worse
                  than the pointer one.
                */}
                <button
                  type="button"
                  role="menuitem"
                  disabled={index === 0}
                  data-testid={`pin-up-${pin.key}`}
                  onClick={() =>
                    dispatch({
                      type: "move-pin",
                      key: pin.key,
                      direction: "up",
                    })
                  }
                >
                  Move up
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={index === state.pins.length - 1}
                  data-testid={`pin-down-${pin.key}`}
                  onClick={() =>
                    dispatch({
                      type: "move-pin",
                      key: pin.key,
                      direction: "down",
                    })
                  }
                >
                  Move down
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="p-pin-menu-unpin"
                  data-testid={`pin-remove-${pin.key}`}
                  onClick={() => dispatch({ type: "unpin", key: pin.key })}
                >
                  Unpin
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </aside>
  );
}

/* ----------------------------------------------------------- quick dossier */

interface QuickDossierProps {
  readonly person: PrototypePerson;
  readonly x: number;
  readonly y: number;
  readonly frameWidth: number;
  readonly pinned: boolean;
  readonly onClose: () => void;
  readonly onOpenFull: () => void;
  readonly onTogglePin: () => void;
  readonly onOpenLink: (ref: EntityRef) => void;
}

function QuickDossier({
  person,
  x,
  y,
  frameWidth,
  pinned,
  onClose,
  onOpenFull,
  onTogglePin,
  onOpenLink,
}: QuickDossierProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, [person.id]);

  /* Adaptive placement: the dossier takes whichever side of the selected
     person has room, so the person being described stays visible. */
  const toTheRight = x < frameWidth * 0.55;
  const style: React.CSSProperties = toTheRight
    ? { left: Math.round(x + 46), top: Math.max(56, Math.round(y - 220)) }
    : {
        right: Math.round(frameWidth - x + 46),
        top: Math.max(56, Math.round(y - 220)),
      };

  return (
    <aside
      className="p-quick-dossier"
      style={style}
      role="dialog"
      aria-modal="false"
      aria-labelledby="p-quick-dossier-name"
      data-testid="quick-dossier"
      data-person-id={person.id}
    >
      <header>
        <div>
          <p className="p-kicker">Your read</p>
          <h2 id="p-quick-dossier-name">{person.name}</h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="p-close"
          aria-label={`Close the quick dossier for ${person.name}`}
          data-testid="quick-dossier-close"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <p className="p-role">{person.role}</p>

      {/* Current activity, kept separate from the lasting read of them. */}
      <p className="p-right-now" data-testid="quick-right-now">
        <span className="p-right-now-label">Right now</span>
        {person.read}
      </p>

      <div className="p-impression">
        <strong>{person.relationship}</strong>
      </div>

      <div className="p-dossier-section">
        <h3>Details</h3>
        <FactList facts={person.facts.slice(0, 3)} testId="quick-facts" />
      </div>

      <div className="p-dossier-section">
        <h3>Last interaction</h3>
        <p>{person.lastInteraction}</p>
      </div>

      {person.links.length > 0 ? (
        <div className="p-dossier-section">
          <h3>Connected</h3>
          <div className="p-dossier-actions">
            {person.links.map((link) => (
              <button
                key={`${link.kind}:${link.id}`}
                type="button"
                className="p-button"
                data-testid={`quick-link-${link.kind}-${link.id}`}
                onClick={() => onOpenLink(link)}
              >
                {labelForRef(link) ?? "Unavailable"}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="p-dossier-actions">
        <button
          type="button"
          className="p-button"
          data-variant="accent"
          data-testid="quick-dossier-full"
          onClick={onOpenFull}
        >
          Full record
        </button>
        <button
          type="button"
          className="p-button"
          aria-pressed={pinned}
          data-testid="quick-dossier-pin"
          onClick={onTogglePin}
        >
          {pinned ? "Unpin" : "Pin"}
        </button>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------- scene shell */

interface SceneShellProps {
  readonly state: PrototypeState;
  readonly dispatch: (action: PrototypeAction) => void;
  readonly openEntity: (ref: EntityRef) => void;
  readonly onOptions: () => void;
  readonly children?: React.ReactNode;
}

export function SceneShell({
  state,
  dispatch,
  openEntity,
  onOptions,
  children,
}: SceneShellProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const room = findRoom(state.roomId);
  const sceneId = room?.sceneId ?? "";
  const backdrop = resolveBackdrop(sceneId);
  const frame = useCoverFrame(stageRef, backdrop.aspectRatio);
  const anchors = sceneAnchors(sceneId);
  const people = room ? peopleInRoom(room.id) : [];

  const positioned = people.map((person, index) => {
    /*
     * Spread the people across the room's anchors rather than taking the first
     * few. Authored anchors often cluster (a chair beside a standing spot), and
     * two markers on top of each other tells the owner nothing about how the
     * composition reads.
     */
    const anchor =
      anchors.length === 0
        ? undefined
        : anchors[
            Math.min(
              anchors.length - 1,
              Math.floor((index * anchors.length) / Math.max(people.length, 1)),
            )
          ];
    const xPercent = anchor?.xPercent ?? 30 + index * 18;
    const floorYPercent = anchor?.floorYPercent ?? 82;
    const x = frame ? frame.left + (frame.width * xPercent) / 100 : 0;
    const y = frame ? frame.top + (frame.height * floorYPercent) / 100 : 0;
    /*
     * Marker height is the room's own measured standing height at this floor
     * line, so someone at the back of the room reads as further away instead of
     * as the same size in a different place. Rooms with no declared calibration
     * fall back to a fixed height rather than to an invented one.
     */
    const height =
      frame && anchor?.bodyHeightPercent != null
        ? (frame.height * anchor.bodyHeightPercent) / 100
        : 80;
    return {
      person,
      x,
      y,
      height,
      anchorId: anchor?.anchorId ?? null,
    };
  });

  const selected = positioned.find(
    (entry) => entry.person.id === state.actionMenuPersonId,
  );
  const inspected = positioned.find(
    (entry) => entry.person.id === state.quickDossierPersonId,
  );

  return (
    <div className="p-shell" data-testid="scene-shell">
      <div className="p-scene-stage" ref={stageRef}>
        <div
          className="p-backdrop"
          data-plate={backdrop.url ? "released" : "missing"}
          data-asset-id={backdrop.assetId ?? "none"}
          data-testid="scene-backdrop"
          style={
            backdrop.url
              ? { backgroundImage: `url(${backdrop.url})` }
              : undefined
          }
          role="img"
          aria-label={`${backdrop.label}.`}
        />
        {backdrop.url ? null : (
          <p className="p-backdrop-missing">
            This room has no released plate. Nothing is being substituted for
            it.
          </p>
        )}

        {frame
          ? positioned.map(({ person, x, y, height }) => (
              <button
                key={person.id}
                type="button"
                className="p-scene-person"
                style={
                  {
                    left: x,
                    top: y,
                    "--p-figure-height": `${Math.round(height)}px`,
                  } as React.CSSProperties
                }
                data-testid={`scene-person-${person.id}`}
                data-selected={
                  state.actionMenuPersonId === person.id ? "true" : "false"
                }
                aria-haspopup="menu"
                aria-expanded={state.actionMenuPersonId === person.id}
                aria-label={`${person.name}, ${person.role}. Open actions.`}
                onClick={() =>
                  dispatch({ type: "select-person", personId: person.id })
                }
              >
                <span className="p-scene-person-label" aria-hidden="true">
                  {person.name} <small>· {person.role}</small>
                </span>
                <span className="p-scene-person-figure" aria-hidden="true" />
              </button>
            ))
          : null}

        {selected ? (
          <div
            className="p-action-menu"
            style={{ left: selected.x, top: selected.y - 92 }}
            role="menu"
            aria-label={`${selected.person.name} actions`}
            data-testid="person-action-menu"
          >
            <p className="p-action-menu-name">{selected.person.name}</p>
            <button
              type="button"
              role="menuitem"
              data-testid="action-inspect"
              onClick={() =>
                dispatch({
                  type: "open-quick-dossier",
                  personId: selected.person.id,
                })
              }
            >
              Inspect
              <small>What you make of them</small>
            </button>
            <button
              type="button"
              role="menuitem"
              data-testid="action-pin"
              onClick={() =>
                dispatch({
                  type: "toggle-pin",
                  ref: { kind: "person", id: selected.person.id },
                })
              }
            >
              {isPinned(state, { kind: "person", id: selected.person.id })
                ? "Unpin"
                : "Pin"}
            </button>
            {selected.person.links[0] ? (
              <button
                type="button"
                role="menuitem"
                data-testid="action-context"
                onClick={() => {
                  const link = selected.person.links[0];
                  if (link) openEntity(link);
                }}
              >
                {labelForRef(selected.person.links[0]) ?? "Connected record"}
                <small>{kindLabel(selected.person.links[0].kind)}</small>
              </button>
            ) : null}
            {/*
              Deliberately disabled, with the reason said out loud. Conversation
              is a real system this prototype does not have, and a Talk button
              that opened a fake exchange would be worse than one that admits it.
            */}
            <button
              type="button"
              role="menuitem"
              disabled
              data-testid="action-talk"
            >
              Talk
              <small>Conversation is not part of this prototype</small>
            </button>
          </div>
        ) : null}

        {inspected && frame ? (
          <QuickDossier
            person={inspected.person}
            x={inspected.x}
            y={inspected.y}
            frameWidth={stageRef.current?.clientWidth ?? frame.width}
            pinned={isPinned(state, {
              kind: "person",
              id: inspected.person.id,
            })}
            onClose={() => dispatch({ type: "close-quick-dossier" })}
            onOpenFull={() =>
              openEntity({ kind: "person", id: inspected.person.id })
            }
            onTogglePin={() =>
              dispatch({
                type: "toggle-pin",
                ref: { kind: "person", id: inspected.person.id },
              })
            }
            onOpenLink={openEntity}
          />
        ) : null}
      </div>

      {children}

      <NavCluster
        state={state}
        dispatch={dispatch}
        locationLabel={room?.locationLabel ?? "Unknown location"}
        onGo={(surface) => dispatch({ type: "go-to-surface", surface })}
        onOptions={onOptions}
      />

      <PinRail state={state} dispatch={dispatch} onOpen={openEntity} />
    </div>
  );
}
