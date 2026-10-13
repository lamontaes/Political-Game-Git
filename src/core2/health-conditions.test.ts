import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import {
  CONDITION_PACK,
  conditionPrevalence,
} from "../simulation/crisis/condition-pack";
import { buildDeepPast } from "./deep-past";
import { advanceCore, createLifeCore } from "./life";
import { HEALTH_MODULE, healthReport } from "./modules/health";
import { buildPopulation } from "./population";
import type { CoreEventInput, CoreModule } from "./types";

// SG-P10-health-minimal-port, conditions during life: over a year in two
// drawn towns, chronic conditions begin as people age, at about the rise in
// the share of people their age who have them, only for people who did not
// have them, each heard by their family, and the illness course after it
// reads the new condition's weight.
const LIFELONG = CONDITION_PACK.filter(
  (row) =>
    !row.infant &&
    !row.childhood &&
    row.prevalence.length > 1 &&
    row.prevalence.at(-1)!.percent > row.prevalence[0]!.percent,
);
const towns = ["conditions-a", "conditions-b"].map((label) => {
  const place = drawPlace(
    process.env.GOLDEN_PATH_SEED ?? "health-conditions",
    label,
  );
  const input = buildDeepPast(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: "2021-01-01",
      minimumPeople: 800,
    }),
  );
  const events: CoreEventInput[] = [];
  const recorder: CoreModule = {
    id: "test-recorder",
    eventKinds: ["health.condition-began"],
    onEvent(_api, event) {
      events.push(event);
    },
  };
  const core = createLifeCore(input, { modules: [HEALTH_MODULE, recorder] });
  advanceCore(core, "2021-01-02");
  const before = new Map(
    [...healthReport(core).conditionsByPerson].map(([id, list]) => [
      id,
      [...list],
    ]),
  );
  // Expected: each person's rise in the share of their age with each condition.
  let expected = 0;
  for (const person of core.people.values()) {
    if (!person.alive) continue;
    const age = ageOnDate(
      makeIsoDate(person.birthDate),
      makeIsoDate("2021-01-01"),
    );
    for (const condition of LIFELONG)
      expected += Math.max(
        0,
        conditionPrevalence(condition, age + 1, "equal-mixture") -
          conditionPrevalence(condition, age, "equal-mixture"),
      );
  }
  advanceCore(core, "2022-01-01");
  return { place, core, events, before, expected };
});

describe(`conditions beginning during life in ${towns.map(({ place }) => `${place.name} (seed ${place.seed.slice(0, 12)})`).join(", ")}`, () => {
  it("begins chronic conditions at about the rise in their prevalence with age", () => {
    const begun = towns.reduce((sum, row) => sum + row.events.length, 0);
    const expected = towns.reduce((sum, row) => sum + row.expected, 0);
    expect(begun).toBeGreaterThan(0.5 * expected - 3 * Math.sqrt(expected));
    expect(begun).toBeLessThan(1.5 * expected + 3 * Math.sqrt(expected));
  });

  it("begins a condition only for someone who did not have it, heard by their family", () => {
    for (const { core, events, before } of towns)
      for (const event of events) {
        const [id] = event.personIds;
        const key = String(event.facts?.conditionKey);
        expect(before.get(id!) ?? []).not.toContain(key);
        expect(healthReport(core).conditionsByPerson.get(id!)).toContain(key);
        const person = core.people.get(id!)!;
        for (const kin of event.witnessIds ?? [])
          expect(
            person.familyIds.has(kin) ||
              core.households.get(person.householdId)!.memberIds.includes(kin),
          ).toBe(true);
      }
  });
});
