/**
 * A household with a member who died moves whole under its own id, and a
 * played year runs to its end (pool: core-relocation-job-held-intermittent).
 * The place and seed are the played year that once stopped on "A whole
 * household moves under its own id" (Dover, New Hampshire, PR 5149's
 * comments); a drawn place from all 56 runs beside it.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const PINNED = {
  key: "3318820",
  seed: "ee04c2985f301a47",
  name: "Dover, New Hampshire",
};
const drawn = drawPlace(
  `${process.env.RELOCATION_SEED ?? randomBytes(8).toString("hex")}:0`,
  "relocation-dead-member",
);

for (const place of [PINNED, drawn]) {
  it(`runs a played year; a household that kept a dead member on its roll and moved kept its id (${place.name}, ${place.key}, seed ${place.seed})`, () => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // Households with a dead member on the roll and a living one at the start.
    const before = new Map<string, { placeId: string; living: string[] }>();
    for (const household of core.households.values()) {
      const members = household.memberIds.map((id) => core.people.get(id)!);
      const living = members.filter((p) => p.alive);
      if (living.length && living.length < members.length)
        before.set(household.id, {
          placeId: household.placeId,
          living: living.map((p) => p.id),
        });
    }
    const start = core.date;
    advanceCore(core, addDays(makeIsoDate(start), 366));
    expect(core.date > start, `${place.name} ${place.seed}`).toBe(true);
    const moved = [...before].filter(
      ([id, was]) => core.households.get(id)?.placeId !== was.placeId,
    );
    console.log(
      `RELOCATION ${place.name} ${place.seed}: ${before.size} households with a dead member, moved whole: ${moved.map(([id, was]) => `${id} (${was.living.join(",")})`).join("; ") || "none"}`,
    );
    for (const [id, was] of moved) {
      const household = core.households.get(id)!;
      // Whoever moved is still on the household under its own id.
      for (const personId of was.living)
        if (core.people.get(personId)?.alive)
          expect(core.people.get(personId)!.householdId, personId).toBe(id);
      expect(household.id).toBe(id);
    }
  }, 3_000_000);
}
