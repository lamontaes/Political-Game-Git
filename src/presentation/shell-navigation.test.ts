import { describe, expect, it } from "vitest";

import {
  DEFAULT_PREFERENCES,
  INITIAL_SHELL_STATE,
  activeView,
  canGoBack,
  isPinned,
  refKey,
  sameRef,
  shellReducer,
  type ShellAction,
  type ShellRef,
  type ShellState,
} from "./shell-navigation";
import type { EntityId } from "../simulation";

const ALICE = "person-alice" as EntityId;
const BOB = "person-bob" as EntityId;
const MEETING = "activity-1" as EntityId;
const BILL = "measure-1" as EntityId;

const person: ShellRef = { kind: "person", id: ALICE };
const meeting: ShellRef = { kind: "commitment", id: MEETING };
const bill: ShellRef = { kind: "measure", id: BILL };

function run(
  actions: readonly ShellAction[],
  from: ShellState = INITIAL_SHELL_STATE,
): ShellState {
  return actions.reduce(shellReducer, from);
}

describe("the shell's navigation", () => {
  it("opens on the room and can go nowhere back from it", () => {
    expect(activeView(INITIAL_SHELL_STATE)).toEqual({ surface: "scene" });
    expect(canGoBack(INITIAL_SHELL_STATE)).toBe(false);
  });

  it("walks a chain and comes back through it one step at a time", () => {
    const state = run([
      { type: "go-to-surface", surface: "people" },
      { type: "open-entity", ref: person },
      { type: "open-entity", ref: meeting },
    ]);
    expect(activeView(state)).toEqual({ surface: "entity", ref: meeting });

    const back = shellReducer(state, { type: "back" });
    expect(activeView(back)).toEqual({ surface: "entity", ref: person });

    const twice = shellReducer(back, { type: "back" });
    expect(activeView(twice)).toEqual({ surface: "people" });
  });

  it("does not stack the same view on itself", () => {
    const state = run([
      { type: "open-entity", ref: person },
      { type: "open-entity", ref: person },
    ]);
    expect(state.history).toHaveLength(2);
  });

  it("returns to the room in one move from anywhere", () => {
    const state = run([
      { type: "go-to-surface", surface: "calendar" },
      { type: "open-entity", ref: meeting },
      { type: "go-to-scene" },
    ]);
    expect(state.history).toEqual([{ surface: "scene" }]);
  });

  it("carries the chosen person rather than dropping the id", () => {
    const state = shellReducer(INITIAL_SHELL_STATE, {
      type: "select-person",
      personId: BOB,
    });
    expect(state.actionMenuPersonId).toBe(BOB);

    const other = shellReducer(state, {
      type: "select-person",
      personId: ALICE,
    });
    expect(other.actionMenuPersonId).toBe(ALICE);
  });
});

describe("pins", () => {
  it("keeps three kinds at once and opens by reference, not by row", () => {
    const state = run([
      { type: "toggle-pin", ref: person },
      { type: "toggle-pin", ref: meeting },
      { type: "toggle-pin", ref: bill },
    ]);
    expect(state.pins.map((pin) => pin.key)).toEqual([
      refKey(person),
      refKey(meeting),
      refKey(bill),
    ]);
    expect(isPinned(state, meeting)).toBe(true);
  });

  it("survives navigation, because a pin is a choice and not a layer", () => {
    const state = run([
      { type: "toggle-pin", ref: person },
      { type: "go-to-surface", surface: "journal" },
      { type: "open-entity", ref: bill },
      { type: "back" },
      { type: "go-to-scene" },
    ]);
    expect(state.pins).toHaveLength(1);
  });

  it("reorders by key, so a stale index cannot move the wrong pin", () => {
    const pinned = run([
      { type: "toggle-pin", ref: person },
      { type: "toggle-pin", ref: meeting },
      { type: "toggle-pin", ref: bill },
    ]);
    const moved = shellReducer(pinned, {
      type: "reorder-pin",
      key: refKey(bill),
      toIndex: 0,
    });
    expect(moved.pins.map((pin) => pin.key)).toEqual([
      refKey(bill),
      refKey(person),
      refKey(meeting),
    ]);

    const gone = shellReducer(moved, {
      type: "reorder-pin",
      key: "person:nobody",
      toIndex: 0,
    });
    expect(gone).toBe(moved);
  });

  it("moves up and down for the keyboard and leaves that menu standing", () => {
    const pinned = run([
      { type: "toggle-pin", ref: person },
      { type: "toggle-pin", ref: meeting },
      { type: "toggle-pin-menu", key: refKey(meeting) },
    ]);
    const moved = shellReducer(pinned, {
      type: "move-pin",
      key: refKey(meeting),
      direction: "up",
    });
    expect(moved.pins[0]?.key).toBe(refKey(meeting));
    expect(moved.activePinMenuKey).toBe(refKey(meeting));
  });

  it("closes only its own menu when a size is chosen", () => {
    const pinned = run([
      { type: "toggle-pin", ref: person },
      { type: "toggle-pin", ref: meeting },
      { type: "toggle-pin-menu", key: refKey(person) },
    ]);
    const sized = shellReducer(pinned, {
      type: "set-pin-size",
      key: refKey(person),
      size: "expanded",
    });
    expect(sized.pins[0]?.size).toBe("expanded");
    expect(sized.activePinMenuKey).toBeNull();

    const otherMenu = shellReducer(
      { ...pinned, activePinMenuKey: refKey(meeting) },
      { type: "set-pin-size", key: refKey(person), size: "tiny" },
    );
    expect(otherMenu.activePinMenuKey).toBe(refKey(meeting));
  });

  it("takes a new pin at the size the preferences ask for", () => {
    const state = run([
      { type: "set-default-pin-size", size: "tiny" },
      { type: "toggle-pin", ref: person },
    ]);
    expect(state.pins[0]?.size).toBe("tiny");
  });

  it("drops pins this world cannot resolve", () => {
    const pinned = run([
      { type: "toggle-pin", ref: person },
      { type: "toggle-pin", ref: bill },
    ]);
    const pruned = shellReducer(pinned, {
      type: "prune-pins",
      keep: [refKey(person)],
    });
    expect(pruned.pins.map((pin) => pin.key)).toEqual([refKey(person)]);
  });
});

