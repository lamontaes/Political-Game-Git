import { describe, expect, it } from "vitest";
import { namedSeatForFixture } from "../../tests/fixtures/campaign-fixture";
import {
  GAME_ADULT_CANDIDACY_AGE,
  ageOnDate,
  advanceWorld,
  assertWorldIntegrity,
  candidacyPackById,
  createScenarioWorld,
  deserializeWorld,
  ensureCampaignOpponents,
  fileCampaign,
  makeCurrencyCode,
  recordWorldEvent,
  serializeWorld,
  addDays,
} from "./index";
import { KENTUCKY_CONTEXT } from "./legislation-scenarios";
import type { CampaignRecord, EntityId, World } from "./types";
import { appendPressRecord } from "./press/store";
import { advanceProceeding } from "./press/procedures";
import { applyFindingConsequences } from "./press/finding-consequences";
import { UNRESEARCHED_FINDING_EFFECTS } from "./press/findings";
import { recordSupportLoss } from "./campaign-support";
import { applyFindingSupportLoss } from "./campaign-finding-support";

const KENTUCKY_PACK = "us-ky-general-assembly-v1:candidacy";

function firstAdult(world: World): EntityId {
  const personId = world.personOrder.find((candidate) => {
    const person = world.people[candidate];
    return (
      person !== undefined &&
      ageOnDate(person.birthDate, world.currentDate) >= GAME_ADULT_CANDIDACY_AGE
    );
  });
  if (!personId) throw new Error("The fixture produced no adult.");
  return personId;
}

function kentuckyOfficeKey(): string {
  const pack = candidacyPackById(KENTUCKY_PACK);
  if (!pack) throw new Error("The Kentucky candidacy pack is missing.");
  const office = pack.offices[0];
  if (!office) throw new Error("The Kentucky candidacy pack has no office.");
  return office.officeKey;
}

interface Filed {
  readonly world: World;
  readonly campaign: CampaignRecord;
  readonly candidatePersonId: EntityId;
}

