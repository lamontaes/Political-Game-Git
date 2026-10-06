import { describe, expect, it } from "vitest";
import { bindingFromIdentity } from "../../src/districts/query";
import { candidateQualificationRuleSet } from "../../src/simulation/candidate-qualification";
import { candidacyPacks } from "../../src/simulation/candidacy-packs";
import {
  completedMonthsBetween,
  makeIsoDate,
} from "../../src/simulation/dates";
import { districtResidenceSince } from "../../src/simulation/district-residence";
import { recordProspectRunChoice } from "../../src/simulation/election-candidate-prospect";
import { createOrganization } from "../../src/simulation/life";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { stateResidenceSince } from "../../src/simulation/nationwide-world/residence-duration";
import {
  prepareStateCandidateSlates,
  type StateCandidateSeatPlan,
} from "../../src/simulation/nationwide-world/state-legislature-candidates";
import {
  planStateChambers,
  STATE_LEGISLATURE_KEYS,
} from "../../src/simulation/nationwide-world/state-legislature-opening";
import {
  durationMonths,
  officeFamilyForChamberKey,
  officeQualifications,
  assessOfficeQualifications,
} from "../../src/simulation/office-qualification-rules";
import { SeededRng } from "../../src/simulation/rng";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import { smallWorld } from "../fixtures/small-world";
import { recordWorldEvent } from "../../src/simulation/world";

const SEED = "elections-a119-required-residence";
const intake = makeIsoDate("2028-02-29");
const identities = lifePlaceStateIdentities();
const watched = new SeededRng(SEED).pick(identities);

function fixture(jurisdictionKey: string, seed = SEED) {
  const pack = candidacyPacks().find(
    (row) =>
      row.jurisdictionKey === jurisdictionKey &&
      planStateChambers(row).chambers.length > 0,
  )!;
  expect(pack).toBeDefined();
  const { world: initial, stateJurisdictionId } = smallWorld({
    place: jurisdictionKey,
    date: intake,
    seed,
  });
  const world = createOrganization(initial, {
    stableKey: STATE_LEGISLATURE_KEYS.body(pack.packId),
    formedAt: intake,
    provenance: { kind: "generated", generatorKey: "a119-test" },
    initialProfile: {
      name: pack.displayName,
      classification: "custom:test-legislature",
      locationJurisdictionId: stateJurisdictionId,
    },
  });
  const plans: StateCandidateSeatPlan[] = planStateChambers(pack).chambers.map(
    (chamber) => {
      const office = pack.offices.find(
        (row) => row.officeKey === chamber.officeKey,
      )!;
      return {
        packId: pack.packId,
        jurisdictionKey,
        officeKey: chamber.officeKey,
        ordinal: 1,
        title: chamber.chamberName,
        minimumAge:
          office.qualification.minimumAge.kind === "known"
            ? office.qualification.minimumAge.value
            : 21,
        usesGeneratedResidencyRule: false,
        districtBinding: chamber.districts[0]
          ? bindingFromIdentity(chamber.districts[0])
          : null,
        democraticShare: null,
        incumbentPersonId: null,
        incumbentParty: null,
        incumbentSeeking: false,
        intakeDate: intake,
      };
    },
  );
  return {
    world,
    plans,
    result: prepareStateCandidateSlates(world, 2028, plans),
  };
}

