import { expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import { latestPersonalityTendenciesForPerson } from "../simulation/queries";
import { ensurePeopleTraits } from "../simulation/people-traits";
import { recordedCouncilAgenda } from "../simulation/living-world/local-council-meetings";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";
import { submitTimeCommand } from "./time-command";
import { recordedRoomPresence } from "./recorded-room-presence";
import { projectPlayedSceneExchange } from "./scene-conversation";
import { speakerTraits } from "./speaker-traits";

it("admits an actual generated meeting speaker and records the live agenda without a canned ordinance", () => {
  const seed = "session4-english-workshop-2026-10-06:0";
  const place = drawRandomPlace(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 18,
      startingLife: "ordinary-life",
    }),
  ).game!;
  const player = game.playerPersonId;
  const world = openOrdinaryLife(game.world, player);
  const before = JSON.stringify(world);
  const agenda = recordedCouncilAgenda(world, player);
  expect(JSON.stringify(world)).toBe(before);
  if (agenda.items.length === 0)
    expect(agenda.summary).toBe("Routine business.");
  for (const item of agenda.items) {
    expect(
      (world.history.legislativeMeasures ?? []).some(
        (row) => row.id === item.measureId,
      ),
    ).toBe(true);
    expect(item.sourceRecordIds).toContain(item.measureId);
  }
  expect(
    (world.history.legislativeMeasures ?? []).some(
      (row) => row.shortTitle === "Meeting Room Evening Hours Ordinance",
    ),
  ).toBe(false);
  const activity = world.history.scheduledActivities.find(
    (row) => row.location.locationKey === "ordinary-life:meeting-room",
  )!;
  const arrival = submitTimeCommand(world, {
    requestId: "session4:actual-speaker-admission",
    personId: player,
    sourceMoment: world.currentMoment,
    command: { kind: "attend-activity", activityId: activity.id },
  });
  expect(arrival.receipt.status).toBe("accepted");
  const presence = recordedRoomPresence(arrival.world, player)!;
  expect(presence).not.toBeNull();
  const entry = arrival.world.history.events.find(
    (row) => row.id === presence.eventId,
  )!;
  const chair = entry.participants.find(
    (row) => row.role === "coordination:chair",
  )!.personId;
  const traits = speakerTraits(arrival.world, chair);
  expect(Object.keys(traits).length).toBeGreaterThan(0);
  const records = latestPersonalityTendenciesForPerson(arrival.world, chair);
  expect(records.length).toBeGreaterThan(0);
  for (const record of records) {
    expect(record.recordedAt <= arrival.world.currentDate).toBe(true);
    expect(record.sequence < entry.sequence).toBe(true);
  }
  expect(ensurePeopleTraits(arrival.world, [chair])).toBe(arrival.world);
  const playerTraits = latestPersonalityTendenciesForPerson(
    arrival.world,
    player,
  );
  expect(ensurePeopleTraits(arrival.world, [chair, player])).toBe(
    arrival.world,
  );
  expect(latestPersonalityTendenciesForPerson(arrival.world, player)).toEqual(
    playerTraits,
  );
  const scene = projectPlayedSceneExchange(arrival.world, player, chair)!;
  expect(scene).not.toBeNull();
  expect(scene.contributions.length).toBeGreaterThan(0);
  expect(scene.replies.some((reply) => reply.primitive === "ask-record")).toBe(
    true,
  );
  for (const reply of scene.replies) {
    expect(reply.line.text).not.toMatch(
      /^(What do you think about this\?|This is what I know:|That's not true:)/,
    );
    const knowledge = arrival.world.history.knowledge.find(
      (row) => row.id === reply.knowledgeId,
    );
    if (knowledge)
      expect(reply.line.text).not.toContain(knowledge.believedSummary);
  }
}, 60_000);
