import { describe, expect, test } from "vitest";
import { favorRecords, favorStandingBetween, recordFavor } from "../favors";
import { createPortabilityFixture } from "../portability-fixture";
import type { EntityId, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  appointmentMotive,
  chooseAppointee,
  followingOf,
  recordAppointmentFavor,
  wasPersonalAppointment,
} from "./appointments";
import type { DecisionConsideration } from "../types";

const POST = { officeKey: "fixture-board-seat", title: "board member" };
const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
};

/** A public moment naming both people, for a favor to point at. */
function moment(world: World, key: string, a: EntityId, b: EntityId): World {
  return recordWorldEvent(world, {
    stableKey: `test:${key}`,
    type: "fixture.helped",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: world.people[a]!.homeJurisdictionId,
    involvedEntityIds: [a, b],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["fixture"],
    summary: "One helped the other.",
    context: CONTEXT,
  });
}

function favor(
  world: World,
  key: string,
  giver: EntityId,
  receiver: EntityId,
): World {
  const withEvent = moment(world, key, giver, receiver);
  return recordFavor(withEvent, {
    stableKey: `test:${key}:favor`,
    giverPersonId: giver,
    receiverPersonId: receiver,
    kind: "personal:help",
    description: "helped them through a hard month",
    givenAt: withEvent.currentDate,
    eventId: withEvent.history.events.at(-1)!.id,
    subject: { kind: "none" },
    motive: "trade",
    weight: "great",
    audience: "limited",
    witnessPersonIds: [],
    inReturnForFavorId: null,
    undertakingId: null,
  });
}

