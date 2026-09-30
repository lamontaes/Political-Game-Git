import { describe, expect, it } from "vitest";
import manifestJson from "../../../art/people-engine/v1/manifest.json" with { type: "json" };
import { heroRecipe } from "./hero-posture";
import {
  FACE_EXPRESSIONS,
  engineRecipeKey,
  expressedFace,
  posedPieces,
  type EngineRecipe,
  type PackPresentation,
  type PeoplePackManifest,
} from "./pack";

const manifest = manifestJson as unknown as PeoplePackManifest;

function recipe(
  pack: PackPresentation,
  overrides: Partial<EngineRecipe> = {},
): EngineRecipe {
  return {
    presentation: "feminine",
    build: "average",
    shade: 4,
    face: pack.faces[0]!.id,
    hair: pack.hair[0]!.id,
    hairColor: "natural",
    outfit: pack.outfits[0]!.id,
    ...overrides,
  };
}

/** The feminine pack with its first face painted smiling. */
function withSmile(pack: PackPresentation): PackPresentation {
  const face = pack.faces[0]!;
  return {
    ...pack,
    faces: [
      {
        ...face,
        expressions: {
          smile: {
            file: face.file.replace(/\.png$/, "-smile.png"),
            skin: face.skin,
          },
        },
      },
      // The other faces keep no painted expressions, whatever the shipped
      // pack now holds, so a face that was not painted can be tested.
      ...pack.faces.slice(1).map((other) => ({
        ...other,
        expressions: undefined,
      })),
    ],
  };
}

describe("expressions", () => {
  const pack = withSmile(manifest.presentations.feminine);

  it("draws a painted expression, and the neutral face for every other", () => {
    const smiling = posedPieces(pack, recipe(pack, { expression: "smile" }));
    expect(smiling.expression).toBe("smile");
    expect(smiling.face.file.endsWith("-smile.png")).toBe(true);
    for (const expression of FACE_EXPRESSIONS.filter((e) => e !== "smile")) {
      const drawn = posedPieces(pack, recipe(pack, { expression }));
      expect(drawn.expression).toBe("neutral");
      expect(drawn.face.file).toBe(pack.faces[0]!.file);
    }
    // Another face was not painted smiling.
    expect(
      posedPieces(
        pack,
        recipe(pack, { face: pack.faces[1]!.id, expression: "smile" }),
      ).expression,
    ).toBe("neutral");
    // The build lacks the file.
    expect(
      posedPieces(
        pack,
        recipe(pack, { expression: "smile" }),
        (file) => !file.endsWith("-smile.png"),
      ).expression,
    ).toBe("neutral");
  });

  it("resolves every expression for every face in today's pack, to a face that exists", () => {
    for (const presentation of ["feminine", "masculine"] as const) {
      const today = manifest.presentations[presentation];
      for (const face of today.faces)
        for (const expression of FACE_EXPRESSIONS) {
          const drawn = expressedFace(face, expression);
          expect(drawn.face.file.length).toBeGreaterThan(0);
          expect(drawn.face.id).toBe(face.id);
        }
    }
  });

  it("names the expression in the recipe key, and neutral as before", () => {
    const plain = engineRecipeKey(recipe(pack));
    expect(engineRecipeKey(recipe(pack, { expression: "neutral" }))).toBe(
      plain,
    );
    expect(engineRecipeKey(recipe(pack, { expression: "smile" }))).not.toBe(
      plain,
    );
  });
});

describe("the title screen's hero", () => {
  const pack = manifest.presentations.feminine;
  const look = recipe(pack);

  it("puts speaking officials and candidates at the podium, turned", () => {
    for (const kind of [
      "president",
      "member-of-congress",
      "governor",
      "state-executive",
      "state-legislator",
      "mayor",
      "council-member",
      "county-commissioner",
      "candidate",
    ]) {
      const hero = heroRecipe(look, kind, manifest);
      expect([hero.pose, hero.view]).toEqual(["podium", "three-quarter"]);
    }
  });

  it("seats a judge in the robe, has an organizer explain, and everyone else fold their arms", () => {
    const judge = heroRecipe(look, "judge", manifest);
    expect(judge.pose).toBe("seated");
    expect(judge.outfit).toBe("judge-robe");
    expect(heroRecipe(look, "organizer", manifest).pose).toBe("explaining");
    for (const kind of ["public-servant", null, undefined, "unknown-kind"])
      expect(heroRecipe(look, kind, manifest).pose).toBe("arms-folded");
    // The look itself is kept: the same person, only posed.
    expect(heroRecipe(look, "mayor", manifest).face).toBe(look.face);
  });
});
