/**
 * The desktop hub's "Return to title" request.
 *
 * The hub has no preload or IPC into the game page, so it asks with a
 * cancelable DOM event and reads the outcome from another one. The game
 * calls `preventDefault()` only when it actually opens its own Return to title
 * flow, which is how the hub knows this build supports the request. Nothing
 * here resets, deletes or reloads a life.
 */
export const RETURN_TO_TITLE_REQUEST_EVENT = "ocd:request-return-to-title";
export const RETURN_TO_TITLE_RESULT_EVENT = "ocd:return-to-title-result";

export type ReturnToTitleOutcome = "title" | "cancelled" | "save-failed";

/** One Return to title in progress, whichever control started it. */
export interface ReturnToTitleRequest {
  readonly fromHub: boolean;
  /** Set once the player chose a way out, so closing the question is not a cancel. */
  leaving: boolean;
}

export function reportReturnToTitle(
  request: ReturnToTitleRequest | null,
  outcome: ReturnToTitleOutcome,
): void {
  if (!request?.fromHub) return;
  window.dispatchEvent(
    new CustomEvent(RETURN_TO_TITLE_RESULT_EVENT, { detail: { outcome } }),
  );
}
