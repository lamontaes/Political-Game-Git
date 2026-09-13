import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { findInvokerControl, menuBesideAnchor } from "./overlay-focus";

/**
 * Restore keyboard focus to the still-mounted invoker after a surface closes.
 * Layout effect, not a timeout: the person token is already in the room.
 */
export function InvokerFocusReturn({
  personId,
  prefer = "scene",
  onDone,
}: {
  readonly personId: string | null;
  readonly prefer?: "scene" | "panel";
  readonly onDone: () => void;
}) {
  useLayoutEffect(() => {
    if (!personId) return;
    const invoker = findInvokerControl(personId, document, prefer);
    invoker?.focus();
    onDone();
  }, [personId, prefer, onDone]);
  return null;
}

export function PersonSceneActionMenu({
  personId,
  name,
  isSelf = false,
  talk,
  pinned,
  onInspect,
  onTalk,
  onPin,
  onRecord,
}: {
  readonly personId: string;
  readonly name: string;
  readonly isSelf?: boolean;
  readonly talk: { readonly disabled: boolean; readonly reason?: string };
  readonly pinned: boolean;
  readonly onInspect: () => void;
  readonly onTalk: () => void;
  readonly onPin: () => void;
  readonly onRecord: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{
    readonly left: number;
    readonly top: number;
  } | null>(null);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const first = menu?.querySelector<HTMLButtonElement>(
      "button:not(:disabled)",
    );
    first?.focus();

    const place = () => {
      if (!menu) return;
      const anchor = document.querySelector<HTMLElement>(
        `[data-testid="scene-person-${personId}"]`,
      );
      const menuBox = menu.getBoundingClientRect();
      if (!anchor) {
        setPlacement(
          menuBesideAnchor(
            {
              left: window.innerWidth / 2,
              top: window.innerHeight / 2,
              width: 1,
              height: 1,
            },
            { width: menuBox.width, height: menuBox.height },
            { width: window.innerWidth, height: window.innerHeight },
          ),
        );
        return;
      }
      const box = anchor.getBoundingClientRect();
      setPlacement(
        menuBesideAnchor(
          box,
          { width: menuBox.width, height: menuBox.height },
          { width: window.innerWidth, height: window.innerHeight },
        ),
      );
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [personId]);

  return (
    <div
      ref={menuRef}
      className="pg-action-menu civic-glass"
      role="menu"
      aria-label={`${name} actions`}
      data-testid="person-action-menu"
      data-person-id={personId}
      style={
        placement
          ? ({
              left: `${placement.left}px`,
              top: `${placement.top}px`,
              right: "auto",
              bottom: "auto",
            } satisfies CSSProperties)
          : ({ visibility: "hidden" } satisfies CSSProperties)
      }
    >
      <p className="pg-action-menu-name">{name}</p>
      <MenuItem testId="action-inspect" onClick={onInspect}>
        Inspect
        <small>
          {isSelf ? "Your notes on yourself" : "What you make of them"}
        </small>
      </MenuItem>
      <MenuItem
        testId="action-talk"
        disabled={talk.disabled || isSelf}
        describedBy={
          talk.disabled || isSelf ? "pg-action-talk-reason" : undefined
        }
        onClick={onTalk}
      >
        Talk
        <small>
          {isSelf ? "You are already this person" : "Say something to them"}
        </small>
      </MenuItem>
      {(talk.disabled && talk.reason) || isSelf ? (
        <p
          className="pg-action-menu-reason"
          id="pg-action-talk-reason"
          data-testid="action-talk-reason"
        >
          {isSelf
            ? "This is you. Appearance and wardrobe are in Personal."
            : talk.reason}
        </p>
      ) : null}
      <MenuItem testId="action-pin" onClick={onPin}>
        {pinned ? "Unpin" : "Pin"}
      </MenuItem>
      <MenuItem testId="action-record" onClick={onRecord}>
        Full record
      </MenuItem>
    </div>
  );
}

function MenuItem({
  testId,
  disabled = false,
  describedBy,
  onClick,
  children,
}: {
  readonly testId: string;
  readonly disabled?: boolean;
  readonly describedBy?: string;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-testid={testId}
      disabled={disabled}
      aria-describedby={describedBy}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
