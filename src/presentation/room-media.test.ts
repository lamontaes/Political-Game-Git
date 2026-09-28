import { describe, expect, it } from "vitest";
import { mediaOutlets } from "../simulation/press/outlets";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  projectRoomMedia,
  roomBroadcastLine,
  roomFrontPageLine,
} from "./room-media";
import { submitTimeCommand } from "./time-command";

/**
 * The room's television and newspaper change with the day and are never
 * blank: five places, seven days each. Every day the TV shows a story or its
 * program card, the paper shows its masthead and a date, and both name
 * outlets the world actually has.
 */
const PLACES = [
  ["1805860", "Bloomington, Indiana"],
  ["2743000", "Minneapolis, Minnesota"],
  ["3502000", "Albuquerque, New Mexico"],
  ["1150000", "Washington, District of Columbia"],
  ["0203000", "Anchorage, Alaska"],
] as const;

function nextDay(
  world: ReturnType<typeof generateOpeningLife>["game"] extends infer G
    ? G extends { world: infer W }
      ? W
      : never
    : never,
  personId: Parameters<typeof projectRoomMedia>[1],
  index: number,
) {
  return submitTimeCommand(world, {
    requestId: `room-media-${index}`,
    personId,
    command: { kind: "days", days: 1 },
    sourceMoment: world.currentMoment,
  }).world;
}

describe("the room's television and newspaper", () => {
  for (const [placeKey, label] of PLACES) {
    it(`show a story or a card every day for a week in ${label}`, () => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: `room-media-${placeKey}`,
          startAge: 34,
          placeKey,
        }),
      ).game!;
      const personId = game.playerPersonId;
      let world = game.world;
      const names = new Set(mediaOutlets(world).map((outlet) => outlet.name));
      const seen = new Set<string>();
      for (let day = 0; day < 7; day += 1) {
        const media = projectRoomMedia(world, personId);
        const { broadcast, frontPage } = media;
        expect(broadcast, `${label} day ${day}: a station`).not.toBeNull();
        expect(frontPage, `${label} day ${day}: a paper`).not.toBeNull();
        expect(names.has(broadcast!.station.name)).toBe(true);
        expect(names.has(frontPage!.paper.name)).toBe(true);
        // A story or a card, never neither.
        expect(Boolean(broadcast!.story) !== Boolean(broadcast!.card)).toBe(
          true,
        );
        expect(roomBroadcastLine(broadcast!).length).toBeGreaterThan(
          broadcast!.station.name.length + 2,
        );
        expect(frontPage!.dateLine).toMatch(
          /^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}, \d{4}$/,
        );
        expect(roomFrontPageLine(frontPage!)).toContain(frontPage!.paper.name);
        // A story the TV or paper leads with is today's, from its own outlet.
        if (broadcast!.story)
          expect(broadcast!.story.publishedAt).toBe(world.currentDate);
        if (frontPage!.story)
          expect(frontPage!.story.outletName).toBe(frontPage!.paper.name);
        for (const line of broadcast!.ticker)
          expect(line).toMatch(/^[^:]+: \S/);
        seen.add(frontPage!.dateLine);
        world = nextDay(world, personId, day);
      }
      // The paper's date changes every day.
      expect(seen.size).toBe(7);
    }, 600_000);
  }

  it("gives two people in the same town the same station and masthead", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "room-media-same-town",
        startAge: 34,
        placeKey: "1805860",
      }),
    ).game!;
    const home = game.world.people[game.playerPersonId]!.homeJurisdictionId;
    const neighbor = game.world.personOrder.find(
      (id) =>
        id !== game.playerPersonId &&
        game.world.people[id]?.homeJurisdictionId === home,
    )!;
    expect(neighbor).toBeDefined();
    const mine = projectRoomMedia(game.world, game.playerPersonId);
    const theirs = projectRoomMedia(game.world, neighbor);
    expect(theirs.broadcast!.station).toEqual(mine.broadcast!.station);
    expect(theirs.frontPage!.paper).toEqual(mine.frontPage!.paper);
  }, 600_000);
});
