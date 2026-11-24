import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { residentsRuntime } from "./modules/residents";
import type { CoreState } from "./types";

// A layoff ends the job in the book that holds it. In this place a year used
// to stop on November 1, 2025: the business laid off a worker whose job row
// lived only in the counted books while the worker was already a full person,
// and the full-job ending threw. The place is the one that reproduced it
// (seed "s3", purpose "bg-chain"), named so a regression is found here. A
// household returning to the counts with a member only counted also threw
// "Absent person" here (fillInPerson, fixed with the returning-household
// change).
const place = drawPlace("s3", "bg-chain");

describe(`a layoff in ${place.name} (${place.key})`, () => {
  it("ends a counted job that belongs to a person filled in since, and the year runs", () => {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core as unknown as CoreState;
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    const rt = residentsRuntime(core)!;
    // The year ran to its end, and every counted job a layoff ended no longer
    // has a wage flow paying it (the job the layoff once reached, found by its
    // record id, is no longer in this place's evolution).
    expect(core.date).toBe(addDays(makeIsoDate(gameStartDate()), 365));
    const ended = [...rt.jobs.values()].filter((job) => job.endsAt);
    expect(ended.length, `${place.name}: jobs a layoff ended`).toBeGreaterThan(
      0,
    );
    for (const job of ended)
      expect(
        rt.wageFlowByJob.has(job.id),
        `${job.id}: its wage flow no longer pays it`,
      ).toBe(false);
  }, 600_000);
});
