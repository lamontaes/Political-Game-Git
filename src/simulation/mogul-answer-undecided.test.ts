import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createScenarioWorld } from "./demo";
import { searchLifePlaces, stateJurisdictionForKey } from "./life-places";
import { ensureStateJurisdiction } from "./nationwide-world/state-executives";
import { stateExecutiveIdentity } from "./nationwide-world/state-executive-candidacy-packs";
import { ageOnDate, addDays, makeIsoDate } from "./dates";
import { fileCampaign } from "./campaigns";
import { createResourcePosition, makeCurrencyCode, money } from "./resources";
import { resourcePositionAt } from "./resource-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assertWorldIntegrity } from "./world";
import * as decisions from "./decisions";
import type { DecisionContext, EntityId, World } from "./types";
import {
  answerMogulOffer,
  MOGUL_OFFER_ANSWERED_EVENT,
  mogulOffers,
  produceMogulOffers,
  recordMogulInterest,
} from "./moguls";
import { projectMogulOffers } from "../presentation/mogul-offers-view";

type Answer =
  "undecided" | "no-available-option" | "selected-null" | "accept" | "decline";
const USD = makeCurrencyCode("USD");
let ready: World;
let mogulId: EntityId;
let candidateId: EntityId;
let committeeId: EntityId;
let offered: World | undefined;
beforeAll(() => {
  const jurisdiction = stateJurisdictionForKey("US-OR")!;
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-OR",
    scope: "locality",
  })[0]!;
  const generated = createScenarioWorld(
    "c8-mogul-approach-pending",
    {
      jurisdiction: place.context.jurisdiction,
      initialMoment: {
        date: makeIsoDate("2026-09-14"),
        minuteOfDay: 540,
        timeZone: "America/Los_Angeles",
        utcOffsetMinutes: -420,
      },
      creationSummary: "Authored Oregon campaign caller fixture.",
      goalScope: "Authored mogul caller fixture",
      householdLocationLabel: "Authored Oregon residence",
    },
    { peopleCount: 14 },
  );
  const adults = generated.personOrder.filter(
    (id) =>
      ageOnDate(generated.people[id]!.birthDate, generated.currentDate) >= 35,
  );
  if (adults.length < 3) throw new Error("Fixture needs three adult people.");
  candidateId = adults[0]!;
  mogulId = adults[1]!;
  const controlled: World = {
    ...ensureStateJurisdiction(generated, "OR"),
    control: { kind: "person", personId: candidateId },
  };
  const filed = fileCampaign(controlled, {
    stableKey: "c8-mogul-campaign",
    candidatePersonId: candidateId,
    jurisdictionId: jurisdiction.id,
    officeKey: stateExecutiveIdentity("OR")!.officeKey,
    districtBinding: null,
    electionDate: addDays(controlled.currentDate, 480),
    rivalPersonIds: [adults[2]!],
    existingContestId: null,
    committeeName: "Authored caller fixture committee",
    donorPoolName: "Existing aggregate donor fixture",
    advertisingVendorName: "Existing aggregate advertising fixture",
    staffPersonIds: [],
    treasuryCurrency: USD,
  });
  committeeId = filed.campaign.organizationId;
  const funded = createResourcePosition(filed.world, {
    stableKey: "c8-mogul-authored-fortune",
    owner: { kind: "person", personId: mogulId },
    openedAt: filed.world.currentDate,
    openingBalance: money(200_000_000_000, USD),
    provenance: {
      kind: "authored",
      note: "Explicitly authored fixture fortune; no researched wealth claim.",
    },
  });
  const proposition = Object.values(funded.policyCatalog.propositions)[0]!;
  ready = recordMogulInterest(funded, {
    personId: mogulId,
    propositionId: proposition.id,
    wants: "oppose",
    because:
      "Explicit caller fixture interest in this existing policy question.",
  });
  ready = { ...ready, control: { kind: "person", personId: adults[2]! } };
  assertWorldIntegrity(ready);
});
afterEach(() => {
  vi.restoreAllMocks();
  offered = undefined;
});
function control(answer: Answer) {
  const actual = decisions.evaluateDecision;
  return vi
    .spyOn(decisions, "evaluateDecision")
    .mockImplementation((world: World, context: DecisionContext) => {
      if (context.decisionType === "mogul.approach") {
        // Real evaluator and canonical trace: force an actual donation offer to reach its NPC recipient.
        return actual(world, {
          ...context,
          randomness: "none",
          constraints: context.options
            .filter((option) => option.key !== "donate")
            .map((option) => ({
              stableKey: `fixture:c8-approach:${option.key}`,
              optionKey: option.key,
              kind: "fixture:controlled-answer",
              explanation:
                "This caller fixture requires an actual donation offer.",
              sourceRefs: [],
            })),
        });
      }
      if (context.decisionType !== "mogul.answer")
        return actual(world, context);
      offered = world;
      if (answer === "undecided" || answer === "selected-null") {
        return {
          ...actual(world, context),
          outcomeKind: answer === "undecided" ? "undecided" : "selected",
          selectedOptionKey: null,
        };
      }
      // Caller availability controls are not naturally selected motives or new contribution rules.
      return actual(world, {
        ...context,
        randomness: "none",
        constraints: context.options
          .filter(
            (option) =>
              answer === "no-available-option" || option.key !== answer,
          )
          .map((option) => ({
            stableKey: `fixture:c8-mogul-answer:${option.key}`,
            optionKey: option.key,
            kind: "fixture:controlled-answer",
            explanation:
              "This caller fixture controls which answer is available.",
            sourceRefs: [],
          })),
      });
    });
}
function balance(
  world: World,
  owner:
    | { kind: "person"; personId: EntityId }
    | { kind: "organization"; organizationId: EntityId },
) {
  return resourcePositionAt(world, owner, USD)!.liquidBalance.minorUnits;
}
describe("unresolved NPC answers preserve the actual open mogul offer", () => {
  it.each(["undecided", "no-available-option", "selected-null"] as const)(
    "%s does not become a refusal or transfer",
    (answer: Answer) => {
      const spy = control(answer);
      const result = produceMogulOffers(ready);
      expect(offered).toBeDefined();
      expect(result).toBe(offered);
      expect(serializeWorld(result)).toBe(serializeWorld(offered!));
      expect(result.currentMoment).toEqual(ready.currentMoment);
      const offers = mogulOffers(result);
      expect(offers).toHaveLength(1);
      expect(offers[0]!.state).toBe("open");
      expect(offers[0]!.toPersonId).toBe(candidateId);
      expect(offers[0]!.mogulPersonId).toBe(mogulId);
      expect(
        result.history.events.filter(
          (event) => event.type === MOGUL_OFFER_ANSWERED_EVENT,
        ),
      ).toHaveLength(0);
      expect(
        result.history.decisionTraces.filter(
          (trace) => trace.context.decisionType === "mogul.answer",
        ),
      ).toHaveLength(0);
      expect(result.history.resourceTransferOutcomes).toEqual(
        ready.history.resourceTransferOutcomes,
      );
      expect(balance(result, { kind: "person", personId: mogulId })).toBe(
        balance(ready, { kind: "person", personId: mogulId }),
      );
      expect(
        balance(result, { kind: "organization", organizationId: committeeId }),
      ).toBe(
        balance(ready, { kind: "organization", organizationId: committeeId }),
      );
      const saved = deserializeWorld(serializeWorld(result));
      assertWorldIntegrity(saved);
      const before = serializeWorld(saved);
      const projection = projectMogulOffers(saved, candidateId);
      expect(projection).toHaveLength(1);
      expect(projection[0]!.outcome).toBeNull();
      expect(projection[0]!.canAnswer).toBe(true);
      expect(serializeWorld(saved)).toBe(before);
      // The existing cooldown/open-offer checks prevent immediate duplicate offers and retries.
      expect(serializeWorld(produceMogulOffers(saved))).toBe(before);
      expect(
        spy.mock.calls.filter(
          ([, context]: Parameters<typeof decisions.evaluateDecision>) =>
            context.decisionType === "mogul.answer",
        ),
      ).toHaveLength(1);
    },
  );
  it.each(["accept", "decline"] as const)(
    "preserves selected %s and its saved money outcome",
    (answer: Answer) => {
      control(answer);
      const result = produceMogulOffers(ready);
      const saved = deserializeWorld(serializeWorld(result));
      assertWorldIntegrity(saved);
      expect(saved.currentMoment).toEqual(ready.currentMoment);
      const offers = mogulOffers(saved);
      expect(offers).toHaveLength(1);
      const offer = offers[0]!;
      expect(offer.state).toBe(answer === "accept" ? "accepted" : "declined");
      const traces = saved.history.decisionTraces.filter(
        (trace) => trace.context.decisionType === "mogul.answer",
      );
      expect(traces).toHaveLength(1);
      expect(traces[0]!.context.actorPersonId).toBe(candidateId);
      expect(traces[0]!.selectedOptionKey).toBe(answer);
      expect(
        saved.history.events.filter(
          (event) => event.type === MOGUL_OFFER_ANSWERED_EVENT,
        ),
      ).toHaveLength(1);
      const amount = answer === "accept" ? offer.amount.minorUnits : 0;
      expect(balance(saved, { kind: "person", personId: mogulId })).toBe(
        balance(ready, { kind: "person", personId: mogulId }) - amount,
      );
      expect(
        balance(saved, { kind: "organization", organizationId: committeeId }),
      ).toBe(
        balance(ready, { kind: "organization", organizationId: committeeId }) +
          amount,
      );
      expect(
        saved.history.resourceTransferOutcomes.length -
          ready.history.resourceTransferOutcomes.length,
      ).toBe(answer === "accept" ? 1 : 0);
      const before = serializeWorld(saved);
      expect(projectMogulOffers(saved, candidateId)[0]!.outcome).not.toBeNull();
      expect(serializeWorld(saved)).toBe(before);
      expect(serializeWorld(produceMogulOffers(saved))).toBe(before);
      expect(() =>
        answerMogulOffer(saved, {
          offerEventId: offer.eventId,
          answer: "accept",
        }),
      ).toThrow("That offer has already been answered.");
      expect(serializeWorld(saved)).toBe(before);
    },
  );
});
