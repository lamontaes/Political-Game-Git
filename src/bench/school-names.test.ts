// @vitest-environment node
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
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
// Named places and fixed seeds, so every run is the same run.
const PLACES = [
  { name: "East End Colony, Montana", key: "3022943", seed: "school-names-a" },
  { name: "Bowdoinham, Maine", key: "2306330", seed: "school-names-b" },
] as const;
const DALMATIA_SEED =
  "d5a7f4797e3756f8bdd69464f234cc3c2e3a0e91d0ef4b01ef56cfde097588e6";
const ABBREVIATED = /\b(Sch|El|Elem|HS|MS|SD|ISD|CISD|CUSD|CCSD|USD|ESD)\b/i;
const LEFT = /\b(Sch|Elem|HS|MS|SD|ISD|CISD|CUSD|CCSD|USD|ESD)\b(?!\.)|\bEl$/;

it.each(PLACES)(
  "names no school by a record's abbreviation in $name",
  (place) => {
    setBookkeeping(false);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
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
  },
  300_000,
);

it("keeps a state's postal code and a person's Jr or Sr, and spells out the rest", () => {
  const said = (name: string) => schoolNameWords(properName(name));
  // A state after a comma is not a school word.
  expect(said("Jackson Prep, MS")).toBe("Jackson Prep, MS");
  expect(said("Sioux Falls Christian, SD")).toBe("Sioux Falls Christian, SD");
  // A person's Jr or Sr stays; a junior or senior high is spelled out.
  expect(said("Martin Luther King Jr Elementary")).toBe(
    "Martin Luther King Jr Elementary",
  );
  expect(said("Martin Luther King Jr. Elem Sch")).toBe(
    "Martin Luther King Jr. Elementary School",
  );
  expect(said("Lincoln Jr High")).toBe("Lincoln Junior High");
  expect(said("New Haven Jr/Sr High School")).toBe(
    "New Haven Junior/Senior High School",
  );
  expect(said("Northwestern MS")).toBe("Northwestern Middle School");
  expect(said("Shamokin Area El Sch")).toBe("Shamokin Area Elementary School");
  expect(said("El Paso Academy")).toBe("El Paso Academy");
  expect(said("DeKalb Co Eastern Com School District")).toBe(
    "DeKalb County Eastern Community School District",
  );
  expect(said("Powder River Co District H S")).toBe(
    "Powder River County District High School",
  );
  expect(said("International Academy Of Columbus")).toBe(
    "International Academy of Columbus",
  );
  expect(said("Smith Co-Op For The Arts")).toBe("Smith Co-Op for the Arts");
});

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
}, 300_000);

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