describe("appointments read and write the one favor record", () => {
  test("someone who owes the appointer is named over a stranger, citing the favor", () => {
    const world = createPortabilityFixture();
    const [appointer, debtor, stranger] = world.personOrder as EntityId[];
    const before = favor(world, "loan", appointer!, debtor!);
    expect(
      favorStandingBetween(before, debtor!, appointer!).receiverDebt,
    ).not.toBe("none");
    const choice = chooseAppointee(before, {
      stableKey: "fixture:board-1",
      appointerPersonId: appointer!,
      post: POST,
      circle: [stranger!, debtor!],
      eligible: () => true,
    })!;
    expect(choice.personId).toBe(debtor);
    const trace = choice.world.history.decisionTraces.find(
      (row) => row.id === choice.decisionTraceId,
    )!;
    const owed = trace.context.considerations.find((row) =>
      row.stableKey.endsWith(`${debtor}:owes-appointer`),
    )!;
    expect(owed.sourceRefs).toContainEqual({
      kind: "historical-event",
      eventId: favorRecords(before)[0]!.eventId,
    });
    // A choice carried by what the appointee owes is a trade.
    expect(appointmentMotive(choice.world, appointer!, debtor!)).toBe("trade");
  });

  test("an appointment on the merits, or by the book, writes no debt", () => {
    const world = createPortabilityFixture();
    const [appointer, debtor, stranger] = world.personOrder as EntityId[];
    // Nobody is better placed than the debtor, so the tie to the appointer
    // beat no one: the post was not personal.
    const before = favor(world, "loan", appointer!, debtor!);
    const choice = chooseAppointee(before, {
      stableKey: "fixture:board-2",
      appointerPersonId: appointer!,
      post: POST,
      circle: [stranger!, debtor!],
      eligible: () => true,
    })!;
    const seated = moment(choice.world, "seated", appointer!, debtor!);
    const merits = recordAppointmentFavor(seated, {
      stableKey: "fixture:board-2",
      appointerPersonId: appointer!,
      appointeePersonId: debtor!,
      post: POST,
      eventId: seated.history.events.at(-1)!.id,
      subject: { kind: "none" },
    });
    expect(favorRecords(merits)).toHaveLength(favorRecords(before).length);
    // No recorded choice at all: the post was filled by the book.
    const byTheBook = recordAppointmentFavor(seated, {
      stableKey: "fixture:board-3",
      appointerPersonId: appointer!,
      appointeePersonId: stranger!,
      post: POST,
      eventId: seated.history.events.at(-1)!.id,
      subject: { kind: "none" },
    });
    expect(favorRecords(byTheBook)).toHaveLength(favorRecords(before).length);
  });

  test("a personal appointment over someone better placed is a life-changing favor", () => {
    const world = createPortabilityFixture();
    const [appointer, debtor, rival, helped] = world.personOrder as EntityId[];
    // The rival has a following of their own, so stands better on the merits.
    const owed = favor(world, "loan", appointer!, debtor!);
    const before = favor(owed, "rival-help", rival!, helped!);
    expect(followingOf(before, rival!)).toBe(1);
    const choice = chooseAppointee(before, {
      stableKey: "fixture:board-4",
      appointerPersonId: appointer!,
      post: POST,
      circle: [rival!, debtor!],
      eligible: () => true,
    })!;
    expect(choice.personId).toBe(debtor);
    const seated = moment(choice.world, "seated", appointer!, debtor!);
    const after = recordAppointmentFavor(seated, {
      stableKey: "fixture:board-4",
      appointerPersonId: appointer!,
      appointeePersonId: debtor!,
      post: POST,
      eventId: seated.history.events.at(-1)!.id,
      subject: { kind: "none" },
    });
    const record = favorRecords(after).find(
      (row) => row.kind === "public:appointment",
    );
    expect(record).toMatchObject({
      giverPersonId: appointer,
      receiverPersonId: debtor,
      weight: "life-changing",
      audience: "public",
      // Carried by what the debtor owed the appointer.
      motive: "trade",
    });
    expect(favorStandingBetween(after, debtor!, appointer!).receiverDebt).toBe(
      "strong",
    );
  });

  test("a choice is personal only when a better-placed person lost to a tie", () => {
    const row = (
      optionKey: string,
      sourceType: DecisionConsideration["sourceType"],
      importance: DecisionConsideration["importance"],
    ): DecisionConsideration => ({
      stableKey: `${optionKey}:${sourceType}`,
      optionKey,
      sourceType,
      direction: "supports",
      importance,
      confidence: "high",
      explanation: "fixture",
      sourceRefs: [],
    });
    const tie = row("person:a", "social:relationship", "strong");
    const party = row("person:b", "context:party", "moderate");
    expect(wasPersonalAppointment([tie, party], "person:a")).toBe(true);
    expect(wasPersonalAppointment([tie, party], "person:b")).toBe(false);
    expect(
      wasPersonalAppointment(
        [tie, row("person:a", "context:party", "moderate"), party],
        "person:a",
      ),
    ).toBe(false);
  });
  test("a weaker merit record without supportive personal reasons creates no appointment debt", () => {
    const row = (
      optionKey: string,
      sourceType: DecisionConsideration["sourceType"],
      importance: DecisionConsideration["importance"],
      direction: DecisionConsideration["direction"] = "supports",
    ): DecisionConsideration => ({
      stableKey: `${optionKey}:${sourceType}`,
      optionKey,
      sourceType,
      direction,
      importance,
      confidence: "high",
      explanation: "Controlled favor classification fixture.",
      sourceRefs: [],
    });
    const merit = [
      row("person:chosen", "context:party", "slight"),
      row("person:other", "context:public-record", "strong"),
    ];
    expect(wasPersonalAppointment(merit, "person:chosen")).toBe(false);
    expect(
      wasPersonalAppointment(
        [
          ...merit,
          row("person:chosen", "social:relationship", "strong", "opposes"),
        ],
        "person:chosen",
      ),
    ).toBe(false);
    expect(
      wasPersonalAppointment(
        [...merit, row("person:chosen", "social:relationship", "strong")],
        "person:chosen",
      ),
    ).toBe(true);
  });
});
