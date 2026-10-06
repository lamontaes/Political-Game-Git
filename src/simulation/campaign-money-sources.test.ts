import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { recordCampaignFundraiserReceipts } from "./campaign-money-sources";
import { createOrganization } from "./life";
import { SeededRng } from "./rng";
import { STATES } from "./state-reference";
import { makeCurrencyCode } from "./resources";
import {
  createResourceFlow,
  createResourcePosition,
  recordResourceTransferOutcome,
} from "./resources";
import { recordWorldEvent } from "./world";

function fundraiser() {
  const seed = "a66-recorded-receipts";
  const places = Object.keys(STATES);
  const place = places[new SeededRng(seed).integer(0, places.length)]!;
  const fixture = smallWorld({ place, seed });
  const candidatePersonId = fixture.personId;
  const donorPersonId = Object.values(fixture.world.people).find(
    (person) => person.id !== candidatePersonId,
  )!.id;
  let world = createOrganization(fixture.world, {
    stableKey: "a66:committee",
    formedAt: fixture.world.currentDate,
    detailLevel: "lightweight",
    provenance: { kind: "authored", note: "Recorded test committee" },
    initialProfile: {
      name: "Recorded committee",
      classification: "custom:political-campaign",
      locationJurisdictionId: fixture.jurisdictionId,
    },
  });
  const committeeOrganizationId = world.history.organizations.at(-1)!.id;
  const currency = makeCurrencyCode("USD");
  world = createResourcePosition(world, {
    stableKey: "a66:donor-cash",
    owner: { kind: "person", personId: donorPersonId },
    openedAt: world.currentDate,
    openingBalance: { minorUnits: 12345, currency },
    provenance: {
      kind: "authored",
      note: "Recorded cash fixture, not fundraising capacity invented by the writer",
    },
  });
  world = recordWorldEvent(world, {
    stableKey: "a66:fundraiser",
    type: "campaign.test-fundraiser",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: fixture.jurisdictionId,
    involvedEntityIds: [
      candidatePersonId,
      donorPersonId,
      committeeOrganizationId,
    ],
    participants: [
      {
        personId: donorPersonId,
        role: "presence:participant",
        detail: "Recorded attendee",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [],
    summary: "Recorded fundraiser attendance",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const input = {
    eventId: world.history.events.at(-1)!.id,
    candidatePersonId,
    committeeOrganizationId,
    currency,
  };
  return { world, input, donorPersonId, place, seed };
}

describe("recorded fundraiser sources", () => {
  it("records the unavailable ask in the existing evaluator despite recorded cash; never invents a donor or gift", () => {
    const fixture = fundraiser();
    console.info(`A66 place=${fixture.place} seed=${fixture.seed}`);
    const result = recordCampaignFundraiserReceipts(
      fixture.world,
      fixture.input,
    );
    expect(result.unavailableBasis).toEqual([
      "monetary-ask",
      "contribution-cap-law-term",
    ]);
    expect(result.raisedAmount).toBeNull();
    expect(result.world.people).toBe(fixture.world.people);
    expect(result.world.history.resourceFlows).toBe(
      fixture.world.history.resourceFlows,
    );
    expect(result.world.history.resourceTransferOutcomes).toBe(
      fixture.world.history.resourceTransferOutcomes,
    );
    const trace = result.world.history.decisionTraces.at(-1)!;
    expect(trace.context.actorPersonId).toBe(fixture.donorPersonId);
    expect(trace.context.randomness).toBe("none");
    expect(trace.selectedOptionKey).toBe("not-attempted");
    expect(trace.context.constraints[0]!.explanation).toContain("12345");
    expect(
      recordCampaignFundraiserReceipts(result.world, fixture.input).world,
    ).toBe(result.world);
  });

  it("reports a completed event-attributed gift without repaying it or deciding for its donor again", () => {
    const fixture = fundraiser();
    const amount = { minorUnits: 2345, currency: fixture.input.currency };
    let world = createResourceFlow(fixture.world, {
      stableKey: "a66:completed-gift",
      source: { kind: "person", personId: fixture.donorPersonId },
      recipient: {
        kind: "organization",
        organizationId: fixture.input.committeeOrganizationId,
      },
      startsAt: fixture.world.currentDate,
      initialStatus: "active",
      amount,
      cadenceKind: "schedule:one-time",
      basisKind: "custom:campaign-contribution",
      basisReference: { kind: "general" },
      restrictionKind: "purpose:campaign",
      jurisdictionId: null,
      provenance: { kind: "simulated-event", eventId: fixture.input.eventId },
    });
    const flowId = world.history.resourceFlows.at(-1)!.id;
    world = recordResourceTransferOutcome(world, {
      stableKey: "a66:completed-payment",
      resourceFlowId: flowId,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      status: "completed",
      attemptedAmount: amount,
      transferredAmount: amount,
      reasonKind: null,
      note: "An already recorded payment",
      provenance: { kind: "simulated-event", eventId: fixture.input.eventId },
    });
    const result = recordCampaignFundraiserReceipts(world, fixture.input);
    expect(result.raisedAmount).toEqual(amount);
    expect(result.resourceFlowId).toBe(flowId);
    expect(result.world).toBe(world);
    expect(
      recordCampaignFundraiserReceipts(result.world, fixture.input).world,
    ).toBe(world);
  });

  it("offers jurisdiction-specific leftover uses and labels estimates", async () => {
    const { leftoverFundsRuleForState } =
      await import("./campaign-money-sources");
    expect(leftoverFundsRuleForState("US-NY")).toMatchObject({
      jurisdiction: "NY",
      allowedUses: [
        "keep-for-future-race",
        "refund-donors",
        "give-to-charity",
        "give-to-party/candidate",
      ],
      source: expect.stringContaining("Brooklyn Eagle"),
    });
    expect(leftoverFundsRuleForState("US-VA")?.source).toContain("VPM");
    expect(leftoverFundsRuleForState("US-CA")).toMatchObject({
      estimatedFrom: "NY",
      allowedUses: ["keep-for-future-race", "refund-donors"],
    });
  });

  it("has a nonblank rule for every state, D.C. and territory", async () => {
    const { leftoverFundsRuleForState } =
      await import("./campaign-money-sources");
    const expected =
      "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC AS GU MP PR VI".split(
        " ",
      );
    for (const state of expected) {
      expect(leftoverFundsRuleForState(`US-${state}`), state).not.toBeNull();
    }
  });
});
