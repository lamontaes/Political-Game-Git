import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { EntityId, Person, World } from "../simulation/types";
import {
  PART_PALETTES,
  type EngineRecipe,
} from "../presentation/appearance-engine/pack";
import { engineRecipeFor } from "../presentation/appearance-engine/recipe";
import { PEOPLE_PACK } from "../presentation/appearance-engine/runtime";
import type * as AppearanceRuntime from "../presentation/appearance-engine/runtime";
import type { PersonSceneAppearance } from "../presentation/person-scene-appearance";
import {
  PRODUCTION_CHARACTER_LIBRARY,
  PRODUCTION_VISUAL_LIBRARY,
} from "../presentation/visual-integration";

vi.mock("./SavedAppearance", () => ({
  useSavedRenderSnapshot: () => undefined,
  useSavedWardrobe: () => undefined,
}));
vi.mock("../presentation/appearance-engine/runtime", async () => {
  const actual = await vi.importActual<typeof AppearanceRuntime>(
    "../presentation/appearance-engine/runtime",
  );
  return { ...actual, peoplePackAvailable: () => true };
});
vi.mock("./EnginePerson", () => ({
  EnginePortrait: ({ recipe }: { recipe: EngineRecipe }) => (
    <span data-testid="drawn-portrait" data-recipe={JSON.stringify(recipe)} />
  ),
  EngineFigure: ({ recipe }: { recipe: EngineRecipe }) => (
    <span data-testid="drawn-figure" data-recipe={JSON.stringify(recipe)} />
  ),
}));
vi.mock("../presentation/work-uniform", () => ({
  workUniform: vi.fn(() => undefined),
}));
vi.mock("../simulation/governing/office-consequence", () => ({
  officesHeldBy: () => [],
}));
vi.mock("../presentation/appearance-engine/marital-status", () => ({
  isMarriedNow: () => false,
}));

import { workUniform } from "../presentation/work-uniform";
import { PersonPortrait } from "./PersonPortrait";
import { SavedPersonFigure } from "./SavedPersonFigure";

const pack = PEOPLE_PACK;

function fixture() {
  const person = {
    id: "portrait-scene-person" as EntityId,
    givenName: "Taylor",
    familyName: "Jones",
    birthDate: "1990-01-01",
  } as Person;
  const world = {
    people: { [person.id]: person },
    currentDate: "2026-01-05",
  } as unknown as World;
  return { person, world };
}

function drawnRecipe(markup: string): EngineRecipe {
  const value = /data-recipe="([^"]*)"/.exec(markup)?.[1];
  expect(value).toBeDefined();
  return JSON.parse(value!.replaceAll("&quot;", '"').replaceAll("&amp;", "&"));
}

