/**
 * WHOSE TURN IT IS TO BE DRAWN.
 *
 * People are composed one at a time, so a full room never stalls a frame for
 * long. Each waiting person carries a priority, read when the next turn is
 * given rather than when they joined the line, and the highest goes first:
 * the people on the screen the player is looking at, newest first, before
 * anyone from a screen they have left (runtime.ts sets the priority). Equal
 * priorities go newest first. Each turn is given a frame of its own
 * (`schedule`), so the page keeps drawing while a room fills.
 */
export interface ComposeTurns {
  /** Resolves when it is this caller's turn; call `done` when finished. */
  readonly turn: (priority: () => number) => Promise<void>;
  readonly done: () => void;
}

export function createComposeTurns(
  schedule: (run: () => void) => void = (run) => setTimeout(run, 0),
): ComposeTurns {
  const waiting: { priority: () => number; resolve: () => void }[] = [];
  let composing = false;
  const next = () => {
    if (composing || waiting.length === 0) return;
    let best = waiting.length - 1;
    for (let at = waiting.length - 2; at >= 0; at -= 1)
      if (waiting[at]!.priority() > waiting[best]!.priority()) best = at;
    const [chosen] = waiting.splice(best, 1);
    composing = true;
    schedule(chosen!.resolve);
  };
  return {
    turn: (priority) =>
      new Promise((resolve) => {
        waiting.push({ priority, resolve });
        next();
      }),
    done: () => {
      composing = false;
      next();
    },
  };
}
