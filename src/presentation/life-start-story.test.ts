import { describe, expect, it } from "vitest";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { projectLifeStartStory } from "./life-start-story";
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  createStableId,
  educationEnrollmentHistoryForPerson,
  workRelationshipHistoryForPerson,
} from "../simulation";
import { projectLifeSoFarJournal } from "./life-so-far-english";
import {
  generateOpeningLifeWithProgress,
  prepareOpeningLife,
} from "./opening-life";

const seed = "session7-loading-story-20261005";
const place = drawRandomPlace(seed);

describe("the life loading screen reads saved chapters and published local news", () => {
  it(
    "uses first-person English with dated starts and leaves the World unchanged",
    { timeout: 60_000 },
    () => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
        startAge: 38,
      });
      const before = JSON.stringify(game.world);
      const lines = projectLifeSoFarJournal(game.world, game.playerPersonId);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.every((line) => line.date <= game.world.currentDate)).toBe(
        true,
      );
      expect(lines.map((line) => line.text).join(" ")).not.toMatch(
        /\bYou\b|\byour\b|my your/,
      );
      for (const record of [
        ...educationEnrollmentHistoryForPerson(game.world, game.playerPersonId),
        ...workRelationshipHistoryForPerson(game.world, game.playerPersonId),
      ]) {
        if (record.startedAt > game.world.currentDate) continue;
        const line = lines.find((line) =>
          line.sourceRecordIds.includes(record.id),
        );
        if (line) expect(line.date).toBe(record.startedAt);
      }
      const projection = projectLifeStartStory(
        game.world,
        game.playerPersonId,
      )!;
      expect(projection.year).toBe(game.world.currentDate.slice(0, 4));
      expect(projection.place).toBe(place.displayName);
      expect(JSON.stringify(game.world)).toBe(before);
      expect(
        projectLifeStartStory(JSON.parse(before), game.playerPersonId),
      ).toEqual(projection);
      console.info({
        seed,
        place: place.displayName,
        age: 38,
        journal: projection.chapters,
      });
    },
  );
  it(
    "excludes other towns and future press editions without writing news",
    { timeout: 60_000 },
    () => {
      const game = createNewGameWorld({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
      });
      // Controlled saved-edition fixture verifies filtering, not a natural press claim.
      const person = game.world.people[game.playerPersonId]!;
      const edition = {
        id: createStableId("publication", "local-fixture"),
        stableKey: "local-fixture",
        sequence: 0,
        kind: "civic-event" as const,
        sourceEventId: createStableId("event", "fixture"),
        sourceRecordIds: [],
        jurisdictionId: person.homeJurisdictionId,
        outletKey: "civic-ledger" as const,
        outletName: "Fixture outlet",
        headline: "Fixture local edition",
        body: "Fixture copy",
        publishedAt: game.world.currentDate,
        recordedAt: game.world.currentDate,
        correctsPublicationId: null,
        correctionNote: null,
      };
      const world = {
        ...game.world,
        history: {
          ...game.world.history,
          publications: [
            edition,
            {
              ...edition,
              id: createStableId("publication", "elsewhere"),
              jurisdictionId: null,
            },
            {
              ...edition,
              id: createStableId("publication", "future"),
              publishedAt: "2099-01-01" as const,
            },
          ],
        },
      };
      expect(
        projectLifeStartStory(world, game.playerPersonId)!.headlines.map(
          (row) => row.id,
        ),
      ).toEqual([edition.id]);
    },
  );
  it("does not create or publish a game after the monotonic deadline", async () => {
    await expect(
      generateOpeningLifeWithProgress(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: place.key,
        }),
        { deadlineAt: performance.now() - 1 },
      ),
    ).rejects.toMatchObject({ name: "TimeoutError" });
  });
});
