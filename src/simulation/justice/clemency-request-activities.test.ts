import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { SeededRng, pickDistinct } from "../rng";
import { lifePlaceStateIdentities } from "../life-places";
import { addDays, ageOnDate } from "../dates";
import { currentLifeCutoff } from "../life-queries";
import {
  cancelFutureDueItem,
  resolveFutureDueItemsThrough,
  futureDueItemStateAt,
} from "../future-transitions";
import { assertWorldIntegrity } from "../world";
import { serializeWorld, deserializeWorld } from "../serialization";
import { personName } from "../people";
import { composeWorldTimeHandlers } from "../campaigns";
import {
  referForProsecution,
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
  enterPlea,
  PROSECUTION_TIMING_PROFILE,
} from "./prosecution";
import { prosecutionTimingFor } from "./prosecution-timing";
import { PROSECUTION_STAGE_TRANSITION_KEY } from "./prosecution-transitions";

import { considerClemencyAfterSentence } from "./clemency";
import { CLEMENCY_PETITION_EVENT } from "./clemency-records";
import { CLEMENCY_SENTENCE_TAG } from "./jail-terms";

const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.A10_NPC_REQUEST_PROOF_PATH)
    writeFileSync(
      process.env.A10_NPC_REQUEST_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

// Full production composer with unrelated saved commitments canonically
// cancelled; this is a bounded case-clock proof, not a whole-world year.
describe("a saved NPC sentence wakes its existing clemency decision", () => {
  const rng = new SeededRng("team9-g10-floor-five-20260930");
  const states = pickDistinct(rng, lifePlaceStateIdentities(), 1);
  it.each(states)(
    "records the named defendant's request decision after sentencing in $jurisdictionKey",
    (state) => {
      const seed = `team9-a10-npc-request:${state.jurisdictionKey}`;
      // A small world (tests/fixtures/small-world.ts) with its governor seated.
      const small = smallWorld({
        place: state.jurisdictionKey,
        seed,
        offices: ["governor"],
      });
      const place = small.place;
      const game = { world: small.world, playerPersonId: small.personId };
      let isolated = game.world;
      // The fixture cancels unrelated opening commitments through the canonical
      // writer, retaining every due record. No saved time is reassigned.
      for (const item of isolated.history.futureDueItems) {
        if (
          futureDueItemStateAt(isolated, item.id, currentLifeCutoff(isolated))
            ?.status !== "scheduled"
        )
          continue;
        isolated = cancelFutureDueItem(isolated, {
          stableKey: `g12-fixture-cancel:${item.id}`,
          dueItemId: item.id,
          effectiveAt: isolated.currentDate,
          reasonKey: "fixture:isolated-court-clock",
          context:
            "Controlled fixture isolates the court adapter from unrelated opening schedules.",
        });
      }
      const subject = Object.values(isolated.people).find(
        (person) =>
          person.id !== game.playerPersonId &&
          person.homeJurisdictionId ===
            isolated.people[game.playerPersonId]!.homeJurisdictionId &&
          ageOnDate(person.birthDate, isolated.currentDate) >= 25,
      );
      expect(subject).toBeDefined();
      const subjectId = subject!.id;
      const input = {
        stableKey: "g12-clock-case",
        subjectPersonId: subjectId,
        jurisdictionId: isolated.people[subjectId]!.homeJurisdictionId,
        offenseKey: "crime:robbery",
        evidence: "documentary" as const,
        standingFindings: 6,
        basisEventIds: [],
        referredBy: {
          kind: "police" as const,
          label: "police",
          personId: null,
        },
      };
      const referral = referForProsecution(isolated, input);
      expect(referForProsecution(referral.world, input).world).toBe(
        referral.world,
      );
      const item = referral.world.history.futureDueItems.find(
        (item) => item.transitionKey === PROSECUTION_STAGE_TRANSITION_KEY,
      )!;
      expect(item.stableKey).toBe(
        `justice:prosecution-stage:${referral.referralId}`,
      );
      expect(item.entityIds).toEqual([subjectId]);
      expect(item.dueAt).toBe(
        addDays(
          isolated.currentDate,
          PROSECUTION_TIMING_PROFILE.chargeDecisionDays,
        ),
      );
      const registry = composeWorldTimeHandlers();
      const reloaded = deserializeWorld(serializeWorld(referral.world));
      const before = resolveFutureDueItemsThrough(
        reloaded,
        addDays(item.dueAt, -1),
        registry,
      );
      expect(
        before.history.events.filter(
          (event) =>
            event.type === PROSECUTION_CHARGED_EVENT &&
            event.involvedEntityIds.includes(subjectId),
        ),
      ).toHaveLength(0);
      const charged = resolveFutureDueItemsThrough(
        before,
        item.dueAt,
        registry,
      );
      const events = charged.history.events.filter(
        (event) =>
          event.type === PROSECUTION_CHARGED_EVENT &&
          event.involvedEntityIds.includes(subjectId),
      );
      expect(
        events,
        `${seed}: ${personName(charged.people[subjectId]!)}`,
      ).toHaveLength(1);
      expect(events[0]!.occurredAt).toBe(item.dueAt);
      expect(
        futureDueItemStateAt(charged, item.id, currentLifeCutoff(charged))
          ?.status,
      ).toBe("resolved");
      const trialItem = charged.history.futureDueItems.find(
        (next) =>
          next.stableKey === `justice:prosecution-stage:${events[0]!.id}`,
      )!;
      expect(trialItem.dueAt).toBe(
        addDays(
          item.dueAt,
          prosecutionTimingFor(state.jurisdictionKey).resolveAfterDays,
        ),
      );
      const saved = deserializeWorld(serializeWorld(charged));
      assertWorldIntegrity(saved);
      const repeated = resolveFutureDueItemsThrough(
        saved,
        item.dueAt,
        registry,
      );
      expect(repeated.history.events).toEqual(charged.history.events);
      expect(repeated.history.futureDueItems).toEqual(
        charged.history.futureDueItems,
      );
      // Explicit case-fixture action uses the existing plea writer. The judge,
      // sentence and later petition choice remain the production decisions.
      const plea = enterPlea(repeated, {
        personId: subjectId,
        referralId: referral.referralId,
        plea: "guilty",
      });
      expect(plea.ok).toBe(true);
      const sentenced = resolveFutureDueItemsThrough(
        plea.world,
        trialItem.dueAt,
        registry,
      );
      const sentence = sentenced.history.events.find(
        (event) =>
          event.type === PROSECUTION_SENTENCED_EVENT &&
          event.involvedEntityIds.includes(subjectId),
      );
      expect(sentence).toBeDefined();
      const trace = sentenced.history.decisionTraces.filter(
        (record) =>
          record.context.decisionType === "justice.clemency-petition" &&
          record.context.actorPersonId === subjectId,
      );
      expect(trace).toHaveLength(1);
      const petitions = sentenced.history.events.filter(
        (event) =>
          event.type === CLEMENCY_PETITION_EVENT &&
          event.tags.includes(`${CLEMENCY_SENTENCE_TAG}${sentence!.id}`),
      );
      expect(petitions).toHaveLength(
        trace[0]!.selectedOptionKey === "petition" ? 1 : 0,
      );
      const continued = deserializeWorld(serializeWorld(sentenced));
      assertWorldIntegrity(continued);
      expect(considerClemencyAfterSentence(continued, sentence!.id)).toBe(
        continued,
      );
      expect(
        considerClemencyAfterSentence(continued, referral.referralId),
      ).toBe(continued);
      const playerControlled = {
        ...continued,
        control: { kind: "person" as const, personId: subjectId },
      };
      expect(
        considerClemencyAfterSentence(playerControlled, sentence!.id),
      ).toBe(playerControlled);
      receipts.push({
        seed,
        place: place.key,
        personId: subjectId,
        name: personName(sentenced.people[subjectId]!),
        referralId: referral.referralId,
        sentenceId: sentence!.id,
        sentenceDate: sentence!.occurredAt,
        decisionId: trace[0]!.id,
        selectedOptionKey: trace[0]!.selectedOptionKey,
        petitionIds: petitions.map((event) => event.id),
        composer: "composeWorldTimeHandlers",
        replay: "unchanged",
      });
    },
  );
});
