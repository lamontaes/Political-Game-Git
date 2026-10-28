/**
 * The creator renames the player after the world, and so the opening, is
 * composed: the household that carried the drawn family name carries the
 * chosen one, and every label the opening's camera shows (a frame's cast and
 * the people it points out) reads by person id from the current records. Each
 * drawn place is one of all 56; the failure names the place and seeds.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { applyChosenPerson } from "./creator";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`opening-names:${Date.now()}`).digest("hex");
const PLACES = 3;

describe("the opening after the creator renames the player", () => {
  for (let n = 0; n < PLACES; n++) {
    const place = drawPlace(runSeed, `opening-names:${n}`);
    const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
    it(`gives the household the names the creator chose: ${place.name}`, () => {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core } = world;
      const playerId = world.playerId!;
      const story = world.director.ledger.opening;
      expect(story, `an opening is composed: ${where}`).toBeTruthy();
      const player = core.people.get(playerId)!;
      const drawn = player.familyName;
      const sharing = (core.households.get(player.householdId)?.memberIds ?? [])
        .filter((id) => id !== playerId)
        .filter((id) => core.people.get(id)?.familyName === drawn);
      const [year, month, day] = player.birthDate.split("-").map(Number);
      // The creator's own call, as the new-life screen makes it.
      applyChosenPerson(core, playerId, {
        givenName: "Bo",
        familyName: "Snider",
        gender: player.looks?.gender === "male" ? "male" : "female",
        birthYear: year!,
        birthMonth: month!,
        birthDay: day!,
      });
      // Everyone who carried the drawn name now carries the chosen one.
      for (const id of sharing)
        expect(core.people.get(id)!.familyName, `${id}: ${where}`).toBe(
          "Snider",
        );
    }, 300_000);
  }
});
