import { useEffect, useMemo, useReducer, useRef } from "react";

import { BrowserShellStateStore } from "../presentation/browser-shell-state";
import { shellRefIsResolvable } from "../presentation/person-dossier";
import {
  INITIAL_SHELL_STATE,
  refKey,
  shellReducer,
  type ShellAction,
  type ShellState,
} from "../presentation/shell-navigation";
import type { EntityId, World } from "../simulation";

/**
 * The shell's state, kept and kept up.
 *
 * Three things happen here that the reducer deliberately cannot do for itself,
 * because each one touches the world outside it: pins and preferences are read
 * back from storage when a slot is opened and written whenever they change;
 * pins whose target this world does not hold are dropped rather than left as
 * rows that cannot be opened; and Escape is bound once, at the document, so
 * every surface gets the same layering behaviour without binding its own.
 */
export function useShell(
  world: World,
  saveId: EntityId | null,
): readonly [ShellState, (action: ShellAction) => void] {
  const [state, dispatch] = useReducer(shellReducer, INITIAL_SHELL_STATE);
  const store = useMemo(() => new BrowserShellStateStore(), []);
  /* The slot whose state has been read, so a re-render does not re-read it. */
  const loadedFor = useRef<EntityId | null>(null);
  const loading = useRef(false);

  useEffect(() => {
    if (saveId === null) return;
    if (loadedFor.current === saveId) return;
    let cancelled = false;
    loading.current = true;
    void store.read(saveId).then((stored) => {
      if (cancelled) return;
      loadedFor.current = saveId;
      loading.current = false;
      /*
       * A slot with nothing stored keeps what this session already has. That is
       * the difference between opening a saved life and saving the one being
       * played: the second must not wipe the rail the player arranged before
       * they pressed save.
       */
      if (!stored) return;
      dispatch({
        type: "restore",
        pins: stored.pins,
        preferences: stored.preferences,
      });
    });
    return () => {
      cancelled = true;
      loading.current = false;
    };
  }, [saveId, store]);

  /*
   * Written after every change rather than on a timer or on close: a player who
   * arranges a rail and then closes the tab has made a choice, and a debounce
   * is how that choice gets lost. The store queues its own writes.
   */
  useEffect(() => {
    if (saveId === null) return;
    if (loadedFor.current !== saveId) return;
    void store.write(saveId, {
      pins: state.pins,
      preferences: state.preferences,
    });
  }, [saveId, store, state.pins, state.preferences]);

  /* A pin the world cannot resolve is not shown as one that can be opened. */
  useEffect(() => {
    if (state.pins.length === 0) return;
    const keep = state.pins
      .filter((pin) => shellRefIsResolvable(world, pin.ref))
      .map((pin) => refKey(pin.ref));
    if (keep.length === state.pins.length) return;
    dispatch({ type: "prune-pins", keep });
  }, [world, state.pins]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      dispatch({ type: "escape" });
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return [state, dispatch] as const;
}
