import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it, vi } from "vitest";
import manifestJson from "../../../art/people-engine/v1/manifest.json" with { type: "json" };
import {
  BODY_BUILDS,
  POSES_BY_PRESENTATION,
  composeEnginePerson,
  type NamedBodyPose,
  type OutfitPostures,
  type PackPostures,
  type PackPresentation,
  type PeoplePackManifest,
  poseFallbacks,
} from "./pack";
import type { Raster } from "./raster";
import type * as Runtime from "./runtime";

/**
 * The same room once the posed and turned art is in the pack. Until it is,
 * every pose and the turned view point at today's standing and seated files,
 * so the scene can be checked end to end: who explains, who listens, who is
 * turned and who is mirrored to face whom.
 */

const today = manifestJson as unknown as PeoplePackManifest;
const STANDING_POSES = [
  "arms-folded",
  "explaining",
  "hand-on-hip",
  "hands-in-pockets",
  "podium",
];
const SEATED_POSES = [
  "seated-leaning",
  "seated-legs-crossed",
  "seated-ankle-on-knee",
];

function everyPose(pack: PackPresentation): PackPostures {
  const posed = (pose: string) =>
    Object.fromEntries(
      BODY_BUILDS.map((build) => [
        build,
        SEATED_POSES.includes(pose)
          ? pack.seated!.bodies[build]
          : pack.bodies[build],
      ]),
    );
  return {
    bodies: pack.bodies,
    seated: pack.seated!,
    poses: Object.fromEntries(
      [...STANDING_POSES, ...SEATED_POSES].map((pose) => [
        pose,
        { bodies: posed(pose) },
      ]),
    ) as PackPostures["poses"],
  };
}

function everyOutfitPose(outfit: OutfitPostures): OutfitPostures {
  return {
    builds: outfit.builds,
    seated: outfit.seated!,
    poses: Object.fromEntries(
      [...STANDING_POSES, ...SEATED_POSES].map((pose) => [
        pose,
        SEATED_POSES.includes(pose) ? outfit.seated! : outfit.builds,
      ]),
    ) as Partial<Record<NamedBodyPose, OutfitPostures["builds"]>>,
  };
}

function landed(pack: PackPresentation): PackPresentation {
  const postures = everyPose(pack);
  return {
    ...pack,
    ...postures,
    views: {
      "three-quarter": {
        ...postures,
        canonical: pack.canonical,
        faces: pack.faces,
        hair: pack.hair,
        toward: "right",
      },
    },
    outfits: pack.outfits.map((outfit) => ({
      ...outfit,
      ...everyOutfitPose(outfit),
      views: { "three-quarter": everyOutfitPose(outfit) },
    })),
  };
}

const LANDED: PeoplePackManifest = {
  ...today,
  presentations: {
    feminine: landed(today.presentations.feminine),
    masculine: landed(today.presentations.masculine),
  },
};

vi.mock("./runtime", async (importOriginal) => ({
  ...(await importOriginal<typeof Runtime>()),
  PEOPLE_PACK: LANDED,
  peoplePackAvailable: () => true,
}));

function read(file: string): Raster {
  const png = PNG.sync.read(readFileSync(`art/people-engine/v1/${file}`));
  return {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
}

describe("a conversation once the posed art lands", async () => {
  const { planLifeScenePeople } = await import("../life-scene-people");
  const { DOMESTIC_CANONICAL_SCENE_ID } = await import("../scene-registry");
  const { createNewGameWorld } = await import("../new-game");
  const { world } = createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 30,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "pose-conversation-proof",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  } as Parameters<typeof createNewGameWorld>[0]);
  const present = Object.values(world.people)
    .filter((person) => person.id !== world.control.personId)
    .map((person) => ({
      personId: person.id,
      name: person.id,
      relationship: null,
      introduction: person.id,
    }));
  const x = (person: { leftPercent: number; widthPercent: number }) =>
    person.leftPercent + person.widthPercent / 2;

  it("has the speaker explain to the player and the listeners turn toward the speaker", () => {
    const engines = planLifeScenePeople(
      world,
      present,
      DOMESTIC_CANONICAL_SCENE_ID,
    ).filter((person) => person.engine);
    // Try every standing person as the one answering.
    const standing = engines.filter((person) => !person.seated);
    expect(standing.length).toBeGreaterThanOrEqual(2);
    let folded = 0;
    for (const { personId: speakerId } of standing) {
      const placed = planLifeScenePeople(
        world,
        present,
        DOMESTIC_CANONICAL_SCENE_ID,
        undefined,
        undefined,
        { speakerId },
      ).filter((person) => person.engine);
      const speaker = placed.find((person) => person.personId === speakerId)!;
      expect(speaker.engine!.pose).toBe("explaining");
      expect(speaker.engine!.view ?? "front").toBe("front");
      // Explaining faces the viewer, so the speaker is never mirrored.
      expect(speaker.engine!.mirrored).toBeUndefined();
      for (const listener of placed.filter((person) => person !== speaker)) {
        expect(listener.engine!.view).toBe("three-quarter");
        // Each in their own presentation's poses.
        const own = POSES_BY_PRESENTATION[listener.engine!.presentation];
        expect(own).toContain(listener.engine!.pose);
        expect(
          listener.seated
            ? ["seated-hands-folded", "seated-listening"]
            : ["arms-folded", "hand-on-hip", "hands-in-pockets"],
        ).toContain(listener.engine!.pose);
        if (listener.engine!.pose === "arms-folded") folded += 1;
        // Turned right as painted, so mirrored exactly when the speaker is
        // on their left.
        expect(listener.engine!.mirrored === true).toBe(
          x(speaker) < x(listener),
        );
        // Drawn as asked, turned: the pose itself, or plain seated when this
        // outfit was not painted in it (the Sept. 29 seated poses cover six
        // outfits for each presentation).
        const drawn = composeEnginePerson(LANDED, read, listener.engine!);
        expect(drawn.view).toBe("three-quarter");
        expect(poseFallbacks(listener.engine!.pose)).toContain(drawn.pose);
      }
    }
    // At least one listener folds their arms in this household.
    expect(folded).toBeGreaterThan(0);
  }, 120_000);
});
