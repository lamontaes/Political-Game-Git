import { describe, expect, it } from "vitest";

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
