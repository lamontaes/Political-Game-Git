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
} from "./appointments";

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

  test("an appointment that takes effect is a life-changing favor the appointee owes", () => {
    const world = createPortabilityFixture();
    const [appointer, appointee] = world.personOrder as EntityId[];
    const seated = moment(world, "seated", appointer!, appointee!);
    const after = recordAppointmentFavor(seated, {
      stableKey: "fixture:board-2",
      appointerPersonId: appointer!,
      appointeePersonId: appointee!,
      post: POST,
      eventId: seated.history.events.at(-1)!.id,
      subject: { kind: "none" },
    });
    const [record] = favorRecords(after);
    expect(record).toMatchObject({
      giverPersonId: appointer,
      receiverPersonId: appointee,
      kind: "public:appointment",
      weight: "life-changing",
      audience: "public",
      // No recorded choice: the post was filled by the book.
      motive: "shared-belief",
    });
    expect(
      favorStandingBetween(after, appointee!, appointer!).receiverDebt,
    ).toBe("strong");
    expect(followingOf(after, appointer!)).toBe(1);
    expect(followingOf(after, appointee!)).toBe(0);
  });
});
