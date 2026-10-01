import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { addDays } from "../dates";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { SeededRng, pickDistinct } from "../rng";
import { serializeWorld, deserializeWorld } from "../serialization";
import { personName } from "../people";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import {
  vacateJudicialSeat,
  seatHolderAt,
  seatJudge,
} from "../judiciary/courts";
import { recoverOverdueProsecutions } from "./prosecution-transitions";
import { currentLifeCutoff } from "../life-queries";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
} from "../future-transitions";
import { assertWorldIntegrity } from "../world";
import type { World } from "../types";
import { sentencingJudge, type CourtCase } from "./court-reasoning";
import {
  advanceProsecutions,
  referForProsecution,
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_ENDED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
  PROSECUTION_MISTRIAL_EVENT,
  PROSECUTION_BENCH_ACTIVATION_EVENT,
  UNRESEARCHED_PROSECUTION,
} from "./prosecution";

const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.G13_PROOF_PATH)
    writeFileSync(
      process.env.G13_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

function digest(world: World): string {
  return createHash("sha256").update(serializeWorld(world)).digest("hex");
}

describe("a case requires a sitting judge", () => {
  const seed = "team9-g10-floor-five-20260930";
  const rng = new SeededRng(seed);
  const states = pickDistinct(rng, lifePlaceStateIdentities(), 5);
  it.each(states)(
    "preserves the actual pending defendant in $jurisdictionKey",
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
      const caseSeed = `team9-g13-no-judge:${state.jurisdictionKey}`;
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: caseSeed,
          placeKey: place.key,
          startAge: 40,
          questionnaire: "skipped",
        }),
      ).game!;
      const personId = game.playerPersonId;
      const venue = game.world.people[personId]!.homeJurisdictionId;
      const referred = referForProsecution(game.world, {
        stableKey: "g13-pending-fixture",
        subjectPersonId: personId,
        jurisdictionId: venue,
        offenseKey: "crime:robbery",
        referredBy: { kind: "police", label: "police", personId: null },
        basisEventIds: [],
        evidence: "documentary",
        standingFindings: 6,
      });
      // Historical fixture dates make this real saved case due without moving
      // the world's clock or creating a decision for the player.
      const due: World = {
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
      const charged = advanceProsecutions(due);
      expect(
        charged.history.events.some(
          (event) =>
            event.type === PROSECUTION_CHARGED_EVENT &&
            event.involvedEntityIds.includes(personId),
        ),
      ).toBe(true);
      const trialDue: World = {
        ...charged,
        history: {
          ...charged.history,
          events: charged.history.events.map((event) =>
            event.type === PROSECUTION_CHARGED_EVENT &&
            event.involvedEntityIds.includes(personId)
              ? {
                  ...event,
                  occurredAt: addDays(
                    charged.currentDate,
                    -UNRESEARCHED_PROSECUTION.resolveAfterDays,
                  ),
                }
              : event,
          ),
        },
      };
      const referral = trialDue.history.events.find(
        (event) => event.id === referred.referralId,
      )!;
      const courtCase: CourtCase = {
        caseKey: referral.stableKey,
        defendantId: personId,
        offenseKey: "crime:robbery",
        offenseLabel: "robbery",
        evidence: "documentary",
        standingFindings: 6,
        venueJurisdictionId: venue,
        stateKey: state.jurisdictionKey,
      };
      expect(sentencingJudge(trialDue, courtCase, 0)).not.toBeNull();
      const staffed = advanceProsecutions(trialDue);
      const overdueSave = deserializeWorld(serializeWorld(trialDue));
      const recovered = recoverOverdueProsecutions(overdueSave);
      expect(recovered.history.events).toEqual(staffed.history.events);
      expect(recoverOverdueProsecutions(recovered)).toBe(recovered);
      const judgments = (world: World) =>
        world.history.events.filter(
          (event) =>
            [
              PROSECUTION_ENDED_EVENT,
              PROSECUTION_SENTENCED_EVENT,
              PROSECUTION_MISTRIAL_EVENT,
            ].includes(event.type) &&
            event.involvedEntityIds.includes(personId),
        );
      expect(judgments(staffed).length).toBeGreaterThan(0);
      let vacant = trialDue;
      const eligibleJudge = sentencingJudge(trialDue, courtCase, 0)!;
      const eligibleTenure = trialDue.judiciary!.seatTenures.find(
        (tenure) =>
          tenure.personId === eligibleJudge &&
          tenure.endedAt === null &&
          trialDue.judiciary!.courts[
            trialDue.judiciary!.seats[tenure.seatId]!.courtId
          ]?.level === "local-general-trial",
      )!;
      expect(eligibleTenure).toBeDefined();
      const vacated: string[] = [];
      for (const seat of Object.values(trialDue.judiciary!.seats)) {
        const court = trialDue.judiciary!.courts[seat.courtId];
        if (
          court?.level !== "local-general-trial" ||
          court.jurisdictionId !==
            chiefExecutiveJurisdiction(state.jurisdictionKey.slice(3))?.id
        )
          continue;
        const holder = seatHolderAt(vacant, seat.seatId);
        if (!holder) continue;
        vacant = vacateJudicialSeat(vacant, {
          seatId: seat.seatId,
          vacatedAt: vacant.currentDate,
          reason: "resignation",
        });
        vacated.push(seat.seatId);
      }
      expect(vacated.length).toBeGreaterThan(0);
      expect(sentencingJudge(vacant, courtCase, 0)).toBeNull();
      assertWorldIntegrity(vacant);
      const pending = advanceProsecutions(vacant);
      expect(judgments(pending)).toHaveLength(0);
      expect(pending).toBe(vacant);
      receipts.push({
        seed: caseSeed,
        place: place.key,
        personId,
        name: personName(pending.people[personId]!),
        referralId: referral.id,
        staffedDigest: digest(staffed),
        staffedJudgments: judgments(staffed),
        vacantJudgments: judgments(pending),
        vacatedSeats: vacated,
      });
      const reloaded = deserializeWorld(serializeWorld(pending));
      assertWorldIntegrity(reloaded);
      expect(advanceProsecutions(reloaded).history.events).toEqual(
        pending.history.events,
      );
      expect(recoverOverdueProsecutions(reloaded)).toBe(reloaded);
      let isolated = reloaded;
      for (const item of isolated.history.futureDueItems) {
        if (
          futureDueItemStateAt(isolated, item.id, currentLifeCutoff(isolated))
            ?.status !== "scheduled"
        )
          continue;
        isolated = cancelFutureDueItem(isolated, {
          stableKey: `g12-bench-fixture-cancel:${item.id}`,
          dueItemId: item.id,
          effectiveAt: isolated.currentDate,
          reasonKey: "fixture:isolated-bench-activation",
          context:
            "Isolate the court recovery boundary from unrelated schedules.",
        });
      }
      const dayBoundary = "fixture:bench-reappointment-boundary";
      const scheduledBoundary = scheduleFutureDueItem(isolated, {
        stableKey: `${dayBoundary}:${personId}`,
        dueAt: addDays(isolated.currentDate, 1),
        transitionKey: dayBoundary,
        entityIds: [eligibleJudge],
        jurisdictionId: venue,
        provenance: { kind: "simulated", sourceEntityIds: [eligibleJudge] },
      });
      const tomorrow = resolveFutureDueItemsThrough(
        scheduledBoundary,
        addDays(isolated.currentDate, 1),
        createFutureTransitionHandlerRegistry([
          [
            dayBoundary,
            (world) => ({
              world,
              status: "resolved",
              reasonKey: dayBoundary,
              context:
                "Controlled fixture clock boundary before actual saved reappointment; no production retry interval.",
              outcomeEventId: null,
            }),
          ],
        ]),
      );
      expect(tomorrow.currentDate).toBe(addDays(isolated.currentDate, 1));
      expect(judgments(tomorrow)).toHaveLength(0);
      const seated = seatJudge(tomorrow, {
        seatId: eligibleTenure.seatId,
        personId: eligibleJudge,
        startedAt: tomorrow.currentDate,
        selection: {
          path: "reappointment",
          selectionRecordId: null,
          decisionRecordId: null,
          selectingPersonId: null,
          contestId: null,
          note: "Controlled fixture reappoints the actual previously eligible judge; no election outcome is inferred.",
        },
        termEndsAt: null,
        retentionDueAt: null,
      });
      expect(judgments(seated).length).toBeGreaterThan(0);
      const activation = seated.history.events.filter(
        (event) =>
          event.type === PROSECUTION_BENCH_ACTIVATION_EVENT &&
          event.involvedEntityIds.includes(personId),
      );
      expect(activation).toHaveLength(1);
      const newTenure = seatHolderAt(seated, eligibleTenure.seatId)!;
      expect(activation[0]!.tags).toContain(
        `justice.bench-tenure:${newTenure.tenureId}`,
      );
      expect(activation[0]!.occurredAt).toBe(tomorrow.currentDate);
      expect(
        seated.history.events.find((event) => event.id === referral.id),
      ).toEqual(referral);
      for (const event of judgments(seated))
        expect(event.occurredAt).toBe(tomorrow.currentDate);
      const restored = deserializeWorld(serializeWorld(seated));
      expect(recoverOverdueProsecutions(restored)).toBe(restored);
      expect(restored.history.events).toEqual(seated.history.events);
      receipts.push({
        seed: caseSeed,
        personId,
        name: personName(restored.people[personId]!),
        recoveryDate: restored.currentDate,
        activationId: activation[0]!.id,
        tenureId: newTenure.tenureId,
        originalReferralDate: referral.occurredAt,
        judgments: judgments(restored),
      });
    },
  );
});
