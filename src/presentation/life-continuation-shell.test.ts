import { describe, expect, it } from "vitest";

import type { EntityId } from "../simulation";
import { assignLegacyJournal } from "./browser-shell-state";
import {
  isObserving,
  observerReadingLens,
  personalGoalActions,
  playedLifeContinuation,
  shellReadOnly,
  shellViewpointPersonId,
  surfaceOpenWhileReadOnly,
} from "./life-continuation-shell";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { observeWorld, retireFromPlay } from "./people-continuation";
import type { PrivateJournal } from "./shell-navigation";

function adultLife() {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "ui46-continuation-shell",
      startAge: 34,
    }),
  ).game!;
}

describe("the shell around an ended life", () => {
  it("stays writable for a living, played character", () => {
    const { world, playerPersonId } = adultLife();
    expect(shellReadOnly(world)).toBe(false);
    expect(isObserving(world)).toBe(false);
    expect(shellViewpointPersonId(world)).toBe(playerPersonId);
    expect(playedLifeContinuation(world)).toBeNull();
    expect(observerReadingLens(world)).toBe(world);
  });

  it("goes read-only on retirement and stays readable while observing", () => {
    const { world, playerPersonId } = adultLife();
    const retired = retireFromPlay(world, playerPersonId);
    expect(shellReadOnly(retired)).toBe(true);
    const view = playedLifeContinuation(retired);
    expect(view?.ended).toBe("retirement");
    expect(view?.recordPersonId).toBe(playerPersonId);

    const observed = observeWorld(retired, playerPersonId);
    expect(isObserving(observed)).toBe(true);
    expect(shellReadOnly(observed)).toBe(true);
    // Seen through the last life played, which can still be continued from.
    expect(shellViewpointPersonId(observed)).toBe(playerPersonId);
    expect(playedLifeContinuation(observed)?.predecessorId).toBe(
      playerPersonId,
    );
    const lens = observerReadingLens(observed);
    expect(lens.control).toEqual({ kind: "person", personId: playerPersonId });
    // The lens is a reading copy; the observed World itself is untouched.
    expect(observed.control).toEqual({ kind: "observer" });
    expect(lens.history).toBe(observed.history);
  });

  it("keeps only reading surfaces open while read-only", () => {
    for (const surface of ["people", "news", "journal", "government"] as const)
      expect(surfaceOpenWhileReadOnly(surface)).toBe(true);
    for (const surface of ["calendar", "work", "places", "personal"] as const)
      expect(surfaceOpenWhileReadOnly(surface)).toBe(false);
  });

  it("offers aim changes only from an open aim", () => {
    expect(personalGoalActions("active").map((a) => a.status)).toEqual([
      "paused",
      "achieved",
      "abandoned",
    ]);
    expect(personalGoalActions("paused").map((a) => a.status)).toEqual([
      "active",
      "abandoned",
    ]);
    expect(personalGoalActions("achieved")).toEqual([]);
    expect(personalGoalActions("abandoned")).toEqual([]);
  });
});

describe("private notebooks per played person", () => {
  const first = "person-first" as EntityId;
  const legacy: PrivateJournal = {
    ambition: "Win the seat",
    notes: [
      {
        id: "note-old",
        title: "Old",
        body: "Written before notebooks were per person",
        group: "",
        personId: null,
        eventKey: null,
      },
    ],
  };

  it("gives a slot-wide notebook to the save's original character", () => {
    const migrated = assignLegacyJournal({ journal: legacy }, first);
    expect(migrated.journals[first]).toEqual(legacy);
    expect(migrated.legacyJournal).toEqual({ ambition: "", notes: [] });
    // A successor has nothing of it.
    expect(migrated.journals["person-successor"]).toBeUndefined();
  });

  it("merges into a notebook that person already has, dropping nothing", () => {
    const existing: PrivateJournal = {
      ambition: "Keep the house",
      notes: [
        {
          id: "note-new",
          title: "New",
          body: "Written after",
          group: "",
          personId: null,
          eventKey: null,
        },
      ],
    };
    const migrated = assignLegacyJournal(
      { journal: legacy, journals: { [first]: existing } },
      first,
    );
    expect(migrated.journals[first]?.notes.map((note) => note.id)).toEqual([
      "note-new",
      "note-old",
    ]);
    expect(migrated.journals[first]?.ambition).toContain("Keep the house");
    expect(migrated.journals[first]?.ambition).toContain("Win the seat");
    // Reading it twice does not duplicate anything.
    const again = assignLegacyJournal(
      { journal: legacy, journals: migrated.journals },
      first,
    );
    expect(again.journals[first]?.notes).toHaveLength(2);
    expect(again.journals[first]?.ambition).toBe(
      migrated.journals[first]?.ambition,
    );
  });

  it("keeps a notebook it cannot place unassigned rather than dropping it", () => {
    const migrated = assignLegacyJournal({ journal: legacy }, null);
    expect(migrated.legacyJournal).toEqual(legacy);
    expect(migrated.journals).toEqual({});
  });

  it("leaves per-person notebooks alone when there is no old one", () => {
    const journals = { [first]: legacy };
    const migrated = assignLegacyJournal({ journals }, first);
    expect(migrated.journals).toBe(journals);
  });
});
