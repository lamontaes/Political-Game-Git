import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { randomBytes, randomInt } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ageOnDate, addDays, daysBetween, makeIsoDate } from "../dates";
import { lifePlaces, stateJurisdictionForKey } from "../life-places";
import { createLightweightPerson } from "../people";
import { createProductionPolicyCatalog } from "../production-catalog";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../life";
import {
  createWorld,
  createWorldId,
  advanceWorld,
  writeWithWorldIntegrityOnce,
} from "../world";
import {
  healthCoverageRecords,
  medicaidCoverageDecision,
  recordHealthCoverage,
} from "../crisis/health-coverage";
import { deserializeWorld, serializeWorld } from "../serialization";
import { isLawEffectStamp } from "../law-effect-stamp";
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
import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import type { EntityId, World } from "../types";
import type { LawConsequenceRow } from "../law-consequence-types";
import { TEAM_8_COVERAGE_ELIGIBILITY as registration } from "./coverage-eligibility";

const EXPANSION =
  "us-policy-positions:health-human-services.expand-medicaid-eligibility";
const WORK =
  "us-policy-positions:health-human-services.medicaid-work-requirement";
const manifestPath = "test-results/team8/coverage-kind-random-places.json";
const places = lifePlaces().filter((place) => !!place.stateJurisdictionKey);
const manifest: { seed: string; placeKeys: string[] } = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : (() => {
      const keys = new Set<string>();
      while (keys.size < 5) keys.add(places[randomInt(places.length)]!.key);
      const value = {
        seed: randomBytes(16).toString("hex"),
        placeKeys: [...keys],
      };
      writeFileSync(manifestPath, JSON.stringify(value, null, 2));
      return value;
    })();

function row(selector: string): LawConsequenceRow {
  return {
    id: "coverage-kind:" + selector,
    kind: "coverage-eligibility",
    when: "effective",
    who: {
      selector,
      predicates: [
        { capability: "medicaid-recorded-household", parameters: {} },
      ],
    },
    what: "recompute-medicaid-coverage",
    decision: {
      op: "record",
      key: "medicaid-coverage-decision",
      type: "boolean",
    },
    conditions: [],
    lag: { days: 0, sourceIds: ["existing coverage activity"] },
    onRepeal: "recompute-prospective",
    evidence: {
      sourceIds: ["src/simulation/crisis/health-coverage.ts"],
      population: "actual supplied person",
      scope: "operative Medicaid eligibility",
      why: "Recompute actual eligibility and save only a coverage change.",
      uncertainty:
        "Existing model and authored legislative fixture, not natural passage or medical service delivery.",
    },
  };
}

function enact(
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
        "HB fixture " + (world.history.legislativeMeasures.length + 1),
      shortTitle: "Authored coverage fixture",
      summary:
        "Controlled legal change using actual procedure, not natural passage.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      sponsorPersonId: world.personOrder[0]!,
      propositionIds: [proposition.id],
      propositionAnswers: [{ propositionId: proposition.id, answer }],
    });
    const measure = world.history.legislativeMeasures.at(-1)!;
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
            {
              key: COMMITTEE_HEARING_TRANSITION_KEY,
              apply: committeeHearingTransitionHandler,
            },
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
          kind: "authored",
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
            kind: "authored",
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

