import { describe, expect, it } from "vitest";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
  createOrganization,
} from "../life";
import { ageOnDate, makeIsoDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { stateJurisdictionForKey } from "../life-places";
import { applyLawConsequences } from "../enacted-law-effects";
import { createLightweightPerson } from "../people";
import { createProductionPolicyCatalog } from "../production-catalog";
import { STATES } from "../state-reference";
import { createWorld, createWorldId, recordWorldEvent } from "../world";
import { isEligibleVoterIn } from "../issue-record";
import { townBusinesses } from "../living-world/town-businesses";
import { latestLawPermission } from "./permission-records";
import { RESTORE_VOTING_QUESTION_KEY } from "../justice/voting-standing";
import {
  PROSECUTION_SENTENCED_EVENT,
  SENTENCE_KIND_TAG,
  SENTENCE_MONTHS_TAG,
} from "../justice/jail-terms";

const CANNABIS_QUESTION_KEY =
  "us-policy-positions:business-commerce.legalize-cannabis-sales";
const DATE = makeIsoDate("2026-01-05");
const PROVENANCE = {
  kind: "authored" as const,
  note: "Controlled all-jurisdictions consequence reader fixture.",
};

function question(world: ReturnType<typeof createWorld>, stableKey: string) {
  return Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === stableKey,
  )!;
}

function fixture(usps: string) {
  const seed = `au2-wire-06-readers:${usps}`;
  const state = stateJurisdictionForKey(`US-${usps}`)!;
  let index = 0;
  let person = createLightweightPerson({
    worldId: createWorldId(seed),
    worldSeed: seed,
    index: index++,
    currentDate: DATE,
    homeJurisdictionId: state.id,
  });
  while (ageOnDate(person.birthDate, DATE) < 18 && index < 100)
    person = createLightweightPerson({
      worldId: createWorldId(seed),
      worldSeed: seed,
      index: index++,
      currentDate: DATE,
      homeJurisdictionId: state.id,
    });
  if (ageOnDate(person.birthDate, DATE) < 18)
    throw new Error("Could not seed an adult voter for the jurisdiction.");
  let world = createWorld({
    seed,
    currentDate: DATE,
    jurisdictions: [state],
    people: [person],
    policyCatalog: createProductionPolicyCatalog(),
  });
  world = createHousehold(world, {
    stableKey: `au2-wire-06:${usps}:home`,
    formedAt: DATE,
    label: "Recorded voter home",
    provenance: PROVENANCE,
  });
  const household = world.history.households.at(-1)!;
  world = recordHouseholdLocation(world, {
    stableKey: `au2-wire-06:${usps}:home-location`,
    householdId: household.id,
    effectiveAt: DATE,
    jurisdictionId: state.id,
    label: state.name,
    kind: "residence:primary",
    provenance: PROVENANCE,
    supersedesLocationId: null,
  });
  world = startHouseholdMembership(world, {
    stableKey: `au2-wire-06:${usps}:voter-member`,
    personId: person.id,
    householdId: household.id,
    startedAt: DATE,
    residenceRole: "primary",
    kind: "resident:fixture",
    provenance: PROVENANCE,
  });
  const sentencedAt = makeIsoDate("2024-01-05");
  world = recordWorldEvent(world, {
    stableKey: `au2-wire-06:${usps}:expired-felony`,
    type: PROSECUTION_SENTENCED_EVENT,
    occurredAt: sentencedAt,
    recordedAt: DATE,
    jurisdictionId: state.id,
    involvedEntityIds: [person.id],
    participants: [
      { personId: person.id, role: "focus:defendant", detail: null },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [`${SENTENCE_KIND_TAG}jail`, `${SENTENCE_MONTHS_TAG}18`],
    summary: "Controlled expired felony sentence.",
    context: {
      location: null,
      socialContext: "Controlled fixture",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world, person, state };
}

describe("the unused law readers across all 56 state and territory keys", () => {
  it("uses the stamped voting-rights and retail-license decisions", () => {
    expect(Object.keys(STATES)).toHaveLength(56);
    for (const usps of Object.keys(STATES).sort()) {
      const { world: start, person, state } = fixture(usps);
      const restore = question(start, RESTORE_VOTING_QUESTION_KEY);
      const restoreLaw = lawInForce(start, state.id, restore.id, DATE);
      const activity = recordWorldEvent(start, {
        stableKey: `au2-wire-06:${usps}:rights-effective`,
        type: "fixture.law-rights-effective",
        occurredAt: DATE,
        recordedAt: DATE,
        jurisdictionId: state.id,
        involvedEntityIds: [person.id],
        participants: [],
        personFactConstraints: [],
        visibility: "private",
        tags: ["fixture:law-effective"],
        summary: "Controlled rights-law effect activity.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const rights = applyLawConsequences(activity, {
        onDate: DATE,
        activity: "effective",
        activityId: activity.history.events.at(-1)!.id,
        subjectIds: [person.id],
        governingLawId: restoreLaw?.measureId,
        questionKey: RESTORE_VOTING_QUESTION_KEY,
      });
      const voterPermission = latestLawPermission(
        rights,
        { kind: "person", id: person.id },
        RESTORE_VOTING_QUESTION_KEY,
        DATE,
      );
      if (restoreLaw?.answer === "yes" || restoreLaw?.answer === "no") {
        expect(voterPermission?.status, usps).toBe(
          restoreLaw.answer === "yes" ? "permitted" : "prohibited",
        );
        expect(isEligibleVoterIn(rights, person.id, state.id, DATE), usps).toBe(
          restoreLaw.answer === "yes",
        );
      } else {
        expect(voterPermission, usps).toBeNull();
        expect(isEligibleVoterIn(rights, person.id, state.id, DATE), usps).toBe(
          false,
        );
      }

      const cannabis = question(rights, CANNABIS_QUESTION_KEY);
      const retail = createOrganization(rights, {
        stableKey: `town-employment-v1:${state.id}:employer:retail:0`,
        formedAt: DATE,
        provenance: PROVENANCE,
        initialProfile: {
          name: `${usps} fixture retail shop`,
          classification: "enterprise:retail",
          locationJurisdictionId: state.id,
        },
      });
      const retailer = retail.history.organizations.at(-1)!;
      const licensed = applyLawConsequences(retail, {
        onDate: DATE,
        activity: "application",
        activityId: retailer.id,
        subjectIds: [retailer.id],
        questionKey: CANNABIS_QUESTION_KEY,
      });
      const business = townBusinesses(licensed, state.id).find(
        (row) => row.organizationId === retailer.id,
      );
      expect(business, usps).toBeDefined();
      const cannabisLaw = lawInForce(licensed, state.id, cannabis.id, DATE);
      expect(business!.cannabisSalesLicensed, usps).toBe(
        cannabisLaw?.answer === "yes",
      );
    }
  });
});
