// @vitest-environment node
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { schoolsOf } from "./words";
import { schoolNameWords } from "../english/school-names";
import { properName } from "../director/words";
import institutions from "../../data/research/places/local-institutions.json" with { type: "json" };

// Who you are lists a person's schools by the names people write
// (play-school-names-abbreviated): in two drawn places, no school name of
// the town's people keeps a record's abbreviation (a trailing "Sch" or "El",
// an "Elem", "HS" or "MS" standing as a word).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DALMATIA_SEED =
  "d5a7f4797e3756f8bdd69464f234cc3c2e3a0e91d0ef4b01ef56cfde097588e6";
const ABBREVIATED = /\b(Sch|El|Elem|HS|MS|SD|ISD|CISD|CUSD|CCSD|USD|ESD)\b/i;
const LEFT = /\b(Sch|Elem|HS|MS|SD|ISD|CISD|CUSD|CCSD|USD|ESD)\b(?!\.)|\bEl$/;

it("names no school by a record's abbreviation in two drawn places", () => {
  setBookkeeping(false);
  for (let draw = 0; draw < 2; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "school-names");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const names = new Set<string>();
    for (const person of [...core.people.values()].slice(0, 400))
      for (const school of schoolsOf(core, person.id)) names.add(school.name);
    console.log(
      `${where}: ${names.size} school names: ${[...names].join("; ")}`,
    );
    for (const name of names) expect(name, where).not.toMatch(LEFT);
  }
}, 900_000);

// The item's repro: Dalmatia, Pennsylvania, whose people went to schools the
// federal files name "Shamokin Area Intermediate Sch" and "Shamokin Area El Sch"
// (Nov 8). On main its schools are its district's record or the town's public
// schools; whichever it is, no abbreviation is left.
it("spells out Dalmatia's schools", () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(DALMATIA_SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: "4218080",
  });
  const names = new Set<string>();
  for (const person of core.people.values())
    for (const school of schoolsOf(core, person.id)) names.add(school.name);
  console.log(`Dalmatia, Pennsylvania (4218080): ${[...names].join("; ")}`);
  for (const name of names) expect(name).not.toMatch(LEFT);
}, 900_000);

it("spells out every school record's abbreviation in the school files", () => {
  const names: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object")
      for (const [key, inner] of Object.entries(value))
        if (key === "name" && typeof inner === "string") names.push(inner);
        else walk(inner);
  };
  walk(institutions);
  const schools = names.filter((name) => ABBREVIATED.test(name));
  const left = schools
    .map((name) => schoolNameWords(properName(name)))
    .filter((name) =>
      /\b(Sch|Elem|HS|MS)\b(?!\.)|\bEl\s+School\b|\bEl$/.test(name),
    );
  console.log(
    `${schools.length} school names with an abbreviation; left: ${left.slice(0, 10).join("; ")}`,
  );
  expect(left).toEqual([]);
});
