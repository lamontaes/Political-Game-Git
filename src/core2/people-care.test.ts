import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { peopleData, peopleModules } from "../director/play-modules";
import { closenessBetween } from "./closeness";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, availableActs, createLifeCore } from "./life";
import { careNeedOf, healthReport } from "./modules/health";
import { parameter } from "./parameters";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState, PersonState } from "./types";

// A grown relative at home draws care from their health and the closeness of
// the tie (P15 part 2b), not only a child by age. A relative's care is traced
// to their health record: the conditions that set the need.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

const childYears = (core: CoreState) =>
  parameter("householdChildAgeYears", core.data.parameters);
const ageOf = (core: CoreState, person: PersonState) =>
  (Date.parse(`${core.date}T00:00:00Z`) -
    Date.parse(`${person.birthDate}T00:00:00Z`)) /
  (parameter("daysPerMeanYear", core.data.parameters) * 86_400_000);

/** Grown relatives living with a person, with the health need they bring. */
function grownKinAtHome(core: CoreState, actor: PersonState) {
  return [...actor.familyIds].flatMap((id) => {
    const kin = core.people.get(id);
    if (!kin?.alive || kin.householdId !== actor.householdId) return [];
    if (ageOf(core, kin) < childYears(core)) return [];
    return [{ kin, need: careNeedOf(core, id) }];
  });
}

describe("caring for a grown relative at home", () => {
  it("draws care from the relative's health, and the act is traced to their health record", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const place = drawPlace(seed, `people-care:${attempt}`);
      const core = createLifeCore(generatedOpening(place, { twoLevel: true }), {
        data: peopleData(),
        modules: peopleModules(),
      });
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      const where = `${place.name} (${place.key}), seed ${seed}`;
      tried.push(where);
      const pairs = [...core.people.values()]
        .filter((actor) => actor.alive && actor.tier !== "husk")
        .flatMap((actor) =>
          grownKinAtHome(core, actor).map((row) => ({ actor, ...row })),
        );
      const frail = pairs.filter(
        (row) =>
          row.need > 0 && closenessBetween(core, row.actor.id, row.kin.id) > 0,
      );
      const noChildAtHome = (actor: PersonState) =>
        [...actor.familyIds].every((id) => {
          const kin = core.people.get(id);
          return (
            !kin ||
            kin.householdId !== actor.householdId ||
            ageOf(core, kin) >= childYears(core)
          );
        });
      const carers = new Set(
        frail
          .filter((row) => noChildAtHome(row.actor))
          .map((row) => row.actor.id),
      );
      if (!carers.size) continue;

      // Care is offered for exactly the relatives whose health asks for it.
      for (const row of pairs) {
        const offered = availableActs(core, row.actor.id).some(
          (offer) =>
            offer.definition.effect === "care" && offer.targetId === row.kin.id,
        );
        const asks =
          row.need > 0 && closenessBetween(core, row.actor.id, row.kin.id) > 0;
        expect(
          offered,
          `${where}: care for ${row.kin.id} by ${row.actor.id} (need ${row.need})`,
        ).toBe(asks);
      }

      // The need traces to the relative's health record: a condition held, or
      // a serious illness begun.
      const report = healthReport(core);
      for (const row of frail) {
        const held = report.conditionsByPerson.get(row.kin.id) ?? [];
        const ill = report.cases.some(
          (found) => found.personId === row.kin.id && found.onsetEventId,
        );
        expect(
          held.length > 0 || ill,
          `${where}: ${row.kin.id} needs care with no condition or illness on record`,
        ).toBe(true);
      }

      // And they act on it: a person with a frail relative at home and no
      // child to care for still spends days caring, within two months.
      advanceCore(core, addDays(makeIsoDate(core.date), 60));
      let careActs = 0;
      for (const counter of core.actCounters.values())
        if (
          carers.has(counter.actorId) &&
          counter.actionId === "care-for-relative"
        )
          careActs += counter.count;
      expect(
        careActs,
        `${where}: care by ${[...carers].join(", ")}`,
      ).toBeGreaterThan(0);
      return;
    }
    throw new Error(
      `No relative at home needed care in ${tried.join("; ")}; draw more places.`,
    );
  }, 600_000);
});
