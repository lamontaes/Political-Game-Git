import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildDeferredKin, buildPopulation } from "./population";
import type { CoreInput, PersonInput } from "./types";

// M7-01, a lighter opening: relatives are built at the opening only for the
// households chosen before generation; any other household's relatives are
// built when it is filled in. Either way a household's people, relatives,
// temperaments and family facts are exactly what a full build gives it.
const place = drawPlace(process.env.GOLDEN_PATH_SEED ?? "deferred-kin", "kin");
const options = {
  seed: place.seed,
  placeKey: place.key,
  startedAt: "2021-01-01",
  minimumPeople: 600,
};
const full = buildPopulation(options);
const residents = full.people
  .filter((person) => person.tier !== "husk")
  .sort((a, b) => a.id.localeCompare(b.id));
const chosen = residents[0]!.householdId;
const light = buildPopulation({
  ...options,
  chooseKinHouseholds: () => new Set([chosen]),
});
const deferredHome = residents.find(
  (person) => person.householdId !== chosen,
)!.householdId;

/** A household's residents and every relative they name, as records. */
function household(input: CoreInput, id: string): PersonInput[] {
  const members = new Set(
    input.households.find((row) => row.id === id)!.memberIds,
  );
  const kin = new Set<string>();
  for (const person of input.people)
    if (members.has(person.id))
      for (const other of person.familyIds) kin.add(other);
  return input.people
    .filter((person) => members.has(person.id) || kin.has(person.id))
    .sort((a, b) => a.id.localeCompare(b.id));
}

describe(`deferred relatives in ${place.name} (seed ${place.seed.slice(0, 12)})`, () => {
  it("builds the chosen household exactly as a full build does, and fewer people overall", () => {
    expect(household(light, chosen)).toEqual(household(full, chosen));
    expect(light.people.length).toBeLessThan(full.people.length);
    expect(light.deferredKin?.households[chosen]).toBeUndefined();
    expect(light.deferredKin?.households[deferredHome]).toBeDefined();
  });

  it("builds a deferred household's relatives on fill-in exactly as a full build does", () => {
    const members = new Set(
      light.households.find((row) => row.id === deferredHome)!.memberIds,
    );
    const built = buildDeferredKin(
      light.deferredKin!,
      deferredHome,
      light.people.filter((person) => members.has(person.id)),
    )!;
    const after: CoreInput = {
      ...light,
      people: [
        ...light.people.filter((person) => !members.has(person.id)),
        ...built.people,
      ],
      households: [...light.households, ...built.households],
    };
    expect(household(after, deferredHome)).toEqual(
      household(full, deferredHome),
    );
    expect(
      built.familyLinks.every((link) =>
        full.familyLinks.some((row) => row.id === link.id),
      ),
    ).toBe(true);
  });
});
