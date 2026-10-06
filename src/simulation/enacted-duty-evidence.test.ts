import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { US_CONGRESS_PACK_ID } from "./congress-rule-pack";
import {
  enactedDutiesOf,
  settleEnactedDuty,
  writeDutyRecord,
} from "./enacted-duties";
import { createOrganization, createWorkRelationship } from "./life";
import { lifePlaceStateIdentities, searchLifePlaces } from "./life-places";
import { introduceMeasure } from "./legislation";
import { recordFiledProvision } from "./legislative-politics";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import { personName } from "./people";
import { SeededRng } from "./rng";
import { deserializeWorld, serializeWorld } from "./serialization";
import type {
  EnactedDutyCoverage,
  EnactedDutyRuleRecord,
  EntityId,
  World,
} from "./types";

// Canonical saved-duty fixtures test settlement, not passage or delivery of a law.
const seed = "A97-staffing-is-not-performance";
const state = new SeededRng(seed).pick(lifePlaceStateIdentities());
const place = searchLifePlaces("", 1, {
  stateJurisdictionKey: state.jurisdictionKey,
})[0]!;
let world: World;
let measureId: EntityId;
let provisionId: EntityId;
let staffedId: EntityId;
let emptyId: EntityId;
let unplacedId: EntityId;
let operatorId: EntityId;
let duty: EnactedDutyRuleRecord;
const authored = {
  kind: "authored" as const,
  note: "Supplied A97 duty fixture, not a naturally enacted or fulfilled law.",
};
function addBody(at: World, key: string, location: EntityId | null) {
  const next = createOrganization(at, {
    stableKey: `a97:body:${key}`,
    formedAt: at.currentDate,
    provenance: authored,
    initialProfile: {
      name: `${key} Utility`,
      classification: "enterprise:utility",
      locationJurisdictionId: location,
    },
  });
  return { world: next, id: next.history.organizations.at(-1)!.id };
}
function addDuty(at: World, key: string, coverage: EnactedDutyCoverage) {
  return writeDutyRecord(
    at,
    key,
    {
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      involved: [measureId],
      summary: "Supplied continuity-plan duty for the evidence guard.",
    },
    {
      kind: "duty",
      measureId,
      provisionId,
      provisionKey: "continuity-plan",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      heading: "Continuity plan",
      coverage,
      operativeAt: at.currentDate,
      complyBy: at.currentDate,
      enforcerLabel: null,
      penaltyLabel: null,
    },
  );
}
beforeAll(() => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  world = ensureNationalElectionJurisdiction(game.world);
  operatorId = game.playerPersonId;
  world = introduceMeasure(world, {
    stableKey: "a97:supplied-duty-measure",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: US_CONGRESS_PACK_ID,
    designation: "Supplied A97 Bill",
    shortTitle: "Continuity plans",
    summary: "Saved section identity for a controlled settlement test.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: null,
    originChamberKey: "house",
  });
  measureId = world.history.legislativeMeasures!.at(-1)!.id;
  world = recordFiledProvision(world, {
    stableKey: "a97:continuity-plan",
    measureId,
    provisionKey: "continuity-plan",
    sectionNumber: 1,
    heading: "Continuity plan",
    text: "Each utility shall file a continuity plan.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "each utility",
    },
    applicationScope: {
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      segmentKey: null,
    },
  });
  provisionId = world.history.legislativeProvisions!.at(-1)!.id;
  const staffed = addBody(
    world,
    "Staffed",
    game.world.people[operatorId]!.homeJurisdictionId,
  );
  const empty = addBody(
    staffed.world,
    "Unstaffed",
    game.world.people[operatorId]!.homeJurisdictionId,
  );
  const unplaced = addBody(empty.world, "Unplaced", null);
  staffedId = staffed.id;
  emptyId = empty.id;
  unplacedId = unplaced.id;
  world = createWorkRelationship(unplaced.world, {
    stableKey: "a97:operator",
    personId: operatorId,
    organizationId: staffedId,
    startedAt: world.currentDate,
    kind: "employment:duty-fixture",
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: authored,
    initialRole: {
      title: "Utility operator",
      occupationClassification: null,
      locationJurisdictionId: world.people[operatorId]!.homeJurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 40 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: world.people[operatorId]!.homeJurisdictionId,
      },
    },
  });
  const written = addDuty(world, "a97:duty", {
    kind: "classes",
    classifications: ["enterprise:utility"],
    coveredLabel: "each utility",
  });
  world = written.world;
  duty = written.record as EnactedDutyRuleRecord;
});

