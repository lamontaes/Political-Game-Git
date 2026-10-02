import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { addDays } from "../dates";
import { composeWorldTimeHandlers } from "../campaigns";
import { createPressTransitionRegistry } from "../press/transitions";
import { PRESS_DESK_SWEEP_TRANSITION_KEY } from "../press/desk";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
  scheduleFutureDueItem,
} from "../future-transitions";
import { currentLifeCutoff } from "../life-queries";
import { lifePlaceStateIdentities } from "../life-places";
import { personName } from "../people";
import { pickDistinct, SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { assertWorldIntegrity } from "../world";
import {
  advanceClemencyPetition,
  clemencyPetitionStatus,
  fileClemencyPetition,
  nextClemencyPetitionDueAt,
} from "./clemency";
import {
  CLEMENCY_PETITION_TRANSITION_KEY,
  ensureClemencyPetitionSchedule,
} from "./clemency-transitions";
import {
  PROSECUTION_SENTENCED_EVENT,
  enterPlea,
  referForProsecution,
} from "./prosecution";
import { prosecutionTimingFor } from "./prosecution-timing";

const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.G12_CLEMENCY_PROOF_PATH)
    writeFileSync(
      process.env.G12_CLEMENCY_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

describe("a saved clemency petition runs on its own existing boundaries", () => {
  const seed = "team9-g10-floor-five-20260930";
  const states = pickDistinct(
    new SeededRng(seed),
    lifePlaceStateIdentities(),
    1,
  );
  it.each(states)(
    "reviews the actual petitioner in $jurisdictionKey",
    (state) => {
      // A real contested trial needs an eligible full panel. Generate the
      // small world's residents; never manufacture a verdict or sentence.
      const small = smallWorld({
        place: state.jurisdictionKey,
        seed: `team9-g12-clemency:${state.jurisdictionKey}`,
        offices: ["governor"],
        people: 40,
      });
      const game = { world: small.world };
      const personId = small.personId;
      const referred = referForProsecution(game.world, {
        stableKey: "fixture:g12-clemency-case",
        subjectPersonId: personId,
        jurisdictionId: game.world.people[personId]!.homeJurisdictionId,
        offenseKey: "crime:robbery",
        referredBy: { kind: "police", label: "police", personId: null },
        basisEventIds: [],
        evidence: "documentary",
        standingFindings: 6,
      });
      const timing = prosecutionTimingFor(state.jurisdictionKey);
      const chargedAt = addDays(
        referred.world.currentDate,
        timing.chargeDecisionDays,
      );
      // Enter the contested plea after charging, before its trial boundary. Do
      // not backdate saved events and accidentally reach trial first.
      const charged = resolveFutureDueItemsThrough(
        referred.world,
        chargedAt,
        composeWorldTimeHandlers(),
      );
      const plea = enterPlea(charged, {
        personId,
        referralId: referred.referralId,
        // A contested trial supplies this clock fixture with a serving term;
        // a sourced zero-month guilty-plea term is already served and cannot
        // support a clemency request. Keep the same person and assertions.
        plea: "not-guilty",
      });
      expect(plea.ok).toBe(true);
      const sentenced = resolveFutureDueItemsThrough(
        plea.world,
        addDays(chargedAt, timing.resolveAfterDays),
        composeWorldTimeHandlers(),
      );
      const sentence = sentenced.history.events.find(
        (event) =>
          event.type === PROSECUTION_SENTENCED_EVENT &&
          event.involvedEntityIds.includes(personId),
      );
      if (process.env.G12_CLEMENCY_DIAGNOSTIC_PATH)
        writeFileSync(
          process.env.G12_CLEMENCY_DIAGNOSTIC_PATH,
          JSON.stringify(
            {
              state: state.jurisdictionKey,
              currentDate: sentenced.currentDate,
              personId,
              referralId: referred.referralId,
              events: sentenced.history.events.filter(
                (event) =>
                  event.id === referred.referralId ||
                  event.tags.includes(
                    `justice.referral:${referred.referralId}`,
                  ),
              ),
              decisions: sentenced.history.decisionTraces.filter((trace) =>
                trace.context.stableKey.includes("fixture:g12-clemency-case"),
              ),
              seatTenures: sentenced.judiciary?.seatTenures,
            },
            null,
            2,
          ),
        );
      expect(sentence).toBeDefined();
      const filed = fileClemencyPetition(sentenced, {
        personId,
        sentencedEventId: sentence!.id,
      });
      expect(filed.ok, filed.ok ? "" : filed.reason).toBe(true);
      if (!filed.ok) throw new Error(filed.reason);
      let isolated = filed.world;
      for (const item of isolated.history.futureDueItems)
        if (
          item.transitionKey !== CLEMENCY_PETITION_TRANSITION_KEY &&
          futureDueItemStateAt(isolated, item.id, currentLifeCutoff(isolated))
            ?.status === "scheduled"
        )
          isolated = cancelFutureDueItem(isolated, {
            stableKey: `fixture:g12-clemency-cancel:${item.id}`,
            dueItemId: item.id,
            effectiveAt: isolated.currentDate,
            reasonKey: "fixture:isolated-clemency",
            context: "Isolate the actual petition clock.",
          });
      const due = nextClemencyPetitionDueAt(isolated, filed.petitionId)!;
      expect(due).not.toBeNull();
      expect(due > isolated.currentDate).toBe(true);
      const item = isolated.history.futureDueItems.find(
        (item) =>
          item.transitionKey === CLEMENCY_PETITION_TRANSITION_KEY &&
          item.dueAt === due,
      )!;
      expect(item.entityIds).toEqual([personId]);
      expect(ensureClemencyPetitionSchedule(isolated, filed.petitionId)).toBe(
        isolated,
      );
      const pressOnly = scheduleFutureDueItem(
        cancelFutureDueItem(isolated, {
          stableKey: `a10-fixture-cancel:${item.id}`,
          dueItemId: item.id,
          effectiveAt: isolated.currentDate,
          reasonKey: "fixture:press-only",
          context: "Isolate a newspaper sweep from the petition's due item.",
        }),
        {
          stableKey: "press46:desk-sweep:900",
          dueAt: due,
          transitionKey: PRESS_DESK_SWEEP_TRANSITION_KEY,
          entityIds: [isolated.id],
          jurisdictionId: null,
          provenance: { kind: "simulated", sourceEntityIds: [isolated.id] },
        },
      );
      const swept = resolveFutureDueItemsThrough(
        pressOnly,
        due,
        createPressTransitionRegistry(),
      );
      expect(swept.currentDate).toBe(due);
      expect(clemencyPetitionStatus(swept, filed.petitionId)).toBe(
        clemencyPetitionStatus(isolated, filed.petitionId),
      );
      expect(
        swept.history.events.filter((event) =>
          event.type.startsWith("justice."),
        ),
      ).toEqual(
        pressOnly.history.events.filter((event) =>
          event.type.startsWith("justice."),
        ),
      );
      const atDue = resolveFutureDueItemsThrough(
        isolated,
        due,
        composeWorldTimeHandlers(),
      );
      expect(atDue.currentDate).toBe(due);
      expect(atDue.history.events.length).toBeGreaterThan(
        isolated.history.events.length,
      );
      expect(clemencyPetitionStatus(atDue, filed.petitionId)).toBe("denied");
      expect(
        atDue.history.events.find((event) => event.id === sentence!.id),
      ).toEqual(sentence);
      const saved = deserializeWorld(serializeWorld(atDue));
      assertWorldIntegrity(saved);
      const reviewed = advanceClemencyPetition(saved, filed.petitionId);
      expect(reviewed.history.events).toEqual(saved.history.events);
      const replay = resolveFutureDueItemsThrough(
        saved,
        due,
        composeWorldTimeHandlers(),
      );
      expect(serializeWorld(replay)).toBe(serializeWorld(saved));
      receipts.push({
        seed,
        place: state.jurisdictionKey,
        name: personName(saved.people[personId]!),
        personId,
        sentenceId: sentence!.id,
        petitionId: filed.petitionId,
        dueItemId: item.id,
        due,
        status: clemencyPetitionStatus(saved, filed.petitionId),
        composedCourtHandler: true,
        pressOnlyJusticeUnchanged: true,
        successor: nextClemencyPetitionDueAt(saved, filed.petitionId),
      });
    },
  );
});
