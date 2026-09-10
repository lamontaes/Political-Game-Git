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
import { planLifeScenePeople } from "../src/presentation/life-scene-people";
import { resolveLifeScene } from "../src/presentation/life-scene";
import { resolvePersonPortrait } from "../src/presentation/person-visual";
import { createNewGameWorld } from "../src/presentation/new-game";
import { PRODUCTION_CHARACTER_LIBRARY } from "../src/presentation/visual-integration";
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

describe("nothing about production eligibility moved", () => {
  it("leaves the production library free of candidate components", () => {
    for (const id of PREVIEW.characters.components.keys()) {
      expect(PRODUCTION_CHARACTER_LIBRARY.components.has(id)).toBe(false);
    }
  });
});
