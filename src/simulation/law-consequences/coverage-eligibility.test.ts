import { drawLegislativeStartingProcedures } from "../legislative-starting-procedures";
import {
  authoredScenarioSeatCount,
  seatBodyForPack,
  dispositionsFromCounts,
} from "../legislation-scenarios";
import {
  introduceMeasure,
  referMeasure,
  scheduleCommitteeHearing,
  committeeHearingTransitionHandler,
  COMMITTEE_HEARING_TRANSITION_KEY,
  recordCommitteeDisposition,
  placeMeasureOnCalendar,
  takeFloorVote,
  transmitMeasure,
  enrollMeasure,
  presentMeasureToExecutive,
  recordExecutiveAction,
  recordEnactment,
  measurePosition,
} from "../legislation";
import type { World } from "../types";
import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, daysBetween, makeIsoDate } from "../dates";
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
import { applyLawConsequences } from "../enacted-law-effects";
import { deserializeWorld, serializeWorld } from "../serialization";
import { STATES } from "../state-reference";
import {
  advanceWorld,
  createWorld,
  createWorldId,
  writeWithWorldIntegrityOnce,
} from "../world";
import {
  healthCoverageRecords,
  recordHealthCoverage,
  scheduleHealthCoveragePass,
} from "../crisis/health-coverage";
import { healthCoveragePassHandler } from "../crisis/health-coverage-pass";
import {
  COVERAGE_ELIGIBILITY_ROWS,
  COVERAGE_ELIGIBILITY_REGISTRATION,
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
        policyCatalog: (() => {
          const catalog = createProductionPolicyCatalog();
          const propositions = { ...catalog.propositions };
          for (const id of catalog.propositionOrder) {
            const proposition = propositions[id]!;
            const row = COVERAGE_ELIGIBILITY_ROWS[proposition.stableKey];
            if (row) propositions[id] = { ...proposition, consequences: [row] };
          }
          return { ...catalog, propositions };
        })(),
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
                for (const resolved of inputs) {
                  expect(
                    resolveCoverageEligibility(output, row, {
                      onDate: item.dueAt,
                      activity: "renewal",
                      activityId: item.id,
                      subjectIds: [resolved.subject.id],
                      questionKey,
                      governingLawId: resolved.law.measureId,
                    }),
                  ).toContainEqual(resolved);
                  expect(
                    resolveCoverageEligibility(output, row, {
                      onDate: item.dueAt,
                      activity: "renewal",
                      activityId: item.id,
                      subjectIds: [resolved.subject.id],
                      questionKey,
                      governingLawId: input.id,
                    }),
                  ).toEqual([]);
                }
              }
              output = applyLawConsequences(
                output,
                {
                  onDate: item.dueAt,
                  activity: "renewal",
                  activityId: item.id,
                  subjectIds: item.entityIds.slice(),
                },
                [COVERAGE_ELIGIBILITY_REGISTRATION],
              );
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

