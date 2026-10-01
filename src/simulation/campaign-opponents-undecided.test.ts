import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { namedSeatForFixture } from "../../tests/fixtures/campaign-fixture";
import * as decisions from "./decisions";
import {
  campaignWeeklyEvaluationHandler,
  CAMPAIGN_OPPONENT_EVENTS,
} from "./campaign-opponents";
import { CAMPAIGN_WEEKLY_EVALUATION_KEY } from "./campaign-life-types";
import { campaignOpponentStepRecords } from "./campaign-queries";
import {
  resolveFutureDueItemsThrough,
  futureDueItemStateAt,
} from "./future-transitions";
import { composeWorldTimeHandlers } from "./campaigns";
import { ensureCampaignOpponents, fileCampaign } from "./campaigns";
import { candidacyPackForJurisdiction } from "./candidacy";
import { addDays, ageOnDate } from "./dates";
import { GAME_ADULT_CANDIDACY_AGE } from "./candidacy-packs";
import { lifePlaceStateIdentities } from "./life-places";
import { SeededRng, pickDistinct } from "./rng";
import { createOrganization, createOrganizationParticipation } from "./life";
import {
  LIVING_WORLD_KEYS,
  livingWorldOrganizationId,
  PARTY_AFFILIATION_KIND,
} from "./living-world/opening";
import { ensureHomePartyChapters } from "./living-world/party-chapters";
import { makeCurrencyCode } from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { World } from "./types";

const SEED = "a125-opponents-undecided-20261001";
const [state] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
const evaluate = decisions.evaluateDecision;

function race() {
  const small = smallWorld({
    place: state!.jurisdictionKey,
    people: 16,
    seed: SEED,
  });
  const candidate = small.world.personOrder.find(
    (id) =>
      ageOnDate(small.world.people[id]!.birthDate, small.world.currentDate) >=
      GAME_ADULT_CANDIDACY_AGE,
  )!;
  expect(candidate).toBeDefined();
  let world: World = {
    ...small.world,
    control: { kind: "person", personId: candidate },
  };
  for (const party of ["democratic", "republican"] as const) {
    world = createOrganization(world, {
      stableKey: LIVING_WORLD_KEYS.nationalParty(party),
      formedAt: world.currentDate,
      detailLevel: "lightweight",
      provenance: {
        kind: "authored",
        note: "Actual national-party fixture for the chapter reply.",
      },
      initialProfile: {
        name: `${party} party`,
        classification: "membership:political-party",
        locationJurisdictionId: null,
      },
    });
  }
  world = ensureHomePartyChapters(world, candidate);
  const rivals = ensureCampaignOpponents(world, {
    stableKey: "a125-opponents-race",
    jurisdictionId: small.jurisdictionId,
    count: 1,
    excludePersonIds: [candidate],
  });
  world = rivals.world;
  const rival = rivals.personIds[0]!;
  world = createOrganizationParticipation(world, {
    stableKey: "a125-opponents-rival-party",
    personId: rival,
    organizationId: livingWorldOrganizationId(
      world,
      LIVING_WORLD_KEYS.nationalParty("democratic"),
    ),
    startedAt: world.currentDate,
    kind: PARTY_AFFILIATION_KIND,
    roleKind: "member:public-affiliation",
    context: "Public fixture affiliation",
    provenance: {
      kind: "authored",
      note: "The rival belongs to this actual chapter's party.",
    },
  });
  const pack = candidacyPackForJurisdiction(small.jurisdictionId);
  expect(pack?.offices.length).toBeGreaterThan(0);
  const office = pack!.offices[0]!;
  const filed = fileCampaign(world, {
    stableKey: "a125-opponents-race",
    candidatePersonId: candidate,
    jurisdictionId: small.jurisdictionId,
    officeKey: office.officeKey,
    districtBinding: namedSeatForFixture(world, candidate, office.officeKey),
    electionDate: addDays(world.currentDate, 28),
    rivalPersonIds: [rival],
    existingContestId: null,
    committeeName: "Recorded fixture committee",
    donorPoolName: "Recorded fixture donors",
    advertisingVendorName: "Recorded fixture vendor",
    staffPersonIds: [],
    treasuryCurrency: makeCurrencyCode("USD"),
  });
  const due =
    filed.world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === CAMPAIGN_WEEKLY_EVALUATION_KEY &&
        item.entityIds.includes(filed.campaign.id),
    ) ??
    filed.world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === CAMPAIGN_WEEKLY_EVALUATION_KEY &&
        item.entityIds.includes(filed.campaign.candidatePersonId),
    );
  expect(due).toBeDefined();
  return { world: filed.world, due: due! };
}

