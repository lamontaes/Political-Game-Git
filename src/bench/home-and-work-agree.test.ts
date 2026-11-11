import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { workSpansOnDateV1 } from "../core2/work-spans-v1";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";
import { buildBenchWorld } from "./world";
import { homeOf, presentIds } from "./scene";
import { visitPlace } from "./places";
import { isOnShift } from "./shift";

// One reader says who is on a shift (shift.ts), and both rooms use it: a
// household member at their workplace on their shift is not also named in
// the kitchen at that minute (Nov 11 play: a father seen at the factory and
// at home at the same hour).
const ATTEMPTS = 8;

/** A worker on a shift at some minute of the date, in a household with someone else alive. */
function findCase(core: CoreState) {
  const api = coreAPI(core);
  for (const worker of core.people.values()) {
    if (!worker.alive || !worker.jobId) continue;
    const home = core.households.get(worker.householdId)?.memberIds ?? [];
    const at = home.find(
      (id) => id !== worker.id && core.people.get(id)?.alive === true,
    );
    if (!at) continue;
    let owners;
    try {
      owners = workSpansOnDateV1(api, {
        controlledPersonId: worker.id,
        date: core.date,
      }).owners;
    } catch {
      continue;
    }
    for (const owner of owners) {
      const span = owner.spans[0];
      if (!span || span.endMinute - span.startMinute < 2) continue;
      return {
        workerId: worker.id,
        atId: at,
        organizationId: owner.organizationId,
        minute: span.startMinute + 1,
        offMinute: span.endMinute + 1,
      };
    }
  }
  return null;
}

describe("home and workplace agree on who is on a shift", () => {
  it("leaves a household member on shift out of the kitchen and in the workplace", () => {
    const seed =
      process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
    setBookkeeping(false);
    const passed: string[] = [];
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const drawn = drawPlace(seed, `bench-home-and-work-${attempt}`);
      const world = buildBenchWorld(drawn.seed, gameStartDate(), {
        placeKey: drawn.key,
        twoLevel: true,
        settings: { population: 1500 },
      });
      const core = world.core;
      const found = findCase(core);
      const context = `${drawn.name}, seed ${seed}, attempt ${attempt}`;
      if (!found) {
        passed.push(`${drawn.name} (no worker on a shift that date)`);
        continue;
      }
      const { workerId, atId, organizationId, minute, offMinute } = found;
      expect(isOnShift(core, workerId, minute, organizationId), context).toBe(
        true,
      );
      const homePlace = homeOf(core, atId, minute);
      // At home at that minute the worker is left out...
      expect(
        presentIds(core, atId, homePlace, "at home", undefined, minute),
        `${context}: the worker is not in the kitchen on shift`,
      ).not.toContain(workerId);
      // ...the opening evening keeps the whole household...
      expect(
        presentIds(core, atId, homePlace, "at home"),
        `${context}: the opening evening keeps the whole household`,
      ).toContain(workerId);
      // ...off shift they are home again...
      if (!isOnShift(core, workerId, offMinute))
        expect(
          presentIds(core, atId, homePlace, "at home", undefined, offMinute),
          `${context}: off shift they are at home`,
        ).toContain(workerId);
      // ...and the workplace visit names them at the same minute.
      let visited: string[] | null = null;
      try {
        visited = Object.keys(
          visitPlace(core, atId, organizationId, minute).names,
        );
      } catch {
        // The workplace has no picture: nothing to visit, try another place.
      }
      if (visited === null) {
        passed.push(`${drawn.name} (its workplace has no picture)`);
        continue;
      }
      expect(visited, `${context}: the workplace names them`).toContain(
        workerId,
      );
      return;
    }
    throw new Error(
      `seed ${seed}: no drawn place gave a worker in a household with a pictured workplace; passed over: ${passed.join("; ")}`,
    );
  });
});
