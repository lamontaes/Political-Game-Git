import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import { campaigns } from "./campaign-queries";
import {
  applyFindingSupportLoss,
  latestSupportState,
  quantityBasisPoints,
  SUPPORT_DENOMINATOR,
} from "./campaign-support";
import { cancelElectionContest } from "./election-contests";
import { lifePlaceStateIdentities } from "./life-places";
import { applyFindingConsequences } from "./press/finding-consequences";
import {
  ADVERSE_PUBLIC_OUTCOMES,
  UNRESEARCHED_FINDING_EFFECTS,
} from "./press/findings";
import type { ProceedingOutcome } from "./press/records";
import { appendPressRecord } from "./press/store";
import { advanceProceeding } from "./press/procedures";
import { pickDistinct, SeededRng } from "./rng";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

const seed = "finding-support-owner-20261001";
const [place] = pickDistinct(
  new SeededRng(seed),
  lifePlaceStateIdentities(),
  1,
);

function fixture(outcome: ProceedingOutcome, publicStep = true) {
  const small = smallWorld({ place: place!.jurisdictionKey, seed });
  let world = fileForOffice(small.world, small.personId);
  const campaign = campaigns(world)[0]!;
  world = recordWorldEvent(world, {
    stableKey: "fixture:saved-outcome",
    type: "fixture.institutional-outcome",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: campaign.jurisdictionId,
    involvedEntityIds: [small.personId],
    participants: [],
    personFactConstraints: [],
    visibility: publicStep ? "public" : "private",
    tags: ["fixture:authored-institutional-outcome"],
    summary: "An authored institutional outcome was recorded for this test.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = world.history.events.at(-1)!;
  // The institution's saved output is an explicit test input. This test
  // exercises its electoral consequence, not a new finding or penalty rule.
  const matter = appendPressRecord(world, "matter", {
    stableKey: "fixture:matter",
    family: "M1",
    subjectPersonIds: [small.personId],
    occurrenceId: null,
    openedAt: world.currentDate,
    originEventId: event.id,
    jurisdictionId: campaign.jurisdictionId,
  });
  const proceeding = appendPressRecord(matter.world, "matter-proceeding", {
    stableKey: "fixture:proceeding",
    matterId: matter.record.id,
    procedureKey: "fec-enforcement",
    institutionLabel: "Authored test institution",
    complainantPersonId: null,
    respondentPersonIds: [small.personId],
    openedAt: world.currentDate,
    openingEventId: event.id,
    confidentialWhilePending: true,
    simulatedDisclosure: null,
  });
  const step = appendPressRecord(proceeding.world, "proceeding-step", {
    stableKey: "fixture:outcome-step",
    proceedingId: proceeding.record.id,
    step: outcome,
    at: world.currentDate,
    eventId: event.id,
    nextDueAt: null,
    nextDueBasis: null,
    outcome,
    closes: true,
    publicStep,
    evidenceArtifactIds: [],
  });
  assertWorldIntegrity(step.world);
  return {
    world: step.world,
    campaign,
    respondentId: small.personId,
    proceeding: proceeding.record,
    step: step.record,
    event,
  };
}

function shares(f: ReturnType<typeof fixture>, world = f.world) {
  return Object.fromEntries(
    f.campaign.candidateSupportScopes.map((scope) => [
      scope.candidatePersonId,
      quantityBasisPoints(latestSupportState(world, f.campaign, scope)),
    ]),
  );
}

describe(`finding support uses the campaign engine in ${place!.jurisdictionKey}`, () => {
  it.each(ADVERSE_PUBLIC_OUTCOMES)(
    "transfers %s support through the existing writer and retains saved provenance",
    (outcome) => {
      const f = fixture(outcome);
      const before = shares(f);
      const after = applyFindingConsequences(
        f.world,
        f.proceeding,
        f.step,
        f.event,
      );
      assertWorldIntegrity(after);
      const actual = shares(f, after);
      expect(actual[f.respondentId]).toBe(
        before[f.respondentId]! -
          UNRESEARCHED_FINDING_EFFECTS.supportLossBasisPoints[outcome],
      );
      expect(Object.values(actual).reduce((sum, value) => sum + value, 0)).toBe(
        SUPPORT_DENOMINATOR,
      );
      const writes = after.history.metricStates.filter((state) =>
        state.stableKey.startsWith(`${f.step.stableKey}:finding-support:`),
      );
      expect(writes).toHaveLength(f.campaign.candidateSupportScopes.length);
      for (const state of writes)
        expect(state.provenance).toEqual({
          kind: "simulated",
          sourceEntityIds: [f.event.id],
        });
      expect(after.history.resourceFlows).toEqual(
        f.world.history.resourceFlows,
      );
      expect(after.history.resourceTransferOutcomes).toEqual(
        f.world.history.resourceTransferOutcomes,
      );
      const restored = deserializeWorld(serializeWorld(after));
      expect(shares(f, restored)).toEqual(actual);
      expect(advanceProceeding(restored, f.proceeding.id)).toEqual({
        world: restored,
        step: null,
      });
      expect(serializeWorld(restored)).toBe(serializeWorld(after));
    },
  );

  it.each([
    ["finding", false],
    ["dismissed", true],
  ] as const)(
    "leaves support unchanged for %s / public=%s",
    (outcome, publicStep) => {
      const f = fixture(outcome, publicStep);
      const after = applyFindingSupportLoss(
        f.world,
        f.respondentId,
        f.step,
        f.event,
      );
      expect(after).toBe(f.world);
    },
  );

  it("leaves a cancelled contest unchanged", () => {
    const f = fixture("finding");
    const cancelled = cancelElectionContest(f.world, {
      stableKey: "fixture:cancel-contest",
      contestId: f.campaign.contestId,
      effectiveAt: f.world.currentDate,
      reason: "Authored test cancellation before an outcome consequence.",
    });
    const after = applyFindingSupportLoss(
      cancelled,
      f.respondentId,
      f.step,
      f.event,
    );
    expect(after).toBe(cancelled);
  });
});
