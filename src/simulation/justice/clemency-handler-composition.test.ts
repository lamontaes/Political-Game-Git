import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { addDays } from "../dates";
import { composeWorldTimeHandlers } from "../campaigns";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import { currentLifeCutoff } from "../life-queries";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { personName } from "../people";
import { pickDistinct, SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { World } from "../types";
import { assertWorldIntegrity } from "../world";
import {
  advanceClemencyPetition,
  clemencyPetitionStatus,
  fileClemencyPetition,
  nextClemencyPetitionDueAt,
} from "./clemency";
import {
  CLEMENCY_PETITION_TRANSITION_KEY,
  clemencyPetitionHandler,
  ensureClemencyPetitionSchedule,
} from "./clemency-transitions";
import {
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
  advanceProsecutions,
  enterPlea,
  referForProsecution,
  UNRESEARCHED_PROSECUTION,
} from "./prosecution";

const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.G12_CLEMENCY_PROOF_PATH)
    writeFileSync(
      process.env.G12_CLEMENCY_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

describe("the complete composer dispatches saved clemency petitions", () => {
  it("cold loads the function cycle and admits the actual petition handler", () => {
    expect(
      composeWorldTimeHandlers().get(CLEMENCY_PETITION_TRANSITION_KEY),
    ).toBe(clemencyPetitionHandler);
  });
  const seed = "team9-g10-floor-five-20260930";
  const states = pickDistinct(
    new SeededRng(seed),
    lifePlaceStateIdentities(),
    5,
  );
  it.each(states)(
    "reviews the actual petitioner in $jurisdictionKey",
    (state: (typeof states)[number]) => {
      const place =
        searchLifePlaces("", 5000, {
          stateJurisdictionKey: state.jurisdictionKey,
          scope: "locality",
        })[0] ??
        searchLifePlaces("", 5, {
          stateJurisdictionKey: state.jurisdictionKey,
          scope: "state",
        })[0]!;
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: `team9-g12-clemency:${state.jurisdictionKey}`,
          placeKey: place.key,
          startAge: 40,
          questionnaire: "skipped",
        }),
      ).game!;
      const personId = game.playerPersonId;
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
      // Authored historical fixture inputs make the saved case due; no clock backfill.
      const stale: World = {
        ...referred.world,
        history: {
          ...referred.world.history,
          events: referred.world.history.events.map((event) =>
            event.id === referred.referralId
              ? { ...event, occurredAt: addDays(game.world.currentDate, -200) }
              : event,
          ),
        },
      };
      const charged = advanceProsecutions(stale);
      const plea = enterPlea(charged, {
        personId,
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
            event.involvedEntityIds.includes(personId)
              ? {
                  ...event,
                  occurredAt: addDays(
                    plea.world.currentDate,
                    -UNRESEARCHED_PROSECUTION.resolveAfterDays,
                  ),
                }
              : event,
          ),
        },
      };
      const sentenced = advanceProsecutions(trialDue);
      const sentence = sentenced.history.events.find(
        (event) =>
          event.type === PROSECUTION_SENTENCED_EVENT &&
          event.involvedEntityIds.includes(personId),
      );
      expect(sentence).toBeDefined();
      const filed = fileClemencyPetition(sentenced, {
        personId,
        sentencedEventId: sentence!.id,
      });
      expect(filed.ok).toBe(true);
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
        successor: nextClemencyPetitionDueAt(saved, filed.petitionId),
      });
    },
  );
});
