import { afterEach, describe, expect, it, vi } from "vitest";
import * as decisions from "./decisions";
import type { DecisionContext, World } from "./types";
import { createDemoWorld } from "./demo";
import { recordWorldEvent, assertWorldIntegrityFully } from "./world";
import { recordRelationshipInteraction } from "./records";
import { serializeWorld, deserializeWorld } from "./serialization";
import {
  COUPLE_DECLINED_EVENT,
  COUPLE_FORMED_EVENT,
  DATE_KIND,
  DATES_BEFORE_ASKING,
  coupleAskRefusal,
  coupleBetween,
  dateRefusal,
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
  for (let date = 0; date < DATES_BEFORE_ASKING; date++) {
    world = recordWorldEvent(world, {
      stableKey: `c8:kept-date:${date}`,
      type: "life.date-held",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.people[pair.personId]!.homeJurisdictionId,
      involvedEntityIds: [pair.personId, pair.otherPersonId],
      participants: [
        {
          personId: pair.personId,
          role: "presence:participant",
          detail: "Went on the recorded date",
        },
        {
          personId: pair.otherPersonId,
          role: "presence:participant",
          detail: "Went on the recorded date",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["life.date"],
      summary: "The pair went on a date.",
      context: {
        location: null,
        socialContext: "A recorded date.",
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    world = recordRelationshipInteraction(world, {
      stableKey: `c8:date-interaction:${date}`,
      personIds: [pair.personId, pair.otherPersonId],
      eventId: world.history.events.at(-1)!.id,
      occurredAt: world.currentDate,
      kind: DATE_KIND,
      change: "maintained",
      significance: "meaningful",
      summary: "The pair went on a date.",
      tags: ["life.date"],
    });
  }
  expect(coupleAskRefusal(world, pair.personId, pair.otherPersonId)).toBeNull();
  assertWorldIntegrityFully(world);
  return { world, pair };
}
afterEach(() => vi.restoreAllMocks());
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
