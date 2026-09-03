import type { FlushResult, UnsavedSlot } from "./browser-world-repository";

/**
 * Closing the tab is a way of leaving, and it used to be the only one nothing
 * watched.
 *
 * Leaving through the game asks the store to drain and refuses to let go of a
 * life that did not reach disk. Closing the window asked nothing. Autosave is
 * launched from an effect and returns a promise nobody can await once the
 * document is being torn down, so a world that was in flight, in retry backoff,
 * or already failed existed only in memory — and the memory went with the tab.
 * The player saw an ordinary close and lost an ordinary amount of work.
 *
 * What is honest to promise here is small, so this promises exactly that much.
 * An asynchronous write started during unload is not guaranteed to finish, and
 * nothing below pretends otherwise. What the guard does is refuse to let the
 * close be silent: while the store owes anything — a write in flight, a write
 * that failed, or a slot lost to another tab — the browser is asked to put its
 * own "leave site?" question to the player, which is the one mechanism a page
 * genuinely has. The best-effort flush on the way out is exactly that, and is
 * never treated as durability.
 */

/** The part of the store a guard needs. Narrow, so a test can stand in for it. */
export interface UnsavedWorkSource {
  unsavedWork(): readonly UnsavedSlot[];
  flush(): Promise<FlushResult>;
}

/** The part of `window` a guard needs. */
export interface UnloadTarget {
  addEventListener(
    type: string,
    listener: (event: Event) => void,
    options?: unknown,
  ): void;
  removeEventListener(
    type: string,
    listener: (event: Event) => void,
    options?: unknown,
  ): void;
}

export interface UnsavedWorkGuardOptions {
  /** Told what could not be saved, so the screen can say it too. */
  readonly onUnsaved?: (unsaved: readonly UnsavedSlot[]) => void;
}

/**
 * Watches a store for as long as the page lives. Returns the undo.
 *
 * `beforeunload` is the only event that can still stop a close, and a browser
 * only honours it if the handler cancels the event, so that is what happens
 * when work is owed — and nothing happens when none is, because a page that
 * always asks is a page whose question stops meaning anything.
 */
export function guardUnsavedWork(
  store: UnsavedWorkSource,
  target: UnloadTarget,
  options: UnsavedWorkGuardOptions = {},
): () => void {
  const beforeUnload = (event: Event) => {
    const unsaved = store.unsavedWork();
    if (unsaved.length === 0) return;
    options.onUnsaved?.(unsaved);
    // Both spellings: `preventDefault` is the standard one, `returnValue` is
    // what several browsers still actually look at.
    event.preventDefault();
    (event as { returnValue?: unknown }).returnValue = "";
  };

  const pageHide = () => {
    if (store.unsavedWork().length === 0) return;
    // Best effort, and only that. The page may be gone before this resolves,
    // which is why the prompt above exists and why nothing here reports back.
    void store.flush().catch(() => undefined);
  };

  target.addEventListener("beforeunload", beforeUnload);
  target.addEventListener("pagehide", pageHide);
  return () => {
    target.removeEventListener("beforeunload", beforeUnload);
    target.removeEventListener("pagehide", pageHide);
  };
}