describe("A97 duty settlement requires fulfillment evidence", () => {
  it("keeps a body with workers open when it has no filing, report or service record", () => {
    expect(
      world.history.workRelationships.some(
        (relationship) =>
          relationship.organizationId === staffedId &&
          relationship.personId === operatorId,
      ),
    ).toBe(true);
    expect(enactedDutiesOf(world, measureId)[0]!.findings).toHaveLength(0);

    const next = settleEnactedDuty(world, duty.id);
    const findings = enactedDutiesOf(next, measureId)[0]!.findings;
    expect(
      findings.find((row) => row.organizationId === staffedId),
    ).toMatchObject({ outcome: "compliance-unknown", basis: "unknown" });
    expect(
      findings.find((row) => row.organizationId === emptyId),
    ).toMatchObject({ outcome: "compliance-unknown", basis: "unknown" });
    expect(findings.filter((row) => row.outcome === "complied")).toHaveLength(
      0,
    );
    expect(
      findings.find((row) => row.organizationId === staffedId)!.reason,
    ).toContain("No qualifying fulfillment record");
    console.info(
      "A97 evidence receipt",
      JSON.stringify({
        seed,
        state: state.jurisdictionKey,
        place: place.displayName,
        operator: personName(world.people[operatorId]!),
        dutyId: duty.id,
        staffedId,
        coveredBodies: findings.filter(
          (row) => row.outcome !== "coverage-unknown",
        ).length,
        complied: findings.filter((row) => row.outcome === "complied").length,
        complianceUnknown: findings.filter(
          (row) => row.outcome === "compliance-unknown",
        ).length,
        coverageUnknown: findings.filter(
          (row) => row.outcome === "coverage-unknown",
        ).length,
        fixture:
          "canonical supplied duty, no natural enactment or positive completion claim",
      }),
    );
  });
  it("retains unknown coverage for an unplaced body and unrecorded applicability test", () => {
    const ordinary = settleEnactedDuty(world, duty.id);
    expect(
      enactedDutiesOf(ordinary, measureId)[0]!.findings.find(
        (row) => row.organizationId === unplacedId,
      ),
    ).toMatchObject({ outcome: "coverage-unknown", basis: "unknown" });
    const written = addDuty(world, "a97:unknown-coverage", {
      kind: "unrecorded-test",
      classifications: ["enterprise:utility"],
      coveredLabel: "qualifying utilities",
      testLabel: "its number of customers",
      researchQuestionId: "test:missing-customer-count",
    });
    const next = settleEnactedDuty(written.world, written.record.id);
    expect(
      enactedDutiesOf(next, measureId)
        .find((row) => row.duty.id === written.record.id)!
        .findings.every(
          (row) =>
            row.outcome === "coverage-unknown" && row.basis === "unknown",
        ),
    ).toBe(true);
  });
  it("preserves findings and paired event IDs through repeat and canonical Continue", () => {
    const next = settleEnactedDuty(world, duty.id);
    const loaded = deserializeWorld(serializeWorld(next));
    expect(enactedDutiesOf(loaded, measureId)).toEqual(
      enactedDutiesOf(next, measureId),
    );
    expect(settleEnactedDuty(next, duty.id)).toBe(next);
    expect(settleEnactedDuty(loaded, duty.id)).toBe(loaded);
    expect(serializeWorld(loaded)).toBe(serializeWorld(next));
  });
  it("leaves legacy game-profile findings unchanged rather than rewriting saved history", () => {
    const legacy = writeDutyRecord(
      world,
      `${duty.stableKey}:finding:${staffedId}`,
      {
        jurisdictionId: duty.jurisdictionId,
        involved: [measureId, staffedId],
        summary: "Supplied legacy game-profile finding.",
      },
      {
        kind: "finding",
        dutyId: duty.id,
        organizationId: staffedId,
        outcome: "complied",
        basis: "game-profile",
        researchQuestionId: "legacy:staffed-body",
        reason:
          "Legacy supplied staffing-based finding, not proof of actual fulfillment.",
      },
    );
    const next = settleEnactedDuty(legacy.world, duty.id);
    expect(
      enactedDutiesOf(next, measureId)[0]!.findings.find(
        (row) => row.organizationId === staffedId,
      ),
    ).toEqual(legacy.record);
    const loaded = deserializeWorld(serializeWorld(next));
    expect(
      enactedDutiesOf(loaded, measureId)[0]!.findings.find(
        (row) => row.organizationId === staffedId,
      ),
    ).toEqual(legacy.record);
  });
});
