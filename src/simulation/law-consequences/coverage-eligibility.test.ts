import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, makeIsoDate } from "../dates";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "../future-transitions";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { createLightweightPerson } from "../people";
import { createProductionPolicyCatalog } from "../production-catalog";
import { deserializeWorld, serializeWorld } from "../serialization";
import { STATES } from "../state-reference";
import { advanceWorld, createWorld, createWorldId } from "../world";
import {
  healthCoverageRecords,
  recordHealthCoverage,
  scheduleHealthCoveragePass,
} from "../crisis/health-coverage";
import { healthCoveragePassHandler } from "../crisis/health-coverage-pass";
import {
  COVERAGE_ELIGIBILITY_ROWS,
  applyCoverageEligibility,
  resolveCoverageEligibility,
} from "./coverage-eligibility";

describe("coverage kind reuses the existing saved-record writer", () => {
  it.each(Object.keys(STATES))(
    "matches the existing review in %s and survives Save/Continue",
    (usps) => {
      const state = stateJurisdictionForKey(`US-${usps}`)!;
      const date = makeIsoDate("2026-01-14");
      const reviewDate = addDays(date, 1);
      const seed = `coverage-kind-parity:${usps}`;
      const person = Array.from({ length: 12 }, (_, index) =>
        createLightweightPerson({
          worldId: createWorldId(seed),
          worldSeed: seed,
          index,
          currentDate: date,
          homeJurisdictionId: state.id,
        }),
      ).find(
        (p) =>
          ageOnDate(p.birthDate, date) >= 19 &&
          ageOnDate(p.birthDate, date) <= 64,
      )!;
      expect(person).toBeDefined();
      let world = createWorld({
        seed,
        currentDate: date,
        jurisdictions: [state],
        people: [person],
        policyCatalog: createProductionPolicyCatalog(),
      });
      const provenance = {
        kind: "authored",
        note: "Bounded nonworking household for existing-writer parity.",
      } as const;
      world = createHousehold(world, {
        stableKey: "fixture:household",
        formedAt: date,
        label: "Parity household",
        provenance,
      });
      const household = world.history.households.at(-1)!;
      world = recordHouseholdLocation(world, {
        stableKey: "fixture:home",
        householdId: household.id,
        effectiveAt: date,
        jurisdictionId: state.id,
        label: "Parity home",
        kind: "residence:fixture",
        provenance,
        supersedesLocationId: null,
      });
      world = startHouseholdMembership(world, {
        stableKey: "fixture:member",
        personId: person.id,
        householdId: household.id,
        startedAt: date,
        residenceRole: "primary",
        kind: "resident:fixture",
        provenance,
      });
      const membershipId = world.history.householdMemberships.at(-1)!.id;
      world = scheduleFutureDueItem(world, {
        stableKey: "fixture:coverage-review",
        dueAt: reviewDate,
        transitionKey: "crisis:health-coverage",
        entityIds: [person.id],
        jurisdictionId: state.id,
        provenance: { kind: "simulated", sourceEntityIds: [membershipId] },
      });
      const activityId = world.history.futureDueItems.at(-1)!.id;
      const before = serializeWorld(world);
      const legacy = advanceWorld(
        world,
        1,
        createFutureTransitionHandlerRegistry([
          ["crisis:health-coverage", healthCoveragePassHandler],
        ]),
      );
      const next = advanceWorld(
        world,
        1,
        createFutureTransitionHandlerRegistry([
          [
            "crisis:health-coverage",
            (input, item) => {
              let output = input;
              const beforeCount = healthCoverageRecords(input).length;
              for (const [questionKey, row] of Object.entries(
                COVERAGE_ELIGIBILITY_ROWS,
              )) {
                const inputs = resolveCoverageEligibility(output, row, {
                  onDate: item.dueAt,
                  activity: "renewal",
                  activityId: item.id,
                  subjectIds: item.entityIds.slice(),
                  questionKey,
                });
                for (const resolved of inputs)
                  output = applyCoverageEligibility(output, resolved);
              }
              const changed = healthCoverageRecords(output).slice(beforeCount);
              output = scheduleHealthCoveragePass(
                output,
                item.dueAt,
                output.id,
              );
              const gained = changed.filter((record) => record.covered).length;
              return {
                world: output,
                status: "resolved",
                reasonKey: "crisis:health-coverage",
                context: `${gained} gained coverage, ${changed.length - gained} lost it.`,
                outcomeEventId: null,
              };
            },
          ],
        ]),
      );
      expect(serializeWorld(world)).toBe(before);
      const records = healthCoverageRecords(next);
      expect(
        records.map((r) => ({
          id: r.id,
          personId: r.personId,
          covered: r.covered,
          reasonKey: r.reasonKey,
          basis: r.basis,
          hazardMultiplierMicros: r.hazardMultiplierMicros,
          hazardFrom: r.hazardFrom,
        })),
      ).toEqual(
        healthCoverageRecords(legacy).map((r) => ({
          id: r.id,
          personId: r.personId,
          covered: r.covered,
          reasonKey: r.reasonKey,
          basis: r.basis,
          hazardMultiplierMicros: r.hazardMultiplierMicros,
          hazardFrom: r.hazardFrom,
        })),
      );
      for (const record of records) {
        expect(record.personId).toBe(person.id);
        expect(record.causalParentIds).toEqual([activityId]);
        expect(record.lawEffectStamps?.[0]?.sourceRecordIds).toContain(
          activityId,
        );
        expect(record.lawEffectStamps?.[0]?.sourceRecordIds).toContain(
          membershipId,
        );
      }
      const continued = deserializeWorld(serializeWorld(next));
      for (const [questionKey, row] of Object.entries(
        COVERAGE_ELIGIBILITY_ROWS,
      ))
        expect(
          resolveCoverageEligibility(continued, row, {
            onDate: reviewDate,
            activity: "renewal",
            activityId,
            subjectIds: [person.id],
            questionKey,
          }),
        ).toEqual([]);
      expect(recordHealthCoverage(continued, reviewDate, activityId)).toBe(
        continued,
      );
      expect(healthCoverageRecords(continued)).toEqual(records);
    },
  );
  it("runs the same rule across all 56 jurisdictions", () =>
    expect(Object.keys(STATES)).toHaveLength(56));
});
