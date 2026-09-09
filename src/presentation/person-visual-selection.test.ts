import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import catalogJson from "../../art/fixtures/valid_character_catalog.json";
import manifestJson from "../../art/fixtures/valid_character_manifest.json";
import { createDemoWorld } from "../simulation/demo";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import type { PersonAppearance } from "../simulation/types";
import {
  createCharacterComponentLibrary,
  reproduceCharacterRecipe,
  resolveCharacterRecipe,
  type CharacterCatalogData,
  type CharacterComponentManifestRecord,
} from "./character-components";
import {
  listPersonVisualSelections,
  listPersonWardrobeFamilies,
  resolvePersonWardrobeContext,
  setPersonVisualSelection,
  type PersonVisualSelection,
  type PersonWardrobePreference,
} from "./person-visual-selection";

const records =
  manifestJson.assets as unknown as readonly CharacterComponentManifestRecord[];
const catalog = catalogJson as unknown as CharacterCatalogData;
const library = createCharacterComponentLibrary(records, catalog);
const context = { library, poseFamily: "standing-neutral" };
const appearance: PersonAppearance = {
  seed: "explicit-selection-control",
  recipeVersion: "appearance-recipe-v1",
  catalogGeneration: 1,
};
const selection: PersonVisualSelection = {
  bodyFamily: "adult-medium",
  headFamily: "round",
  hairFamily: "short-crop",
};
const world = createDemoWorld();
const personId = world.personOrder[0]!;

function selectedWorld(chosen = selection) {
  return setPersonVisualSelection(world, personId, chosen, context);
}

