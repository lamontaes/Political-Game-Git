import { describe, expect, it, vi } from "vitest";

// Building a real World for the ordering proof below is the slow part.
vi.setConfig({ testTimeout: 120_000 });

import { compareSimulationMoments, type World } from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { submitTimeCommand } from "./time-command";
import {
  createWorldChangeGuard,
  nextTimeRequestId,
} from "./world-change-guard";

const world = (label: string) => ({ label }) as unknown as World;

describe("the player root's World change guard", () => {
  it("admits a change from the rendered World and a chained change from the same base", () => {
    const guard = createWorldChangeGuard();
    const shown = world("shown");
    guard.rendered(shown);
    expect(guard.admit(shown)).toBe(true);
    expect(guard.admit(shown)).toBe(true);
  });

  it("refuses a late change computed from an earlier World", () => {
    const guard = createWorldChangeGuard();
    const older = world("older");
    const newer = world("newer");
    guard.rendered(older);
    expect(guard.admit(older)).toBe(true);
    guard.rendered(newer);
    // A callback captured before the re-render cannot rewind or repeat time.
    expect(guard.admit(older)).toBe(false);
    expect(guard.admit(newer)).toBe(true);
  });

  /*
   * The ordering itself, in one test: commit a World, advance it through the
   * shared time command, commit that, and only then let a panel that still
   * holds the pre-advance World write.
   *
   * The two tests above each cover half of this. Read the guard as an
   * advance-only rule and it looks sound — no change can rewind the clock.
   * The hole is the other direction: the day the shared command advanced
   * resolved due items, scheduled activities and office matters in order,
   * and a panel rendered before that advance still holds the world as it was
   * an hour of play ago. Its edit carries an old moment with it, so
   * committing it would quietly undo everything the advanced day settled —
   * not by moving time backwards, which the guard would notice, but by
   * overwriting the World that moved. The guard refuses it on identity: the
   * base is not the committed World, whatever its date says. This is the
   * concrete risk another lane raised, and nothing here asserted it before.
   */
  it("refuses a panel's edit built before the shared time command advanced the day, and keeps the advanced World", () => {
    const built = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "crunch47-advance-then-stale-write",
      startAge: 34,
      placeKey: "lexington-fayette",
      gender: "male",
      pronouns: "he-him",
      questionnaire: "skipped",
    });
    const base = openOrdinaryLife(built.world, built.playerPersonId);

    const guard = createWorldChangeGuard();
    let committed: World = base;
    // The player root's one write path: a change lands only if admitted.
    const submit = (candidate: World, next: World): boolean => {
      if (!guard.admit(candidate)) return false;
      committed = next;
      return true;
    };

    // 1. The base World is committed and on screen.
    guard.rendered(committed);

    // 2. The shared time command advances it, correctly, and that lands.
    const moved = submitTimeCommand(base, {
      requestId: nextTimeRequestId(),
      personId: built.playerPersonId,
      sourceMoment: base.currentMoment,
      command: { kind: "days", days: 1 },
    });
    expect(moved.receipt.status).toBe("accepted");
    // Forward, through the one command — it may stop early for a commitment,
    // but it never fails to move and never moves back.
    expect(
      compareSimulationMoments(moved.world.currentMoment, base.currentMoment),
    ).toBeGreaterThan(0);
    expect(submit(base, moved.world)).toBe(true);
    const advanced = moved.world;
    expect(committed).toBe(advanced);
    guard.rendered(committed);

    // 3. A panel still holding the pre-advance World submits an edit from it.
    const staleEdit: World = { ...base };

    // 4. It is refused, and the advanced World is still what is committed:
    //    the stale write neither applies nor rolls the advanced day back.
    expect(submit(base, staleEdit)).toBe(false);
    expect(committed).toBe(advanced);
    expect(committed.currentMoment).toEqual(advanced.currentMoment);
    expect(
      compareSimulationMoments(committed.currentMoment, base.currentMoment),
    ).toBeGreaterThan(0);

    // 5. Positive control: the same edit built from the advanced World lands.
    const freshEdit: World = { ...advanced };
    expect(submit(advanced, freshEdit)).toBe(true);
    expect(committed).toBe(freshEdit);
  });

  it("refuses everything before a World is on screen", () => {
    const guard = createWorldChangeGuard();
    guard.rendered(null);
    expect(guard.admit(world("any"))).toBe(false);
  });
});
