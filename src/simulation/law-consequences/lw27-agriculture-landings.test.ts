import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { createOrganization, createWorkRelationships } from "../life";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { lawExposuresOf } from "../law-exposure";
import { createLightweightPerson } from "../people";
import { createWorld, createWorldId } from "../world";
import type { World } from "../types";
import { applyLW27AgricultureWorkLanding } from "./lw27-agriculture-landings";

const DATE = makeIsoDate("2026-10-01");
const KEYS = lifePlaceStateIdentities().map((row) => row.jurisdictionKey);
const QUESTION_KEYS = [
  "us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal",
  "us-policy-positions:agriculture-natural-resources.protect-farmland-from-development",
];

function farmJob(placeKey: string) {
  const jurisdiction = stateJurisdictionForKey(placeKey)!;
  const seed = `lw27-generated-${placeKey}`;
  const person = createLightweightPerson({
    worldId: createWorldId(seed, "production"),
    worldSeed: seed,
    index: 0,
    currentDate: DATE,
    homeJurisdictionId: jurisdiction.id,
    birthplaceJurisdictionId: jurisdiction.id,
    profile: "production",
  });
  let world: World = createWorld({
    seed,
    currentDate: DATE,
    jurisdictions: [jurisdiction],
    people: [person],
    lineage: "production",
  });
  world = createOrganization(world, {
    stableKey: "generated-farm",
    formedAt: DATE,
    provenance: {
      kind: "authored",
      note: "Generated farm work route fixture.",
    },
    initialProfile: {
      name: "Farm",
      classification: "enterprise:agriculture",
      locationJurisdictionId: jurisdiction.id,
    },
  });
  const employerId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationships(world, [
    {
      stableKey: "generated-farm-job",
      personId: person.id,
      organizationId: employerId,
      startedAt: DATE,
      kind: "employment:agriculture",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: {
        kind: "authored",
        note: "Generated farm work route fixture.",
      },
      initialRole: {
        title: "Farm worker",
        occupationClassification: "occupation:farmworker",
        locationJurisdictionId: jurisdiction.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 40 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: jurisdiction.id,
        },
      },
    },
  ]);
  return {
    world,
    personId: person.id,
    relationshipId: world.history.workRelationships.at(-1)!.id,
    jurisdiction,
  };
}

describe("LW-27 agricultural work landings", () => {
  it.each(KEYS)("uses the same recorded farm-work route in %s", (placeKey) => {
    const { world, personId, relationshipId, jurisdiction } = farmJob(placeKey);
    const questions = Object.values(world.policyCatalog.propositions).filter(
      (row) => QUESTION_KEYS.includes(row.stableKey),
    );
    const effective = questions
      .map((question) => lawInForce(world, jurisdiction.id, question.id, DATE))
      .filter((law) => law?.answer === "yes");
    const landed = applyLW27AgricultureWorkLanding(world, relationshipId);
    expect(
      lawExposuresOf(landed, personId).map((row) => row.measureId),
    ).toEqual(effective.map((law) => law!.measureId));
    expect(
      lawExposuresOf(landed, personId).every(
        (row) =>
          row.channel === "job-rule" &&
          row.direction === "none" &&
          row.sourceRecordId === relationshipId,
      ),
    ).toBe(true);
    expect(applyLW27AgricultureWorkLanding(landed, relationshipId)).toBe(
      landed,
    );
  });
});
