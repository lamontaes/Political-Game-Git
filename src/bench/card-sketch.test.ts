import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { knownCard } from "./card";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";

// The person card says what someone the player knows is like, in the third
// person, with the pronouns their record carries
// (words-person-card-third-person-sketch). Fails on a second-person sentence
// or on a pronoun that contradicts the record.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "card-sketch");

const WRONG: Readonly<Record<string, RegExp>> = {
  "she-her": /\b(?:he|him|himself|his|they|them|themselves)\b/i,
  "he-him": /\b(?:she|her|herself|they|them|themselves)\b/i,
  "they-them": /\b(?:she|her|herself|he|him|himself)\b/i,
};

it(`the person card says what a relative is like in the third person, ${place.name} (${place.key}), seed ${seed}`, () => {
  setBookkeeping(false);
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const player = core.people.get(playerId! as PersonId)!;
  const relatives = (player.pastFacts ?? [])
    .filter((fact) => fact.kind.startsWith("family:"))
    .map((fact) => fact.facts?.otherPersonId)
    .filter((id): id is string => !!id && !!core.people.get(id as PersonId));
  let told = 0;
  for (const id of new Set(relatives)) {
    const card = knownCard(core, playerId!, id);
    const pronouns =
      core.people.get(id as PersonId)?.looks?.pronouns ?? "they-them";
    const here = `${where}: ${id} (${pronouns})`;
    expect(card.sketch, `${here}: no sketch`).toBeTruthy();
    expect(card.sketch!, here).not.toMatch(/\b(?:you|your|you're|yourself)\b/i);
    const wrong = WRONG[pronouns];
    if (wrong) expect(card.sketch!, here).not.toMatch(wrong);
    told += 1;
    console.log(`${here}: "${card.sketch}"`);
  }
  expect(told, `${where}: no relative on record`).toBeGreaterThan(0);
}, 600_000);
