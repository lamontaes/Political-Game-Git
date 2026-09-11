import { describe, expect, it } from "vitest";

import {
  ART_PREVIEW_PARAMETER,
  ART_PREVIEW_VALUE,
  artPreviewLibraries,
  artPreviewMode,
  PREVIEW_MINIMUM_AGE,
  previewArtRefusal,
  previewDatabaseName,
} from "../src/presentation/art-preview";
import {
  fitLayersToBox,
  planLifeScenePeople,
} from "../src/presentation/life-scene-people";
import { resolveLifeScene } from "../src/presentation/life-scene";
import { resolvePersonPortrait } from "../src/presentation/person-visual";
import { createNewGameWorld } from "../src/presentation/new-game";
import { PRODUCTION_CHARACTER_LIBRARY } from "../src/presentation/visual-integration";
import { wearableChoicesIn } from "../src/player/SavedAppearance";
import type { ScenePerson } from "../src/presentation/life-story";
import type { EntityId, NewGameSetup, Person, World } from "../src/simulation";

/**
 * The local development art preview, and the four things that keep it honest.
 *
 * It is off unless it is asked for, and cannot be asked for in a shipped
 * build. It changes nothing for a caller that does not opt in. It draws the
 * same canonical people the production path was refusing, out of the banked
 * review art rather than out of nowhere. And it refuses a child rather than
 * putting an adult body on one, because the compositor cannot tell.
 */

function aWorld(age: number, seed: string) {
  return createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: age,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  } as NewGameSetup);
}

/** Everybody in the world except the player, as the room would receive them. */
function householdOf(world: World, playerId: EntityId): ScenePerson[] {
  return world.personOrder
    .filter((id) => id !== playerId)
    .map((id) => world.people[id])
    .filter((person): person is Person => Boolean(person))
    .map((person) => ({
      personId: person.id,
      name: `${person.givenName} ${person.familyName}`,
      relationship: null,
      introduction: `${person.givenName} ${person.familyName}`,
    }));
}

const PREVIEW = artPreviewLibraries("candidate-review")!;

describe("the development art preview is opt-in and development-only", () => {
  it("is off for an ordinary address", () => {
    expect(artPreviewMode("", true)).toBe("production");
    expect(artPreviewMode("?seed=abc", true)).toBe("production");
  });

  it("is off for a near miss, rather than for anything that mentions art", () => {
    expect(artPreviewMode(`?${ART_PREVIEW_PARAMETER}=1`, true)).toBe(
      "production",
    );
    expect(artPreviewMode(`?${ART_PREVIEW_PARAMETER}=candidates`, true)).toBe(
      "production",
    );
    expect(artPreviewMode("?art=candidate", true)).toBe("production");
  });

  it("is on only for the exact opt-in, and only in a development build", () => {
    const address = `?${ART_PREVIEW_PARAMETER}=${ART_PREVIEW_VALUE}`;
    expect(artPreviewMode(address, true)).toBe("candidate-review");
    // The one that matters: a shipped build ignores the query entirely.
    expect(artPreviewMode(address, false)).toBe("production");
  });

  it("keeps its lives in a separate saved-game database", () => {
    expect(previewDatabaseName("candidate-review")).not.toBe(
      previewDatabaseName("production"),
    );
  });

  it("separates every store it touches, not just the one for worlds", () => {
    /*
     * A life is not kept in one database. The world goes in one store and the
     * shell's own per-slot state goes in another — and a wardrobe CHOICE is
     * shell state. Isolating only the world left the preview writing candidate
     * outfits into the ordinary database under the ordinary slot id, so an
     * opt-in development preview was editing a production save through the
     * other door.
     */
    const base = "some-other-store";
    expect(previewDatabaseName("candidate-review", base)).not.toBe(base);
    expect(previewDatabaseName("production", base)).toBe(base);
  });

  it("hands production callers nothing to override with", () => {
    expect(artPreviewLibraries("production")).toBeNull();
  });
});

describe("the production room is unchanged and now says why", () => {
  it("still refuses unreleased art, and names the refusal instead of going quiet", () => {
    const { world, playerPersonId } = aWorld(34, "art-preview-production");
    const sceneId = resolveLifeScene(world, playerPersonId).sceneId;
    const placed = planLifeScenePeople(
      world,
      householdOf(world, playerPersonId),
      sceneId,
      undefined,
      { wardrobeByPersonId: {} },
    );

    expect(placed.length).toBeGreaterThan(0);
    for (const person of placed) {
      expect(person.hasArt).toBe(false);
      // The point of the repair: an empty layer list used to be the whole
      // story, and there was nowhere to read what the compositor objected to.
      expect(person.artRefusal ?? "").not.toBe("");
    }
  });
});

