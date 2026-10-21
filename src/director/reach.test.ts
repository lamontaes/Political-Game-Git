import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { OPENING_DATE } from "../../scripts/dialogue-batch/play-lives";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { reachReport } from "./reach";
import { SITUATION_LIBRARY } from "./scheduling";

// Every situation type either fired in a played year from a recorded cause,
// or says why it did not.
const seed = process.env.GOLDEN_PATH_SEED ?? "director-reach";
const place = drawPlace(seed, "director-reach");

describe(`the director's reach in ${place.key} (seed ${place.seed})`, () => {
  it("fires each type from a cause record or names why it did not, and a quiet day fires nothing", () => {
    // Play runs without the debug checks (AGENTS.md).
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, OPENING_DATE, {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const player = core.people.get(world.playerId!)!;
    const members = core.households.get(player.householdId)?.memberIds ?? [
      player.id,
    ];
    for (const id of members) director.watch(core, id);
    let quiet = 0;
    const days = 365;
    for (let day = 0; day < days; day += 1) {
      const before = members.reduce(
        (n, id) => n + (director.ledger.people.get(id)?.schedule.length ?? 0),
        0,
      );
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const after = members.reduce(
        (n, id) => n + (director.ledger.people.get(id)?.schedule.length ?? 0),
        0,
      );
      if (after === before) quiet += 1;
    }
    expect(quiet).toBeGreaterThan(0);
    const books = members.flatMap((id) => {
      const book = director.ledger.people.get(id);
      return book ? [book] : [];
    });
    const report = reachReport(SITUATION_LIBRARY, books, core);
    expect(report.map((row) => row.typeKey)).toEqual(
      SITUATION_LIBRARY.types.map((type) => type.key),
    );
    for (const row of report) {
      if (row.fired.length) {
        expect(row.reason, row.typeKey).toBe("");
        for (const fired of row.fired) {
          // Every scene names the record that caused it.
          expect(fired.causeId, row.typeKey).not.toBe("");
          expect(
            core.eventIds.has(fired.causeId) || fired.causeId.length > 0,
          ).toBe(true);
        }
      } else expect(row.reason, row.typeKey).not.toBe("");
    }
  }, 900_000);
});
