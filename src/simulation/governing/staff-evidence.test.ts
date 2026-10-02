import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "../demo";
import { createOrganization, createWorkRelationship } from "../life";
import { workRelationshipHistoryForPerson } from "../life-queries";
import {
  lifePlaceStateIdentities,
  requireLifePlace,
  searchLifePlaces,
} from "../life-places";
import { makeIsoDate } from "../dates";
import { ensureStateExecutiveIncumbent } from "../nationwide-world/state-executives";
import { personName } from "../people";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { createCandidates, currentGoverningOffices } from "./state-governing";
import {
  staffAssessment,
  staffCareerEvidence,
  staffKnowsLegislature,
} from "./staff-evidence";

const seed = "A93-staff-record-evidence";
const state = new SeededRng(seed).pick(lifePlaceStateIdentities());
const place = searchLifePlaces("", 1, {
  stateJurisdictionKey: state.jurisdictionKey,
  scope: "locality",
})[0]!;

function openingWorld(suffix: string) {
  return createScenarioWorld(`${seed}:${suffix}`, place.context);
}

describe("A93: a staff assessment reads the actual record", () => {
  it("uses the same absence-of-evidence rule in all 56 starting jurisdictions", () => {
    const identities = lifePlaceStateIdentities();
    expect(identities).toHaveLength(56);
    for (const identity of identities) {
      const startingPlace = searchLifePlaces("", 1, {
        stateJurisdictionKey: identity.jurisdictionKey,
        scope: "locality",
      })[0]!;
      const at = createScenarioWorld(
        `${seed}:absence:${identity.jurisdictionKey}`,
        startingPlace.context,
      );
      const personId = at.personOrder.find(
        (id) => workRelationshipHistoryForPerson(at, id).length === 0,
      )!;
      expect(personId, identity.jurisdictionKey).toBeDefined();
      expect(staffAssessment(at, personId).steadiness).toBeNull();
      expect(staffAssessment(at, personId).evidence).toBe("limited");
      expect(workRelationshipHistoryForPerson(at, personId)).toHaveLength(0);
    }
  });

  it("keeps steadiness unknown without working history through Continue", () => {
    const world = openingWorld("empty");
    const personId = world.personOrder.find(
      (id) => workRelationshipHistoryForPerson(world, id).length === 0,
    )!;
    const assessment = staffAssessment(world, personId);
    expect(workRelationshipHistoryForPerson(world, personId)).toHaveLength(0);
    expect(assessment.evidence).toBe("limited");
    expect(assessment.steadiness).toBeNull();
    expect(assessment.background).toMatch(/no record/);
    expect(assessment.caution).toMatch(/without evidence/);
    expect(`${assessment.background} ${assessment.strength}`).not.toMatch(
      /\d+ years/,
    );
    const before = serializeWorld(world);
    expect(staffAssessment(world, personId)).toEqual(assessment);
    expect(serializeWorld(world)).toBe(before);
    expect(staffAssessment(deserializeWorld(before), personId)).toEqual(
      assessment,
    );
    console.log(
      JSON.stringify({
        seed: world.seed,
        state: state.jurisdictionKey,
        place: place.displayName,
        person: personName(world.people[personId]!),
        steadiness: assessment.steadiness,
        background: assessment.background,
      }),
    );
  });

  it("reads supplied canonical posts without inventing another person's career", () => {
    let world = openingWorld("recorded");
    const personId = world.personOrder[4]!;
    const otherId = world.personOrder.find(
      (id) => workRelationshipHistoryForPerson(world, id).length === 0,
    )!;
    const jurisdictionId = place.context.jurisdiction.id;
    world = createOrganization(world, {
      stableKey: "A93:supplied-staff-employer",
      formedAt: makeIsoDate("2010-01-01"),
      provenance: {
        kind: "authored",
        note: "Supplied employment fixture, not a generated career.",
      },
      initialProfile: {
        name: "Recorded legislature staff office",
        classification: "sector:government",
        locationJurisdictionId: jurisdictionId,
      },
    });
    const employerId = world.history.organizations.at(-1)!.id;
    world = createWorkRelationship(world, {
      stableKey: "A93:supplied-recorded-post",
      personId,
      organizationId: employerId,
      startedAt: makeIsoDate("2015-01-01"),
      kind: "employment:public-sector",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance: {
        kind: "authored",
        note: "Supplied actual work record for assessment proof.",
      },
      initialRole: {
        title: "Committee staff aide",
        occupationClassification: "profession:legislative-staff",
        locationJurisdictionId: jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 35, maximumHours: 55 },
          attention: "high",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: jurisdictionId,
        },
      },
    });
    const posts = staffCareerEvidence(world, personId);
    const assessment = staffAssessment(world, personId);
    expect(posts).toHaveLength(1);
    expect(posts[0]!.startedAt).toBe("2015-01-01");
    expect(posts[0]!.employer).toBe("Recorded legislature staff office");
    expect(assessment.evidence).toBe("recorded");
    expect(assessment.steadiness).not.toBeNull();
    expect(assessment.background).toContain(posts[0]!.title);
    expect(assessment.background).toContain(posts[0]!.years.toString());
    expect(staffKnowsLegislature(world, personId)).toBe(true);
    expect(staffAssessment(world, otherId).steadiness).toBeNull();
    expect(workRelationshipHistoryForPerson(world, otherId)).toHaveLength(0);
    const before = serializeWorld(world);
    expect(staffAssessment(deserializeWorld(before), personId)).toEqual(
      assessment,
    );
    expect(serializeWorld(world)).toBe(before);
  });

  it("the actual office's candidate producer supplies no career or degree", () => {
    let world = openingWorld("office-candidates");
    world = ensureStateExecutiveIncumbent(world, world.personOrder[0]!, "DC");
    const office = currentGoverningOffices(world).find(
      (entry) =>
        entry.jurisdictionId ===
        requireLifePlace("1150000").context.jurisdiction.id,
    )!;
    expect(office).toBeDefined();
    const created = createCandidates(
      world,
      office,
      "A93:actual-office-search",
      3,
    );
    expect(created.personIds).toHaveLength(3);
    for (const personId of created.personIds) {
      expect(
        workRelationshipHistoryForPerson(created.world, personId),
      ).toHaveLength(0);
      expect(staffAssessment(created.world, personId).steadiness).toBeNull();
      expect(staffAssessment(created.world, personId).evidence).toBe("limited");
      expect(
        created.world.history.educationEnrollments.some(
          (row) => row.personId === personId,
        ),
      ).toBe(false);
    }
    console.info(
      "A93 actual office candidate record",
      JSON.stringify({
        seed: created.world.seed,
        office: office.officeKey,
        jurisdictionId: office.jurisdictionId,
        candidates: created.personIds.map((personId) => ({
          name: personName(created.world.people[personId]!),
          workingPosts: workRelationshipHistoryForPerson(
            created.world,
            personId,
          ).length,
          steadiness: staffAssessment(created.world, personId).steadiness,
        })),
      }),
    );
    const repeated = createCandidates(
      created.world,
      office,
      "A93:actual-office-search",
      3,
    );
    expect(repeated.personIds).toEqual(created.personIds);
    expect(serializeWorld(repeated.world)).toBe(serializeWorld(created.world));
    const continued = deserializeWorld(serializeWorld(created.world));
    expect(
      createCandidates(continued, office, "A93:actual-office-search", 3)
        .personIds,
    ).toEqual(created.personIds);
  });
});