function fileKentuckyCampaign(
  seed: string,
  staffCount = 1,
  advanceDays = 0,
): Filed {
  const created = createScenarioWorld(seed, KENTUCKY_CONTEXT, {
    peopleCount: 6,
  });
  const scenario =
    advanceDays > 0 ? advanceWorld(created, advanceDays) : created;
  const candidatePersonId = firstAdult(scenario);
  // Campaign work is work somebody does, and the activity engine will not let
  // an unheld person do it. The fixture takes control the way a player does.
  const base: World = {
    ...scenario,
    control: { kind: "person", personId: candidatePersonId },
  };
  const staffPersonIds = base.personOrder
    .filter((personId) => personId !== candidatePersonId)
    .filter((personId) => {
      const person = base.people[personId]!;
      return (
        ageOnDate(person.birthDate, base.currentDate) >=
        GAME_ADULT_CANDIDACY_AGE
      );
    })
    .slice(0, staffCount);
  const opponents = ensureCampaignOpponents(base, {
    stableKey: "test-campaign",
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    count: 1,
    excludePersonIds: [candidatePersonId, ...staffPersonIds],
  });
  const filed = fileCampaign(opponents.world, {
    stableKey: "test-campaign",
    candidatePersonId,
    jurisdictionId: KENTUCKY_CONTEXT.jurisdiction.id,
    officeKey: kentuckyOfficeKey(),
    districtBinding: namedSeatForFixture(
      base,
      candidatePersonId,
      kentuckyOfficeKey(),
    ),
    electionDate: addDays(base.currentDate, 21),
    rivalPersonIds: opponents.personIds,
    existingContestId: null,
    committeeName: "A committee for the test fixture",
    donorPoolName: "Supporters, in aggregate",
    advertisingVendorName: "Advertising, in aggregate",
    staffPersonIds,
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  return {
    world: filed.world,
    campaign: filed.campaign,
    candidatePersonId,
  };
}


function findingFixture(seed: string) {
  // Reuse the established six-person filing fixture and its explicit seat.
  // This is controlled Kentucky proof, not an all-jurisdiction or natural route.
  const f = fileKentuckyCampaign(seed, 0);
  let world = recordWorldEvent(f.world, {
    stableKey: "fixture:public-finding",
    type: "fixture.public-finding",
    occurredAt: f.world.currentDate,
    recordedAt: f.world.currentDate,
    jurisdictionId: f.campaign.jurisdictionId,
    involvedEntityIds: [f.candidatePersonId],
    participants: [{ personId: f.candidatePersonId, role: "focus:subject", detail: "Controlled saved finding" }],
    personFactConstraints: [],
    visibility: "public",
    tags: ["fixture:controlled-finding"],
    summary: "A controlled public finding names the recorded candidate.",
    context: { location: null, socialContext: null, pressure: null, choice: null, motivation: null, immediateReaction: null },
  });
  const event = world.history.events.at(-1)!;
  const matter = appendPressRecord(world, "matter", {
    stableKey: "fixture:matter",
    family: "M1",
    subjectPersonIds: [f.candidatePersonId],
    occurrenceId: null,
    openedAt: world.currentDate,
    originEventId: event.id,
    jurisdictionId: f.campaign.jurisdictionId,
  });
  world = matter.world;
  const proceeding = appendPressRecord(world, "matter-proceeding", {
    stableKey: "fixture:proceeding",
    matterId: matter.record.id,
    procedureKey: "fec-enforcement",
    institutionLabel: "Federal Election Commission",
    complainantPersonId: null,
    respondentPersonIds: [f.candidatePersonId],
    openedAt: world.currentDate,
    openingEventId: event.id,
    confidentialWhilePending: true,
    simulatedDisclosure: null,
  });
  world = proceeding.world;
  const step = appendPressRecord(world, "proceeding-step", {
    stableKey: "fixture:closed-finding",
    proceedingId: proceeding.record.id,
    step: "controlled-public-finding",
    at: world.currentDate,
    eventId: event.id,
    nextDueAt: null,
    nextDueBasis: null,
    outcome: "finding",
    closes: true,
    publicStep: true,
    evidenceArtifactIds: [],
  });
  world = step.world;
  assertWorldIntegrity(world);
  return { ...f, world, event, proceeding: proceeding.record, step: step.record };
}

describe("A152 finding support ownership", () => {
  it.each(["filing-basics", "filing-twice", "work-fundraising", "work-advertising", "distribution"])(
    "preserves the existing canonical support result for saved fixture %s",
    (seed) => {
      const f = findingFixture(seed);
      const after = applyFindingSupportLoss(
        f.world, f.candidatePersonId, "finding", f.step, f.event,
      );
      const expected = recordSupportLoss(f.world, f.campaign, {
        stableKeyBase: `${f.step.stableKey}:finding-support:${f.campaign.id}:${f.candidatePersonId}`,
        loserPersonId: f.candidatePersonId,
        lossBasisPoints: UNRESEARCHED_FINDING_EFFECTS.supportLossBasisPoints.finding,
        sourceEntityIds: [f.event.id],
      }).world;
      expect(serializeWorld(after)).toBe(serializeWorld(expected));
      const added = after.history.metricStates.slice(f.world.history.metricStates.length);
      expect(added).toHaveLength(f.campaign.candidateSupportScopes.length);
      for (const state of added) {
        expect(state.provenance).toEqual({ kind: "simulated", sourceEntityIds: [f.event.id] });
      }
      const loaded = deserializeWorld(serializeWorld(after));
      assertWorldIntegrity(loaded);
      // The authoritative closed proceeding owns replay, not a new score guard.
      expect(advanceProceeding(loaded, f.proceeding.id).world).toBe(loaded);
    },
  );
  it("does not change support from the press-only entrypoint", () => {
    const f = findingFixture("filing-basics");
    const after = applyFindingConsequences(f.world, f.proceeding, f.step, f.event);
    expect(after.history.metricStates).toBe(f.world.history.metricStates);
  });
  it("applies only the supplied support adapter in the existing first slot", () => {
    const f = findingFixture("filing-basics");
    const expected = applyFindingSupportLoss(
      f.world,
      f.candidatePersonId,
      "finding",
      f.step,
      f.event,
    );
    const after = applyFindingConsequences(
      f.world,
      f.proceeding,
      f.step,
      f.event,
      undefined,
      undefined,
      applyFindingSupportLoss,
    );
    expect(
      after.history.metricStates.filter(
        (state) => state.metricId === f.campaign.supportMetricId,
      ),
    ).toEqual(
      expected.history.metricStates.filter(
        (state) => state.metricId === f.campaign.supportMetricId,
      ),
    );
  });
  it("does not affect an actual person outside the candidate field", () => {
    const f = findingFixture("filing-basics");
    const outsider = f.world.personOrder.find((id) =>
      !f.campaign.candidateSupportScopes.some((scope) => scope.candidatePersonId === id),
    );
    expect(outsider).toBeDefined();
    expect(applyFindingSupportLoss(f.world, outsider!, "finding", f.step, f.event)).toBe(f.world);
  });
});