function verifyRequiredResidence(jurisdictionKey: string, seed = SEED) {
  const { plans, result } = fixture(jurisdictionKey, seed);
  const backgrounds = result.history.events.filter(
    (event) => event.type === "life.fictional-candidate-residence-background",
  );
  expect(backgrounds).toHaveLength(plans.length);
  let measured = 0;
  for (const plan of plans) {
    const family = officeFamilyForChamberKey(
      plan.officeKey.split(":").at(-1)!,
    )!;
    const rows = officeQualifications(jurisdictionKey, family, intake);
    const background = backgrounds.find((event) =>
      event.stableKey.includes(`|${plan.officeKey}|${plan.ordinal}:`),
    )!;
    expect(background).toBeDefined();
    const personId = background.participants[0]!.personId;
    const stateSince = stateResidenceSince(
      result,
      personId,
      jurisdictionKey,
      intake,
    );
    const districtSince = plan.districtBinding
      ? districtResidenceSince(result, personId, plan.districtBinding, intake)
      : null;
    for (const field of ["STATE_RESIDENCE", "DISTRICT_RESIDENCE"] as const) {
      const ruleSet = candidateQualificationRuleSet(
        plan.packId,
        plan.officeKey,
        intake,
      );
      const ruleValue =
        field === "STATE_RESIDENCE"
          ? ruleSet?.stateResidenceYears
          : ruleSet?.districtResidenceYears;
      const required = rows
        .filter(
          (row) =>
            row.field === field &&
            row.sourceState === "KNOWN" &&
            row.temporalApplicability.state === "SUPPORTED",
        )
        .flatMap((row) => {
          const duration = durationMonths(row);
          return duration ? [duration.months] : [];
        });
      if (ruleValue?.state === "KNOWN") required.push(ruleValue.value * 12);
      if (
        !required.length ||
        (field === "DISTRICT_RESIDENCE" && !plan.districtBinding)
      )
        continue;
      const since = field === "STATE_RESIDENCE" ? stateSince : districtSince;
      expect(since).not.toBeNull();
      expect(completedMonthsBetween(since!, intake)).toBe(
        Math.max(...required),
      );
      measured++;
    }
    const assessments = assessOfficeQualifications({
      person: result.people[personId]!,
      stateJurisdictionKey: jurisdictionKey,
      officeFamily: family,
      onDate: intake,
      stateResidenceSince: stateSince,
      districtResidenceSince: districtSince,
    });
    expect(
      assessments.filter(
        (row) =>
          ["STATE_RESIDENCE", "DISTRICT_RESIDENCE"].includes(row.field) &&
          row.verdict === "fails",
      ),
    ).toEqual([]);
  }
  expect(prepareStateCandidateSlates(result, 2028, plans)).toBe(result);
  const saved = serializeWorld(result);
  const loaded = deserializeWorld(saved);
  expect(serializeWorld(prepareStateCandidateSlates(loaded, 2028, plans))).toBe(
    saved,
  );
  return measured;
}

