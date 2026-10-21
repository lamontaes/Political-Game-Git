/**
 * The voting engine reads the outcome web's turnout factor for each voter by
 * their place and age, and leaves out the links the election laws already
 * act through (no law moves turnout twice). Played in the bench world in a
 * place drawn from all 56 on a seed nobody chose; the web's month row is
 * shifted in the record the engine reads, and the propensity the engine
 * kept is checked against it by record id.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { turnoutOn } from "./modules/voting";
import { propensityOf } from "./turnout";
import { ageOnElection } from "./turnout-web";
import { coreAPI } from "./state";

const seed = process.env.WEB_TURNOUT_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "web-turnout");

describe(`turnout and the outcome web (${place.name}, seed ${seed})`, () => {
  it("multiplies each voter's propensity by the links the laws do not already read", () => {
    const opening = gameStartDate();
    const world = buildBenchWorld(seed, opening, {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(world.core, addDays(makeIsoDate(opening), 5));
    const api = coreAPI(world.core);
    const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
    const rows = (months.rows() as unknown as WebMonth[]).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
    const row = rows.at(-1)!;
    expect(row).toBeTruthy();
    // The town's adults, in a spread of ages.
    const adults = [...world.core.people.values()]
      .filter(
        (p) =>
          p.placeId === row.placeId &&
          ageOnElection(p.birthDate, world.core.date) >= 18,
      )
      .sort((a, b) => a.birthDate.localeCompare(b.birthDate));
    expect(adults.length).toBeGreaterThan(5);
    const appeal = { a: { total: 1 }, b: { total: -1 } };

    // Shift the record: a redistricting effect (read by the engine) and an
    // all-mail effect (a law the law reach already applies, so left out).
    months.put({
      ...row,
      effects: {
        ...row.effects,
        "independent-redistricting-to-turnout": 0.05,
        "all-mail-voting-to-turnout": 0.2,
        "same-day-registration-to-youth-turnout": 0.13,
      },
    } as never);
    const seen: { age: number; factor: number; recordId: string }[] = [];
    for (const person of adults.filter((_, i) => i % 3 === 0).slice(0, 12)) {
      const t = turnoutOn(api, person, appeal);
      expect(t.web, person.id).toBeDefined();
      expect(t.web!.recordId).toBe(row.id);
      expect(t.web!.links).toEqual(["independent-redistricting-to-turnout"]);
      const factor = t.propensity / propensityOf(t);
      // Equal unless the propensity hit its ceiling of one.
      if (t.propensity < 1) expect(factor).toBeCloseTo(1.05, 9);
      seen.push({
        age: ageOnElection(person.birthDate, world.core.date),
        factor,
        recordId: t.web!.recordId,
      });
    }
    expect(seen.length).toBeGreaterThan(3);
    console.log(
      `web turnout: ${place.name}, seed ${seed}: record ${row.id}, factors ${seen.map((s) => `${s.age}:${s.factor.toFixed(3)}`).join(" ")}`,
    );
  }, 900_000);
});
