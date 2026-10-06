import { describe, expect, it } from "vitest";
import {
  observerSetup,
  openObserverWorld,
} from "../../presentation/observer-world";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { pickDistinct, SeededRng } from "../rng";
import { recordWorldEvent } from "../world";
import { courtFor } from "../judiciary/court-for";
import { seatJudge, seatsForCourt } from "../judiciary/courts";
import type { EntityId } from "../types";
import { appealJudgment, type AppealInput } from "./appeals";

const SEED = "b13-p4-appeal-bounds-20261006";
let opened: ReturnType<typeof openObserverWorld> | null = null;

function fixture() {
  opened ??= openObserverWorld(observerSetup(SEED));
  let world = opened.world;
  const state = pickDistinct(
    new SeededRng(SEED),
    lifePlaceStateIdentities(),
    1,
  )[0]!;
  const venue = stateJurisdictionForKey(state.jurisdictionKey)!.id;
  const court = courtFor(world, venue, "local-intermediate", "criminal");
  expect(court, "random-place appellate court").not.toBeNull();
  const seats = seatsForCourt(world, court!.courtId);
  expect(seats.length, "saved appellate seats").toBeGreaterThan(0);
  const occupied = new Set(
    seats
      .map(
        (seat) =>
          world.judiciary!.seatTenures.find(
            (tenure) =>
              tenure.seatId === seat.seatId && tenure.endedAt === null,
          )?.personId,
      )
      .filter((id): id is EntityId => id !== undefined),
  );
  if (occupied.size === 0) {
    const seat = seats[0]!;
    const judge = world.personOrder.find((id) => !occupied.has(id))!;
    world = seatJudge(world, {
      seatId: seat.seatId,
      personId: judge,
      startedAt: world.currentDate,
      selection: {
        path: "judicial-assignment",
        selectionRecordId: null,
        decisionRecordId: null,
        selectingPersonId: null,
        contestId: null,
        note: "Test fixture seats a judge in the existing appellate court.",
      },
      termEndsAt: null,
      retentionDueAt: null,
    });
  }
  const judgeIds = seats
    .map(
      (seat) =>
        world.judiciary!.seatTenures.find(
          (tenure) => tenure.seatId === seat.seatId && tenure.endedAt === null,
        )?.personId,
    )
    .filter((id): id is EntityId => id !== undefined);
  const excluded = new Set(judgeIds);
  const people = world.personOrder.filter((id) => !excluded.has(id));
  const appellant = people[0]!;
  const respondent = people[1]!;
  const trialJudge = people[2]!;
  world = recordWorldEvent(world, {
    stableKey: "b13-p4:test-judgment",
    type: "justice.sentence-imposed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: venue,
    involvedEntityIds: [appellant, respondent, trialJudge],
    participants: [
      { personId: appellant, role: "focus:defendant", detail: null },
      { personId: respondent, role: "focus:complainant", detail: null },
      { personId: trialJudge, role: "focus:judge", detail: null },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: ["case:b13-p4:test-case"],
    summary: "A test court imposed a sentence.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const judgmentEventId = world.history.events.at(-1)!.id;
  const base: Omit<AppealInput, "stableKey" | "judgment"> = {
    caseKey: "b13-p4:test-case",
    judgmentEventId,
    appellantPersonId: appellant,
    opposingPersonId: respondent,
    trialJudgePersonId: trialJudge,
    venueJurisdictionId: venue,
    trialCourtLevel: "local-general-trial",
    caseKind: "criminal",
    evidence: "circumstantial",
    means: "adequate",
    judgmentMagnitude: "substantial",
  };
  return { world, base, judgeIds };
}

describe("appellate review uses the recorded legal bounds", () => {
  it("reverses a sentence below its lawful minimum in a random-place game", () => {
    const { world, base } = fixture();
    const result = appealJudgment(world, {
      ...base,
      stableKey: "b13-p4:out-of-bounds",
      judgment: {
        kind: "sentence",
        outcomeKey: "conviction",
        termMonths: 10,
        minimumMonths: 24,
        maximumMonths: 60,
      },
    });
    expect(result).not.toBeNull();
    expect(result!.outcome).toBe("reverse");
    expect(result!.votes.length).toBeGreaterThan(0);
    const filed = result!.world.history.events.at(-2)!;
    const decided = result!.world.history.events.at(-1)!;
    expect(filed.type).toBe("justice.appeal-filed");
    expect(filed.involvedEntityIds).toContain(base.appellantPersonId);
    expect(decided.type).toBe("justice.appeal-decided");
    expect(decided.involvedEntityIds).toContain(base.trialJudgePersonId);
    expect(decided.tags).toContain(`court:${result!.appellateCourtId}`);
    expect(decided.tags).toContain("outcome:reverse");
  });

  it("affirms a sentence inside its lawful range in the same new game", () => {
    const { world, base } = fixture();
    const result = appealJudgment(world, {
      ...base,
      stableKey: "b13-p4:in-bounds",
      judgment: {
        kind: "sentence",
        outcomeKey: "conviction",
        termMonths: 24,
        minimumMonths: 24,
        maximumMonths: 60,
      },
    });
    expect(result).not.toBeNull();
    expect(result!.outcome).toBe("affirm");
    expect(result!.votes.length).toBeGreaterThan(0);
  });

  it("does not offer an appeal from an acquittal or an ungrounded eviction record", () => {
    const { world, base } = fixture();
    expect(
      appealJudgment(world, {
        ...base,
        stableKey: "b13-p4:acquittal",
        judgment: { kind: "acquittal", outcomeKey: "acquittal" },
      }),
    ).toBeNull();
    expect(
      appealJudgment(world, {
        ...base,
        stableKey: "b13-p4:eviction",
        judgment: {
          kind: "eviction",
          outcomeKey: "eviction-ordered",
          withinLaw: true,
        },
      }),
    ).toBeNull();
  });
});
