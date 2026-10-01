import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { addDays, daysBetween } from "../dates";
import {
  cancelFutureDueItem,
  createFutureTransitionHandlerRegistry,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import {
  GOVERNING_NPC_DECISION,
  decideGoverningMatter,
  governingMatters,
  governingNpcDecisionHandler,
  type GoverningMatter,
} from "../governing/state-governing";
import { currentLifeCutoff } from "../life-queries";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { personName } from "../people";
import { pickDistinct, SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { assertWorldIntegrity } from "../world";
import {
  advanceClemencyPetition,
  clemencyPetitionStatus,
  fileClemencyPetition,
  nextClemencyPetitionDueAt,
} from "./clemency";
import { createClemencyTransitionRegistry } from "./clemency-transitions";
import { CLEMENCY_GRANT } from "./clemency-reasoning";
import {
  clemencyAuthorityFor,
  clemencyBody,
  EXECUTIVE_BODY,
} from "./clemency-rules";
import {
  CLEMENCY_GRANTED_EVENT,
  CLEMENCY_SENTENCE_TAG,
  sentencesOf,
} from "./jail-terms";
import {
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
  UNRESEARCHED_PROSECUTION,
  advanceProsecutions,
  enterPlea,
  referForProsecution,
} from "./prosecution";

const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.G12_DECISION_PROOF_PATH)
    writeFileSync(
      process.env.G12_DECISION_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

function isolate(world: World, retainedIds: readonly EntityId[]): World {
  let next = world;
  for (const item of next.history.futureDueItems)
    if (
      !retainedIds.includes(item.id) &&
      futureDueItemStateAt(next, item.id, currentLifeCutoff(next))?.status ===
        "scheduled"
    )
      next = cancelFutureDueItem(next, {
        stableKey: `fixture:clemency-decision-isolate:${item.id}`,
        dueItemId: item.id,
        effectiveAt: next.currentDate,
        reasonKey: "fixture:isolated-clemency-decision",
        context: "Isolate only this actual saved case's decision clock.",
      });
  return next;
}

describe("a saved executive decision immediately reaches its actual petition", () => {
  const seed = "team9-g10-floor-five-20260930";
  const places = lifePlaceStateIdentities();
  const draw = pickDistinct(new SeededRng(seed), places, places.length);
  const needsExecutive = (state: (typeof places)[number]) => {
    const authority = clemencyAuthorityFor(state.jurisdictionKey);
    if (!authority)
      throw new Error("The sampled place lacks its authority rule.");
    return authority.gates.some((gate) =>
      gate.mustAgree.some(
        (key) =>
          key === EXECUTIVE_BODY ||
          clemencyBody(authority, key)?.includesExecutive,
      ),
    );
  };
  // Keep five actual executive-power jurisdictions plus the first sampled
  // board-only control. Never invent executive power to satisfy a fixture.
  const states = [
    ...draw.filter(needsExecutive).slice(0, 5),
    draw.find((state) => !needsExecutive(state))!,
  ];
  for (const state of states)
    describe(state.jurisdictionKey, () => {
      let ready: World,
        petitionerId: EntityId,
        petitionId: EntityId,
        sentenceId: EntityId,
        matter: GoverningMatter;
      beforeAll(() => {
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
            seed: `team9-g12-decision:${state.jurisdictionKey}`,
            placeKey: place.key,
            startAge: 40,
            questionnaire: "skipped",
          }),
        ).game!;
        petitionerId = game.playerPersonId;
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
        sentenceId = actualSentence!.id;
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
        petitionId = filed.petitionId;
        ready = advanceClemencyPetition(filed.world, petitionId);
        const findMatter = (world: World) =>
          governingMatters(world).find(
            (candidate) =>
              candidate.family === "clemency" &&
              candidate.openedEvent.tags.includes(`source-event:${petitionId}`),
          );
        if (!findMatter(ready)) {
          const dueAt = nextClemencyPetitionDueAt(ready, petitionId)!;
          const dueItem = ready.history.futureDueItems.find(
            (item) =>
              item.transitionKey === "justice:clemency-petition" &&
              item.dueAt === dueAt,
          )!;
          ready = resolveFutureDueItemsThrough(
            isolate(ready, [dueItem.id]),
            dueAt,
            createClemencyTransitionRegistry(),
          );
        }
        matter = findMatter(ready)!;
        if (!needsExecutive(state)) {
          expect(matter).toBeUndefined();
          expect(clemencyPetitionStatus(ready, petitionId)).toBe("granted");
          return;
        }
        expect(matter).toBeDefined();
        expect(matter.status).toBe("open");
      });

      it("the player decision records the actual grant once", () => {
        if (!needsExecutive(state)) {
          const saved = deserializeWorld(serializeWorld(ready));
          assertWorldIntegrity(saved);
          const grants = saved.history.events.filter(
            (event) =>
              event.type === CLEMENCY_GRANTED_EVENT &&
              event.tags.includes(`${CLEMENCY_SENTENCE_TAG}${sentenceId}`),
          );
          expect(grants).toHaveLength(1);
          expect(advanceClemencyPetition(saved, petitionId)).toBe(saved);
          receipts.push({
            seed,
            place: state.jurisdictionKey,
            mode: "board-only",
            name: personName(saved.people[petitionerId]!),
            petitionerId,
            petitionId,
            grantEventId: grants[0]!.id,
            limit:
              "Existing unseated board case-record reader; no executive power or individual board-member decision is inferred.",
          });
          return;
        }
        const controlled: World = {
          ...ready,
          control: { kind: "person", personId: matter.holderPersonId },
        };
        const answer = decideGoverningMatter(
          controlled,
          matter.id,
          CLEMENCY_GRANT,
        );
        expect(answer.ok).toBe(true);
        expect(clemencyPetitionStatus(answer.world, petitionId)).toBe(
          "granted",
        );
        const saved = deserializeWorld(serializeWorld(answer.world));
        assertWorldIntegrity(saved);
        const grants = saved.history.events.filter(
          (event) =>
            event.type === CLEMENCY_GRANTED_EVENT &&
            event.tags.includes(`${CLEMENCY_SENTENCE_TAG}${sentenceId}`),
        );
        expect(grants).toHaveLength(1);
        expect(advanceClemencyPetition(saved, petitionId)).toBe(saved);
        const repeated = decideGoverningMatter(
          saved,
          matter.id,
          CLEMENCY_GRANT,
        );
        expect(repeated.ok).toBe(false);
        expect(serializeWorld(repeated.world)).toBe(serializeWorld(saved));
        receipts.push({
          seed,
          place: state.jurisdictionKey,
          mode: "player",
          petitionerId,
          name: personName(saved.people[petitionerId]!),
          deciderId: matter.holderPersonId,
          deciderName: personName(saved.people[matter.holderPersonId]!),
          petitionId,
          grantEventId: grants[0]!.id,
        });
      });

      it("the actual NPC due decision closes the matching petition once", () => {
        if (!needsExecutive(state)) {
          expect(
            governingMatters(ready).some(
              (candidate) =>
                candidate.family === "clemency" &&
                candidate.openedEvent.tags.includes(
                  `source-event:${petitionId}`,
                ),
            ),
          ).toBe(false);
          const saved = deserializeWorld(serializeWorld(ready));
          expect(
            serializeWorld(advanceClemencyPetition(saved, petitionId)),
          ).toBe(serializeWorld(saved));
          return;
        }
        const dueItem = ready.history.futureDueItems.find(
          (item) =>
            item.transitionKey === GOVERNING_NPC_DECISION &&
            item.entityIds.includes(matter.id),
        )!;
        expect(dueItem).toBeDefined();
        const registry = createFutureTransitionHandlerRegistry([
          [GOVERNING_NPC_DECISION, governingNpcDecisionHandler],
        ]);
        const answered = resolveFutureDueItemsThrough(
          isolate(ready, [dueItem.id]),
          dueItem.dueAt,
          registry,
        );
        const decided = governingMatters(answered).find(
          (candidate) => candidate.id === matter.id,
        )!;
        expect(decided.decision).not.toBeNull();
        const granted = decided.decision!.tags.includes(
          `choice:${CLEMENCY_GRANT}`,
        );
        expect(clemencyPetitionStatus(answered, petitionId)).toBe(
          granted ? "granted" : "denied",
        );
        const saved = deserializeWorld(serializeWorld(answered));
        assertWorldIntegrity(saved);
        expect(advanceClemencyPetition(saved, petitionId)).toBe(saved);
        expect(
          serializeWorld(
            resolveFutureDueItemsThrough(saved, dueItem.dueAt, registry),
          ),
        ).toBe(serializeWorld(saved));
        receipts.push({
          seed,
          place: state.jurisdictionKey,
          mode: "npc",
          petitionerId,
          name: personName(saved.people[petitionerId]!),
          deciderId: matter.holderPersonId,
          petitionId,
          decisionEventId: decided.decision!.id,
          status: clemencyPetitionStatus(saved, petitionId),
        });
      });
    });
});
