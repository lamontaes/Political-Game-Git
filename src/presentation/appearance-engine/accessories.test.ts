import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";
import manifestJson from "../../../art/people-engine/v1/manifest.json" with { type: "json" };
import type { Person } from "../../simulation/types";
import { LAYER_ORDER } from "./assemble";
import {
  ACCESSORY_SHARE,
  accessoriesFor,
  accessoryKindOf,
} from "./face-extras";
import {
  BODY_BUILDS,
  accessoryPlacement,
  composeEnginePerson,
  engineRecipeKey,
  posedPieces,
  recipeFiles,
  type BodyBuild,
  type EngineRecipe,
  type PackAccessory,
  type PackPresentation,
  type PeoplePackManifest,
} from "./pack";
import type { Raster } from "./raster";
import { choiceFromRecipe, engineRecipeFor } from "./recipe";

function readPng(path: string): Raster {
  const png = PNG.sync.read(readFileSync(path));
  return {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
}

const today = manifestJson as unknown as PeoplePackManifest;

const everyBuild = (name: string) =>
  Object.fromEntries(
    BODY_BUILDS.map((build) => [build, { file: `${name}-${build}.png` }]),
  ) as Record<BodyBuild, { file: string }>;

/** The pack with two earrings, a necklace, a watch, a ring and a pin painted. */
function withJewelry(pack: PackPresentation, sex: string): PackPresentation {
  const head = (variant: string): PackAccessory => ({
    id: `earrings-${variant}`,
    kind: "earrings",
    placement: "head",
    file: `accessory-${sex}-earrings-${variant}.png`,
  });
  const body = (
    kind: PackAccessory["kind"],
    variant: string,
    seated = false,
  ): PackAccessory => ({
    id: `${kind}-${variant}`,
    kind,
    placement: "body",
    builds: everyBuild(`accessory-${sex}-${kind}-${variant}`),
    ...(seated
      ? { poses: { seated: everyBuild(`accessory-${sex}-${kind}-seated`) } }
      : {}),
  });
  return {
    ...pack,
    accessories: [
      head("pearl"),
      head("hoop"),
      body("necklace", "chain", true),
      body("watch", "steel"),
      body("ring", "band"),
      body("lapel-pin", "flag"),
    ],
  };
}
const JEWELED: PeoplePackManifest = {
  ...today,
  presentations: {
    feminine: withJewelry(today.presentations.feminine, "feminine"),
    masculine: withJewelry(today.presentations.masculine, "masculine"),
  },
};

const seeds = Array.from({ length: 4000 }, (_, n) => `crowd-${n}`);
const feminine = JEWELED.presentations.feminine;
const masculine = JEWELED.presentations.masculine;
const share = (
  presentation: "feminine" | "masculine",
  pack: PackPresentation,
  kind: PackAccessory["kind"],
  context = {},
) =>
  seeds.filter((seed) =>
    accessoriesFor(seed, 40, presentation, pack, undefined, context).some(
      (id) => accessoryKindOf(id) === kind,
    ),
  ).length / seeds.length;

function adult(age: number, gender: "male" | "female", n: number): Person {
  return {
    id: `person:jewels-${gender}-${age}-${n}`,
    birthDate: `${2026 - age}-01-01`,
    identity: { gender },
    appearance: {
      seed: `jewels-${gender}-${age}-${n}`,
      recipeVersion: "appearance-recipe-v1",
    },
  } as unknown as Person;
}

describe("who wears jewelry", () => {
  it("counts from official portraits: women's earrings and necklaces, and no man's", () => {
    // 51 of 76 women and 0 of 80 men showed earrings; 38 of 76 and 0 of 80 a necklace.
    expect(ACCESSORY_SHARE.earrings.feminine).toBeCloseTo(51 / 76, 6);
    expect(ACCESSORY_SHARE.necklace.feminine).toBeCloseTo(38 / 76, 6);
    expect(ACCESSORY_SHARE.earrings.masculine).toBe(0);
    expect(ACCESSORY_SHARE.necklace.masculine).toBe(0);
    expect(
      Math.abs(share("feminine", feminine, "earrings") - 51 / 76),
    ).toBeLessThan(0.03);
    expect(
      Math.abs(share("feminine", feminine, "necklace") - 0.5),
    ).toBeLessThan(0.03);
    expect(share("masculine", masculine, "earrings")).toBe(0);
    expect(share("masculine", masculine, "necklace")).toBe(0);
  });

  it("varies the variant, and keeps each person's own", () => {
    const worn = new Set(
      seeds.flatMap((seed) =>
        accessoriesFor(seed, 40, "feminine", feminine, undefined),
      ),
    );
    expect(worn.has("earrings-pearl")).toBe(true);
    expect(worn.has("earrings-hoop")).toBe(true);
    expect(accessoriesFor("same", 40, "feminine", feminine, undefined)).toEqual(
      accessoriesFor("same", 40, "feminine", feminine, undefined),
    );
  });

  it("dresses no child, and nobody in what the pack has not painted", () => {
    expect(
      seeds.some(
        (seed) =>
          accessoriesFor(seed, 12, "feminine", feminine, undefined).length > 0,
      ),
    ).toBe(false);
    expect(
      seeds.some(
        (seed) =>
          accessoriesFor(
            seed,
            40,
            "feminine",
            today.presentations.feminine,
            undefined,
          ).length > 0,
      ),
    ).toBe(false);
  });

  it("puts a lapel pin only on an officeholder dressed for it, at the counted share", () => {
    const office = { wear: "business" as const, officeholder: () => true };
    expect(
      Math.abs(share("feminine", feminine, "lapel-pin", office) - 21 / 76),
    ).toBeLessThan(0.03);
    expect(
      Math.abs(share("masculine", masculine, "lapel-pin", office) - 18 / 80),
    ).toBeLessThan(0.03);
    expect(
      share("masculine", masculine, "lapel-pin", {
        wear: "business",
        officeholder: () => false,
      }),
    ).toBe(0);
    expect(
      share("masculine", masculine, "lapel-pin", {
        wear: "casual",
        officeholder: () => true,
      }),
    ).toBe(0);
    expect(share("masculine", masculine, "lapel-pin")).toBe(0);
  });

  it("asks whether someone holds an office only when a pin could be worn", () => {
    let asked = 0;
    const officeholder = () => {
      asked += 1;
      return true;
    };
    for (const seed of seeds)
      accessoriesFor(seed, 40, "masculine", masculine, undefined, {
        wear: "casual",
        officeholder,
      });
    expect(asked).toBe(0);
    for (const seed of seeds)
      accessoriesFor(seed, 40, "masculine", masculine, undefined, {
        wear: "formal",
        officeholder,
      });
    // Asked for the 22.5% whose roll passed, never for every person.
    expect(asked).toBeGreaterThan(0);
    expect(asked).toBeLessThan(seeds.length / 2);
  });

  it("marks the watch and ring shares as placeholders, since a portrait shows no wrist", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      new URL("./face-extras.ts", import.meta.url),
      "utf8",
    );
    expect(
      source.match(/PLACEHOLDER\(accessories\)/g)?.length,
    ).toBeGreaterThanOrEqual(2);
  });
});