function enactCoverageRule(
  input: World,
  stateKey: string,
  questionKey: string,
  answer: "yes" | "no",
  tag: string,
): World {
  return writeWithWorldIntegrityOnce(input, () => {
    let world = input;
    const state = stateJurisdictionForKey(stateKey)!;
    const procedure = drawLegislativeStartingProcedures(world)[stateKey];
    if (!procedure)
      throw new Error("Missing researched legislature capability: " + stateKey);
    const pack = procedure.baselinePack;
    const proposition = Object.values(world.policyCatalog!.propositions).find(
      (p) => p.stableKey === questionKey,
    )!;
    world = introduceMeasure(world, {
      stableKey: tag,
      jurisdictionId: state.id,
      rulePackId: pack.packId,
      designation:
        "HB " + ((world.history.legislativeMeasures?.length ?? 0) + 1),
      shortTitle: "Authored coverage fixture",
      summary:
        "Controlled legal change using actual procedure, not natural passage.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      sponsorPersonId: world.personOrder[0]!,
      propositionIds: [proposition.id],
      propositionAnswers: [{ propositionId: proposition.id, answer }],
    });
    const measure = world.history.legislativeMeasures?.at(-1);
    if (!measure)
      throw new Error("Canonical introduction did not write a measure.");
    for (const chamber of pack.chambers) {
      const seats = authoredScenarioSeatCount(pack, chamber.chamberKey);
      const body = seatBodyForPack(
        chamber.chamberKey,
        chamber.name,
        seats,
        [],
        false,
      );
      const committee = chamber.committees[0]!;
      world = referMeasure(world, {
        stableKey: tag + ":" + chamber.chamberKey + ":refer",
        measureId: measure.id,
        committeeKey: committee.committeeKey,
      });
      if (
        chamber.referral.everyMeasureMustBeHeard.kind === "known" &&
        chamber.referral.everyMeasureMustBeHeard.value
      ) {
        world = scheduleCommitteeHearing(world, {
          stableKey: tag + ":" + chamber.chamberKey + ":hear",
          measureId: measure.id,
          hearingDate: addDays(world.currentDate, 1),
        });
        world = advanceWorld(
          world,
          1,
          createFutureTransitionHandlerRegistry([
            [
              COMMITTEE_HEARING_TRANSITION_KEY,
              committeeHearingTransitionHandler,
            ],
          ]),
        );
      }
      const members = body.members.slice(0, committee.appointedMembers);
      world = recordCommitteeDisposition(world, {
        stableKey: tag + ":" + chamber.chamberKey + ":committee",
        measureId: measure.id,
        recommendation: "favorable",
        dispositions: dispositionsFromCounts(members, {
          yea: members.length,
          nay: 0,
        }),
        rationale: "Authored fixture vote.",
        provenance: {
          method: "authored-fixture",
          sourceEntityIds: [measure.id],
          note: "Controlled fixture, not an actor decision.",
        },
      });
      world = placeMeasureOnCalendar(world, {
        stableKey: tag + ":" + chamber.chamberKey + ":calendar",
        measureId: measure.id,
      });
      for (const stage of chamber.floorStages) {
        const date = measurePosition(world, measure.id).earliestNextFloorDate;
        if (date && date > world.currentDate)
          world = advanceWorld(
            world,
            daysBetween(world.currentDate, date),
            createFutureTransitionHandlerRegistry([]),
          );
        world = takeFloorVote(world, {
          stableKey: tag + ":" + chamber.chamberKey + ":" + stage.stageKey,
          measureId: measure.id,
          dispositions: dispositionsFromCounts(body.members, {
            yea: seats,
            nay: 0,
          }),
          presentMembers: seats,
          electedMembers: seats,
          provenance: {
            method: "authored-fixture",
            sourceEntityIds: [measure.id],
            note: "Controlled fixture, not an actor decision.",
          },
        });
      }
      if (measurePosition(world, measure.id).phase === "awaiting-transmittal")
        world = transmitMeasure(world, {
          stableKey: tag + ":transmit",
          measureId: measure.id,
        });
    }
    world = enrollMeasure(world, {
      stableKey: tag + ":enroll",
      measureId: measure.id,
    });
    world = presentMeasureToExecutive(world, {
      stableKey: tag + ":present",
      measureId: measure.id,
    });
    world = recordExecutiveAction(world, {
      stableKey: tag + ":sign",
      measureId: measure.id,
      action: "signed",
      rationale: "Authored fixture.",
    });
    return recordEnactment(world, {
      stableKey: tag + ":enact",
      measureId: measure.id,
      effectiveAt: world.currentDate,
    });
  });
}

describe("coverage kind canonical enacted authority", () => {
  it("filters by the actual enacted measure identity", () => {
    // Explicit controlled legislative scenario; no natural passage claimed.
    const stateKey = `US-${Object.keys(STATES)[0]!}`;
    const state = stateJurisdictionForKey(stateKey)!;
    const date = makeIsoDate("2026-01-05");
    const seed = "coverage-kind:canonical-enacted-authority";
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
    let world = createWorld({
      seed,
      currentDate: date,
      jurisdictions: [state],
      people: [person],
      policyCatalog: createProductionPolicyCatalog(),
    });
    const provenance = {
      kind: "authored",
      note: "Controlled household for enacted-authority test.",
    } as const;
    world = createHousehold(world, {
      stableKey: "identity:household",
      formedAt: date,
      label: "Identity household",
      provenance,
    });
    const household = world.history.households.at(-1)!;
    world = recordHouseholdLocation(world, {
      stableKey: "identity:home",
      householdId: household.id,
      effectiveAt: date,
      jurisdictionId: state.id,
      label: "Identity home",
      kind: "residence:fixture",
      provenance,
      supersedesLocationId: null,
    });
    world = startHouseholdMembership(world, {
      stableKey: "identity:member",
      personId: person.id,
      householdId: household.id,
      startedAt: date,
      residenceRole: "primary",
      kind: "resident:fixture",
      provenance,
    });
    const questionKey = Object.keys(COVERAGE_ELIGIBILITY_ROWS).find((key) =>
      key.endsWith("expand-medicaid-eligibility"),
    )!;
    world = enactCoverageRule(
      world,
      stateKey,
      questionKey,
      "yes",
      "identity:expansion",
    );
    const enactment = world.history.legislativeEnactments?.at(-1);
    if (!enactment)
      throw new Error("Canonical enactment did not write a record.");
    // Actual effective-law activity, not a fictional renewal/application.
    const row = {
      ...COVERAGE_ELIGIBILITY_ROWS[questionKey]!,
      when: "effective" as const,
    };
    const context = {
      onDate: world.currentDate,
      activity: "effective" as const,
      activityId: enactment.id,
      subjectIds: [person.id],
      questionKey,
      governingLawId: enactment.measureId,
    };
    const inputs = resolveCoverageEligibility(world, row, context);
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.law.origin).toBe("enacted");
    expect(inputs[0]!.law.measureId).toBe(enactment.measureId);
    expect(
      resolveCoverageEligibility(world, row, {
        ...context,
        governingLawId: enactment.id,
      }),
    ).toEqual([]);
    const continued = deserializeWorld(serializeWorld(world));
    expect(continued.history.legislativeEnactments?.at(-1)?.measureId).toBe(
      enactment.measureId,
    );
  });
});