describe("the preview draws the canonical adults the production path refused", () => {
  const { world, playerPersonId } = aWorld(34, "art-preview-adults");
  const sceneId = resolveLifeScene(world, playerPersonId).sceneId;
  const household = householdOf(world, playerPersonId);

  const production = planLifeScenePeople(world, household, sceneId, undefined, {
    wardrobeByPersonId: {},
  });
  const preview = planLifeScenePeople(world, household, sceneId, undefined, {
    wardrobeByPersonId: {},
    artPreview: PREVIEW,
  });

  it("stands at least one of them in the room with real, non-fixture art", () => {
    const drawn = preview.filter((person) => person.hasArt);
    expect(drawn.length).toBeGreaterThan(0);
    for (const person of drawn) {
      expect(person.layers.length).toBeGreaterThan(0);
      for (const layer of person.layers) expect(layer.url).toBeTruthy();
    }
  });

  it("draws nobody the production path would have drawn, because it drew nobody", () => {
    expect(production.every((person) => !person.hasArt)).toBe(true);
  });

  it("is the same canonical people, not a cast invented for the preview", () => {
    expect([...preview.map((person) => person.personId)].sort()).toStrictEqual(
      [...production.map((person) => person.personId)].sort(),
    );
    for (const person of preview) {
      expect(world.people[person.personId as EntityId]).toBeDefined();
    }
  });

  it("gives the dossier portrait the same person a likeness too", () => {
    const drawn = preview.find((person) => person.hasArt)!;
    const record = world.people[drawn.personId as EntityId]!;
    const portrait = resolvePersonPortrait(record, {
      libraries: { characters: PREVIEW.characters, visuals: PREVIEW.visuals },
    });
    expect(portrait.kind).toBe("modular");
  });

  it("keeps the appearance the World already recorded, rather than rerolling", () => {
    for (const placed of preview) {
      const record = world.people[placed.personId as EntityId]!;
      // The preview supplies art. It never supplies identity: the seed a
      // person carries is the seed the World wrote when it made them.
      expect(record.appearance?.seed).toBeTruthy();
    }
  });
});

describe("the preview does not put an adult body on a child", () => {
  it("refuses anyone under the banked bodies' age, and says which coverage is missing", () => {
    const child = {
      id: "person_child" as EntityId,
      birthDate: "2016-04-02",
    };
    const refusal = previewArtRefusal(child, "2026-09-10");
    expect(refusal).toContain("no child body");
    expect(refusal).toContain("10");
  });

  /*
   * The eighteenth birthday itself, from three sides.
   *
   * The first version of this guard subtracted calendar years, so somebody
   * born in December read as an adult from the first of January — nearly a
   * year of a minor being eligible for an adult body, and the error ran in the
   * unsafe direction every time. These cases are written against the calendar
   * rather than against the age helper, so a regression in the helper cannot
   * pass them by agreeing with itself.
   */
  const EIGHTEENTH = [
    { when: "the day before", date: "2026-12-13", allowed: false },
    { when: "the day itself", date: "2026-12-14", allowed: true },
    { when: "the day after", date: "2026-12-15", allowed: true },
    {
      when: "ten months early, same calendar year",
      date: "2026-02-01",
      allowed: false,
    },
    {
      when: "the first day of the birth year + 18",
      date: "2026-01-01",
      allowed: false,
    },
  ] as const;

  for (const probe of EIGHTEENTH) {
    it(`is ${probe.allowed ? "allowed" : "refused"} on ${probe.when}`, () => {
      const refusal = previewArtRefusal(
        { id: "person_birthday" as EntityId, birthDate: "2008-12-14" },
        probe.date,
      );
      if (probe.allowed) {
        expect(refusal).toBeNull();
      } else {
        expect(refusal).toContain("no child body");
      }
    });
  }

  it("does not let a leap-day birthday turn seventeen into eighteen early", () => {
    // Born 29 February 2008. In 2026, a common year, the birthday falls on the
    // 28th; the 27th is still seventeen and the 28th is eighteen.
    expect(
      previewArtRefusal(
        { id: "person_leap" as EntityId, birthDate: "2008-02-29" },
        "2026-02-27",
      ),
    ).toContain("no child body");
    expect(
      previewArtRefusal(
        { id: "person_leap" as EntityId, birthDate: "2008-02-29" },
        "2026-02-28",
      ),
    ).toBeNull();
  });

  it("refuses rather than guessing when the age is not known", () => {
    expect(
      previewArtRefusal(
        { id: "person_x" as EntityId, birthDate: null },
        "2026-09-10",
      ),
    ).toContain("no birth date");
  });

  it("draws an adult", () => {
    expect(
      previewArtRefusal(
        { id: "person_y" as EntityId, birthDate: "1990-01-01" },
        "2026-09-10",
      ),
    ).toBeNull();
  });

  it("refuses every person in a child's household room that is under age", () => {
    const { world, playerPersonId } = aWorld(10, "art-preview-child");
    const sceneId = resolveLifeScene(world, playerPersonId).sceneId;
    const placed = planLifeScenePeople(
      world,
      householdOf(world, playerPersonId),
      sceneId,
      undefined,
      { wardrobeByPersonId: {}, artPreview: PREVIEW },
    );
    for (const person of placed) {
      const record = world.people[person.personId as EntityId]!;
      const years =
        Number(world.currentDate.slice(0, 4)) -
        Number((record.birthDate ?? "").slice(0, 4));
      if (Number.isFinite(years) && years >= PREVIEW_MINIMUM_AGE) continue;
      expect(person.hasArt).toBe(false);
      expect(person.artRefusal ?? "").toContain("candidate-bank");
    }
  });
});