describe("explicit saved appearance selection", () => {
  it("narrows dependent identity controls without changing the available combinations", () => {
    const all = listPersonVisualSelections({ ...context, appearance });
    for (const selectionFilter of [
      { hairFamily: null },
      { bodyFamily: "adult-medium", headFamily: "round" },
      { hairFamily: "short-crop" },
      { bodyFamily: "absent" },
    ]) {
      expect(
        listPersonVisualSelections({ ...context, appearance, selectionFilter }),
      ).toEqual(
        all.filter((entry) =>
          Object.entries(selectionFilter).every(
            ([key, value]) =>
              entry.selection[key as keyof PersonVisualSelection] === value,
          ),
        ),
      );
    }
  });

  it("preserves the exact pre-extension recipe bytes when selection is absent", () => {
    const recipe = resolveCharacterRecipe(
      { appearance, poseFamily: context.poseFamily, catalogGeneration: 1 },
      library,
    );
    // Read from the actual 44aea4bf resolver before this extension.
    expect(
      createHash("sha256").update(JSON.stringify(recipe)).digest("hex"),
    ).toBe("991d069ddbf9e0b468274b2a1ac41d147106d573220f717f0effe7fc20ac43e5");
    expect(recipe).not.toHaveProperty("selection");
  });

  it("enumerates only exact body, head, hair and facing combinations", () => {
    const standing = listPersonVisualSelections({ ...context, appearance });
    expect(standing.map((entry) => entry.selection)).toEqual([
      { bodyFamily: "adult-medium", headFamily: "oval", hairFamily: null },
      {
        bodyFamily: "adult-medium",
        headFamily: "oval",
        hairFamily: "short-crop",
      },
      { bodyFamily: "adult-medium", headFamily: "round", hairFamily: null },
      {
        bodyFamily: "adult-medium",
        headFamily: "round",
        hairFamily: "short-crop",
      },
    ]);
    // Tall body has no standing art; long-wave hair has no front-facing art.
    expect(
      standing.every(
        (entry) =>
          entry.bodyAssetId === "body_adult_medium_standing_v1" &&
          !entry.released,
      ),
    ).toBe(true);
    const seated = listPersonVisualSelections({
      ...context,
      appearance,
      poseFamily: "seated-at-desk",
    });
    expect(
      seated.some(
        (entry) =>
          entry.selection.bodyFamily === "adult-tall" &&
          entry.selection.headFamily === "round" &&
          entry.selection.hairFamily === "long-wave",
      ),
    ).toBe(true);
    expect(
      seated.some(
        (entry) =>
          entry.selection.bodyFamily === "adult-tall" &&
          entry.selection.headFamily === "oval",
      ),
    ).toBe(false);
    expect(standing).toEqual(
      listPersonVisualSelections({ ...context, appearance }),
    );
  });

  it("writes one canonical person immutably and round trips the explicit choice", () => {
    const before = serializeWorld(world);
    const updated = selectedWorld();
    expect(serializeWorld(world)).toBe(before);
    expect(updated).not.toBe(world);
    expect(updated.people).not.toBe(world.people);
    expect(updated.personOrder).toBe(world.personOrder);
    expect(updated.history).toBe(world.history);
    for (const id of world.personOrder) {
      if (id !== personId) expect(updated.people[id]).toBe(world.people[id]);
    }
    const person = updated.people[personId]!;
    expect(person).toEqual({
      ...world.people[personId],
      appearance: { ...world.people[personId]!.appearance, selection },
    });
    expect(person.appearance!.seed).toBe(
      world.people[personId]!.appearance!.seed,
    );
    expect(person.appearance!.recipeVersion).toBe(
      world.people[personId]!.appearance!.recipeVersion,
    );
    expect(person.appearance!.catalogGeneration).toBe(
      world.people[personId]!.appearance!.catalogGeneration,
    );
    const reloaded = deserializeWorld(serializeWorld(updated));
    expect(reloaded.people[personId]!.appearance).toEqual(person.appearance);
    const recipe = resolveCharacterRecipe(
      { appearance: person.appearance!, poseFamily: context.poseFamily },
      library,
    );
    expect(recipe.identity.bodyFamily).toBe(selection.bodyFamily);
    expect(recipe.identity.headFamily).toBe(selection.headFamily);
    expect(recipe.identity.slots.hair).toBe(selection.hairFamily);
    expect(
      reproduceCharacterRecipe(recipe, context.poseFamily, library),
    ).toEqual(recipe);
  });

  it("explicit null removes optional front and paired back hair without rerolling other slots", () => {
    const first = resolveCharacterRecipe(
      {
        appearance: { ...appearance, selection },
        poseFamily: context.poseFamily,
      },
      library,
    );
    const bare = resolveCharacterRecipe(
      {
        appearance: {
          ...appearance,
          selection: { ...selection, hairFamily: null },
        },
        poseFamily: context.poseFamily,
      },
      library,
    );
    expect(
      bare.context.components.some(
        (part) => part.kind === "hair-front" || part.kind === "hair-back",
      ),
    ).toBe(false);
    expect(bare.identity.slots).toEqual({
      ...first.identity.slots,
      hair: null,
    });
    expect(bare.context.components).toEqual(
      first.context.components.filter(
        (part) => part.kind !== "hair-front" && part.kind !== "hair-back",
      ),
    );
  });

  it.each([
    { ...selection, bodyFamily: "not-a-body" },
    { ...selection, headFamily: "not-a-head" },
    { ...selection, hairFamily: "not-a-hair" },
    { ...selection, bodyFamily: "adult-tall", headFamily: "oval" },
    { ...selection, headFamily: "oval", hairFamily: "long-wave" },
  ])(
    "refuses unavailable explicit identity $bodyFamily / $headFamily / $hairFamily",
    (invalid) => {
      expect(() =>
        resolveCharacterRecipe(
          {
            appearance: { ...appearance, selection: invalid },
            poseFamily: context.poseFamily,
            unresolvableRequiredSlots: "diagnose",
          },
          library,
        ),
      ).toThrow(/Explicit/);
      expect(() => selectedWorld(invalid)).toThrow();
    },
  );

  it("refuses a selected hairstyle that has no facing for the requested pose", () => {
    expect(() =>
      selectedWorld({ ...selection, hairFamily: "long-wave" }),
    ).toThrow(/unavailable in pose/);
  });

  it("cannot use a later generation or override an absent legacy pin", () => {
    const futureHair = records.find(
      (entry) => entry.asset_id === "hair_short_crop_front_front_v1",
    )!;
    const grown = createCharacterComponentLibrary(
      [
        ...records,
        {
          ...futureHair,
          asset_id: "future-hair",
          component: {
            ...futureHair.component!,
            family: "future-hair",
            catalog_generation: 2,
          },
        },
      ],
      { ...catalog, catalog_generation: 2 },
    );
    const pinned: PersonAppearance = {
      seed: appearance.seed,
      recipeVersion: appearance.recipeVersion,
      selection: { ...selection, hairFamily: "future-hair" },
    };
    expect(() =>
      resolveCharacterRecipe(
        { appearance: pinned, poseFamily: context.poseFamily },
        grown,
      ),
    ).toThrow(/pinned generation 1/);
    expect(() =>
      resolveCharacterRecipe(
        {
          appearance: pinned,
          poseFamily: context.poseFamily,
          catalogGeneration: 2,
        },
        grown,
      ),
    ).toThrow(/catalog pin/);
    expect(
      listPersonVisualSelections({
        ...context,
        library: grown,
        appearance,
      }).some((entry) => entry.selection.hairFamily === "future-hair"),
    ).toBe(false);
  });

  it("rejects malformed saved selections, unknown people and bodies with baked heads", () => {
    for (const invalid of [
      null,
      {},
      { ...selection, hairFamily: undefined },
      { ...selection, extra: "ignored?" },
    ]) {
      expect(() =>
        resolveCharacterRecipe(
          {
            appearance: {
              ...appearance,
              selection: invalid as PersonVisualSelection,
            },
            poseFamily: context.poseFamily,
          },
          library,
        ),
      ).toThrow(/Explicit/);
    }
    expect(() =>
      setPersonVisualSelection(world, "missing-person", selection, context),
    ).toThrow(/Unknown canonical person/);
    const baked = createCharacterComponentLibrary(
      records.map((entry) =>
        entry.component?.kind === "body"
          ? {
              ...entry,
              component: { ...entry.component, baked_slots: ["head"] },
            }
          : entry,
      ),
      catalog,
    );
    expect(() =>
      resolveCharacterRecipe(
        {
          appearance: { ...appearance, selection },
          poseFamily: context.poseFamily,
        },
        baked,
      ),
    ).toThrow(/Explicit head/);
  });
});

