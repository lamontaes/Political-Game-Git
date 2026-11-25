import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import cohorts from "./data/names/given-names-by-decade.json" with { type: "json" };
import {
  DEFAULT_CORPUS_VERSION,
  getNameCorpus,
  givenNamePoolForCorpus,
} from "./gov-rules/names-data";

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

it("keeps a chosen sibling name on the player and updates the sibling's record", () => {
  setBookkeeping(false);
  const place = cases[0]!;
  const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const player = core.people.get(playerId!)!;
  const siblings = (player.pastFacts ?? [])
    .filter((fact) => fact.kind === "family:sibling")
    .flatMap((fact) => {
      const row = core.people.get(String(fact.facts?.otherPersonId));
      return row?.alive ? [row] : [];
    });
  expect(siblings.length).toBeGreaterThan(0);
  expect(siblings[0]!.looks?.gender).toBe("female");
  const chosen = siblings[0]!.givenName.toUpperCase();
  const before = siblings.map((row) => ({
    id: row.id,
    familyName: row.familyName,
    birthDate: row.birthDate,
    looks: structuredClone(row.looks),
    facts: structuredClone(row.pastFacts),
  }));
  coreAPI(core).chooseIdentityV1(player.id, {
    givenName: chosen,
    familyName: player.familyName,
    birthDate: player.birthDate,
    looks: player.looks ?? {},
  });
  expect(player.givenName).toBe(chosen);
  const names = [player, ...siblings].map((row) => row.givenName.toLowerCase());
  expect(new Set(names).size).toBe(names.length);
  const femaleNames = new Set([
    ...givenNamePoolForCorpus(getNameCorpus(DEFAULT_CORPUS_VERSION), "female"),
    ...Object.values(cohorts.decades).flatMap((decade) =>
      decade.female.map(([name]) => name),
    ),
  ]);
  expect(femaleNames.has(siblings[0]!.givenName)).toBe(true);
  expect(
    siblings.map((row) => ({
      id: row.id,
      familyName: row.familyName,
      birthDate: row.birthDate,
      looks: structuredClone(row.looks),
      facts: structuredClone(row.pastFacts),
    })),
  ).toEqual(before);
  console.log(
    JSON.stringify({
      place: place.name,
      replay: place.seed,
      playerId,
      chosen,
      siblings: siblings.map(({ id, givenName, familyName }) => ({
        id,
        givenName,
        familyName,
      })),
    }),
  );
}, 300_000);

it("the chosen name never repeats a full name in the player's household or family", () => {
  setBookkeeping(false);
  const passedOver: string[] = [];
  for (let at = 0; at < 6; at += 1) {
    const place = drawPlace(
      at ? `${replay}:${at}` : replay,
      "chosen-name-family",
    );
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const player = core.people.get(playerId!)!;
    const siblings = (player.pastFacts ?? []).flatMap((fact) => {
      const row =
        fact.kind === "family:sibling" && fact.facts?.otherPersonId
          ? core.people.get(fact.facts.otherPersonId)
          : undefined;
      return row?.alive ? [row] : [];
    });
    const housemate = (core.households.get(player.householdId)?.memberIds ?? [])
      .map((id) => core.people.get(id)!)
      .find((row) => row.id !== player.id && row.alive);
    if (!siblings.length || !housemate) {
      passedOver.push(`${place.name}: no living sibling and housemate`);
      continue;
    }
    // The sister was given the housemate's given name, and the player keeps the family name.
    siblings[0]!.givenName = housemate.givenName;
    siblings[0]!.familyName = player.familyName;
    housemate.familyName = player.familyName;
    coreAPI(core).chooseIdentityV1(player.id, {
      givenName: player.givenName,
      familyName: player.familyName,
      birthDate: player.birthDate,
      looks: player.looks ?? {},
    });
    const everyone = [player, housemate, ...siblings];
    const names = everyone.map((row) =>
      `${row.givenName} ${row.familyName}`.toLowerCase(),
    );
    expect(
      new Set(names).size,
      `${place.name} (${place.key}), seed ${place.seed}: ${names.join(", ")} (passed over: ${passedOver.join("; ")})`,
    ).toBe(names.length);
    return;
  }
  throw new Error(
    `No drawn place had a sibling and a housemate: ${passedOver.join("; ")}`,
  );
}, 600_000);
