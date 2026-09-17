import { describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 120_000 });

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { DEFAULT_INTERRUPTIONS } from "../presentation/shell-navigation";
import type { World } from "../simulation";
import {
  createTimeCommandCore,
  type TimeCommandReport,
  type TimeCommandTarget,
} from "./time-command-runner";

function adultLife() {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "ui46-time-runner",
    startAge: 34,
    placeKey: "lexington-fayette",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  return {
    world: openOrdinaryLife(built.world, built.playerPersonId),
    personId: built.playerPersonId,
  };
}

function harness() {
  const life = adultLife();
  const queue: (() => void)[] = [];
  const pending: boolean[] = [];
  const committed: World[] = [];
  let target: TimeCommandTarget = {
    world: life.world,
    personId: life.personId,
    interruptions: DEFAULT_INTERRUPTIONS,
    onWorldChange: (world) => {
      committed.push(world);
      target = { ...target, world };
    },
  };
  const core = createTimeCommandCore({
    latest: () => target,
    setPending: (value) => pending.push(value),
    defer: (work) => queue.push(work),
  });
  return {
    life,
    core,
    queue,
    pending,
    committed,
    setWorld: (world: World) => (target = { ...target, world }),
  };
}

describe("the shell's time runner", () => {
  it("marks controls busy before the command runs, then submits once", () => {
    const h = harness();
    const reports: TimeCommandReport[] = [];
    h.core.submit({ kind: "days", days: 1 }, (r) => reports.push(r));
    h.core.submit({ kind: "days", days: 1 }, (r) => reports.push(r));
    expect(h.pending).toEqual([true]);
    expect(h.queue).toHaveLength(1);
    expect(h.committed).toHaveLength(0);
    h.queue.shift()!();
    expect(h.pending).toEqual([true, false]);
    expect(h.committed).toHaveLength(1);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.status).toBe("accepted");
    expect(reports[0]!.target?.minuteOfDay).toBe(7 * 60);
    expect(h.committed[0]!.currentDate > h.life.world.currentDate).toBe(true);
  });

  it("lets the command refuse a click drawn from an older moment", () => {
    const h = harness();
    const reports: TimeCommandReport[] = [];
    h.core.submit({ kind: "days", days: 1 }, (r) => reports.push(r));
    // Another writer moved the clock before the deferred work ran.
    h.setWorld({
      ...h.life.world,
      currentMoment: { ...h.life.world.currentMoment, minuteOfDay: 1 },
    });
    h.queue.shift()!();
    expect(reports[0]!.status).toBe("stale");
    expect(h.committed).toHaveLength(0);
  });

  it("runs attending under the same busy state and refuses stale worlds", () => {
    const h = harness();
    const reports: TimeCommandReport[] = [];
    h.core.perform(
      (world) => ({ world, outcome: "nothing changed" }),
      (r) => reports.push(r),
    );
    h.core.submit({ kind: "days", days: 1 });
    expect(h.queue).toHaveLength(1);
    h.queue.shift()!();
    expect(reports[0]).toMatchObject({
      status: "accepted",
      outcome: "nothing changed",
    });
    expect(h.pending).toEqual([true, false]);
  });

  it("reports a thrown advance and releases the controls", () => {
    const h = harness();
    const reports: TimeCommandReport[] = [];
    h.core.perform(
      () => {
        throw new Error("Time could not reach that commitment.");
      },
      (r) => reports.push(r),
    );
    h.queue.shift()!();
    expect(reports[0]).toMatchObject({ status: "failed" });
    expect(h.pending).toEqual([true, false]);
  });
});