describe("the fitted figure is scaled, not stretched", () => {
  const { world, playerPersonId } = aWorld(34, "art-preview-fit");
  const sceneId = resolveLifeScene(world, playerPersonId).sceneId;
  const preview = planLifeScenePeople(
    world,
    householdOf(world, playerPersonId),
    sceneId,
    undefined,
    { wardrobeByPersonId: {}, artPreview: PREVIEW },
  );
  const drawn = preview.find((person) => person.hasArt);

  it("draws somebody to measure", () => {
    expect(drawn).toBeDefined();
    expect(drawn!.layers.length).toBeGreaterThan(1);
  });

  it("applies one common scale to every layer on both axes", () => {
    /*
     * Measured on the transform itself, with a box whose aspect deliberately
     * disagrees with the figure's. Two independent scales — the version this
     * replaces — give x and y different multipliers and this fails; one scale
     * cannot. Checked per layer, so a fit that happened to be uniform for the
     * bounding box while distorting the pieces inside it is caught too.
     */
    const layers = [
      {
        url: "a",
        leftPercent: 10,
        topPercent: 20,
        widthPercent: 4,
        heightPercent: 30,
      },
      {
        url: "b",
        leftPercent: 11,
        topPercent: 21,
        widthPercent: 2,
        heightPercent: 3,
      },
      {
        url: "c",
        leftPercent: 12,
        topPercent: 40,
        widthPercent: 1,
        heightPercent: 10,
      },
    ];
    // Union is 4 wide by 30 tall; the box is 20 wide by 60 tall, so a stretched
    // fit would use 5x horizontally and 2x vertically.
    const fitted = fitLayersToBox(layers, {
      leftPercent: 0,
      topPercent: 0,
      widthPercent: 20,
      heightPercent: 60,
    });
    const scales = fitted.flatMap((layer, index) => [
      layer.widthPercent / layers[index]!.widthPercent,
      layer.heightPercent / layers[index]!.heightPercent,
    ]);
    for (const scale of scales) expect(scale).toBeCloseTo(2, 10);
  });

  it("leaves a figure that already fits exactly where it is", () => {
    const layers = [
      {
        url: "a",
        leftPercent: 10,
        topPercent: 20,
        widthPercent: 4,
        heightPercent: 30,
      },
    ];
    const fitted = fitLayersToBox(layers, {
      leftPercent: 10,
      topPercent: 20,
      widthPercent: 4,
      heightPercent: 30,
    });
    expect(fitted[0]!.leftPercent).toBeCloseTo(10, 10);
    expect(fitted[0]!.topPercent).toBeCloseTo(20, 10);
    expect(fitted[0]!.widthPercent).toBeCloseTo(4, 10);
    expect(fitted[0]!.heightPercent).toBeCloseTo(30, 10);
  });

  it("stands the figure on the contact line the anchor declares", () => {
    // The lowest point of the drawn figure is its floor contact, and it must
    // land on the bottom of the box the placement reserved rather than
    // anywhere a corner-anchored rescale would have left it floating.
    const bottom = Math.max(
      ...drawn!.layers.map((layer) => layer.topPercent + layer.heightPercent),
    );
    const contact = drawn!.topPercent + drawn!.heightPercent;
    expect(Math.abs(bottom - contact)).toBeLessThan(0.001);
  });

  it("centres the figure's footprint on the anchor's x", () => {
    const left = Math.min(...drawn!.layers.map((layer) => layer.leftPercent));
    const right = Math.max(
      ...drawn!.layers.map((layer) => layer.leftPercent + layer.widthPercent),
    );
    const centre = drawn!.leftPercent + drawn!.widthPercent / 2;
    expect(Math.abs((left + right) / 2 - centre)).toBeLessThan(0.001);
  });

  it("fills exactly the height the placement reserved", () => {
    const top = Math.min(...drawn!.layers.map((layer) => layer.topPercent));
    const bottom = Math.max(
      ...drawn!.layers.map((layer) => layer.topPercent + layer.heightPercent),
    );
    expect(Math.abs(bottom - top - drawn!.heightPercent)).toBeLessThan(0.001);
  });
});