describe("a saved choice", () => {
  const choice = { version: "people-engine-v1" as const };

  it("wins, including a choice of none", () => {
    expect(
      accessoriesFor("s", 40, "feminine", feminine, {
        ...choice,
        accessories: ["earrings-hoop"],
      }),
    ).toEqual(["earrings-hoop"]);
    const none = seeds.filter(
      (seed) =>
        accessoriesFor(seed, 40, "feminine", feminine, {
          ...choice,
          accessories: [],
        }).length > 0,
    );
    expect(none).toEqual([]);
  });

  it("ignores a saved id the pack does not have", () => {
    expect(
      accessoriesFor("s", 40, "feminine", feminine, {
        ...choice,
        accessories: ["earrings-diamond", "watch-gold"],
      }),
    ).toEqual([]);
  });

  it("never saves a lapel pin, which comes with an office, and remembers the rest", () => {
    const person = adult(45, "female", 3);
    const recipe = engineRecipeFor(person, "2026-09-28", JEWELED, {
      wear: "formal",
      officeholder: () => true,
    })!;
    const withPin: EngineRecipe = {
      ...recipe,
      accessories: [...(recipe.accessories ?? []), "lapel-pin-flag"],
    };
    const saved = choiceFromRecipe(withPin, JEWELED);
    expect(saved.accessories).toBeDefined();
    expect(saved.accessories).not.toContain("lapel-pin-flag");
    // Nothing painted to choose from yet: nothing saved, so the seed applies later.
    expect(choiceFromRecipe(withPin, today).accessories).toBeUndefined();
    const again = engineRecipeFor(
      {
        ...person,
        appearance: { ...person.appearance!, engine: saved },
      } as Person,
      "2026-09-28",
      JEWELED,
    )!;
    expect(again.accessories ?? []).toEqual(
      (recipe.accessories ?? []).filter((id) => id !== "lapel-pin-flag"),
    );
  });
});

describe("the recipe", () => {
  it("leaves today's recipes and keys unchanged until the art lands", () => {
    for (let n = 0; n < 50; n += 1) {
      const recipe = engineRecipeFor(
        adult(40, "female", n),
        "2026-09-28",
        today,
        {
          wear: "formal",
          officeholder: () => true,
        },
      )!;
      expect(recipe.accessories).toBeUndefined();
      expect(engineRecipeKey(recipe)).not.toMatch(/wears:/);
    }
  });

  it("puts jewelry on a crowd once the art lands, and into its key in any order", () => {
    let wearing = 0;
    for (let n = 0; n < 300; n += 1)
      if (
        engineRecipeFor(adult(35, "female", n), "2026-09-28", JEWELED)!
          .accessories
      )
        wearing += 1;
    expect(wearing).toBeGreaterThan(200);
    const base = engineRecipeFor(
      adult(35, "female", 1),
      "2026-09-28",
      JEWELED,
    )!;
    expect(
      engineRecipeKey({
        ...base,
        accessories: ["watch-steel", "earrings-hoop"],
      }),
    ).toBe(
      engineRecipeKey({
        ...base,
        accessories: ["earrings-hoop", "watch-steel"],
      }),
    );
    expect(
      engineRecipeKey({ ...base, accessories: ["earrings-hoop"] }),
    ).not.toBe(engineRecipeKey({ ...base, accessories: ["earrings-pearl"] }));
  });
});

