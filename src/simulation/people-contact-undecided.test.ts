import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import * as decisions from "./decisions";
import { addDays } from "./dates";
import { lifePlaceStateIdentities } from "./life-places";
import { SeededRng, pickDistinct } from "./rng";
import {
  npcContactAnswer,
  proposeContact,
  contactAnswerTransitionHandler,
  contactProposals,
  PEOPLE_CONTACT_HANDLERS,
  CONTACT_ANSWER_TRANSITION_KEY,
  CONTACT_ACCEPTED_EVENT,
  CONTACT_DECLINED_EVENT,
  CONTACT_COUNTERED_EVENT,
} from "./people-contact";
import {
  resolveFutureDueItemsThrough,
  futureDueItemStateAt,
} from "./future-transitions";
import { deserializeWorld, serializeWorld } from "./serialization";

const SEED = "a125-contact-undecided-20261001";
const [state] = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  1,
);
const evaluate = decisions.evaluateDecision;

function request() {
  const small = smallWorld({
    place: state!.jurisdictionKey,
    people: 4,
    seed: SEED,
  });
  const [from, to] = small.world.personOrder;
  expect(from).toBeDefined();
  expect(to).toBeDefined();
  const proposed = proposeContact(small.world, {
    stableKey: "a125-contact-request",
    fromPersonId: from!,
    toPersonId: to!,
    on: addDays(small.world.currentDate, 3),
    purpose: "Catch up",
    answerInPerson: false,
  });
  const due = proposed.world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === CONTACT_ANSWER_TRANSITION_KEY &&
      item.entityIds.includes(proposed.proposal.eventId),
  );
  expect(due).toBeDefined();
  return {
    world: proposed.world,
    proposal: proposed.proposal,
    due: due!,
    from: from!,
  };
}

function forceAnswer(selected: boolean) {
  return vi
    .spyOn(decisions, "evaluateDecision")
    .mockImplementation(
      (
        world: Parameters<typeof evaluate>[0],
        input: Parameters<typeof evaluate>[1],
      ): ReturnType<typeof evaluate> => {
        const actual = evaluate(world, input);
        if (input.decisionType !== "people.contact-answer") return actual;
        return selected
          ? { ...actual, outcomeKind: "selected", selectedOptionKey: "accept" }
          : { ...actual, outcomeKind: "undecided", selectedOptionKey: null };
      },
    );
}

afterEach(() => vi.restoreAllMocks());

describe(`A125 unanswered contact in ${state!.jurisdictionKey} (seed ${SEED})`, () => {
  it("keeps an undecided NPC answer open without a refusal, counter, or commitment, including Continue", () => {
    const { world, proposal, due, from } = request();
    forceAnswer(false);
    const answer = npcContactAnswer(world, proposal.eventId);
    expect(answer.answer).toBeNull();
    expect(answer.counterOn).toBeNull();
    const result = contactAnswerTransitionHandler(world, due);
    expect(result.status).toBe("blocked");
    expect(result.reasonKey).toBe("people:contact-undecided");
    expect(result.outcomeEventId).toBeNull();
    expect(
      contactProposals(result.world, from).find(
        (p) => p.eventId === proposal.eventId,
      )?.answered,
    ).toBe(false);
    expect(
      result.world.history.events.filter((e) =>
        [
          CONTACT_ACCEPTED_EVENT,
          CONTACT_DECLINED_EVENT,
          CONTACT_COUNTERED_EVENT,
        ].includes(e.type),
      ),
    ).toHaveLength(0);
    expect(result.world.history.scheduledActivities).toEqual(
      world.history.scheduledActivities,
    );
    const continued = deserializeWorld(serializeWorld(result.world));
    const repeated = contactAnswerTransitionHandler(continued, due);
    expect(repeated.status).toBe("blocked");
    expect(repeated.world.history.events).toEqual(result.world.history.events);
    expect(repeated.world.history.scheduledActivities).toEqual(
      result.world.history.scheduledActivities,
    );
  });

  it("records the existing due item as blocked and preserves that frontier after Continue and resolver repeat", () => {
    const { world, proposal, due, from } = request();
    forceAnswer(false);
    const resolved = resolveFutureDueItemsThrough(
      world,
      due.dueAt,
      PEOPLE_CONTACT_HANDLERS,
    );
    const cutoff = {
      asOfDate: due.dueAt,
      historySequenceExclusive: resolved.history.nextSequence,
    };
    const saved = futureDueItemStateAt(resolved, due.id, cutoff);
    expect(saved?.status).toBe("blocked");
    expect(saved?.reasonKey).toBe("people:contact-undecided");
    expect(
      contactProposals(resolved, from).find(
        (p) => p.eventId === proposal.eventId,
      )?.answered,
    ).toBe(false);
    expect(resolved.history.scheduledActivities).toEqual(
      world.history.scheduledActivities,
    );
    const continued = deserializeWorld(serializeWorld(resolved));
    const repeated = resolveFutureDueItemsThrough(
      continued,
      due.dueAt,
      PEOPLE_CONTACT_HANDLERS,
    );
    expect(repeated.history.futureDueItemStates).toEqual(
      resolved.history.futureDueItemStates,
    );
    expect(repeated.history.events).toEqual(resolved.history.events);
  });

  it("still writes a selected acceptance through the actual contact writer and confirms one meeting", () => {
    const { world, proposal, due, from } = request();
    forceAnswer(true);
    const accepted = contactAnswerTransitionHandler(world, due);
    expect(accepted.status).toBe("resolved");
    expect(accepted.reasonKey).toBe("people:contact-accept");
    expect(accepted.outcomeEventId).not.toBeNull();
    expect(
      contactProposals(accepted.world, from).find(
        (p) => p.eventId === proposal.eventId,
      )?.answered,
    ).toBe(true);
    expect(
      accepted.world.history.events.filter(
        (e) => e.type === CONTACT_ACCEPTED_EVENT,
      ),
    ).toHaveLength(1);
    expect(accepted.world.history.scheduledActivities).toHaveLength(
      world.history.scheduledActivities.length + 1,
    );
    const continued = deserializeWorld(serializeWorld(accepted.world));
    const repeated = contactAnswerTransitionHandler(continued, due);
    expect(repeated.reasonKey).toBe("people:already-answered");
    expect(repeated.world.history.events).toEqual(
      accepted.world.history.events,
    );
    expect(repeated.world.history.scheduledActivities).toEqual(
      accepted.world.history.scheduledActivities,
    );
  });
});
