import { advanceWorld } from "../world";
import {
  recordedVandalismClemencyCase,
  recordedCourtFixtureClock,
} from "../../../tests/fixtures/clemency-court-case";
import { createProsecutionTransitionRegistry } from "./prosecution-transitions";
import { REFERRAL_TAG } from "./jail-terms";
import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { addDays, daysBetween } from "../dates";
import { lifePlaceStateIdentities } from "../life-places";
import { personName } from "../people";
import { SeededRng, pickDistinct } from "../rng";
import { serializeWorld, deserializeWorld } from "../serialization";
import { assertWorldIntegrity } from "../world";
import {
  advanceClemencyPetition,
  clemencyPetitionStatus,
  fileClemencyPetition,
  nextClemencyPetitionDueAt,
} from "./clemency";
import { clemencyAuthorityFor, EXECUTIVE_BODY } from "./clemency-rules";
import {
  answersTo,
  CLEMENCY_DENIED_EVENT,
  PETITION_TAG,
} from "./clemency-records";
import { composeWorldTimeHandlers } from "../campaigns";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import { currentLifeCutoff } from "../life-queries";
import {
  currentGoverningOffices,
  governingMatters,
} from "../governing/state-governing";
import { CLEMENCY_PETITION_TRANSITION_KEY } from "./clemency-transitions";
import { sentencesOf } from "./jail-terms";
import {
  enterPlea,
  referForProsecution,
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
  advanceProsecutions,
  courtCasesOf,
} from "./prosecution";

