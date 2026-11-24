/**
 * A new game's player is 18 unless the creator picks another age (owner,
 * Nov 16: "18, unless you pick another age"). In played worlds in drawn
 * places from all 56, no birthday chosen: the player's age on the start date
 * is 18, or, where the town holds nobody that age, the pick says it is an
 * estimate. Place and seed printed (DEFAULT_AGE_SEED fixes the seed).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { setBookkeeping } from "../core2/bookkeeping";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.DEFAULT_AGE_SEED || randomBytes(8).toString("hex");
const DRAWS = 3;

describe(`The new game's default age (seed ${seed})`, () => {
  it(
    "the player is 18 on the start date when no age is picked",
    { timeout: 300_000 },
    () => {
      setBookkeeping(false);
      const seen: string[] = [];
      for (let at = 0; at < DRAWS; at += 1) {
        const place = drawPlace(at ? `${seed}:${at}` : seed, "default-age");
        const where = `${place.name} (${place.key}), seed ${place.seed}`;
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const player = core.people.get(core.playerId!)!;
        const age = ageOnDate(
          makeIsoDate(player.birthDate),
          makeIsoDate(gameStartDate()),
        );
        const pick = JSON.parse(
          String(core.placeMetadata?.openingPlayerPick ?? "{}"),
        ) as { estimated?: boolean };
        seen.push(`${where}: age ${age}${pick.estimated ? " (estimate)" : ""}`);
        if (!pick.estimated) expect(age, where).toBe(18);
      }
      console.log(seen.join("\n"));
    },
  );
});
