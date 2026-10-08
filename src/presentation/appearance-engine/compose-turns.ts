/**
 * WHOSE TURN IT IS TO BE DRAWN.
 *
 * People are composed one at a time, so a full room never stalls a frame for
 * long, and the newest asked for go first: the room the player has just
 * walked into is drawn before the rest of the one they left. Each turn is
 * given a frame of its own (`schedule`), so the page keeps drawing while a
 * room fills.
 */
export interface ComposeTurns {
  /** Resolves when it is this caller's turn; call `done` when finished. */
  readonly turn: () => Promise<void>;
  readonly done: () => void;
}

export function createComposeTurns(
  schedule: (run: () => void) => void = (run) => setTimeout(run, 0),
): ComposeTurns {
  const waiting: (() => void)[] = [];
  let composing = false;
  const next = () => {
    if (composing) return;
    const turn = waiting.pop();
    if (!turn) return;
    composing = true;
    schedule(turn);
  };
  return {
    turn: () =>
      new Promise((resolve) => {
        waiting.push(resolve);
        next();
      }),
    done: () => {
      composing = false;
      next();
    },
  };
}
