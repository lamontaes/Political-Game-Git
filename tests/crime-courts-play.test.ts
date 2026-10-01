import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { smallWorld } from "./fixtures/small-world";
import { projectLegalRecord } from "../src/presentation/legal-record";
import { composeWorldTimeHandlers } from "../src/simulation/campaigns";
import { addDays } from "../src/simulation/dates";
import { currentLifeCutoff } from "../src/simulation/life-queries";
import { lifePlaceStateIdentities } from "../src/simulation/life-places";
import { personName } from "../src/simulation/people";
import { pickDistinct, SeededRng } from "../src/simulation/rng";
import { courtFor } from "../src/simulation/judiciary/court-for";
import {
  buildOpeningCourtCatalog,
  seatJudge,
  seatsForCourt,
} from "../src/simulation/judiciary/courts";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "../src/simulation/future-transitions";
import {
  enterPlea,
  referForProsecution,
  PROSECUTION_SENTENCED_EVENT,
  sentencesOf,
} from "../src/simulation/justice/prosecution";
import { prosecutionTimingFor } from "../src/simulation/justice/prosecution-timing";
import {
  deserializeWorld,
  serializeWorld,
} from "../src/simulation/serialization";
import { assertWorldIntegrity } from "../src/simulation/world";

const SEED = "team9-crime-courts-player-script-20261001";
const states = pickDistinct(
  new SeededRng(SEED),
  lifePlaceStateIdentities(),
  56,
);
const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.CRIME_COURTS_PLAY_PROOF_PATH)
    writeFileSync(
      process.env.CRIME_COURTS_PLAY_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

describe("Crime & Courts eight-step player script", () => {
  it.todo(
    "step 1: a person's recorded causes and choice produce the actual incident",
  );
  it.todo(
    "step 2: the report and actual authorized police person produce the referral",
  );
  it.todo(
    "step 3: the actual dated prosecutor holder decides whether to charge",
  );
  it.todo(
    "step 4: the player pays full bail into the actual court government's account, or remains held",
  );
  it.todo(
    "step 8: the player petitions and the actual authorized holder decides on the saved sentence",
  );
  it.todo(
    "step 6 law change: enacted numeric minimum controls the recorded judge choice under Rulings 25/26",
  );
  it.todo(
    "browser acceptance: the same player buttons execute this script without fixture calls",
  );

  it("uses every jurisdiction once in the seeded script", () => {
    expect(states).toHaveLength(56);
    expect(new Set(states.map((state) => state.jurisdictionKey)).size).toBe(56);
  });

  it.each(states)(
    "steps 5–7: plea, court date and saved legal record in $jurisdictionKey",
    (state) => {
      const opening = smallWorld({
        place: state.jurisdictionKey,
        people: 40,
        seed: SEED,
        date: "2026-01-01",
      });
      let world = buildOpeningCourtCatalog(opening.world);
      const court = courtFor(
        world,
        opening.jurisdictionId,
        "local-general-trial",
        "criminal",
      )!;
      expect(court).toBeDefined();
      const judgeId = world.personOrder.at(-1)!;
      const seat = seatsForCourt(world, court.courtId)[0]!;
      world = seatJudge(world, {
        seatId: seat.seatId,
        personId: judgeId,
        startedAt: world.currentDate,
        selection: {
          path: "initial-world",
          selectionRecordId: null,
          decisionRecordId: null,
          selectingPersonId: null,
          contestId: null,
          note: "Authored court fixture uses an actual generated resident through the existing seat writer.",
        },
        termEndsAt: null,
        retentionDueAt: null,
      });
      for (const item of world.history.futureDueItems)
        if (
          futureDueItemStateAt(world, item.id, currentLifeCutoff(world))
            ?.status === "scheduled"
        )
          world = cancelFutureDueItem(world, {
            stableKey: `crime-play-isolate:${item.id}`,
            dueItemId: item.id,
            effectiveAt: world.currentDate,
            reasonKey: "fixture:isolated-court-script",
            context:
              "Preserve unrelated commitments while testing the player's existing court actions.",
          });
      const personId = opening.personId;
      expect(world.control).toMatchObject({ kind: "person", personId });
      // Steps 1–4 remain TODO: this authored documentary referral is a boundary,
      // not proof of natural reporting, prosecutor authority or a bail payment.
      const referral = referForProsecution(world, {
        stableKey: `crime-play:${state.jurisdictionKey}`,
        subjectPersonId: personId,
        jurisdictionId: opening.jurisdictionId,
        offenseKey: "crime:robbery",
        evidence: "documentary",
        standingFindings: 6,
        basisEventIds: [],
        referredBy: {
          kind: "police",
          label: "Authored referral fixture",
          personId: null,
        },
      });
      const timing = prosecutionTimingFor(state.jurisdictionKey);
      const chargedAt = addDays(world.currentDate, timing.chargeDecisionDays);
      const handlers = composeWorldTimeHandlers();
      const charged = resolveFutureDueItemsThrough(
        referral.world,
        chargedAt,
        handlers,
      );
      const legal = projectLegalRecord(charged, personId);
      const caseLine = legal.cases.find(
        (row) => row.referralId === referral.referralId,
      )!;
      expect(caseLine).toBeDefined();
      expect(caseLine.canEnterPlea).toBe(true);
      // Step 5: the existing legal tab's actual action saves this person's plea.
      const plea = enterPlea(charged, {
        personId,
        referralId: caseLine.referralId,
        plea: "guilty",
      });
      expect(plea.ok).toBe(true);
      expect(
        projectLegalRecord(plea.world, personId).cases.find(
          (row) => row.referralId === referral.referralId,
        )?.enteredPlea,
      ).toBe("guilty");
      const hearingAt = addDays(chargedAt, timing.resolveAfterDays);
      const before = resolveFutureDueItemsThrough(
        plea.world,
        addDays(hearingAt, -1),
        handlers,
      );
      const belongs = (event: (typeof world.history.events)[number]) =>
        event.type === PROSECUTION_SENTENCED_EVENT &&
        event.tags.includes(`justice.referral:${referral.referralId}`);
      expect(before.history.events.filter(belongs)).toHaveLength(0);
      // Step 6: the actual composed court clock saves the seated judge's result.
      const sentenced = resolveFutureDueItemsThrough(
        before,
        hearingAt,
        handlers,
      );
      const events = sentenced.history.events.filter(belongs);
      expect(events).toHaveLength(1);
      const event = events[0]!;
      expect(event.occurredAt).toBe(hearingAt);
      expect(event.participants).toContainEqual({
        personId: judgeId,
        role: "agency:decided",
        detail: "Judge",
      });
      const term = sentencesOf(sentenced, personId).find(
        (row) => row.sentencedEventId === event.id,
      )!;
      expect(term).toBeDefined();
      const choice = sentenced.history.decisionTraces.find((row) =>
        row.context.stableKey.endsWith(
          `crime-play:${state.jurisdictionKey}:custody-term`,
        ),
      )!;
      expect(choice).toBeDefined();
      expect(choice.context.randomness).toBe("none");
      expect(choice.selectedOptionKey).toBeTypeOf("string");
      // Step 7: the legal view consumes this actual record and Continue preserves it.
      const view = projectLegalRecord(sentenced, personId);
      expect(
        view.sentences.some((row) => row.sentencedEventId === event.id),
      ).toBe(true);
      const restored = deserializeWorld(serializeWorld(sentenced));
      assertWorldIntegrity(restored);
      expect(projectLegalRecord(restored, personId)).toEqual(view);
      const repeated = resolveFutureDueItemsThrough(
        restored,
        hearingAt,
        handlers,
      );
      expect(repeated.history.events).toEqual(sentenced.history.events);
      expect(repeated.history.futureDueItems).toEqual(
        sentenced.history.futureDueItems,
      );
      receipts.push({
        state: state.jurisdictionKey,
        seed: SEED,
        name: personName(sentenced.people[personId]!),
        personId,
        judgeId,
        courtId: court.courtId,
        referralId: referral.referralId,
        sentencedEventId: event.id,
        chargedAt,
        hearingAt,
        term,
        recordedChoice: choice.selectedOptionKey,
        scope:
          "steps 5–7; authored referral boundary; steps 1–4/8 and browser TODO",
      });
    },
    30_000,
  );
});
