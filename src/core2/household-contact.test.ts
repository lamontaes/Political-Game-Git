/**
 * Household contact (SG-P8-household-shared-time-contact, resolved Oct 19,
 * 2026): people who share a home keep in touch through the same company need
 * and contact offers as everyone else. In the played world, after a quarter,
 * nearly every pair living together has met within a fortnight, in a place
 * drawn from all 56.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, daysBetween, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "household-contact");

describe(`household contact in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("people who live together have mostly met within a fortnight", () => {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    let date = makeIsoDate(gameStartDate());
    for (let day = 0; day < 90; day += 1) {
      date = addDays(date, 1);
      advanceCore(core, date);
    }
    let pairs = 0;
    let recent = 0;
    for (const household of core.households.values()) {
      const members = household.memberIds.filter(
        (id) => core.people.get(id)?.alive,
      );
      for (let i = 0; i < members.length; i += 1)
        for (let j = i + 1; j < members.length; j += 1) {
          pairs += 1;
          const last = core.relationships.get(
            [members[i]!, members[j]!].sort().join(":"),
          )?.lastContactDate;
          if (last && daysBetween(makeIsoDate(last), date) <= 14) recent += 1;
        }
    }
    expect(
      pairs,
      `${place.name}: household pairs (seed ${seed})`,
    ).toBeGreaterThan(0);
    expect(
      recent / pairs,
      `${place.name}: share of household pairs in contact within 14 days (seed ${seed})`,
    ).toBeGreaterThan(0.8);
  }, 900_000);
});
