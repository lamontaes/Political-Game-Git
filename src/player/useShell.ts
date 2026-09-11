import { useEffect, useReducer, useState } from "react";

import type { BrowserShellStateStore } from "../presentation/browser-shell-state";
import { shellRefIsResolvable } from "../presentation/person-dossier";
import {
  INITIAL_SHELL_STATE,
  EMPTY_JOURNAL,
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
  /*
   * The store, supplied rather than built here.
   *
   * This hook used to construct `new BrowserShellStateStore()` with no
   * arguments, which meant the default database — and this hook is the writer
   * that actually persists pins, preferences, the journal and wardrobe
   * choices. So while the development art preview was carefully given its own
   * database everywhere else, the one writer that matters kept writing
   * candidate wardrobe choices into the ordinary player's save. Namespacing a
   * different construction in `PlayerGame` did not reach this one, and store
   * tests that instantiate their own correctly-named instances never ran this
   * line at all.
   *
   * Taking it as a parameter is what makes that impossible to get wrong again:
   * there is no default to fall back to, so every caller has to say which
   * persistence it means.
   */
  store: BrowserShellStateStore,
): readonly [ShellState, (action: ShellAction) => void] {
  const [state, dispatch] = useReducer(shellReducer, INITIAL_SHELL_STATE);
  /*
   * The RECORD this session has finished reading — the slot AND the database.
   *
   * State rather than a ref on purpose: the write below must start once the
   * read has settled, and a ref changing does not re-run an effect. With a ref
   * here, a life pinned BEFORE its first save was read as "nothing stored",
   * kept correctly in memory, and then never written — so the pins were gone
   * on the next load. The browser proof caught exactly that.
   *
   * The slot id alone was not enough once a second database existed. Switching
   * stores for the same slot left the previous certification standing, so the
   * read was skipped and the write fired immediately — carrying whatever was
   * in memory from the other database straight into this one. A record is
   * identified by where it lives as well as by which slot it is.
   */
  const [loadedRecord, setLoadedRecord] = useState<string | null>(null);
  const recordKey = saveId === null ? null : `${store.databaseName}::${saveId}`;

  useEffect(() => {
    if (saveId === null || recordKey === null) return;
    if (loadedRecord === recordKey) return;
    let cancelled = false;
    void store.read(saveId).then((stored) => {
      if (cancelled) return;
      /*
       * A slot with nothing stored keeps what this session already has. That is
       * the difference between opening a saved life and saving the one being
       * played: the second must not wipe the rail the player arranged before
       * they pressed save.
       */
      if (stored) {
        dispatch({
          type: "restore",
          journal: stored.journal ?? EMPTY_JOURNAL,
          personWardrobes: stored.personWardrobes ?? {},
          pins: stored.pins,
          preferences: stored.preferences,
        });
      }
      setLoadedRecord(recordKey);
    });
    return () => {
      cancelled = true;
    };
  }, [saveId, recordKey, loadedRecord, store]);

  /*
   * Written after every change rather than on a timer or on close: a player who
   * arranges a rail and then closes the tab has made a choice, and a debounce
   * is how that choice gets lost. The store queues its own writes.
   */
  useEffect(() => {
    if (saveId === null || recordKey === null) return;
    if (loadedRecord !== recordKey) return;
    void store.write(saveId, {
      journal: state.journal,
      personWardrobes: state.personWardrobes,
      pins: state.pins,
      preferences: state.preferences,
    });
  }, [
    saveId,
    recordKey,
    loadedRecord,
    store,
    state.pins,
    state.preferences,
    state.journal,
    state.personWardrobes,
  ]);

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