const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.A98_PROOF_PATH)
    writeFileSync(
      process.env.A98_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

function sentencedCaseFixture(
  state: ReturnType<typeof lifePlaceStateIdentities>[number],
  offenseKey: string,
) {
  // A small world (tests/fixtures/small-world.ts) with its governor seated.
  const small = smallWorld({
    place: state.jurisdictionKey,
    seed: `team9-a98-unseated:${state.jurisdictionKey}`,
    offices: ["governor"],
  });
  const game = { world: small.world };
  const petitionerId = small.personId;
  const facts =
    offenseKey === "crime:vandalism"
      ? recordedVandalismClemencyCase(
          game.world,
          petitionerId,
          state.jurisdictionKey,
        )
      : {
          world: game.world,
          basisEventIds: [],
          sentencingAllegations: undefined,
        };
  const referred = referForProsecution(facts.world, {
    stableKey: "fixture:g12-executive-case",
    subjectPersonId: petitionerId,
    jurisdictionId: game.world.people[petitionerId]!.homeJurisdictionId,
    offenseKey,
    referredBy: {
      kind: "police",
      label: `police (authored ${offenseKey} fixture)`,
      personId: null,
    },
    basisEventIds: facts.basisEventIds,
    sentencingAllegations: facts.sentencingAllegations,
    evidence: "documentary",
    standingFindings: 6,
  });
  const referral = referred.world.history.events.find(
    (event) => event.id === referred.referralId,
  )!;

  const chargeDue = referred.world.history.futureDueItems.find(
    (item) => item.stableKey === `justice:prosecution-stage:${referral.id}`,
  );
  expect(chargeDue).toBeDefined();
  expect(chargeDue!.entityIds).toContain(petitionerId);
  expect(chargeDue!.jurisdictionId).toBe(referral.jurisdictionId);
  let caseWorld = referred.world;
  for (const item of caseWorld.history.futureDueItems) {
    if (
      item.id === chargeDue!.id ||
      futureDueItemStateAt(caseWorld, item.id, currentLifeCutoff(caseWorld))
        ?.status !== "scheduled"
    )
      continue;
    caseWorld = cancelFutureDueItem(caseWorld, {
      stableKey: `fixture:clemency-isolate:${item.id}`,
      dueItemId: item.id,
      effectiveAt: caseWorld.currentDate,
      reasonKey: "fixture:isolated-court",
      context:
        "Retain unrelated commitments while isolating this saved court case.",
    });
  }
  const charged = resolveFutureDueItemsThrough(
    caseWorld,
    chargeDue!.dueAt,
    createProsecutionTransitionRegistry(),
  );
  const plea = enterPlea(charged, {
    personId: petitionerId,
    referralId: referred.referralId,
    plea: "guilty",
  });
  expect(plea.ok).toBe(true);
  const chargedEvent = charged.history.events.find(
    (event) =>
      event.type === PROSECUTION_CHARGED_EVENT &&
      event.tags.includes(`${REFERRAL_TAG}${referral.id}`),
  )!;
  expect(chargedEvent).toBeDefined();
  expect(
    chargedEvent.participants.some(
      (participant) =>
        participant.role === "focus:defendant" &&
        participant.personId === petitionerId,
    ),
  ).toBe(true);
  const trialDue = plea.world.history.futureDueItems.find(
    (item) => item.stableKey === `justice:prosecution-stage:${chargedEvent.id}`,
  );
  expect(trialDue).toBeDefined();
  expect(trialDue!.entityIds).toContain(petitionerId);
  expect(trialDue!.jurisdictionId).toBe(chargedEvent.jurisdictionId);
  const sentenced = resolveFutureDueItemsThrough(
    plea.world,
    trialDue!.dueAt,
    createProsecutionTransitionRegistry(),
  );
  return { sentenced, referred, petitionerId };
}

function caseFixture(
  state: ReturnType<typeof lifePlaceStateIdentities>[number],
  reachServiceGate = true,
) {
  const { sentenced, petitionerId } = sentencedCaseFixture(
    state,
    "crime:vandalism",
  );
  const actualSentence = sentenced.history.events.find(
    (event) =>
      event.type === PROSECUTION_SENTENCED_EVENT &&
      event.involvedEntityIds.includes(petitionerId),
  );
  expect(actualSentence).toBeDefined();
  const sentenceId = actualSentence!.id;
  const term = sentencesOf(sentenced, petitionerId).find(
    (sentence) => sentence.sentencedEventId === sentenceId,
  )!;
  expect(term.until).not.toBeNull();
  if (term.until === null)
    throw new Error("The fixture's recorded sentence has no end date.");
  // Reach the existing service gate through the real clock; never backdate saved events.
  const served = reachServiceGate
    ? advanceWorld(
        sentenced,
        daysBetween(
          sentenced.currentDate,
          addDays(
            term.from,
            Math.ceil(daysBetween(term.from, term.until) / 2) + 1,
          ),
        ),
        recordedCourtFixtureClock(),
      )
    : sentenced;
  const filed = fileClemencyPetition(served, {
    personId: petitionerId,
    sentencedEventId: sentenceId,
  });
  expect(filed.ok, filed.ok ? undefined : filed.reason).toBe(true);
  if (!filed.ok) throw new Error(filed.reason);
  const petitionId = filed.petitionId;

  return { filed, petitionerId, sentenceId, petitionId };
}

describe("unsupported campaign-funds sentencing remains visibly pending", () => {
  const states = pickDistinct(
    new SeededRng("team9-a10-missing-offense-range"),
    lifePlaceStateIdentities(),
    5,
  );
  it.each(states)(
    "keeps the named campaign-funds case unsentenced in $jurisdictionKey",
    (state) => {
      const { sentenced, referred, petitionerId } = sentencedCaseFixture(
        state,
        "campaign-funds-personal-use",
      );
      const visibleCase = courtCasesOf(sentenced, petitionerId).find(
        (row) => row.referralId === referred.referralId,
      );
      expect(visibleCase).toBeDefined();
      expect(visibleCase!.offenseLabel).toBe(
        "taking campaign money for personal use",
      );
      expect(visibleCase!.sentencedEventId).toBeNull();
      expect(sentencesOf(sentenced, petitionerId)).toHaveLength(0);
      const restored = deserializeWorld(serializeWorld(sentenced));
      const repeated = advanceProsecutions(restored);
      expect(repeated.history.events).toEqual(sentenced.history.events);
      expect(repeated.history.decisionTraces).toEqual(
        sentenced.history.decisionTraces,
      );
      expect(courtCasesOf(repeated, petitionerId)).toContainEqual(visibleCase);
      expect(sentencesOf(repeated, petitionerId)).toHaveLength(0);
      const continued = deserializeWorld(serializeWorld(repeated));
      expect(advanceProsecutions(continued).history.decisionTraces).toEqual(
        sentenced.history.decisionTraces,
      );
    },
    30_000,
  );
});

describe("unseated required pardon bodies cannot answer", () => {
  const places = lifePlaceStateIdentities();
  const permutation = pickDistinct(
    new SeededRng("team9-a98-five"),
    places,
    places.length,
  );
  const states = permutation
    .filter((state) => {
      const authority = clemencyAuthorityFor(state.jurisdictionKey);
      return authority?.gates.some(
        (gate) =>
          gate.mustAgree.length > 0 && gate.mustAgree[0] !== EXECUTIVE_BODY,
      );
    })
    .slice(0, 1);
  it.each(states)(
    "retains the actual petition without a board answer in $jurisdictionKey",
    (state) => {
      const { filed, petitionerId, sentenceId, petitionId } =
        caseFixture(state);

      const pending = advanceClemencyPetition(filed.world, petitionId);
      expect(clemencyPetitionStatus(pending, petitionId)).toBe("open");
      expect(answersTo(pending, petitionId)).toEqual([]);
      expect(nextClemencyPetitionDueAt(pending, petitionId)).toBe(
        sentencesOf(pending, petitionerId).find(
          (row) => row.sentencedEventId === sentenceId,
        )!.until,
      );
      const continued = deserializeWorld(serializeWorld(pending));
      assertWorldIntegrity(continued);
      expect(advanceClemencyPetition(continued, petitionId)).toBe(continued);
      expect(answersTo(continued, petitionId)).toEqual([]);
      expect(
        continued.history.events.find((row) => row.id === petitionId),
      ).toEqual(
        filed.world.history.events.find((row) => row.id === petitionId),
      );
      receipts.push({
        place: state.jurisdictionKey,
        name: personName(continued.people[petitionerId]!),
        petitionerId,
        sentenceId,
        petitionId,
        status: clemencyPetitionStatus(continued, petitionId),
        answers: answersTo(continued, petitionId).length,
        nextDueAt: nextClemencyPetitionDueAt(continued, petitionId),
        reloadRepeat: "unchanged",
        fixture:
          "Authored older-save dates on actual prosecution records; unchanged existing sentence writer.",
      });
    },
  );
});

it("Kansas waits for the sourced advisory deadline before reaching the actual executive", () => {
  const state = lifePlaceStateIdentities().find(
    (row) => row.jurisdictionKey === "US-KS",
  )!;
  const { filed, petitionerId, sentenceId, petitionId } = caseFixture(
    state,
    false,
  );
  const authority = clemencyAuthorityFor(state.jurisdictionKey)!;
  const cap = authority.gates.find(
    (gate) => gate.advisory?.reportWithinDays !== undefined,
  )!.advisory!.reportWithinDays!;
  expect(cap).toBe(120);
  const petition = filed.world.history.events.find(
    (row) => row.id === petitionId,
  )!;
  const deadline = addDays(petition.occurredAt, cap);
  expect(nextClemencyPetitionDueAt(filed.world, petitionId)).toBe(deadline);
  const actualDue = filed.world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === CLEMENCY_PETITION_TRANSITION_KEY &&
      item.stableKey.startsWith(
        `${CLEMENCY_PETITION_TRANSITION_KEY}:${petitionId}:`,
      ) &&
      item.dueAt === deadline,
  );
  expect(actualDue).toBeDefined();
  expect(actualDue!.entityIds).toContain(petitionerId);
  let isolated = filed.world;
  for (const item of isolated.history.futureDueItems) {
    if (item.id === actualDue!.id) continue;
    if (
      futureDueItemStateAt(isolated, item.id, currentLifeCutoff(isolated))
        ?.status !== "scheduled"
    )
      continue;
    isolated = cancelFutureDueItem(isolated, {
      stableKey: `fixture:a98-kansas-isolate:${item.id}`,
      dueItemId: item.id,
      effectiveAt: isolated.currentDate,
      reasonKey: "fixture:isolated-kansas-advisory",
      context:
        "Retain the actual petition's due item and isolate unrelated commitments.",
    });
  }
  expect(
    futureDueItemStateAt(isolated, actualDue!.id, currentLifeCutoff(isolated))
      ?.status,
  ).toBe("scheduled");
  const registry = composeWorldTimeHandlers();
  // The due resolver advances only when a saved item is delivered. An explicit
  // older-save boundary snapshot tests the day before the sourced report cap.
  // The actual retained due item still delivers the deadline through the registry.
  const early = advanceWorld(
    isolated,
    daysBetween(isolated.currentDate, addDays(deadline, -1)),
    recordedCourtFixtureClock(),
  );
  expect(early.currentDate).toBe(addDays(deadline, -1));
  const noBypass = advanceClemencyPetition(early, petitionId);
  expect(clemencyPetitionStatus(noBypass, petitionId)).toBe("open");
  expect(answersTo(noBypass, petitionId)).toEqual([]);
  expect(
    governingMatters(noBypass).filter(
      (row) =>
        row.family === "clemency" &&
        row.openedEvent.tags.includes(`source-event:${petitionId}`),
    ),
  ).toEqual([]);
  const atDeadline = resolveFutureDueItemsThrough(noBypass, deadline, registry);
  const matter = governingMatters(atDeadline).find(
    (row) =>
      row.family === "clemency" &&
      row.openedEvent.tags.includes(`source-event:${petitionId}`),
  );
  expect(matter).toBeDefined();
  const office = currentGoverningOffices(atDeadline).find(
    (row) => row.stateUsps === "KS",
  )!;
  expect(matter!.holderPersonId).toBe(office.holderPersonId);
  expect(matter!.openedEvent.occurredAt).toBe(deadline);
  expect(matter!.status).toBe("open");
  expect(clemencyPetitionStatus(atDeadline, petitionId)).toBe("open");
  expect(answersTo(atDeadline, petitionId)).toEqual([]);
  const saved = deserializeWorld(serializeWorld(atDeadline));
  assertWorldIntegrity(saved);
  expect(advanceClemencyPetition(saved, petitionId)).toBe(saved);
  expect(saved.history.events.find((row) => row.id === petitionId)).toEqual(
    petition,
  );
  receipts.push({
    place: "US-KS",
    name: personName(saved.people[petitionerId]!),
    petitionerId,
    sentenceId,
    petitionId,
    source: "K.S.A.22-3701(d), existing authority record",
    advisoryDays: cap,
    deadline,
    earlyDate: noBypass.currentDate,
    bodyAnswers: answersTo(saved, petitionId).length,
    executiveHolderId: matter!.holderPersonId,
    executiveMatterId: matter!.id,
    executiveOpenedAt: matter!.openedEvent.occurredAt,
    reloadRepeat: "unchanged",
    registry: "composeWorldTimeHandlers",
  });
});

