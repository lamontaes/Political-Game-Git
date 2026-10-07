import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { SeededRng, pickDistinct } from "../rng";
import { lifePlaceStateIdentities } from "../life-places";
import { addDays } from "../dates";
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
import { referForProsecution, PROSECUTION_CHARGED_EVENT } from "./prosecution";
import { prosecutionTimingFor } from "./prosecution-timing";
import { PROSECUTION_STAGE_TRANSITION_KEY } from "./prosecution-transitions";

const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.A10_COMPOSER_PROOF_PATH)
    writeFileSync(
      process.env.A10_COMPOSER_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

// Full production composer with unrelated saved commitments canonically
// cancelled; this is a bounded case-clock proof, not a whole-world year.
describe("the current production composer dispatches saved case stages", () => {
  const rng = new SeededRng("team9-g10-floor-five-20260930");
  const states = pickDistinct(rng, lifePlaceStateIdentities(), 5);
  it.each(states)(
    "charges the named defendant on the actual due date in $jurisdictionKey",
    (state) => {
      const seed = `team9-a10-composed-case:${state.jurisdictionKey}`;
      const small = smallWorld({ place: state.jurisdictionKey, seed });
      const place = small.place;
      let isolated = small.world;
      const timing = prosecutionTimingFor(state.jurisdictionKey);
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
      const subjectId = small.personId;
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
        addDays(isolated.currentDate, timing.chargeDecisionDays),
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
        addDays(item.dueAt, timing.resolveAfterDays),
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
      receipts.push({
        seed,
        place: place.key,
        personId: subjectId,
        name: personName(charged.people[subjectId]!),
        referralId: referral.referralId,
        dueItemId: item.id,
        dueAt: item.dueAt,
        chargeId: events[0]!.id,
        chargeDate: events[0]!.occurredAt,
        trialDueItemId: trialItem.id,
        trialDueAt: trialItem.dueAt,
        timingBasis: timing.resolveBasis,
        composer: "composeWorldTimeHandlers",
        savedStageReplay: "unchanged",
      });
    },
  );
});