describe("the scene's actual clothes in a portrait", () => {
  it("leaves explicit review libraries on their existing portrait path", () => {
    const { person, world } = fixture();
    const before = JSON.stringify(world);
    const appearance: PersonSceneAppearance = {
      personId: person.id,
      onDate: world.currentDate,
      recipe: engineRecipeFor(person, world.currentDate, pack, {
        wear: "formal",
      })!,
    };
    const libraries = {
      characters: PRODUCTION_CHARACTER_LIBRARY,
      visuals: PRODUCTION_VISUAL_LIBRARY,
    };
    expect(
      renderToStaticMarkup(
        <PersonPortrait
          world={world}
          personId={person.id}
          visualLibraries={libraries}
          sceneAppearance={appearance}
        />,
      ),
    ).not.toContain('data-testid="drawn-portrait"');
    expect(
      renderToStaticMarkup(
        <SavedPersonFigure
          world={world}
          personId={person.id}
          libraries={libraries}
          sceneAppearance={appearance}
        />,
      ),
    ).not.toContain('data-testid="drawn-figure"');
    expect(JSON.stringify(world)).toBe(before);
  });

  it("does not borrow an adult scene recipe for a child in an old save", () => {
    const { person, world } = fixture();
    const appearance: PersonSceneAppearance = {
      personId: person.id,
      onDate: world.currentDate,
      recipe: engineRecipeFor(person, world.currentDate, pack, {
        wear: "formal",
      })!,
    };
    const childWorld = {
      ...world,
      people: { [person.id]: { ...person, birthDate: "2020-01-01" } },
    } as World;
    const before = JSON.stringify(childWorld);
    expect(
      renderToStaticMarkup(
        <PersonPortrait
          world={childWorld}
          personId={person.id}
          sceneAppearance={appearance}
        />,
      ),
    ).not.toContain('data-testid="drawn-portrait"');
    expect(
      renderToStaticMarkup(
        <SavedPersonFigure
          world={childWorld}
          personId={person.id}
          sceneAppearance={appearance}
        />,
      ),
    ).toContain('data-figure-status="unavailable"');
    expect(JSON.stringify(childWorld)).toBe(before);
  });

  it.each(["formal", "casual", "uniform"] as const)(
    "keeps %s outfit and resolved colors through inspect/expansion, then restores the ordinary portrait",
    (occasion) => {
      const { person, world } = fixture();
      vi.mocked(workUniform).mockReturnValue(
        occasion === "uniform" ? "police" : undefined,
      );
      const normal = drawnRecipe(
        renderToStaticMarkup(
          <PersonPortrait world={world} personId={person.id} />,
        ),
      );
      const scene = engineRecipeFor(person, world.currentDate, pack, {
        wear: occasion === "uniform" ? "business" : occasion,
        uniform: occasion === "uniform" ? "police" : undefined,
      })!;
      const outfit = pack.presentations[scene.presentation].outfits.find(
        (item) => item.id === scene.outfit,
      )!;
      // A valid already-resolved scene color differs from the seeded default.
      const colors = Object.fromEntries(
        Object.entries(outfit.parts).map(([part, paletteId]) => {
          const palette = PART_PALETTES[paletteId]!;
          return [
            part,
            palette.find((color) => color !== scene.colors?.[part]) ??
              palette[0]!,
          ];
        }),
      );
      const appearance: PersonSceneAppearance = {
        personId: person.id,
        onDate: world.currentDate,
        recipe: { ...scene, colors },
      };
      const before = JSON.stringify({ world, appearance });
      for (const component of [
        <PersonPortrait
          world={world}
          personId={person.id}
          sceneAppearance={appearance}
        />,
        <SavedPersonFigure
          world={world}
          personId={person.id}
          sceneAppearance={appearance}
        />,
      ]) {
        const drawn = drawnRecipe(renderToStaticMarkup(component));
        expect(drawn.outfit).toBe(scene.outfit);
        expect(drawn.colors).toEqual(colors);
        expect(drawn.face).toBe(normal.face);
        expect(drawn.hair).toBe(normal.hair);
        expect(drawn.shade).toBe(normal.shade);
        expect(drawn.presentation).toBe(normal.presentation);
      }
      expect(
        drawnRecipe(
          renderToStaticMarkup(
            <PersonPortrait world={world} personId={person.id} />,
          ),
        ),
      ).toEqual(normal);
      expect(JSON.stringify({ world, appearance })).toBe(before);
    },
  );

  it.each(["other-person", "previous-date"] as const)(
    "does not use clothing from a %s context",
    (mismatch) => {
      const { person, world } = fixture();
      vi.mocked(workUniform).mockReturnValue(undefined);
      const normal = drawnRecipe(
        renderToStaticMarkup(
          <PersonPortrait world={world} personId={person.id} />,
        ),
      );
      const appearance: PersonSceneAppearance = {
        personId:
          mismatch === "other-person"
            ? ("other-person" as EntityId)
            : person.id,
        onDate: mismatch === "previous-date" ? "2026-01-04" : world.currentDate,
        recipe: engineRecipeFor(person, world.currentDate, pack, {
          wear: "formal",
        })!,
      };
      expect(
        drawnRecipe(
          renderToStaticMarkup(
            <PersonPortrait
              world={world}
              personId={person.id}
              sceneAppearance={appearance}
            />,
          ),
        ),
      ).toEqual(normal);
    },
  );
});
