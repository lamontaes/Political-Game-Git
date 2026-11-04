import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { ageOnDate } from "./kernel/dates";
import { buildPopulation } from "./population";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(replay, "opening-parent-birthdays");
const cases = [
  {
    name: "Hebron, Wisconsin",
    key: "5533675",
    seed: "ed0fcb9d5fe8c4fc405921ee692d31ba212d34a236b449fb2c63040a79e143bb",
  },
  { name: drawn.name, key: drawn.key, seed: drawn.seed },
];

for (const place of cases) {
  it(`every parent was at least fifteen at birth: ${place.name}, ${place.seed}`, () => {
    const world = buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: "2021-01-01",
      minimumPeople: 1000,
    });
    const byId = new Map<string, { id: string; birthDate?: string }>([
      ...world.people.map((person) => [person.id, person] as const),
      ...(world.husks ?? []).map((person) => [person.id, person] as const),
    ]);
    const invalid = [];
    let parents = 0;
    for (const person of world.people) {
      for (const fact of person.pastFacts ?? []) {
        if (
          fact.kind !== "family:parent" &&
          fact.kind !== "family:other-parent"
        )
          continue;
        const parent = byId.get(fact.facts!.otherPersonId!);
        expect(parent?.birthDate, fact.id).toBeDefined();
        parents += 1;
        const age = ageOnDate(parent!.birthDate!, person.birthDate);
        if (age < 15)
          invalid.push({ child: person.id, parent: parent!.id, age });
      }
    }
    expect(parents).toBeGreaterThan(0);
    expect(invalid).toEqual([]);
    console.log(
      `${world.placeMetadata?.placeName} (${place.key}), replay ${replay}, world seed ${place.seed}: ${parents} parent birthdays checked`,
    );
  });
}
