import type { MouseEventHandler } from "react";

/**
 * The one pin control.
 *
 * A pin is a saved reference, so the control says "Pin" or "Unpin" in words
 * beside a pin icon rather than borrowing a favourite star. `aria-pressed`
 * carries the state and `name` completes the accessible label.
 */
export function PinIcon() {
  return (
    <svg
      className="pg-pin-icon"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5.5 1.5h5l-.8 4.2 2.3 2.3v1.2H8.6V15l-.6.5-.6-.5V9.2H4V8l2.3-2.3z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PinToggle({
  pinned,
  name,
  testid,
  noun,
  className = "ui-action ui-action--subtle",
  onToggle,
}: {
  readonly pinned: boolean;
  /** What is pinned, for the accessible label ("Pin Jane Doe"). */
  readonly name: string;
  readonly testid: string;
  /** Names the kind beside the verb when one row can pin two things. */
  readonly noun?: string;
  readonly className?: string;
  readonly onToggle: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      className={`${className} pg-pin-toggle`}
      aria-pressed={pinned}
      aria-label={pinned ? `Unpin ${name}` : `Pin ${name}`}
      data-testid={testid}
      onClick={onToggle}
    >
      <PinIcon />
      <span>
        {pinned ? "Unpin" : "Pin"}
        {noun ? ` ${noun}` : ""}
      </span>
    </button>
  );
}
