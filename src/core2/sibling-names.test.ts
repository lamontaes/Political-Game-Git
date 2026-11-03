import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(replay, "sibling-names");
const cases = [
  {
    name: "Mazomanie, Wisconsin",
    key: "5550225",
    seed: "b37762f4-7895-40f5-8d83-0634db5b60cb",
  },
  drawn,
];

for (const place of cases) {
  it(`living siblings have distinct first names: ${place.name}, ${place.seed}`, () => {
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core } = world;
    const collisions = [];
    let pairs = 0;
    for (const person of core.people.values()) {
      if (!person.alive) continue;
      for (const fact of person.pastFacts ?? []) {
        if (fact.kind !== "family:sibling") continue;
        const id = fact.facts?.otherPersonId;
        const sibling = id && (core.people.get(id) ?? core.husks.get(id));
        if (!sibling) throw new Error(`Missing sibling: ${fact.id}`);
        if ("alive" in sibling ? !sibling.alive : !!sibling.diedOn) continue;
        pairs += 1;
        if (person.givenName.toLowerCase() === sibling.givenName.toLowerCase())
          collisions.push({
            person: person.id,
            sibling: sibling.id,
            name: person.givenName,
            fact: fact.id,
          });
      }
    }
    expect(pairs).toBeGreaterThan(0);
    expect(collisions).toEqual([]);
    const player = core.people.get(world.playerId!)!;
    process.stdout.write(
      `SIBLINGS ${world.place.displayName} (${place.key}), replay ${replay}, world seed ${place.seed}: ${pairs} living sibling links; player ${player.id} ${player.givenName} ${player.familyName}\n`,
    );
  }, 300_000);
}