describe("A119 invented candidates meet sourced residence at intake", () => {
  it(`lets recruited people decide from their lives in the watched place ${watched.name}, seed ${SEED}`, () => {
    const {
      world: base,
      personId,
      stateJurisdictionId,
    } = smallWorld({
      place: watched.jurisdictionKey,
      date: intake,
      seed: SEED,
    });
    const decide = (birthDate: string, key: string) => {
      let world = {
        ...base,
        people: {
          ...base.people,
          [personId]: (() => {
            const person = base.people[personId]!;
            const date = makeIsoDate(birthDate);
            return {
              ...person,
              birthDate: date,
              establishedFacts: person.establishedFacts.map((fact) =>
                fact.kind === "birth-date" || fact.kind === "birthplace"
                  ? { ...fact, occurredAt: date }
                  : fact,
              ),
            };
          })(),
        },
      };
      world = recordWorldEvent(world, {
        stableKey: `${key}:recruitment`,
        type: "election.state-legislative-recruitment",
        occurredAt: intake,
        recordedAt: world.currentDate,
        jurisdictionId: stateJurisdictionId,
        involvedEntityIds: [personId],
        participants: [{ personId, role: "focus:subject", detail: "prospect" }],
        personFactConstraints: [],
        visibility: "private",
        tags: [],
        summary: "A party asked this person to run.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      return recordProspectRunChoice({
        world,
        stableKey: key,
        decisionType: "election.consider-state-legislative-run",
        seatKey: "watched-seat",
        personId,
        intakeDate: intake,
        recruitmentEventId: world.history.events.at(-1)!.id,
        opportunity: 0.5,
        lowOpportunityShare: 0.18,
        termEnds: makeIsoDate("2035-01-01"),
      });
    };

    expect(decide("1970-06-15", "young-prospect").runs).toBe(true);
    const older = decide("1940-06-15", "older-prospect");
    expect(older.runs).toBe(false);
    expect(
      older.world.history.decisionTraces
        .at(-1)!
        .context.considerations.some(
          (consideration) => consideration.sourceType === "context:age",
        ),
    ).toBe(true);
  });

  it(`uses the actual producer in the watched place ${watched.name}, seed ${SEED}`, () => {
    expect(identities).toHaveLength(56);
    console.log(
      `A119 watched place: ${watched.name} (${watched.usps}), seed ${SEED}`,
    );
    verifyRequiredResidence(watched.jurisdictionKey);
  });

  it("meets every supported chamber duration, including months and leap-year boundaries", () => {
    let measured = 0;
    for (const identity of identities) {
      const pack = candidacyPacks().find(
        (row) =>
          row.jurisdictionKey === identity.jurisdictionKey &&
          planStateChambers(row).chambers.length > 0,
      );
      if (!pack) continue;
      const sourced = planStateChambers(pack).chambers.some((chamber) => {
        const family = officeFamilyForChamberKey(chamber.chamberKey);
        const rules = candidateQualificationRuleSet(
          pack.packId,
          chamber.officeKey,
          intake,
        );
        return (
          rules?.stateResidenceYears.state === "KNOWN" ||
          rules?.districtResidenceYears.state === "KNOWN" ||
          (family &&
            officeQualifications(identity.jurisdictionKey, family, intake).some(
              (row) =>
                ["STATE_RESIDENCE", "DISTRICT_RESIDENCE"].includes(row.field) &&
                row.sourceState === "KNOWN" &&
                row.temporalApplicability.state === "SUPPORTED" &&
                durationMonths(row) !== null,
            ))
        );
      });
      if (sourced)
        measured += verifyRequiredResidence(identity.jurisdictionKey);
    }
    expect(measured).toBeGreaterThan(0);
  });

  it("records unread requirements without drawing prior years", () => {
    const identity = identities.find((identity) => {
      const pack = candidacyPacks().find(
        (row) =>
          row.jurisdictionKey === identity.jurisdictionKey &&
          planStateChambers(row).chambers.length > 0,
      );
      return (
        pack &&
        planStateChambers(pack).chambers.every((chamber) => {
          const family = officeFamilyForChamberKey(chamber.chamberKey);
          const rules = candidateQualificationRuleSet(
            pack.packId,
            chamber.officeKey,
            intake,
          );
          return (
            rules?.stateResidenceYears.state !== "KNOWN" &&
            rules?.districtResidenceYears.state !== "KNOWN" &&
            family &&
            !officeQualifications(
              identity.jurisdictionKey,
              family,
              intake,
            ).some(
              (row) =>
                ["STATE_RESIDENCE", "DISTRICT_RESIDENCE"].includes(row.field) &&
                row.sourceState === "KNOWN" &&
                row.temporalApplicability.state === "SUPPORTED" &&
                durationMonths(row) !== null,
            )
          );
        })
      );
    })!;
    expect(identity).toBeDefined();
    for (const seed of [SEED, `${SEED}-other`]) {
      const { result } = fixture(identity.jurisdictionKey, seed);
      const backgrounds = result.history.events.filter(
        (event) =>
          event.type === "life.fictional-candidate-residence-background",
      );
      expect(backgrounds.length).toBeGreaterThan(0);
      for (const event of backgrounds) {
        expect(event.occurredAt).toBe(intake);
        expect(event.tags).toContain("state-residence-requirement:unknown");
        expect(
          event.tags.some((tag) => tag.startsWith("state-residence-since:")),
        ).toBe(false);
      }
    }
  });
});
