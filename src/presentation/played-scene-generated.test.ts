import { describe, expect, it } from "vitest";
import {
  deserializeWorld,
  serializeWorld,
  type EntityId,
  type World,
} from "../simulation";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../simulation/life-places";
import { SeededRng } from "../simulation/rng";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { submitTimeCommand } from "./time-command";
import { currentStorySceneSituation } from "./story-scene-day";
import { projectPlayedSceneExchange } from "./scene-conversation";
import { commitPlayedSceneTurn } from "./life-conversation";
import { recordedRoomPresence } from "./recorded-room-presence";
import { claimStanceOf } from "../simulation/claim-stances";
import { speakerTraits } from "./speaker-traits";
import { openOrdinaryLife } from "./ordinary-life";

const draw = new SeededRng("session4-live-place-block-one");
const state = draw.pick(lifePlaceStateIdentities());
const place = draw.pick(
  searchLifePlaces("", 5000, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  }),
);

function arrive(age: number): {
  world: World;
  player: EntityId;
  chair: EntityId;
} {
  const seed = `session4-shared-blocks:${place.key}:${age}`;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: age,
      startingLife: "ordinary-life",
    }),
  ).game!;
  const player = game.playerPersonId;
  const opened = openOrdinaryLife(game.world, player);
  const initial = currentStorySceneSituation(opened, player)!;
  expect(initial.status).toBe("current");
  expect(recordedRoomPresence(opened, player)?.personIds).toEqual([player]);
  const activity = opened.history.scheduledActivities.find(
    (row) => row.location.locationKey === "ordinary-life:meeting-room",
  )!;
  expect(activity, "actual generated meeting offer").toBeDefined();
  const arrival = submitTimeCommand(opened, {
    requestId: `scene-proof:${seed}`,
    personId: player,
    sourceMoment: opened.currentMoment,
    command: { kind: "attend-activity", activityId: activity.id },
  });
  expect(arrival.receipt.status).toBe("accepted");
  const presence = recordedRoomPresence(arrival.world, player)!;
  expect(presence, "actual recorded arrival and meeting entry").not.toBeNull();
  const event = arrival.world.history.events.find(
    (row) => row.id === presence.eventId,
  )!;
  const chair = event.participants.find(
    (row) => row.role === "coordination:chair",
  )!.personId;
  process.stdout.write(
    `generated-scene seed=${seed} world=${arrival.world.id} date=${arrival.world.currentDate} place=${place.key} player=${player} presence=${presence.eventId} chair=${chair}\n`,
  );
  return { world: arrival.world, player, chair };
}

describe(
  "all five scene blocks in ordinary generated lives",
  { timeout: 120_000 },
  () => {
    it.each([34, 19])(
      "composes, records and reloads a real arrival for age %i without fixture insertion",
      (age) => {
        const { world, player, chair } = arrive(age);
        const before = serializeWorld(world);
        const scene = projectPlayedSceneExchange(world, player, chair)!;
        expect(scene, "actual same-block exchange").not.toBeNull();
        expect(scene.participantPersonIds).toContain(chair);
        expect(scene.portraits.map((row) => row.personId)).toContain(chair);
        expect(scene.art.purpose).toBe("activity");
        expect(scene.contributions.length).toBeGreaterThan(0);
        const offer = scene.replies.find(
          (row) => row.primitive === "ask-record",
        )!;
        expect(offer, "reply from actual saved knowledge").toBeDefined();
        expect(offer.line.sourceRecordIds).toContain(offer.knowledgeId);
        expect(serializeWorld(world)).toBe(before);
        const next = commitPlayedSceneTurn(world, {
          playerPersonId: player,
          addresseePersonId: chair,
          replyKey: offer.key,
          snapshot: scene.snapshot,
        });
        const event = next.history.events.at(-1)!;
        expect(event.type).toBe("life.conversation");
        expect(event.context.choice).toBe(offer.line.text);
        expect(event.context.immediateReaction?.length).toBeGreaterThan(0);
        expect(next.history.decisionTraces.length).toBeGreaterThan(
          world.history.decisionTraces.length,
        );
        expect(
          next.history.relationshipInteractions.some(
            (row) =>
              row.eventId === event.id && row.kind === "contact:conversation",
          ),
        ).toBe(true);
        for (const id of scene.participantPersonIds)
          expect(
            next.history.knowledge.some(
              (row) => row.eventId === event.id && row.personId === id,
            ),
          ).toBe(true);
        expect(serializeWorld(world)).toBe(before);
        expect(serializeWorld(deserializeWorld(serializeWorld(next)))).toBe(
          serializeWorld(next),
        );
        expect(() =>
          commitPlayedSceneTurn(next, {
            playerPersonId: player,
            addresseePersonId: chair,
            replyKey: offer.key,
            snapshot: scene.snapshot,
          }),
        ).toThrow("no longer current");
        const restored = deserializeWorld(serializeWorld(next));
        const fresh = projectPlayedSceneExchange(restored, player, chair)!;
        const lie = fresh.replies.find(
          (row) => row.primitive === "deny-record",
        )!;
        expect(lie).toBeDefined();
        const lied = commitPlayedSceneTurn(restored, {
          playerPersonId: player,
          addresseePersonId: chair,
          replyKey: lie.key,
          snapshot: fresh.snapshot,
        });
        const liedEvent = lied.history.events.at(-1)!;
        expect(claimStanceOf(liedEvent)?.intent).toBe("deceive");
        expect(
          lied.history.knowledge.some(
            (row) =>
              row.eventId === liedEvent.id &&
              row.personId === chair &&
              row.accuracy === "unknown" &&
              row.source.kind === "told-by",
          ),
        ).toBe(true);
        expect(
          lied.history.relationshipInteractions.filter(
            (row) =>
              row.kind === "contact:conversation" &&
              row.personIds.includes(player) &&
              row.personIds.includes(chair),
          ),
        ).toHaveLength(1);
        process.stdout.write(
          JSON.stringify({
            age,
            playerTraits: speakerTraits(world, player),
            speakerTraits: speakerTraits(next, chair),
            sourceEvent: offer.sourceEventId,
            words: offer.line.text,
            reply: event.context.immediateReaction,
            eventId: event.id,
            lieEventId: liedEvent.id,
          }) + "\n",
        );
      },
    );
  },
);