describe("drawing it", () => {
  const base: EngineRecipe = {
    presentation: "feminine",
    build: "average",
    shade: 3,
    face: feminine.faces[0]!.id,
    hair: feminine.hair[0]!.id,
    hairColor: "natural",
    outfit: feminine.outfits[0]!.id,
    accessories: ["earrings-pearl", "necklace-chain", "watch-steel"],
  };

  it("draws earrings on the head and the rest on the body, in each place they belong", () => {
    const at = (slot: (typeof LAYER_ORDER)[number]) =>
      LAYER_ORDER.indexOf(slot);
    expect(accessoryPlacement("earrings")).toBe("head");
    expect(accessoryPlacement("watch")).toBe("body");
    expect(at("outerwear")).toBeLessThan(at("jewelry"));
    expect(at("jewelry")).toBeLessThan(at("head"));
    expect(at("glasses")).toBeLessThan(at("earrings"));
    expect(at("earrings")).toBeLessThan(at("front-hair"));
    expect(recipeFiles(JEWELED, base)).toEqual(
      expect.arrayContaining([
        "accessory-feminine-earrings-pearl.png",
        "accessory-feminine-necklace-chain-average.png",
        "accessory-feminine-watch-steel-average.png",
      ]),
    );
    // Composed, they are requested and show: the picture differs from the
    // same person without them.
    const asked: string[] = [];
    const read = (file: string): Raster => {
      asked.push(file);
      if (!file.startsWith("accessory-"))
        return readPng(`art/people-engine/v1/${file}`);
      const like = readPng(
        `art/people-engine/v1/${file.includes("earrings") ? feminine.faces[0]!.file : feminine.bodies.average.file}`,
      );
      const data = new Uint8ClampedArray(like.data.length);
      for (let p = 0; p < like.width * like.height; p += 1)
        if (
          Math.floor(p / like.width) > like.height * 0.3 &&
          Math.floor(p / like.width) < like.height * 0.6 &&
          p % like.width > like.width * 0.3 &&
          p % like.width < like.width * 0.7
        )
          data.set([255, 0, 255, 255], p * 4);
      return { width: like.width, height: like.height, data };
    };
    const worn = composeEnginePerson(JEWELED, read, base);
    expect(asked).toEqual(
      expect.arrayContaining([
        "accessory-feminine-earrings-pearl.png",
        "accessory-feminine-necklace-chain-average.png",
        "accessory-feminine-watch-steel-average.png",
      ]),
    );
    const bare = composeEnginePerson(JEWELED, read, {
      ...base,
      accessories: [],
    });
    expect([worn.raster.width, worn.raster.height]).toEqual([
      bare.raster.width,
      bare.raster.height,
    ]);
    expect(
      Buffer.compare(
        Buffer.from(worn.raster.data),
        Buffer.from(bare.raster.data),
      ),
    ).not.toBe(0);
  }, 60_000);

  it("draws a body accessory only in the pose and build it was painted in", () => {
    // The necklace has a seated painting; the watch does not.
    const seated = posedPieces(feminine, { ...base, pose: "seated" });
    if (seated.pose === "seated") {
      expect(seated.accessories.map((entry) => entry.id)).toEqual(
        expect.arrayContaining(["earrings-pearl", "necklace-chain"]),
      );
      expect(seated.accessories.map((entry) => entry.id)).not.toContain(
        "watch-steel",
      );
    }
    const standing = posedPieces(feminine, base);
    expect(standing.accessories.map((entry) => entry.id).sort()).toEqual([
      "earrings-pearl",
      "necklace-chain",
      "watch-steel",
    ]);
  });

  it("draws no layer for a painting the build lacks or a file the build does not carry", () => {
    const missing = posedPieces(
      feminine,
      base,
      (file) =>
        !file.includes("watch-steel") && !file.includes("earrings-pearl"),
    );
    expect(missing.accessories.map((entry) => entry.id)).toEqual([
      "necklace-chain",
    ]);
    const unpainted = posedPieces(today.presentations.feminine, base);
    expect(unpainted.accessories).toEqual([]);
    // An accessory id the pack never painted is worn by no one.
    expect(
      posedPieces(feminine, { ...base, accessories: ["ring-gold"] })
        .accessories,
    ).toEqual([]);
  });
});
