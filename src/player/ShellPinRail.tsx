import { useCallback, useEffect, useRef, useState } from "react";

import { labelForRef } from "../presentation/person-dossier";
import type {
  PinSize,
  ShellAction,
  ShellRef,
  ShellState,
} from "../presentation/shell-navigation";
import type { World } from "../simulation";

/**
 * The mixed pin rail.
 *
 * People, commitments and measures share one rail. Clicking a pin OPENS the
 * record it points at; pin management lives on a separate control, because one
 * button cannot honestly be both. A pin says nothing about whether that person
 * is in the room and nothing about how they feel — it is a saved reference, and
 * the label under an expanded person pin says so out loud.
 *
 * There is no shared backing panel and no "PINS" header: each pin is its own
 * small surface, which is what lets the rail grow dense without becoming a
 * permanent slab down the side of the room.
 */

const KIND_LABELS: Readonly<Record<ShellRef["kind"], string>> = {
  person: "Person",
  commitment: "Commitment",
  measure: "Measure",
};

export function pinKindLabel(kind: ShellRef["kind"]): string {
  return KIND_LABELS[kind];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

export function ShellPinRail({
  world,
  state,
  dispatch,
  onOpen,
}: {
  readonly world: World;
  readonly state: ShellState;
  readonly dispatch: (action: ShellAction) => void;
  readonly onOpen: (ref: ShellRef) => void;
}) {
  const slotRefs = useRef(new Map<string, HTMLDivElement>());
  /**
   * The gesture in progress.
   *
   * `moved` is what separates a drag from a click. A press that never travels
   * past the threshold stays a click and opens the record, because opening is
   * the ordinary interaction and must not get harder to perform just because
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
  /* Set on pointerup so the click that follows a drag does not also open. */
  const suppressClick = useRef(false);

  const endGesture = useCallback(() => {
    gesture.current = null;
    setDragKey(null);
    setDropIndex(null);
  }, []);

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
   * It listens in the capture phase and stops the event, because the shell's
   * own Escape handler would otherwise also fire and close a layer the player
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
    <aside
      className="pg-pin-rail"
      aria-label="Pinned references"
      data-testid="pin-rail"
    >
      {state.pins.map((pin, index) => {
        const label = labelForRef(world, pin.ref);
        const menuOpen = state.activePinMenuKey === pin.key;
        const manageButton = (
          <button
            type="button"
            className="pg-pin-manage"
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
            className="pg-pin-slot"
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
              className="pg-pin"
              data-size={pin.size}
              data-kind={pin.ref.kind}
              data-testid={`pin-${pin.key}`}
              aria-label={`${label ?? "Unavailable reference"}. ${
                KIND_LABELS[pin.ref.kind]
              }. Open it. Use the pin menu to move or unpin it.`}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                /*
                 * Every gesture starts unsuppressed. The flag exists only to
                 * stop the click that a completed drag emits; leaving it set —
                 * which happens when a pointer capture ends outside the button
                 * and no click follows at all — would swallow the next
                 * ordinary press instead.
                 */
                suppressClick.current = false;
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
                  dispatch({
                    type: "reorder-pin",
                    key: active.key,
                    toIndex: indexForPoint(event.clientY),
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
              <span className="pg-pin-monogram" aria-hidden="true">
                {label ? initials(label) : "?"}
              </span>
              {pin.size !== "tiny" ? (
                <span className="pg-pin-copy">
                  <span className="pg-pin-kind">
                    {KIND_LABELS[pin.ref.kind]}
                  </span>
                  <strong>{label ?? "Unavailable reference"}</strong>
                  {pin.size === "expanded" ? (
                    <small>
                      {pin.ref.kind === "person"
                        ? "Saved reference. It says nothing about where they are."
                        : "Saved reference."}
                    </small>
                  ) : null}
                </span>
              ) : null}
            </button>

            {pin.size === "tiny" ? manageButton : null}

            {menuOpen ? (
              <div
                className="pg-pin-menu"
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
                  they are the keyboard route to the reordering the pointer does
                  by dragging, and reordering is repeated, so closing the menu
                  after each step would make the keyboard path much worse than
                  the pointer one.
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
                  className="pg-pin-menu-unpin"
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
