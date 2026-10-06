import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "../simulation/life";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { recordWorldEvent } from "../simulation/world";
import { electionClerkOffices } from "./election-clerk-offices";
import {
  electionClerkSceneOffer,
  fileFromElectionClerkScene,
  recordElectionClerkOfficeExamination,
} from "./election-clerk-scene";

const seed = "session13-clerk-office-scoped-records";
const place = drawRandomPlace(seed);

function fixture() {
  const base = smallWorld({ place: place.key, seed }).world;
  const player = base.personOrder[0]!;
  const clerk = base.personOrder[1]!;
  const jurisdictionId = base.people[player]!.homeJurisdictionId;
  const organized = createOrganization(base, {
    stableKey: "clerk-scene:authored-office",
    formedAt: base.currentDate,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note: "Authored office-scoped adapter fixture; not ordinary player proof.",
    },
    initialProfile: {
      name: "Recorded clerk office",
      classification: "sector:local-government-office",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const organization = organized.history.organizations.at(-1)!;
  const world = createWorkRelationship(organized, {
    stableKey: "clerk-scene:authored-job",
    personId: clerk,
    organizationId: organization.id,
    startedAt: organized.currentDate,
    kind: "employment:public-service",
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: {
      kind: "authored",
      note: "Authored clerk role for producer coverage.",
    },
    initialRole: {
      title: "City clerk",
      occupationClassification: "profession:municipal-clerk",
      locationJurisdictionId: jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 40 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  const offices = electionClerkOffices(world, player);
  if (!offices.length)
    throw new Error(
      `No recorded office for producer fixture ${place.displayName}.`,
    );
  return { world, player, clerk, organization, jurisdictionId, offices };
}

function encounter(f: ReturnType<typeof fixture>) {
  return recordWorldEvent(f.world, {
    stableKey: "clerk-scene:authored-presence",
    type: "life.scene.opened",
    occurredAt: f.world.currentDate,
    recordedAt: f.world.currentDate,
    jurisdictionId: f.jurisdictionId,
    involvedEntityIds: [f.player, f.clerk, f.organization.id],
    participants: [f.player, f.clerk].map((personId) => ({
      personId,
      role: "presence:participant",
      detail: null,
    })),
    personFactConstraints: [],
    visibility: "private",
    tags: [`moment:${JSON.stringify(f.world.currentMoment)}`],
    summary: "Authored joint office encounter for producer checks.",
    context: {
      location: {
        jurisdictionId: f.jurisdictionId,
        label: "Recorded clerk office",
        setting: "office",
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("clerk scene evidence and actions", () => {
  it("does not turn employment into presence, law knowledge or a filing action", () => {
    const f = fixture();
    const offer = electionClerkSceneOffer(
      f.world,
      f.player,
      f.clerk,
      f.offices[0]!.key,
    )!;
    expect(offer.presenceEventId).toBeNull();
    expect(offer.knownRecordIds).toEqual([]);
    expect(offer.speakableFacts).toBeNull();
    expect(offer.actions.file).toBeNull();
    expect(() =>
      recordElectionClerkOfficeExamination(
        f.world,
        f.player,
        f.clerk,
        offer.officeChoiceKey,
      ),
    ).toThrow("not recorded here");
    expect(() =>
      fileFromElectionClerkScene(
        f.world,
        f.player,
        f.clerk,
        offer.officeChoiceKey,
      ),
    ).toThrow("not recorded here");
  });

  it("records an actual office consultation without creating taught knowledge or changing law", () => {
    const f = fixture();
    const present = encounter(f);
    const before = electionClerkSceneOffer(
      present,
      f.player,
      f.clerk,
      f.offices[0]!.key,
    )!;
    expect(before.presenceEventId).not.toBeNull();
    expect(before.knownRecordIds).toEqual([]);
    const examined = recordElectionClerkOfficeExamination(
      present,
      f.player,
      f.clerk,
      before.officeChoiceKey,
    );
    const after = electionClerkSceneOffer(
      examined,
      f.player,
      f.clerk,
      before.officeChoiceKey,
    )!;
    expect(after.knownRecordIds).toEqual([examined.history.events.at(-1)!.id]);
    expect(after.speakableFacts?.qualifications).toEqual(
      before.qualificationEvidence.map((row) => ({
        ...row,
        sourceRecordIds: after.knownRecordIds,
      })),
    );
    expect(examined.history.knowledge).toBe(present.history.knowledge);
    expect(after.qualificationRules).toEqual(before.qualificationRules);
    expect(after.eligibility).toEqual(before.eligibility);
    expect(
      electionClerkSceneOffer(
        deserializeWorld(serializeWorld(examined)),
        f.player,
        f.clerk,
        before.officeChoiceKey,
      ),
    ).toEqual(after);
  });

  it("does not transfer a reading to another office or an ended clerk role", () => {
    const f = fixture();
    expect(f.offices.length).toBeGreaterThan(1);
    const present = encounter(f);
    const examined = recordElectionClerkOfficeExamination(
      present,
      f.player,
      f.clerk,
      f.offices[0]!.key,
    );
    expect(
      electionClerkSceneOffer(examined, f.player, f.clerk, f.offices[1]!.key)
        ?.knownRecordIds,
    ).toEqual([]);
    const job = examined.history.workRelationships.find(
      (row) =>
        row.personId === f.clerk && row.organizationId === f.organization.id,
    )!;
    const ended = recordWorkStatus(examined, {
      stableKey: "clerk-scene:ended",
      workRelationshipId: job.id,
      supersedesStatusId: examined.history.workStatuses
        .filter((row) => row.workRelationshipId === job.id)
        .at(-1)!.id,
      effectiveAt: examined.currentDate,
      status: "ended",
      reason: "The authored fixture clerk left the job.",
      provenance: { kind: "authored", note: "Authored end of clerk role." },
    });
    expect(
      electionClerkSceneOffer(ended, f.player, f.clerk, f.offices[0]!.key),
    ).toBeNull();
  });

  it("re-reads the exact selected office rather than accepting caller eligibility", () => {
    const f = fixture();
    const present = encounter(f);
    const blocked = f.offices.find((office) => !office.eligible)!;
    expect(blocked).toBeDefined();
    expect(() =>
      fileFromElectionClerkScene(present, f.player, f.clerk, blocked.key),
    ).toThrow();
    expect(() =>
      fileFromElectionClerkScene(
        present,
        f.player,
        f.clerk,
        "unrecorded-office",
      ),
    ).toThrow();
    expect(present.history.campaigns ?? []).toHaveLength(0);
  });
});
