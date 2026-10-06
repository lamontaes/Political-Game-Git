import { describe, expect, it } from "vitest";
import {
  observerSetup,
  openObserverWorld,
} from "../../presentation/observer-world";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
  stateKeyForJurisdiction,
} from "../life-places";
import { pickDistinct, SeededRng } from "../rng";
import { recordWorldEvent } from "../world";
import { courtFor } from "../judiciary/court-for";
import { seatHolderAt, seatJudge, seatsForCourt } from "../judiciary/courts";
import { sourcedCustodyBoundsForCase } from "./sentencing-term";
import {
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_REFERRED_EVENT,
} from "./prosecution";
import {
  PROSECUTION_SENTENCED_EVENT,
  REFERRAL_TAG,
  SENTENCE_KIND_TAG,
  SENTENCE_MONTHS_TAG,
} from "./jail-terms";
import type { CourtCase } from "./court-reasoning";
import type { EntityId } from "../types";
import {
  appealJudgment,
  appealSavedSentence,
  type AppealInput,
} from "./appeals";

const SEED = "b13-p4-appeal-bounds-20261006";
let opened: ReturnType<typeof openObserverWorld> | null = null;

function fixture(sentenceTerm: "below-minimum" | "in-range" = "in-range") {
  opened ??= openObserverWorld(observerSetup(SEED));
  let world = opened.world;
  const candidateStates = lifePlaceStateIdentities().filter((candidate) => {
    const candidateVenue = stateJurisdictionForKey(
      candidate.jurisdictionKey,
    )?.id;
    if (!candidateVenue) return false;
    const intermediate = courtFor(
      world,
      candidateVenue,
      "local-intermediate",
      "criminal",
    );
    const trial = courtFor(
      world,
      candidateVenue,
      "local-general-trial",
      "criminal",
    );
    const caseRecord: CourtCase = {
      caseKey: `b13-p4:candidate:${candidate.jurisdictionKey}`,
      defendantId: world.personOrder[0]!,
      offenseKey: "crime:robbery",
      offenseLabel: "robbery",
      evidence: "circumstantial",
      standingFindings: 1,
      venueJurisdictionId: candidateVenue,
      stateKey: candidate.jurisdictionKey,
      sentencingApplicability: {
        allegations: {},
        priorConvictionEventIds: [],
      },
    };
    const bounds = sourcedCustodyBoundsForCase(world, caseRecord);
    return (
      intermediate !== null &&
      seatsForCourt(world, intermediate.courtId).length > 0 &&
      trial !== null &&
      bounds !== null &&
      bounds.minimumMonths > 0 &&
      bounds.maximumMonths !== null
    );
  });
  const state = pickDistinct(new SeededRng(SEED), candidateStates, 1)[0]!;
  const venue = stateJurisdictionForKey(state.jurisdictionKey)!.id;
  const court = courtFor(world, venue, "local-intermediate", "criminal");
  expect(court, "random-place appellate court").not.toBeNull();
  const seats = seatsForCourt(world, court!.courtId);
  expect(seats.length, "saved appellate seats").toBeGreaterThan(0);
  const occupied = new Set(
    seats
      .map((seat) => seatHolderAt(world, seat.seatId)?.personId)
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
    .map((seat) => seatHolderAt(world, seat.seatId)?.personId)
    .filter((id): id is EntityId => id !== undefined);
  const excluded = new Set(judgeIds);
  const people = world.personOrder.filter((id) => !excluded.has(id));
  const appellant = people[0]!;
  const respondent = people[1]!;
  const trialJudge = people[2]!;
  const caseKey = "b13-p4:test-case";
  world = recordWorldEvent(world, {
    stableKey: `${caseKey}:referral`,
    type: PROSECUTION_REFERRED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: venue,
    involvedEntityIds: [appellant],
    participants: [
      { personId: appellant, role: "focus:subject", detail: null },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      "justice.offense:crime:robbery",
      "justice.evidence:circumstantial",
      "justice.standing-findings:1",
    ],
    summary: "A test prosecution referral.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const referral = world.history.events.at(-1)!;
  const trialCourt = courtFor(world, venue, "local-general-trial", "criminal")!;
  world = recordWorldEvent(world, {
    stableKey: `${caseKey}:charged`,
    type: PROSECUTION_CHARGED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: venue,
    involvedEntityIds: [appellant, respondent],
    participants: [
      { personId: appellant, role: "focus:defendant", detail: null },
      { personId: respondent, role: "agency:decided", detail: "Prosecutor" },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `${REFERRAL_TAG}${referral.id}`,
      `justice.court:${trialCourt.courtId}`,
    ],
    summary: "A test charge was filed.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const existingCase: CourtCase = {
    caseKey: referral.stableKey,
    defendantId: appellant,
    offenseKey: "crime:robbery",
    offenseLabel: "robbery",
    evidence: "circumstantial",
    standingFindings: 1,
    venueJurisdictionId: venue,
    stateKey: stateKeyForJurisdiction(world.jurisdictions[venue]!),
    sentencingApplicability: {
      allegations: {},
      priorConvictionEventIds: [],
    },
  };
  const bounds = sourcedCustodyBoundsForCase(world, existingCase)!;
  const termMonths =
    sentenceTerm === "below-minimum"
      ? bounds.minimumMonths - 1
      : bounds.minimumMonths;
  world = recordWorldEvent(world, {
    stableKey: `${caseKey}:sentence`,
    type: PROSECUTION_SENTENCED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: venue,
    involvedEntityIds: [appellant, trialJudge],
    participants: [
      { personId: appellant, role: "focus:defendant", detail: null },
      { personId: trialJudge, role: "agency:decided", detail: "Judge" },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `${REFERRAL_TAG}${referral.id}`,
      `${SENTENCE_KIND_TAG}jail`,
      `${SENTENCE_MONTHS_TAG}${termMonths}`,
    ],
    summary: "A test judge recorded a sentence.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const sentenceEventId = world.history.events.at(-1)!.id;
  const judgmentEventId = world.history.events.at(-1)!.id;
  const base: Omit<AppealInput, "stableKey" | "judgment"> = {
    caseKey: referral.stableKey,
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
  return { world, base, judgeIds, sentenceEventId, bounds };
}

describe("appellate review uses the recorded legal bounds", () => {
  it("reverses a sentence below its lawful minimum in a random-place game", () => {
    const { world, base, sentenceEventId, bounds } = fixture("below-minimum");
    expect(bounds.minimumMonths).toBeGreaterThan(0);
    const result = appealSavedSentence(world, {
      stableKey: "b13-p4:out-of-bounds",
      sentenceEventId,
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
    const { world, sentenceEventId } = fixture("in-range");
    const result = appealSavedSentence(world, {
      stableKey: "b13-p4:in-bounds",
      sentenceEventId,
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
