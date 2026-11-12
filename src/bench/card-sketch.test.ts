import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { knownCard } from "./card";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";

// The person card shows what someone the player knows is like by each
// leaning's own label, with no sentence that only says the label again in
// other words (Fable A on #7365, Nov 12, under the owner's Nov 11 ruling that
// every line comes from the world's records). Fails on a leaning line with
// words beside its label, or when no relative's card shows a leaning.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "card-sketch");

it(`the person card shows a relative's leanings by their labels alone, ${place.name} (${place.key}), seed ${seed}`, () => {
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
    const here = `${where}: ${id}`;
    for (const row of card.traitLines) {
      expect(row.label, here).toBeTruthy();
      expect(Object.keys(row), here).toEqual(["label"]);
    }
    expect("sketch" in card, `${here}: a sketch sentence is back`).toBe(false);
    told += card.traitLines.length;
    console.log(
      `${here}: ${card.traitLines.map((row) => row.label).join(", ")}`,
    );
  }
  expect(
    told,
    `${where}: no relative on record with a leaning`,
  ).toBeGreaterThan(0);
}, 600_000);
