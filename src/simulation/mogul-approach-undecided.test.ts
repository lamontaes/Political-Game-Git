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
import { mogulOffers, produceMogulOffers, recordMogulInterest } from "./moguls";
import { projectMogulOffers } from "../presentation/mogul-offers-view";

type Answer =
  "undecided" | "no-available-option" | "selected-null" | "donate" | "wait";
const USD = makeCurrencyCode("USD");
let ready: World;
let mogulId: EntityId;
let candidateId: EntityId;
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
  assertWorldIntegrity(ready);
});
afterEach(() => vi.restoreAllMocks());
function control(answer: Answer) {
  const actual = decisions.evaluateDecision;
  return vi
    .spyOn(decisions, "evaluateDecision")
    .mockImplementation((world: World, context: DecisionContext) => {
      if (context.decisionType !== "mogul.approach")
        return actual(world, context);
      if (answer === "undecided" || answer === "selected-null") {
        return {
          ...actual(world, context),
          outcomeKind: answer === "undecided" ? "undecided" : "selected",
          selectedOptionKey: null,
        };
      }
      // Controlled availability tests this caller; it is not an NPC motive or new contribution rule.
      return actual(world, {
        ...context,
        randomness: "none",
        constraints: context.options
          .filter(
            (option) =>
              answer === "no-available-option" || option.key !== answer,
          )
          .map((option) => ({
            stableKey: `fixture:c8-mogul:${option.key}`,
            optionKey: option.key,
            kind: "fixture:controlled-answer",
            explanation:
              "This caller fixture controls which answer is available.",
            sourceRefs: [],
          })),
      });
    });
}
describe("unresolved mogul approaches preserve the campaign without a trace or offer", () => {
  it.each(["undecided", "no-available-option", "selected-null"] as const)(
    "%s leaves the world unchanged",
    (answer: Answer) => {
      const spy = control(answer);
      const before = serializeWorld(ready);
      const result = produceMogulOffers(ready);
      expect(
        spy.mock.calls.filter(
          ([, ctx]: Parameters<typeof decisions.evaluateDecision>) =>
            ctx.decisionType === "mogul.approach",
        ),
      ).toHaveLength(1);
      expect(result).toBe(ready);
      expect(serializeWorld(result)).toBe(before);
      expect(mogulOffers(result)).toHaveLength(0);
      const saved = deserializeWorld(before);
      assertWorldIntegrity(saved);
      const readBytes = serializeWorld(saved);
      expect(projectMogulOffers(saved, candidateId)).toHaveLength(0);
      expect(serializeWorld(saved)).toBe(readBytes);
      expect(serializeWorld(produceMogulOffers(saved))).toBe(readBytes);
    },
  );
  it.each(["donate", "wait"] as const)(
    "preserves selected %s and canonical replay",
    (answer: Answer) => {
      control(answer);
      const balance = resourcePositionAt(
        ready,
        { kind: "person", personId: mogulId },
        USD,
      )!.liquidBalance;
      const result = produceMogulOffers(ready);
      expect(result.currentMoment).toEqual(ready.currentMoment);
      const saved = deserializeWorld(serializeWorld(result));
      assertWorldIntegrity(saved);
      const traces = saved.history.decisionTraces.filter(
        (trace) => trace.context.decisionType === "mogul.approach",
      );
      expect(traces).toHaveLength(1);
      expect(traces[0]!.context.actorPersonId).toBe(mogulId);
      expect(traces[0]!.selectedOptionKey).toBe(answer);
      const offers = mogulOffers(saved);
      expect(offers).toHaveLength(answer === "donate" ? 1 : 0);
      if (answer === "donate") {
        expect(offers[0]!.mogulPersonId).toBe(mogulId);
        expect(offers[0]!.toPersonId).toBe(candidateId);
        expect(offers[0]!.state).toBe("open");
        expect(offers[0]!.kind).toBe("donation");
        // Making an offer is not a payment; the controlled player has not answered it.
        expect(
          resourcePositionAt(saved, { kind: "person", personId: mogulId }, USD)!
            .liquidBalance,
        ).toEqual(balance);
      }
      const beforeRead = serializeWorld(saved);
      expect(projectMogulOffers(saved, candidateId)).toHaveLength(
        answer === "donate" ? 1 : 0,
      );
      expect(serializeWorld(saved)).toBe(beforeRead);
    },
  );
});