describe("typed per-person wardrobe preference", () => {
  it("allows an exact identity in a partial library while refusing its missing bottom", () => {
    const partialLibrary = createCharacterComponentLibrary(
      records.filter((entry) => entry.component?.kind !== "bottom"),
      catalog,
    );
    const partialContext = { ...context, library: partialLibrary };
    expect(
      listPersonVisualSelections({ ...partialContext, appearance }).some(
        (entry) =>
          entry.selection.bodyFamily === selection.bodyFamily &&
          entry.selection.headFamily === selection.headFamily &&
          entry.selection.hairFamily === selection.hairFamily,
      ),
    ).toBe(true);
    const updated = setPersonVisualSelection(
      world,
      personId,
      selection,
      partialContext,
    );
    const person = updated.people[personId]!;
    expect(person.appearance!.selection).toEqual(selection);
    expect(person.appearance!.seed).toBe(
      world.people[personId]!.appearance!.seed,
    );
    expect(listPersonWardrobeFamilies(person, partialContext).bottom).toEqual(
      [],
    );
    expect(
      resolvePersonWardrobeContext(
        person,
        { personId, families: { top: "tee-grey" } },
        partialContext,
      ).families.top,
    ).toEqual(["tee-grey"]);
    expect(() =>
      resolvePersonWardrobeContext(
        person,
        { personId, families: { bottom: "slacks-charcoal" } },
        partialContext,
      ),
    ).toThrow(/unavailable/);
    // This authoring adapter does not change the normal resolver's refusal.
    expect(() =>
      resolveCharacterRecipe(
        { appearance: person.appearance!, poseFamily: context.poseFamily },
        partialLibrary,
      ),
    ).toThrow(/Required character slot 'bottom'/);
  });

  it("lists exact body/pose families, including per-body derivatives", () => {
    const medium = selectedWorld().people[personId]!;
    expect(listPersonWardrobeFamilies(medium, context)).toEqual({
      top: ["blazer-navy", "tee-grey"],
      bottom: ["slacks-charcoal"],
      footwear: ["oxford-black"],
    });
    const seatedContext = { ...context, poseFamily: "seated-at-desk" };
    const tall = setPersonVisualSelection(
      world,
      personId,
      { ...selection, bodyFamily: "adult-tall" },
      seatedContext,
    ).people[personId]!;
    expect(listPersonWardrobeFamilies(tall, seatedContext)).toEqual({
      top: ["blazer-navy"],
      bottom: ["slacks-charcoal"],
      footwear: [],
    });
    expect(() =>
      resolvePersonWardrobeContext(
        tall,
        { personId, families: { top: "tee-grey" } },
        seatedContext,
      ),
    ).toThrow(/unavailable/);
  });

  it("round trips singleton wardrobe preferences beside a saved World and preserves identity", () => {
    const updated = selectedWorld();
    const person = updated.people[personId]!;
    const preference: PersonWardrobePreference = {
      personId,
      families: {
        top: "tee-grey",
        bottom: "slacks-charcoal",
        footwear: "oxford-black",
      },
    };
    const saved = JSON.stringify({
      world: serializeWorld(updated),
      wardrobeByPersonId: { [personId]: preference },
    });
    const loaded = JSON.parse(saved) as {
      world: string;
      wardrobeByPersonId: Record<string, PersonWardrobePreference>;
    };
    const restored = deserializeWorld(loaded.world);
    const wardrobe = resolvePersonWardrobeContext(
      restored.people[personId]!,
      loaded.wardrobeByPersonId[personId]!,
      context,
    );
    expect(wardrobe).toEqual({
      id: `person-wardrobe:${personId}`,
      families: {
        top: ["tee-grey"],
        bottom: ["slacks-charcoal"],
        footwear: ["oxford-black"],
      },
    });
    const without = resolveCharacterRecipe(
      { appearance: person.appearance!, poseFamily: context.poseFamily },
      library,
    );
    const withWardrobe = resolveCharacterRecipe(
      {
        appearance: person.appearance!,
        poseFamily: context.poseFamily,
        wardrobe,
      },
      library,
    );
    expect(withWardrobe.identity).toEqual(without.identity);
    expect(
      withWardrobe.context.components.find((part) => part.kind === "top")!
        .family,
    ).toBe("tee-grey");
    expect(serializeWorld(restored)).toBe(serializeWorld(updated));
  });

  it.each([
    { personId: "wrong-person", families: { top: "tee-grey" } },
    { personId, families: { top: ["tee-grey", "blazer-navy"] } },
    { personId, families: { head: "round" } },
    { personId, families: { top: "" } },
    { personId, families: { footwear: "not-in-library" } },
    { personId, families: null },
  ])("fails closed for invalid saved preference %#", (invalid) => {
    expect(() =>
      resolvePersonWardrobeContext(
        selectedWorld().people[personId]!,
        invalid as PersonWardrobePreference,
        context,
      ),
    ).toThrow();
  });

  it("does not mutate the caller's selection or singleton preference objects", () => {
    const chosen = { ...selection };
    const updated = selectedWorld(chosen);
    chosen.headFamily = "oval";
    expect(updated.people[personId]!.appearance!.selection!.headFamily).toBe(
      "round",
    );
    const preference: PersonWardrobePreference = Object.freeze({
      personId,
      families: Object.freeze({ top: "tee-grey" }),
    });
    expect(
      resolvePersonWardrobeContext(
        updated.people[personId]!,
        preference,
        context,
      ).families.top,
    ).toEqual(["tee-grey"]);
  });
});
