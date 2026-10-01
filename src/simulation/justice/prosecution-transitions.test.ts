import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { SeededRng, pickDistinct } from "../rng";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { addDays } from "../dates";
import { currentLifeCutoff } from "../life-queries";
import {
  cancelFutureDueItem,
  createFutureTransitionHandlerRegistry,
  resolveFutureDueItemsThrough,
  futureDueItemStateAt,
} from "../future-transitions";
import { assertWorldIntegrity } from "../world";
import { serializeWorld, deserializeWorld } from "../serialization";
import { personName } from "../people";
import type { World } from "../types";
import {
  advanceProsecutions,
  referForProsecution,
  PROSECUTION_CHARGED_EVENT,
  UNRESEARCHED_PROSECUTION,
} from "./prosecution";
import { prosecutionTimingFor } from "./prosecution-timing";
import {
  prosecutionStageHandler,
  PROSECUTION_STAGE_TRANSITION_KEY,
} from "./prosecution-transitions";

const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.G12_PROOF_PATH)
    writeFileSync(
      process.env.G12_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

// These are isolated real-clock adapter proofs, not complete composer/year runs.
describe("a saved prosecution stage owns its due item", () => {
  const rng = new SeededRng("team9-g10-floor-five-20260930");
  const states = pickDistinct(rng, lifePlaceStateIdentities(), 2);
  it.each(states)(
    "charges the named defendant on the actual due date in $jurisdictionKey",
    (state) => {
      const place =
        searchLifePlaces("", 5000, {
          stateJurisdictionKey: state.jurisdictionKey,
          scope: "locality",
        })[0] ??
        searchLifePlaces("", 5, {
          stateJurisdictionKey: state.jurisdictionKey,
          scope: "state",
        })[0]!;
      const seed = `team9-g12-case-clock:${state.jurisdictionKey}`;
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: place.key,
          startAge: 40,
          questionnaire: "skipped",
        }),
      ).game!;
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
      const subjectId = game.playerPersonId;
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
          UNRESEARCHED_PROSECUTION.chargeDecisionDays,
        ),
      );
      let legacy: World | undefined;
      let calls = 0;
      const registry = createFutureTransitionHandlerRegistry([
        [
          PROSECUTION_STAGE_TRANSITION_KEY,
          (world, due) => {
            calls++;
            legacy = advanceProsecutions(world);
            const result = prosecutionStageHandler(world, due);
            expect(result.world.history.events).toEqual(legacy.history.events);
            return result;
          },
        ],
      ]);
      const reloaded = deserializeWorld(serializeWorld(referral.world));
      const before = resolveFutureDueItemsThrough(
        reloaded,
        addDays(item.dueAt, -1),
        registry,
      );
      expect(calls).toBe(0);
      const charged = resolveFutureDueItemsThrough(
        before,
        item.dueAt,
        registry,
      );
      expect(calls).toBe(1);
      expect(legacy).toBeDefined();
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
      expect(calls).toBe(1);
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
        legacyEventParity: true,
        reloadedRepeatCalls: calls,
      });
    },
  );
});
