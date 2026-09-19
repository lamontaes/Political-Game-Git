import { describe, expect, it } from "vitest";

import {
  encodeStoredShellState,
  readStoredShellState,
} from "./browser-shell-state";
import {
  DEFAULT_PREFERENCES,
  INITIAL_SHELL_STATE,
  shellReducer,
} from "./shell-navigation";
import type { EntityId } from "../simulation";

const SLOT = "save-1" as EntityId;

/**
 * Learned terms are a saved presentation preference and are validated like
 * every other one: a record written before the Guide existed is a player who
 * has marked nothing, and a key no catalog resolves is dropped rather than
 * restored as an entry the Guide cannot open.
 */
describe("learned Guide terms as a stored preference", () => {
  it("reads a record written before the Guide as none marked", () => {
    const legacy = {
      saveId: SLOT,
      version: 4,
      pins: [],
      preferences: { peopleView: "list", defaultPinSize: "tiny" },
    };
    const read = readStoredShellState(legacy);
    expect(read?.preferences.learnedGuideTermKeys).toEqual([]);
    // The rest of that record is still restored exactly as it was.
    expect(read?.preferences.peopleView).toBe("list");
    expect(read?.preferences.defaultPinSize).toBe("tiny");
  });

  it("restores terms the catalog still has, and drops the rest", () => {
    const read = readStoredShellState({
      saveId: SLOT,
      version: 4,
      pins: [],
      preferences: {
        ...DEFAULT_PREFERENCES,
        learnedGuideTermKeys: [
          "quorum",
          "quorum",
          " veto ",
          "term-this-game-never-had",
          "",
          42,
        ],
      },
    });
    expect(read?.preferences.learnedGuideTermKeys).toEqual(["quorum", "veto"]);
  });

  it("survives the encode and read round trip", () => {
    const encoded = encodeStoredShellState(SLOT, {
      pins: [],
      preferences: {
        ...DEFAULT_PREFERENCES,
        learnedGuideTermKeys: ["presentment"],
      },
    });
    expect(
      readStoredShellState(encoded)?.preferences.learnedGuideTermKeys,
    ).toEqual(["presentment"]);
  });

  it("rejects a damaged value rather than guessing at it", () => {
    const read = readStoredShellState({
      saveId: SLOT,
      version: 4,
      pins: [],
      preferences: { learnedGuideTermKeys: "quorum" },
    });
    expect(read?.preferences.learnedGuideTermKeys).toEqual([]);
  });
});

describe("marking a term learned", () => {
  it("adds and removes a term without touching anything else", () => {
    const marked = shellReducer(INITIAL_SHELL_STATE, {
      type: "set-guide-term-learned",
      semanticKey: "quorum",
      learned: true,
    });
    expect(marked.preferences.learnedGuideTermKeys).toEqual(["quorum"]);
    expect(marked.announcement).toBe("Term marked as learned.");
    // Nothing else in the shell moved: no navigation, no pins, no journal.
    expect(marked.history).toEqual(INITIAL_SHELL_STATE.history);
    expect(marked.pins).toEqual(INITIAL_SHELL_STATE.pins);
    expect(marked.journal).toEqual(INITIAL_SHELL_STATE.journal);
    expect(marked.progress).toEqual(INITIAL_SHELL_STATE.progress);

    const cleared = shellReducer(marked, {
      type: "set-guide-term-learned",
      semanticKey: "quorum",
      learned: false,
    });
    expect(cleared.preferences.learnedGuideTermKeys).toEqual([]);
  });

  it("marks a term once, however many times it is pressed", () => {
    let state = INITIAL_SHELL_STATE;
    for (let index = 0; index < 3; index += 1) {
      state = shellReducer(state, {
        type: "set-guide-term-learned",
        semanticKey: "veto",
        learned: true,
      });
    }
    expect(state.preferences.learnedGuideTermKeys).toEqual(["veto"]);
  });

  it("ignores an empty key", () => {
    const state = shellReducer(INITIAL_SHELL_STATE, {
      type: "set-guide-term-learned",
      semanticKey: "  ",
      learned: true,
    });
    expect(state).toBe(INITIAL_SHELL_STATE);
  });
});

describe("the Guide as a destination", () => {
  it("is an ordinary surface the shell can open and come back from", () => {
    const opened = shellReducer(INITIAL_SHELL_STATE, {
      type: "go-to-surface",
      surface: "guide",
    });
    expect(opened.history[opened.history.length - 1]).toEqual({
      surface: "guide",
    });
    const back = shellReducer(opened, { type: "back" });
    expect(back.history[back.history.length - 1]).toEqual({
      surface: "scene",
    });
  });
});
