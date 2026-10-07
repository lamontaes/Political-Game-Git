import { describe, expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { projectLivingSceneOpening } from "../presentation/living-scene-facts";
import { openingTourStagedPeople } from "../presentation/opening-tour-people";
import { homeStateUsps } from "../simulation/nationwide-world/state-executives";
import { stateCandidacyPack } from "../simulation/candidacy-packs";
import { stateLegislators } from "../simulation/nationwide-world/state-legislature-opening";
import { drawRandomPlace } from "../../tests/support/random-place";

/*
 * OW-15: a chamber in the opening shows the members its records hold, in
 * their seats, not only the two officers this life answers to.
 */
describe(
  "the chambers seat their recorded members",
  { timeout: 240_000 },
  () => {
    for (const seed of ["ow15-chambers-a", "ow15-chambers-b"]) {
      const place = drawRandomPlace(seed);
      it(`${place.displayName} (seed ${seed})`, () => {
        const game = generateOpeningLife(
          prepareOpeningLife({
            ...DEFAULT_NEW_GAME_SETUP,
            seed,
            placeKey: place.key,
            startAge: 34,
            questionnaire: "skipped",
          }),
        ).game!;
        const { world, playerPersonId } = game;
        const before = JSON.stringify(world);
        const chapters = projectLivingSceneOpening(
          world,
          playerPersonId,
        ).chapters;
        const seated = (key: string) =>
          chapters.find((chapter) => chapter.key === key)!.seated;

        // The records hold far more than the player's own seats.
        const own = chapters.find((c) => c.key === "congress")!.actors;
        expect(seated("year").length).toBeGreaterThan(own.length);
        expect(seated("congress").length).toBeGreaterThan(own.length);
        // This life's own representatives sit first.
        for (const actor of own.filter((a) => a.provenance.roleKey))
          if (actor.person.title.toLowerCase().includes("rep"))
            expect(seated("congress")[0]!.person.personId).toBe(
              actor.person.personId,
            );
        // Every seated person is a recorded person with a record behind them.
        for (const key of ["year", "congress", "legislature"])
          for (const actor of seated(key)) {
            expect(world.people[actor.person.personId], key).toBeDefined();
            expect(actor.recordIds.length, key).toBeGreaterThan(0);
          }

        const state = homeStateUsps(world, playerPersonId);
        const pack = state ? stateCandidacyPack(`US-${state}`) : null;
        const recorded = pack ? stateLegislators(world, pack.packId).length : 0;
        expect(seated("legislature").length).toBe(recorded);

        // The staging slots decide how many sit; far more than two do.
        const rooms: Record<string, string> = {
          year: "us-senate-floor",
          congress: "us-house-floor",
          legislature:
            state === "NE"
              ? "state-legislative-chamber-unicameral"
              : "state-legislative-chamber-bicameral",
        };
        const counts: Record<string, number> = {};
        for (const [key, room] of Object.entries(rooms)) {
          const people = seated(key).map((actor) => actor.person);
          const placed = openingTourStagedPeople(
            world,
            playerPersonId,
            room,
            people,
            {
              furniture: true,
              memberIds: new Set(people.map((person) => person.personId)),
            },
          );
          counts[key] = placed.length;
          if (people.length > 2) expect(placed.length, key).toBeGreaterThan(2);
          expect(
            new Set(placed.map((person) => person.personId)).size,
            key,
          ).toBe(placed.length);
        }
        process.stdout.write(
          `${JSON.stringify({ seed, place: place.displayName, state, recorded, seatedYear: seated("year").length, seatedCongress: seated("congress").length, placed: counts })}\n`,
        );
        expect(JSON.stringify(world)).toBe(before);
      });
    }
  },
);
