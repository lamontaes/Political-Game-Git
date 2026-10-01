import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { addDays, daysBetween } from "../dates";
import { lifePlaceStateIdentities } from "../life-places";
import { personName } from "../people";
import { SeededRng, pickDistinct } from "../rng";
import { serializeWorld, deserializeWorld } from "../serialization";
import { assertWorldIntegrity } from "../world";
import type { World } from "../types";
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
  advanceProsecutions,
  enterPlea,
  referForProsecution,
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
  UNRESEARCHED_PROSECUTION,
} from "./prosecution";
import { prosecutionTimingFor } from "./prosecution-timing";

const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.A98_PROOF_PATH)
    writeFileSync(
      process.env.A98_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

function caseFixture(
  state: ReturnType<typeof lifePlaceStateIdentities>[number],
) {
  // A small world (tests/fixtures/small-world.ts) with its governor seated.
  const small = smallWorld({
    place: state.jurisdictionKey,
    seed: `team9-a98-unseated:${state.jurisdictionKey}`,
    offices: ["governor"],
  });
  const game = { world: small.world };
  const petitionerId = small.personId;
  const referred = referForProsecution(game.world, {
    stableKey: "fixture:g12-executive-case",
    subjectPersonId: petitionerId,
    jurisdictionId: game.world.people[petitionerId]!.homeJurisdictionId,
    offenseKey: "campaign-funds-personal-use",
    referredBy: {
      kind: "regulator",
      label: "state regulator",
      personId: null,
    },
    basisEventIds: [],
    evidence: "documentary",
    standingFindings: 6,
  });
  const stale: World = {
    ...referred.world,
    history: {
      ...referred.world.history,
      events: referred.world.history.events.map((event) =>
        event.id === referred.referralId
          ? {
              ...event,
              occurredAt: addDays(game.world.currentDate, -200),
            }
          : event,
      ),
    },
  };
  const charged = advanceProsecutions(stale);
  const plea = enterPlea(charged, {
    personId: petitionerId,
    referralId: referred.referralId,
    plea: "guilty",
  });
  expect(plea.ok).toBe(true);
  const trialDue: World = {
    ...plea.world,
    history: {
      ...plea.world.history,
      events: plea.world.history.events.map((event) =>
        event.type === PROSECUTION_CHARGED_EVENT &&
        event.involvedEntityIds.includes(petitionerId)
          ? {
              ...event,
              occurredAt: addDays(
                plea.world.currentDate,
                -prosecutionTimingFor(state.jurisdictionKey).resolveAfterDays,
              ),
            }
          : event,
      ),
    },
  };
  const sentenced = advanceProsecutions(trialDue);
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
  // Authored older-save fixture: the real sentence has already reached
  // the existing body's service gate. No outcome or new wait is invented.
  const sentenceDate = addDays(
    sentenced.currentDate,
    -Math.ceil(daysBetween(term.from, term.until) / 2) - 1,
  );
  const served: World = {
    ...sentenced,
    history: {
      ...sentenced.history,
      events: sentenced.history.events.map((event) =>
        event.id === referred.referralId
          ? {
              ...event,
              occurredAt: addDays(
                sentenceDate,
                -UNRESEARCHED_PROSECUTION.chargeDecisionDays -
                  prosecutionTimingFor(state.jurisdictionKey).resolveAfterDays,
              ),
            }
          : event.type === PROSECUTION_CHARGED_EVENT &&
              event.involvedEntityIds.includes(petitionerId)
            ? {
                ...event,
                occurredAt: addDays(
                  sentenceDate,
                  -prosecutionTimingFor(state.jurisdictionKey).resolveAfterDays,
                ),
              }
            : event.id === sentenceId
              ? {
                  ...event,
                  occurredAt: sentenceDate,
                }
              : event,
      ),
    },
  };
  const filed = fileClemencyPetition(served, {
    personId: petitionerId,
    sentencedEventId: sentenceId,
  });
  expect(filed.ok).toBe(true);
  if (!filed.ok) throw new Error(filed.reason);
  const petitionId = filed.petitionId;

  return { filed, petitionerId, sentenceId, petitionId };
}

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
  const { filed, petitionerId, sentenceId, petitionId } = caseFixture(state);
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
  const early: World = { ...isolated, currentDate: addDays(deadline, -1) };
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
  const before: World = { ...isolated, currentDate: addDays(until, -1) };
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