describe("shared coverage eligibility kind", () => {
  it.each(manifest.placeKeys)(
    "changes a named person and survives canonical Save/Continue in %s",
    (placeKey) => {
      const place = places.find((candidate) => candidate.key === placeKey)!;
      const stateKey = place.stateJurisdictionKey!;
      const state = stateJurisdictionForKey(stateKey)!;
      const seed = "coverage-kind:" + manifest.seed + ":" + place.key;
      const date = makeIsoDate("2026-01-05");
      const person = Array.from({ length: 12 }, (_, index) =>
        createLightweightPerson({
          worldId: createWorldId(seed),
          worldSeed: seed,
          index,
          currentDate: date,
          homeJurisdictionId: place.context.jurisdiction.id,
        }),
      ).find(
        (candidate) =>
          ageOnDate(candidate.birthDate, date) >= 19 &&
          ageOnDate(candidate.birthDate, date) <= 64,
      )!;
      expect(person).toBeDefined();
      let world = createWorld({
        seed,
        currentDate: date,
        jurisdictions: [state, place.context.jurisdiction],
        people: [person],
        policyCatalog: createProductionPolicyCatalog(),
      });
      const provenance = {
        kind: "authored",
        note: "Controlled nonworking household, actual recorded member.",
      } as const;
      world = createHousehold(world, {
        stableKey: "coverage:household",
        formedAt: date,
        label: "Fixture household",
        provenance,
      });
      const household = world.history.households.at(-1)!;
      world = recordHouseholdLocation(world, {
        stableKey: "coverage:home",
        householdId: household.id,
        effectiveAt: date,
        jurisdictionId: place.context.jurisdiction.id,
        label: place.displayName,
        kind: "residence:fixture",
        provenance,
        supersedesLocationId: null,
      });
      world = startHouseholdMembership(world, {
        stableKey: "coverage:member",
        personId: person.id,
        householdId: household.id,
        startedAt: date,
        residenceRole: "primary",
        kind: "resident:fixture",
        provenance,
      });
      const cause = world.history.householdMemberships.at(-1)!.id;
      const rows = [
        row("medicaid-expansion-person"),
        row("medicaid-work-rule-person"),
      ];
      const settle = (input: World): World => {
        let next = input;
        for (const binding of rows) {
          const values = registration.resolve(next, binding, {
            onDate: next.currentDate,
            activity: "effective",
            activityId: cause,
            subjectIds: [person.id],
          });
          for (const value of values) {
            expect(value.value.type).toBe("boolean");
            next = registration.apply(next, value);
          }
        }
        return next;
      };
      if (!medicaidCoverageDecision(world, person.id).covered) {
        world = enact(world, stateKey, EXPANSION, "yes", "fixture-expansion");
        world = enact(
          world,
          stateKey,
          WORK,
          "no",
          "fixture-initial-work-repeal",
        );
      }
      world = settle(world);
      const initial = healthCoverageRecords(world).at(-1)!;
      expect(initial.personId).toBe(person.id);
      expect(initial.covered).toBe(true);
      expect(initial.lawEffectStamps!.every(isLawEffectStamp)).toBe(true);
      expect(initial.lawEffectStamps![0]!.sourceRecordIds).toContain(cause);
      expect(settle(world)).toBe(world);
      expect(recordHealthCoverage(world, world.currentDate, cause)).toBe(world);
      world = deserializeWorld(serializeWorld(world));
      expect(settle(world)).toBe(world);
      world = enact(
        { ...world, currentDate: addDays(world.currentDate, 1) },
        stateKey,
        WORK,
        "yes",
        "fixture-work",
      );
      world = settle(world);
      const lost = healthCoverageRecords(world).at(-1)!;
      expect(lost.covered).toBe(false);
      expect(lost.reasonKey).toBe("lost:work-requirement");
      expect(lost.lawEffectStamps![0]!.questionKey).toBe(WORK);
      world = enact(
        { ...world, currentDate: addDays(world.currentDate, 1) },
        stateKey,
        WORK,
        "no",
        "fixture-work-repeal",
      );
      world = settle(world);
      const restored = healthCoverageRecords(world).at(-1)!;
      expect(restored.covered).toBe(true);
      expect(restored.lawEffectStamps![0]!.questionKey).toBe(WORK);
      world = enact(
        { ...world, currentDate: addDays(world.currentDate, 1) },
        stateKey,
        EXPANSION,
        "no",
        "fixture-expansion-repeal",
      );
      world = settle(world);
      expect(healthCoverageRecords(world).at(-1)!.covered).toBe(false);
      expect(healthCoverageRecords(world)[0]).toEqual(initial);
      world = deserializeWorld(serializeWorld(world));
      expect(settle(world)).toBe(world);
      expect(healthCoverageRecords(world)).toHaveLength(4);
      appendFileSync(
        "test-results/team8/coverage-kind-proof.jsonl",
        JSON.stringify({
          seed,
          place: place.displayName,
          placeKey,
          stateKey,
          personId: person.id,
          name: person.givenName + " " + person.familyName,
          records: healthCoverageRecords(world),
        }) + "\n",
      );
      expect(() =>
        registration.resolve(
          world,
          {
            ...rows[0]!,
            who: { selector: "unsupported-assistance", predicates: [] },
          },
          {
            onDate: world.currentDate,
            activity: "effective",
            activityId: cause,
            subjectIds: [person.id],
          },
        ),
      ).toThrow(/Missing coverage-eligibility selector capability/);
    },
  );
});