describe("Escape", () => {
  it("closes exactly one layer, in stacking order", () => {
    let state = run([
      { type: "toggle-pin", ref: person },
      { type: "go-to-surface", surface: "people" },
      { type: "select-person", personId: ALICE },
      { type: "open-quick-dossier", personId: ALICE },
      { type: "toggle-pin-menu", key: refKey(person) },
    ]);

    state = shellReducer(state, { type: "escape" });
    expect(state.activePinMenuKey).toBeNull();
    expect(state.quickDossierPersonId).toBe(ALICE);

    state = shellReducer(state, { type: "escape" });
    expect(state.quickDossierPersonId).toBeNull();
    expect(activeView(state)).toEqual({ surface: "people" });

    state = shellReducer(state, { type: "escape" });
    expect(activeView(state)).toEqual({ surface: "scene" });
  });

  it("does nothing at the base of the room", () => {
    const state = shellReducer(INITIAL_SHELL_STATE, { type: "escape" });
    expect(state).toBe(INITIAL_SHELL_STATE);
  });
});

describe("preferences", () => {
  it("start at the documented defaults and are restored wholesale", () => {
    expect(INITIAL_SHELL_STATE.preferences).toEqual(DEFAULT_PREFERENCES);
    const restored = shellReducer(INITIAL_SHELL_STATE, {
      type: "restore",
      pins: [{ key: refKey(person), ref: person, size: "expanded" }],
      preferences: { peopleView: "list", defaultPinSize: "tiny" },
    });
    expect(restored.preferences.peopleView).toBe("list");
    expect(restored.pins).toHaveLength(1);
  });
});

describe("UI9 destinations", () => {
  it("keeps Who you are and Money and property apart", () => {
    // Both entries used to dispatch the identical view, so the second was a
    // second name for the first click rather than a destination.
    let state = shellReducer(INITIAL_SHELL_STATE, {
      type: "go-to-surface",
      surface: "personal",
      section: "identity",
    });
    expect(activeView(state)).toEqual({
      surface: "personal",
      section: "identity",
    });

    state = shellReducer(state, {
      type: "go-to-surface",
      surface: "personal",
      section: "finances",
    });
    expect(activeView(state)).toEqual({
      surface: "personal",
      section: "finances",
    });

    // And Back returns to the half they came from, not to the room.
    state = shellReducer(state, { type: "back" });
    expect(activeView(state)).toEqual({
      surface: "personal",
      section: "identity",
    });
  });

  it("pins a government as its own kind of reference", () => {
    const government = {
      kind: "government" as const,
      id: "lexington-fayette-urban-county-government",
    };
    expect(refKey(government)).toBe(
      "government:lexington-fayette-urban-county-government",
    );

    let state = shellReducer(INITIAL_SHELL_STATE, {
      type: "toggle-pin",
      ref: government,
    });
    expect(isPinned(state, government)).toBe(true);

    // It opens as an entity, so Back behaves as it does for every other pin.
    state = shellReducer(state, { type: "open-entity", ref: government });
    expect(activeView(state)).toEqual({ surface: "entity", ref: government });
    state = shellReducer(state, { type: "back" });
    expect(activeView(state)).toEqual({ surface: "scene" });

    // A person and a government with the same id string are different pins.
    const namesake = { kind: "person" as const, id: government.id as never };
    expect(sameRef(government, namesake)).toBe(false);
  });
});