describe("a previewed figure still reports what is wrong with it", () => {
  it("keeps the compositor's diagnostics on a person who DID draw", () => {
    const { world, playerPersonId } = aWorld(34, "art-preview-diagnostics");
    const sceneId = resolveLifeScene(world, playerPersonId).sceneId;
    const drawn = planLifeScenePeople(
      world,
      householdOf(world, playerPersonId),
      sceneId,
      undefined,
      { wardrobeByPersonId: {}, artPreview: PREVIEW },
    ).find((person) => person.hasArt);

    expect(drawn).toBeDefined();
    /*
     * This is the case the first version dropped. Diagnostics were only built
     * on the way to refusing, so the moment a figure actually drew they went
     * missing — and a figure composed against a room with no floor calibration
     * came back looking like an unqualified success. The residence scenes
     * declare no calibration, so this must say so.
     */
    expect(drawn!.artDiagnostics ?? []).toContain(
      "scene-declares-no-floor-calibration",
    );
    // And a drawn person is still not a refusal.
    expect(drawn!.artRefusal ?? "").toBe("");
  });
});

describe("one catalog decides the whole of one person's picture", () => {
  it("resolves a saved wardrobe against the library that will draw it", () => {
    const { world, playerPersonId } = aWorld(34, "art-preview-wardrobe-path");
    const sceneId = resolveLifeScene(world, playerPersonId).sceneId;
    const household = householdOf(world, playerPersonId);
    const target = household[0]!;

    /*
     * The control for the split path. `resolveWardrobe` is handed the same
     * context the internal resolver gets, so this records which libraries the
     * caller was told to use. Before the repair the preview switched the
     * composition to the review catalog and left the wardrobe resolution on
     * the production one, and nothing observed the disagreement.
     */
    const seen: Array<boolean> = [];
    planLifeScenePeople(world, household, sceneId, undefined, {
      wardrobeByPersonId: {
        [target.personId]: {
          personId: target.personId,
          outfitId: "does-not-exist",
        } as never,
      },
      artPreview: PREVIEW,
      resolveWardrobe: (_person, _preference, context) => {
        seen.push(context.preview?.characters === PREVIEW.characters);
        throw new Error("probe");
      },
    });

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(Boolean)).toBe(true);
  });

  it("tells a production caller there is no preview", () => {
    const { world, playerPersonId } = aWorld(34, "art-preview-wardrobe-prod");
    const sceneId = resolveLifeScene(world, playerPersonId).sceneId;
    const household = householdOf(world, playerPersonId);
    const target = household[0]!;
    const seen: Array<boolean> = [];
    planLifeScenePeople(world, household, sceneId, undefined, {
      wardrobeByPersonId: {
        [target.personId]: {
          personId: target.personId,
          outfitId: "does-not-exist",
        } as never,
      },
      resolveWardrobe: (_person, _preference, context) => {
        seen.push(context.preview === undefined);
        throw new Error("probe");
      },
    });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(Boolean)).toBe(true);
  });
});

describe("clothes can be chosen out of the catalog that draws them", () => {
  it("has nothing wearable in production today, which is why the control was dead", () => {
    /*
     * Not a complaint — the record of why the wardrobe control said there was
     * nothing to choose. Every released production component is fixture
     * regression art, so filtering to released-and-not-fixture empties the
     * catalog. That sentence is correct about production and was a dead end in
     * the preview, where real garments exist and the one surface for putting
     * them on somebody could not see them.
     */
    expect(
      wearableChoicesIn(PRODUCTION_CHARACTER_LIBRARY).components.size,
    ).toBe(0);
  });

  it("offers real garments from the review catalog", () => {
    const wearable = wearableChoicesIn(PREVIEW.characters);
    expect(wearable.components.size).toBeGreaterThan(0);
    // And they are not fixtures wearing a different label.
    for (const component of wearable.components.values()) {
      expect(component.fixture).toBeFalsy();
      expect(component.released).toBe(true);
    }
  });
});

describe("nothing about production eligibility moved", () => {
  it("leaves the production library free of candidate components", () => {
    for (const id of PREVIEW.characters.components.keys()) {
      expect(PRODUCTION_CHARACTER_LIBRARY.components.has(id)).toBe(false);
    }
  });
});