function forceUndecided(chapterOnly: boolean) {
  return vi
    .spyOn(decisions, "evaluateDecision")
    .mockImplementation(
      (
        world: Parameters<typeof evaluate>[0],
        input: Parameters<typeof evaluate>[1],
      ): ReturnType<typeof evaluate> => {
        const packet = evaluate(world, input);
        if (
          chapterOnly &&
          input.decisionType === "campaign.opponent-weekly-step"
        ) {
          return {
            ...packet,
            outcomeKind: "selected",
            selectedOptionKey: "support-request",
          };
        }
        return { ...packet, outcomeKind: "undecided", selectedOptionKey: null };
      },
    );
}

afterEach(() => vi.restoreAllMocks());

describe(`A125 opponent caller pending choices in ${state!.jurisdictionKey} (seed ${SEED})`, () => {
  it.each([false, true])(
    "does not turn an undecided reply into an action (chapterOnly=%s), including Continue and repeat",
    (chapterOnly: boolean) => {
      const { world, due } = race();
      const spy = forceUndecided(chapterOnly);
      const before = world.history;
      const result = campaignWeeklyEvaluationHandler(world, due);
      expect(
        spy.mock.calls.some(
          ([, input]: Parameters<typeof evaluate>) =>
            input.decisionType ===
            (chapterOnly
              ? "campaign.chapter-support-request"
              : "campaign.opponent-weekly-step"),
        ),
      ).toBe(true);
      expect(result.status).toBe("blocked");
      expect(result.reasonKey).toBe("campaign:opponent-undecided");
      expect(result.outcomeEventId).toBeNull();
      expect(campaignOpponentStepRecords(result.world)).toHaveLength(0);
      expect(
        result.world.history.events.filter((event) =>
          Object.values(CAMPAIGN_OPPONENT_EVENTS).includes(
            event.type as (typeof CAMPAIGN_OPPONENT_EVENTS)[keyof typeof CAMPAIGN_OPPONENT_EVENTS],
          ),
        ),
      ).toHaveLength(0);
      expect(result.world.history.resourceTransferOutcomes).toEqual(
        before.resourceTransferOutcomes,
      );
      expect(result.world.history.metricStates).toEqual(before.metricStates);
      expect(result.world.history.relationshipInteractions).toEqual(
        before.relationshipInteractions,
      );
      const continued = deserializeWorld(serializeWorld(result.world));
      const again = campaignWeeklyEvaluationHandler(continued, due);
      expect(again.status).toBe("blocked");
      expect(campaignOpponentStepRecords(again.world)).toHaveLength(0);
      expect(again.world.history.resourceTransferOutcomes).toEqual(
        before.resourceTransferOutcomes,
      );
      expect(again.world.history.metricStates).toEqual(before.metricStates);
      expect(again.world.history.relationshipInteractions).toEqual(
        before.relationshipInteractions,
      );
    },
  );
  it("the existing composed due resolver keeps the undecided weekly item blocked through Continue", () => {
    const { world, due } = race();
    forceUndecided(false);
    const registry = composeWorldTimeHandlers();
    const next = resolveFutureDueItemsThrough(world, due.dueAt, registry);
    const state = futureDueItemStateAt(next, due.id, {
      asOfDate: next.currentDate,
      historySequenceExclusive: next.history.nextSequence,
    });
    expect(state?.status).toBe("blocked");
    expect(state?.reasonKey).toBe("campaign:opponent-undecided");
    expect(campaignOpponentStepRecords(next)).toHaveLength(0);
    const continued = deserializeWorld(serializeWorld(next));
    const repeated = resolveFutureDueItemsThrough(
      continued,
      due.dueAt,
      registry,
    );
    expect(campaignOpponentStepRecords(repeated)).toHaveLength(0);
    expect(repeated.history.futureDueItemStates).toEqual(
      continued.history.futureDueItemStates,
    );
  });

  it("keeps actually selected fundraising on the sole existing payment writer", () => {
    const { world, due } = race();
    vi.spyOn(decisions, "evaluateDecision").mockImplementation(
      (
        at: Parameters<typeof evaluate>[0],
        input: Parameters<typeof evaluate>[1],
      ): ReturnType<typeof evaluate> => ({
        ...evaluate(at, input),
        outcomeKind: "selected",
        selectedOptionKey: "fundraising",
      }),
    );
    const result = campaignWeeklyEvaluationHandler(world, due);
    expect(result.status).toBe("resolved");
    const steps = campaignOpponentStepRecords(result.world);
    expect(steps).toHaveLength(1);
    expect(steps[0]?.kind).toBe("fundraising");
    expect(
      result.world.history.resourceTransferOutcomes.some(
        (outcome) =>
          outcome.resourceFlowId === steps[0]?.resourceFlowId &&
          outcome.status === "completed" &&
          outcome.transferredAmount.minorUnits > 0,
      ),
    ).toBe(true);
  });
});
