import { afterEach, describe, expect, it, vi } from "vitest";
import * as decisions from "./decisions";
import type { DecisionContext, World } from "./types";
import { createDemoWorld } from "./demo";
import { recordWorldEvent, assertWorldIntegrityFully } from "./world";
import { recordRelationshipInteraction } from "./records";
import { addDays } from "./dates";
import { serializeWorld, deserializeWorld } from "./serialization";
import {
  COUPLE_DECLINED_EVENT,
  COUPLE_FORMED_EVENT,
  coupleAskRefusal,
  coupleBetween,
  dateRefusal,
  romanticConsiderations,
  sharedInteractionDays,
  sharedDaysBeforeCoupleAsk,
} from "./couples";
import { askToBeTogether } from "../presentation/people-contacts";

function eligibleRequest() {
  let world = createDemoWorld("c8-couple-undecided");
  const pair = world.personOrder
    .flatMap((personId) =>
      world.personOrder.map((otherPersonId) => ({ personId, otherPersonId })),
    )
    .find(
      ({ personId, otherPersonId }) =>
        dateRefusal(world, personId, otherPersonId) === null,
    );
  if (!pair)
    throw new Error("The fixture requires two eligible recorded adults.");
  // Control is fixture context; people and the dated history remain canonical.
  world = { ...world, control: { kind: "person", personId: pair.personId } };
  const requiredDays = sharedDaysBeforeCoupleAsk(
    world,
    pair.personId,
    pair.otherPersonId,
  );
  for (let day = 0; day < requiredDays; day++) {
    world = recordWorldEvent(world, {
      stableKey: `c8:shared-time:${day}`,
      type: "life.time-together",
      occurredAt: addDays(world.currentDate, day - requiredDays),
      recordedAt: world.currentDate,
      jurisdictionId: world.people[pair.personId]!.homeJurisdictionId,
      involvedEntityIds: [pair.personId, pair.otherPersonId],
      participants: [
        {
          personId: pair.personId,
          role: "presence:participant",
          detail: "Spent time together",
        },
        {
          personId: pair.otherPersonId,
          role: "presence:participant",
          detail: "Spent time together",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["life.time-together"],
      summary: "The pair spent time together.",
      context: {
        location: null,
        socialContext: "A shared afternoon.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    world = recordRelationshipInteraction(world, {
      stableKey: `c8:time-interaction:${day}`,
      personIds: [pair.personId, pair.otherPersonId],
      eventId: world.history.events.at(-1)!.id,
      occurredAt: addDays(world.currentDate, day - requiredDays),
      kind: "contact:time-together",
      change: "maintained",
      significance: "meaningful",
      summary: "The pair spent time together.",
      tags: ["life.time-together"],
    });
  }
  expect(coupleAskRefusal(world, pair.personId, pair.otherPersonId)).toBeNull();
  assertWorldIntegrityFully(world);
  return { world, pair };
}
afterEach(() => vi.restoreAllMocks());
describe("romance grows through recorded time together", () => {
  it("uses ordinary shared time instead of a fixed number of dates", () => {
    const { world, pair } = eligibleRequest();
    expect(
      sharedInteractionDays(world, pair.personId, pair.otherPersonId).length,
    ).toBeGreaterThanOrEqual(
      sharedDaysBeforeCoupleAsk(world, pair.personId, pair.otherPersonId),
    );
    const consideration = romanticConsiderations(
      world,
      "time-together-test",
      pair.otherPersonId,
      pair.personId,
    ).find((item) => item.stableKey === "time-together-test:shared-time");
    expect(consideration).toMatchObject({
      optionKey: "accept",
      sourceType: "social:relationship",
      explanation: "They have spent time together recently.",
    });
  });

  it("does not make couple status available before the pair shares time", () => {
    const world = createDemoWorld("c8-no-shared-time");
    const pair = world.personOrder
      .flatMap((personId) =>
        world.personOrder.map((otherPersonId) => ({ personId, otherPersonId })),
      )
      .find(
        ({ personId, otherPersonId }) =>
          dateRefusal(world, personId, otherPersonId) === null &&
          sharedInteractionDays(world, personId, otherPersonId).length === 0,
      );
    if (!pair) throw new Error("The fixture needs two unconnected adults.");
    expect(coupleAskRefusal(world, pair.personId, pair.otherPersonId)).toBe(
      "You have not spent time together yet.",
    );
  });
});
describe("an unanswered couple request reaches the actual contact consumer", () => {
  it.each(["undecided", "no-available-option", "selected-null"] as const)(
    "does not record or say no for %s, including reload and repeat",
    (outcome: "undecided" | "no-available-option" | "selected-null") => {
      const fixture = eligibleRequest();
      const before = serializeWorld(fixture.world);
      const evaluate = decisions.evaluateDecision;
      const spy = vi
        .spyOn(decisions, "evaluateDecision")
        .mockImplementation((world: World, context: DecisionContext) => {
          const actual = evaluate(world, context);
          if (context.decisionType !== "people.couple-answer") return actual;
          return {
            ...actual,
            outcomeKind: outcome === "selected-null" ? "selected" : outcome,
            selectedOptionKey: null,
          };
        });
      for (const input of [fixture.world, deserializeWorld(before)]) {
        const first = askToBeTogether(input, fixture.pair);
        expect(spy.mock.calls.at(-1)?.[1]).toMatchObject({
          decisionType: "people.couple-answer",
          randomness: "none",
        });
        expect(first.world).toBe(input);
        expect(first.said).toBe("No answer yet.");
        expect(serializeWorld(first.world)).toBe(before);
        expect(
          coupleBetween(
            first.world,
            fixture.pair.personId,
            fixture.pair.otherPersonId,
          ),
        ).toBeNull();
        expect(
          coupleAskRefusal(
            first.world,
            fixture.pair.personId,
            fixture.pair.otherPersonId,
          ),
        ).toBeNull();
        const repeated = askToBeTogether(first.world, fixture.pair);
        expect(repeated.said).toBe(first.said);
        expect(serializeWorld(repeated.world)).toBe(before);
        expect(spy).toHaveBeenLastCalledWith(
          input,
          expect.objectContaining({
            actorPersonId: fixture.pair.otherPersonId,
            decisionType: "people.couple-answer",
          }),
        );
      }
      expect(spy).toHaveBeenCalledTimes(4);
    },
  );
  it.each(["accept", "decline"] as const)(
    "retains the selected %s and its saved response",
    (answer: "accept" | "decline") => {
      const fixture = eligibleRequest();
      const evaluate = decisions.evaluateDecision;
      const spy = vi
        .spyOn(decisions, "evaluateDecision")
        .mockImplementation((world: World, context: DecisionContext) => {
          const actual = evaluate(world, context);
          if (context.decisionType !== "people.couple-answer") return actual;
          return {
            ...actual,
            outcomeKind: "selected",
            selectedOptionKey: answer,
          };
        });
      const result = askToBeTogether(fixture.world, fixture.pair);
      expect(spy).toHaveBeenCalledTimes(1);
      const eventType =
        answer === "accept" ? COUPLE_FORMED_EVENT : COUPLE_DECLINED_EVENT;
      expect(
        result.world.history.events.filter((event) => event.type === eventType),
      ).toHaveLength(1);
      expect(result.said).toBe(
        answer === "accept"
          ? `${fixture.world.people[fixture.pair.otherPersonId]!.givenName} said yes. You are together now.`
          : `${fixture.world.people[fixture.pair.otherPersonId]!.givenName} said no.`,
      );
      expect(
        !!coupleBetween(
          result.world,
          fixture.pair.personId,
          fixture.pair.otherPersonId,
        ),
      ).toBe(answer === "accept");
      const reloaded = deserializeWorld(serializeWorld(result.world));
      expect(
        coupleAskRefusal(
          reloaded,
          fixture.pair.personId,
          fixture.pair.otherPersonId,
        ),
      ).not.toBeNull();
      expect(serializeWorld(reloaded)).toBe(serializeWorld(result.world));
    },
  );
});
