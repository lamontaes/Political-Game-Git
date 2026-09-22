import { useEffect, useRef } from "react";

/**
 * "Return to title" from in-game Options.
 *
 * It reuses the game's own leave flow rather than a second one: a life that
 * has never been saved raises the shell's save-first question (Save first,
 * Quit without saving, Stay), and a kept life leaves through the same flush
 * the menu's Quit uses, which refuses to drop a world that did not reach disk.
 * Kept to this one component so another surface can offer the same action.
 */
export function ReturnToTitleAction({
  needsConfirmation,
  confirming,
  onAskConfirmation,
  onLeave,
}: {
  /** True when leaving now would abandon a life that was never saved. */
  readonly needsConfirmation: boolean;
  /** True while the shell's save-first question is open. */
  readonly confirming: boolean;
  readonly onAskConfirmation: () => void;
  readonly onLeave: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const asked = useRef(false);

  // Focus comes back here when the question is dismissed with Stay or Escape.
  useEffect(() => {
    if (confirming || !asked.current) return;
    asked.current = false;
    buttonRef.current?.focus();
  }, [confirming]);

  return (
    <section
      className="pg-personal-section"
      data-testid="return-to-title-section"
    >
      <h3>Title screen</h3>
      <p className="game-note" id="return-to-title-note">
        Choose whether to save your latest progress before returning.
      </p>
      <button
        ref={buttonRef}
        type="button"
        className="ui-action"
        data-testid="return-to-title"
        aria-describedby="return-to-title-note"
        onClick={() => {
          if (needsConfirmation) {
            asked.current = true;
            onAskConfirmation();
          } else {
            onLeave();
          }
        }}
      >
        Return to title
      </button>
    </section>
  );
}
