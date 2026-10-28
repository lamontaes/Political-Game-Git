/**
 * Conscientiousness in the health engine, in a played world drawn from a seed:
 * the people with high and low conscientiousness in the same place and at the
 * same age differ in when strain crosses their line (mortality, Kern and
 * Friedman 2008) and in who holds the conditions behavior drives (Bogg and
 * Roberts 2004), while the number of people holding them stays what the
 * prevalence tables say.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../tests/golden-path/place";
import { setBookkeeping } from "../bookkeeping";
import { coreAPI } from "../state";
import { addDays, makeIsoDate } from "../kernel/dates";
import { HOUSING_STATUS_EVENT } from "../housing-homeless";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import {
  CONDITION_PACK,
  conditionPrevalence,
  startingConditionAssignments,
} from "../condition-pack";
import { parameter } from "../parameters";
import { worldRateFactor } from "../world-base-rates";
import { healthReport, DEFAULT_HEALTH_DATA } from "./health";
import type { CoreState } from "../types";

const SEED = process.env.HEALTH_TRAITS_SEED ?? "traits-health-test";
const TRAIT = DEFAULT_HEALTH_DATA.conscientiousnessTrait;
let core: CoreState;
let placeKey: string;

// Building a played world (every module, a drawn place) takes about fifteen
// seconds with play's settings (bookkeeping off, as the bench's year runs);
// the checks below read that one world.
let previousBookkeeping = true;
afterAll(() => {
  setBookkeeping(previousBookkeeping);
});
beforeAll(() => {
  previousBookkeeping = setBookkeeping(false);
  const start = gameStartDate();
  placeKey = drawPlace(SEED, "traits-health").key;
  core = buildBenchWorld(SEED, start, { twoLevel: true, placeKey }).core;
  const next = new Date(`${start}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 2);
  advanceCore(core, next.toISOString().slice(0, 10));
}, 90_000);

const ageYears = (birth: string, on: string) =>
  (Date.parse(on) - Date.parse(birth)) / (365.25 * 86_400_000);

describe("health reads conscientiousness", () => {
  it("puts behavior-driven conditions on the less conscientious, holding the same number", () => {
    const report = healthReport(core);
    const key = "substance-use-disorder";
    const counts = { hiHeld: 0, hi: 0, loHeld: 0, lo: 0 };
    // The opening's people, and what the same cells hold with personality off.
    const opening = [...core.people.values()].filter(
      (person) => person.alive && person.birthDate < core.startedAt,
    );
    const flat = startingConditionAssignments(
      opening.map((person) => ({
        personId: person.id,
        placeKey: person.placeId,
        age: ageYears(person.birthDate, core.startedAt),
        category: DEFAULT_HEALTH_DATA.calibrationCategory,
        monthlyHouseholdIncomeMinor: null,
      })),
      new Map(),
      worldRateFactor(SEED, "conditions"),
    );
    let expected = 0;
    let held = 0;
    for (const person of opening) {
      if (flat.get(person.id)?.includes(key)) expected += 1;
      const conditions = report.conditionsByPerson.get(person.id);
      if (!conditions) continue;
      const age = ageYears(person.birthDate, core.startedAt);
      const has = conditions.includes(key);
      if (has) held += 1;
      const level = person.traits[TRAIT];
      if (age < 18 || level === undefined || !Number.isInteger(level)) continue;
      if (level >= 1) {
        counts.hi += 1;
        if (has) counts.hiHeld += 1;
      } else if (level <= -1) {
        counts.lo += 1;
        if (has) counts.loHeld += 1;
      }
    }
    const odds = (a: number, n: number) => a / Math.max(n - a, 1);
    const ratio =
      odds(counts.loHeld, counts.lo) / odds(counts.hiHeld, counts.hi);
    // The slope the world shows, fitted over every adult with a level: each
    // one's log odds is their age's prevalence on that scale (the engine's
    // own), plus one intercept, plus the slope times their level. The two
    // groups' odds ratio above rests on the few adults at level -1 or below
    // (19 in this world), where one holder more or less halves or doubles it;
    // the fit reads all of them (Newton's method on the two terms).
    const condition = CONDITION_PACK.find((c) => c.key === key)!;
    const factor = worldRateFactor(SEED, "conditions");
    const rows: { base: number; level: number; has: number }[] = [];
    for (const person of opening) {
      const age = ageYears(person.birthDate, core.startedAt);
      const level = person.traits[TRAIT];
      const share = conditionPrevalence(
        condition,
        age,
        DEFAULT_HEALTH_DATA.calibrationCategory,
        factor,
      );
      if (age < 18 || level === undefined || !Number.isInteger(level)) continue;
      if (share <= 0 || share >= 1) continue;
      const has = report.conditionsByPerson.get(person.id)?.includes(key);
      rows.push({
        base: Math.log(share / (1 - share)),
        level,
        has: has ? 1 : 0,
      });
    }
    let intercept = 0;
    let fitted = 0;
    let error = Infinity;
    for (let step = 0; step < 25; step += 1) {
      let g0 = 0,
        g1 = 0,
        h00 = 0,
        h01 = 0,
        h11 = 0;
      for (const row of rows) {
        const p =
          1 / (1 + Math.exp(-(row.base + intercept + fitted * row.level)));
        const w = p * (1 - p);
        g0 += row.has - p;
        g1 += (row.has - p) * row.level;
        h00 += w;
        h01 += w * row.level;
        h11 += w * row.level * row.level;
      }
      const det = h00 * h11 - h01 * h01;
      intercept += (h11 * g0 - h01 * g1) / det;
      fitted += (h00 * g1 - h01 * g0) / det;
      error = Math.sqrt(h00 / det);
    }
    const researched = parameter(
      DEFAULT_HEALTH_DATA.behaviorConditions.find((c) => c.key === key)!
        .logOddsPerLevelParameter,
    );
    console.log(
      `place ${placeKey} seed ${SEED}: odds ratio low vs high ${ratio.toFixed(2)}, fitted slope ${fitted.toFixed(3)} (standard error ${error.toFixed(3)}) over ${rows.length} adults against ${researched}, held ${held} expected ${expected.toFixed(1)}`,
    );
    expect(rows.length).toBeGreaterThan(100);
    // The less conscientious hold it more, and the fitted slope sits within
    // three of its own standard errors of the researched one (Bogg and
    // Roberts 2004, -0.716 per level).
    expect(fitted).toBeLessThan(0);
    expect(Math.abs(fitted - researched)).toBeLessThan(3 * error);
    // Personality shifts who, not how many.
    expect(Math.abs(held - expected) / expected).toBeLessThan(0.05);
  });

  // Last: it turns every trait to its opposite in the shared world.
  it("books each person's onset of strain later when their conscientiousness is higher", () => {
    // The same people, the same resilience lines and conditions, with one
    // change: each person's conscientiousness is turned to its opposite and
    // the health engine re-books their onset (a housing change makes it read
    // their traits again). The shift per level is the engine's own reading.
    const report = healthReport(core);
    const before = new Map<string, { onset: string; level: number }>();
    for (const found of report.cases) {
      const person = core.people.get(found.personId);
      const level = person?.traits[TRAIT];
      if (!person?.alive || found.onsetEventId || !level) continue;
      if (!Number.isInteger(level)) continue;
      before.set(person.id, { onset: found.onsetDate, level });
    }
    const api = coreAPI(core);
    for (const id of before.keys()) {
      const person = core.people.get(id)!;
      api.updatePerson(id, {
        traits: { ...person.traits, [TRAIT]: -before.get(id)!.level },
      });
    }
    api.emit({
      id: "event:traits-health-test:rebook",
      date: core.date,
      kind: HOUSING_STATUS_EVENT,
      personIds: [...before.keys()],
      placeId: core.people.get([...before.keys()][0]!)!.placeId,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation:
          "A housing status unchanged, to make the engine re-book onsets.",
        estimatedFrom: "Test input.",
      },
      facts: { status: "housed" },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const after = healthReport(core);
    // Least squares through the origin: shift in years against the starting level.
    let cross = 0;
    let square = 0;
    let counted = 0;
    for (const [id, row] of before) {
      const found = after.cases.find((c) => c.personId === id);
      if (!found || found.onsetEventId) continue;
      const shift =
        ageYears(core.people.get(id)!.birthDate, found.onsetDate) -
        ageYears(core.people.get(id)!.birthDate, row.onset);
      cross += shift * row.level;
      square += row.level * row.level;
      counted += 1;
    }
    const perLevel = cross / square;
    // Flipping a level of c moves the log hazard by 2 c times the slope; at
    // an adult mortality doubling time of about eight years that is a shift
    // of 2 times the slope over ln 2 / 8 years per level, earlier for the
    // person whose level was positive.
    const slope = parameter(
      DEFAULT_HEALTH_DATA.hazardLogPerLevelParameter,
      core.data.parameters,
    );
    const predicted = (2 * slope) / (Math.LN2 / 8);
    console.log(
      `place ${placeKey} seed ${SEED}: ${counted} people re-booked, onset shift ${perLevel.toFixed(2)} years per level flipped, predicted ${predicted.toFixed(2)}`,
    );
    expect(counted).toBeGreaterThan(100);
    expect(perLevel).toBeLessThan(predicted * 0.5);
    expect(perLevel).toBeGreaterThan(predicted * 1.8);
  });
});
