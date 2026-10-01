import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { addDays, daysBetween } from "../dates";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
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
import { answersTo } from "./clemency-records";
import { sentencesOf } from "./jail-terms";
import {
  advanceProsecutions,
  enterPlea,
  referForProsecution,
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
  UNRESEARCHED_PROSECUTION,
} from "./prosecution";

const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.A98_PROOF_PATH)
    writeFileSync(
      process.env.A98_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
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
    .slice(0, 5);
  it.each(states)(
    "retains the actual petition without a board answer in $jurisdictionKey",
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
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: `team9-a98-unseated:${state.jurisdictionKey}`,
          placeKey: place.key,
          startAge: 40,
          questionnaire: "skipped",
        }),
      ).game!;
      const petitionerId = game.playerPersonId;
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
                    -UNRESEARCHED_PROSECUTION.resolveAfterDays,
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
                      UNRESEARCHED_PROSECUTION.resolveAfterDays,
                  ),
                }
              : event.type === PROSECUTION_CHARGED_EVENT &&
                  event.involvedEntityIds.includes(petitionerId)
                ? {
                    ...event,
                    occurredAt: addDays(
                      sentenceDate,
                      -UNRESEARCHED_PROSECUTION.resolveAfterDays,
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
