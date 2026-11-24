/**
 * The player who chooses a name takes it with the family they were born into
 * (gap sheet, Nov 23, 2026, P48: "I'm Samir Spence", yet the sons were John
 * Drake and Jose Spence and the brothers Stewart, Serrano and Santiago). In
 * places drawn from all 56 with players of several ages, every parent, brother,
 * sister and child of the chosen player (a partnered child may have a married
 * name) carries the chosen surname, wherever they live.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { familyFactsOf } from "./closeness";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("a chosen surname goes to the parents, brothers, sisters and children", () => {
  setBookkeeping(false);
  let checked = 0;
  const where: string[] = [];
  for (let draw = 0; draw < 4; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "choose-identity-family-name");
    const age = 30 + draw * 7;
    const label = `${place.name} (${place.key}), seed ${place.seed}, player ${age}`;
    where.push(label);
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      playerBirthDate: `${Number(gameStartDate().slice(0, 4)) - age}-06-15`,
    });
    const player = core.people.get(playerId!)!;
    coreAPI(core).chooseIdentityV1(player.id, {
      givenName: "Samir",
      familyName: "Spence",
      birthDate: player.birthDate,
      looks: { gender: "male" },
    });
    for (const [id, fact] of familyFactsOf(player)) {
      if (!["parent", "sibling", "child"].includes(fact.relation)) continue;
      const other = core.people.get(id as PersonId);
      if (!other) continue;
      if (
        fact.relation === "child" &&
        [...familyFactsOf(other)].some(([, f]) => f.relation === "partner")
      )
        continue;
      checked += 1;
      expect(
        other.familyName,
        `${label}: ${fact.relation} ${other.givenName} ${other.familyName}`,
      ).toBe("Spence");
    }
  }
  expect(
    checked,
    `a relative in 4 drawn places: ${where.join("; ")}`,
  ).toBeGreaterThan(0);
}, 1_800_000);