it("the actual sentence-end due item lapses a waiting body petition without votes", () => {
  const state = lifePlaceStateIdentities().find(
    (row) => row.jurisdictionKey === "US-MN",
  )!;
  const { filed, petitionerId, sentenceId, petitionId } = caseFixture(state);
  const pending = advanceClemencyPetition(filed.world, petitionId);
  const until = sentencesOf(pending, petitionerId).find(
    (row) => row.sentencedEventId === sentenceId,
  )!.until;
  expect(until).not.toBeNull();
  if (until === null)
    throw new Error("The fixture's recorded sentence has no end date.");
  const actualDue = pending.history.futureDueItems.find(
    (item) =>
      item.transitionKey === CLEMENCY_PETITION_TRANSITION_KEY &&
      item.stableKey.startsWith(
        `${CLEMENCY_PETITION_TRANSITION_KEY}:${petitionId}:`,
      ) &&
      item.dueAt === until,
  )!;
  expect(actualDue).toBeDefined();
  let isolated = pending;
  for (const item of isolated.history.futureDueItems) {
    if (item.id === actualDue.id) continue;
    if (
      futureDueItemStateAt(isolated, item.id, currentLifeCutoff(isolated))
        ?.status !== "scheduled"
    )
      continue;
    isolated = cancelFutureDueItem(isolated, {
      stableKey: `fixture:a98-expiry-isolate:${item.id}`,
      dueItemId: item.id,
      effectiveAt: isolated.currentDate,
      reasonKey: "fixture:isolated-body-expiry",
      context: "Retain the actual petition sentence-end due item.",
    });
  }
  // Explicit older-save boundary snapshot, not an invented hearing or retry.
  const before = advanceWorld(
    isolated,
    daysBetween(isolated.currentDate, addDays(until, -1)),
    recordedCourtFixtureClock(),
  );
  expect(
    clemencyPetitionStatus(
      advanceClemencyPetition(before, petitionId),
      petitionId,
    ),
  ).toBe("open");
  expect(answersTo(before, petitionId)).toEqual([]);
  const closed = resolveFutureDueItemsThrough(
    before,
    until,
    composeWorldTimeHandlers(),
  );
  expect(clemencyPetitionStatus(closed, petitionId)).toBe("denied");
  expect(answersTo(closed, petitionId)).toEqual([]);
  const lapse = closed.history.events.find(
    (event) =>
      event.type === CLEMENCY_DENIED_EVENT &&
      event.tags.includes(`${PETITION_TAG}${petitionId}`),
  )!;
  expect(lapse.tags).toContain("justice.clemency-lapsed");
  expect(lapse.summary).toContain("The sentence ended before an answer came.");
  expect(lapse.occurredAt).toBe(until);
  const saved = deserializeWorld(serializeWorld(closed));
  assertWorldIntegrity(saved);
  expect(advanceClemencyPetition(saved, petitionId)).toBe(saved);
  expect(answersTo(saved, petitionId)).toEqual([]);
  expect(
    saved.history.events.filter(
      (event) =>
        event.type === CLEMENCY_DENIED_EVENT &&
        event.tags.includes(`${PETITION_TAG}${petitionId}`),
    ),
  ).toHaveLength(1);
  receipts.push({
    place: "US-MN",
    name: personName(saved.people[petitionerId]!),
    petitionerId,
    sentenceId,
    petitionId,
    dueItemId: actualDue.id,
    until,
    lapseEventId: lapse.id,
    bodyAnswers: 0,
    status: "lapsed at actual sentence expiry",
    reloadRepeat: "unchanged",
    fixture:
      "Explicit day-before snapshot; actual saved due and production registry deliver sentence expiry.",
  });
});
