import { describe, expect, it } from "vitest";
import oldUnpinned from "./fixtures/morning23-old-unpinned.json";
import oldPinned from "./fixtures/morning23-old-gen2.json";
import frozen from "../../art/manifest/character_candidate_visual4_generations.json";
import catalog from "../../art/manifest/character_catalog.json";
import {
  PEOPLE_VISUAL4_CHARACTER_LIBRARY as library,
  PEOPLE_VISUAL4_RECORDS,
} from "./people-visual4-review";
import {
  liftCandidatesForReview,
  resolveCharacterRecipe,
  type CharacterComponentLibrary,
} from "./character-components";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import {
  migrateUnpinnedAppearanceCatalog,
  derivePersonAppearance,
} from "../simulation/person-appearance";

const records = PEOPLE_VISUAL4_RECORDS.filter((r) =>
  library.components.has(r.asset_id),
);
const top = [...library.components.values()].find(
  (c) => c.definition.kind === "top",
)!;
function grow(generation: number): CharacterComponentLibrary {
  const components = new Map(library.components);
  for (let i = 0; i < 12; i++)
    components.set(`future_top_${i}`, {
      ...top,
      assetId: `future_top_${i}`,
      definition: {
        ...top.definition,
        family: `future-top-${i}`,
        catalog_generation: generation,
      },
    });
  return { ...library, catalogGeneration: generation, components };
}
function recipe(
  appearance: ReturnType<typeof derivePersonAppearance>,
  lib = library,
) {
  return resolveCharacterRecipe(
    {
      appearance,
      poseFamily: "standing-neutral",
      unresolvableRequiredSlots: "diagnose",
    },
    lib,
  );
}

describe("MORNING23 saved catalog continuity", () => {
  it("reproduces both donor bugs: moving an unpinned v2 to gen3 and adding new families to saved gen2 changes components", () => {
    for (const [fixture, generation] of [
      [oldUnpinned, 3],
      [oldPinned, 2],
    ] as const) {
      const world = deserializeWorld(fixture.payload);
      const grown = grow(generation);
      const changed = world.personOrder.filter((id) => {
        const appearance = {
          ...world.people[id]!.appearance!,
          catalogGeneration: generation,
        };
        return (
          JSON.stringify(recipe(appearance, grown).context.components) !==
          JSON.stringify(
            recipe(world.people[id]!.appearance!).context.components,
          )
        );
      });
      expect(changed.length).toBeGreaterThan(0);
    }
  });
  it.each([oldUnpinned, oldPinned])(
    "preserves donor components and every non-appearance world field across migration, gen3 growth and save reload",
    (fixture) => {
      const old = deserializeWorld(fixture.payload);
      const migrated = migrateUnpinnedAppearanceCatalog(old);
      const loaded = deserializeWorld(serializeWorld(migrated));
      expect(migrateUnpinnedAppearanceCatalog(loaded)).toBe(loaded);
      for (const expected of fixture.recipes) {
        const person = loaded.people[expected.personId]!;
        expect(person.appearance?.catalogGeneration).toBe(2);
        expect(recipe(person.appearance!, grow(3))).toEqual(expected.recipe);
        expect({
          ...person,
          appearance: old.people[expected.personId]!.appearance,
        }).toEqual(old.people[expected.personId]);
      }
      expect({ ...loaded, people: old.people }).toEqual(old);
      expect(serializeWorld(old)).toBe(fixture.payload);
    },
  );
  it("rejects rewriting published definitions, dropping members or adding a future member to gen2", () => {
    const options = { frozenGenerations: frozen.generations };
    expect(() =>
      liftCandidatesForReview(records.slice(1), catalog.slots, options),
    ).toThrow("Published candidate generation");
    expect(() =>
      liftCandidatesForReview(
        records.map((r, i) =>
          i
            ? r
            : {
                ...r,
                candidate_component: {
                  ...r.candidate_component!,
                  family: "changed",
                },
              },
        ),
        catalog.slots,
        options,
      ),
    ).toThrow("Published candidate generation");
    const extra = { ...records[0]!, asset_id: "future-body" };
    const lifted = liftCandidatesForReview(
      [...records, extra],
      catalog.slots,
      options,
    );
    expect(
      lifted.records.find((r) => r.asset_id === "future-body")!.component!
        .catalog_generation,
    ).toBe(3);
    expect(lifted.catalog.generations.slice(0, 2)).toEqual(frozen.generations);
  });
  it("leaves v1, missing appearances and existing explicit choices unchanged", () => {
    const world = deserializeWorld(oldUnpinned.payload);
    const id = world.personOrder[0]!;
    const appearance = {
      ...derivePersonAppearance(id, "appearance-recipe-v2"),
      selection: {
        bodyFamily: "chosen",
        headFamily: "chosen",
        hairFamily: null,
      },
    };
    const modified = {
      ...world,
      people: { ...world.people, [id]: { ...world.people[id]!, appearance } },
    };
    expect(
      migrateUnpinnedAppearanceCatalog(modified).people[id]!.appearance,
    ).toEqual({ ...appearance, catalogGeneration: 1 });
    const v1 = {
      ...world,
      people: Object.fromEntries(
        Object.entries(world.people).map(([key, p]) => [
          key,
          { ...p, appearance: derivePersonAppearance(key) },
        ]),
      ),
    };
    expect(migrateUnpinnedAppearanceCatalog(v1)).toBe(v1);
  });
});
