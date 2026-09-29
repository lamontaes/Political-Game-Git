import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it, vi } from "vitest";
import manifestJson from "../../../art/people-engine/v1/manifest.json" with { type: "json" };
import {
  BODY_BUILDS,
  BODY_POSES,
  composeEnginePerson,
  engineRecipeKey,
  isSeatedPose,
  mirrorToFace,
  posedPieces,
  poseFallbacks,
  type BodyPose,
  type EngineRecipe,
  type PackPresentation,
  type PeoplePackManifest,
} from "./pack";
import { chooseBodyPose, chooseBodyView, sceneActivity } from "./pose-chooser";
import type { Raster } from "./raster";
import type * as Runtime from "./runtime";

// The scene planner draws engine people only in a bundled build; here the
// pack's manifest stands in for the build's files.
vi.mock("./runtime", async (importOriginal) => ({
  ...(await importOriginal<typeof Runtime>()),
  peoplePackAvailable: () => true,
}));

const manifest = manifestJson as unknown as PeoplePackManifest;
const PRESENTATIONS = ["feminine", "masculine"] as const;

function read(file: string): Raster {
  const png = PNG.sync.read(readFileSync(`art/people-engine/v1/${file}`));
  return {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
  };
}

function recipe(
  pack: PackPresentation,
  overrides: Partial<EngineRecipe> = {},
): EngineRecipe {
  return {
    presentation: "feminine",
    build: "average",
    shade: 4,
    face: "",
    hair: "",
    hairColor: "natural",
    outfit: pack.outfits[0]!.id,
    ...overrides,
  };
}

/**
 * The feminine pack with the arms-folded pose painted for the average body
 * and the first outfit, as the pack builder writes it.
 */
/**
 * An outfit with no posed or turned art, so a test can show the fallback for
 * an outfit that has not been painted, whatever the shipped pack now holds.
 */
function unpainted(
  outfit: PackPresentation["outfits"][number],
): PackPresentation["outfits"][number] {
  return { ...outfit, poses: undefined, views: undefined };
}

function withArmsFolded(pack: PackPresentation): PackPresentation {
  const body = pack.bodies.average;
  const worn = pack.outfits[0]!.builds.average!;
  return {
    ...pack,
    poses: {
      "arms-folded": {
        bodies: {
          average: { ...body, file: "body-feminine-average-arms-folded.png" },
        },
        toward: "left",
      },
    },
    outfits: [
      {
        ...pack.outfits[0]!,
        poses: {
          "arms-folded": {
            average: {
              ...worn,
              file: "outfit-feminine-casual-average-arms-folded.png",
            },
          },
        },
      },
      ...pack.outfits.slice(1).map(unpainted),
    ],
  };
}

describe("named poses", () => {
  it("resolves every pose for every presentation, build and outfit, falling back to art that exists", () => {
    for (const presentation of PRESENTATIONS) {
      const pack = manifest.presentations[presentation];
      for (const build of BODY_BUILDS)
        for (const outfit of pack.outfits)
          for (const pose of BODY_POSES) {
            const pieces = posedPieces(
              pack,
              recipe(pack, { presentation, build, outfit: outfit.id, pose }),
            );
            // Always a body, and always the outfit, in one of the pose's
            // fallbacks; never nothing and never a layer from another pose.
            expect(poseFallbacks(pose)).toContain(pieces.pose);
            expect(pieces.body.file.length).toBeGreaterThan(0);
            expect(pieces.outfit).toBeDefined();
            const suffix = pieces.pose === "standing" ? "" : `-${pieces.pose}`;
            expect(pieces.body.file).toBe(
              `body-${presentation}-${build}${suffix}.png`,
            );
            expect(pieces.outfit!.file.endsWith(`-${build}${suffix}.png`)).toBe(
              true,
            );
            // A seated pose stays seated while the pack can seat them.
            if (isSeatedPose(pose) && pack.seated)
              expect(pieces.seated).toBe(true);
            if (!isSeatedPose(pose)) expect(pieces.seated).toBe(false);
          }
    }
  });

  it("draws a pose that has art, and falls back when its body, outfit or file is missing", () => {
    const pack = withArmsFolded(manifest.presentations.feminine);
    const armsFolded = recipe(pack, { pose: "arms-folded" });
    expect(posedPieces(pack, armsFolded).pose).toBe("arms-folded");
    expect(posedPieces(pack, armsFolded).body.file).toBe(
      "body-feminine-average-arms-folded.png",
    );
    // Another build has no arms-folded body.
    expect(posedPieces(pack, { ...armsFolded, build: "lean" }).pose).toBe(
      "standing",
    );
    // Another outfit has not been painted arms-folded.
    expect(
      posedPieces(pack, { ...armsFolded, outfit: pack.outfits[1]!.id }).pose,
    ).toBe("standing");
    // The build does not have the file.
    expect(
      posedPieces(
        pack,
        armsFolded,
        (file) => !file.endsWith("-arms-folded.png"),
      ).pose,
    ).toBe("standing");
    // A seated pose without its own art sits plainly.
    expect(
      posedPieces(pack, recipe(pack, { pose: "seated-legs-crossed" })).pose,
    ).toBe("seated");
  });

  it("keeps a standing pose's head where the standing body has it, on the same canvas", () => {
    for (const presentation of PRESENTATIONS) {
      const pack = manifest.presentations[presentation];
      for (const [pose, painted] of Object.entries(pack.poses ?? {}))
        for (const build of BODY_BUILDS) {
          const body = painted?.bodies[build];
          if (!body || isSeatedPose(pose as BodyPose)) continue;
          const standing = pack.bodies[build].anchors;
          expect(Math.abs(body.anchors.top - standing.top)).toBeLessThanOrEqual(
            2,
          );
          expect(
            Math.abs(body.anchors.neck.row - standing.neck.row),
          ).toBeLessThanOrEqual(2);
          expect(
            Math.abs(body.anchors.neck.centerX - standing.neck.centerX),
          ).toBeLessThanOrEqual(2);
        }
    }
    expect(manifest.canvas).toEqual({ width: 512, height: 808 });
  });

  it("names the pose and the mirror in the recipe key, and keeps old keys", () => {
    const pack = manifest.presentations.feminine;
    const standing = engineRecipeKey(recipe(pack));
    expect(engineRecipeKey(recipe(pack, { pose: "standing" }))).toBe(standing);
    expect(engineRecipeKey(recipe(pack, { mirrored: false }))).toBe(standing);
    expect(standing).not.toContain("mirrored");
    const keys = new Set(
      BODY_POSES.flatMap((pose) => [
        engineRecipeKey(recipe(pack, { pose })),
        engineRecipeKey(recipe(pack, { pose, mirrored: true })),
      ]),
    );
    expect(keys.size).toBe(BODY_POSES.length * 2);
  });
});

describe("the pose chooser", () => {
  const seeds = Array.from({ length: 400 }, (_, n) => `person-${n}`);

  it("poses each activity as the scene has it", () => {
    for (const seed of seeds) {
      const pose = (
        activity: Parameters<typeof chooseBodyPose>[0]["activity"],
        seated = false,
      ) => chooseBodyPose({ activity, seated, seed });
      expect(pose("speaking")).toBe("explaining");
      expect(pose("speech")).toBe("podium");
      expect(["arms-folded", "hand-on-hip"]).toContain(pose("listening"));
      expect(["arms-folded", "hand-on-hip"]).toContain(pose("waiting"));
      expect(pose("idle")).toBe("standing");
      expect(pose("desk")).toBe("standing");
      expect(pose("speaking", true)).toBe("seated-leaning");
      expect(["seated-leaning", "seated-legs-crossed"]).toContain(
        pose("desk", true),
      );
      expect(["seated-leaning", "seated-legs-crossed"]).toContain(
        pose("meeting", true),
      );
      expect(["seated-leaning", "seated-legs-crossed"]).toContain(
        pose("listening", true),
      );
      expect(pose("idle", true)).toBe("seated");
    }
  });

  it("gives the same person the same pose every time, and a crowd both", () => {
    const listening = seeds.map((seed) =>
      chooseBodyPose({ activity: "listening", seated: false, seed }),
    );
    expect(
      seeds.map((seed) =>
        chooseBodyPose({ activity: "listening", seated: false, seed }),
      ),
    ).toEqual(listening);
    const folded = listening.filter((pose) => pose === "arms-folded").length;
    expect(folded).toBeGreaterThan(seeds.length * 0.35);
    expect(folded).toBeLessThan(seeds.length * 0.65);
  });

  it("folds a guarded person's arms more often, and an open person's less", () => {
    const share = (guarded?: number) =>
      seeds.filter(
        (seed) =>
          chooseBodyPose({
            activity: "listening",
            seated: false,
            seed,
            ...(guarded === undefined ? {} : { guarded }),
          }) === "arms-folded",
      ).length / seeds.length;
    expect(share(2)).toBeGreaterThan(share());
    expect(share(-2)).toBeLessThan(share());
  });

  it("reads the activity from the conversation and the place", () => {
    const at = (
      anchorType: string,
      speakerId: string | null,
      personId = "a",
      seated = false,
    ) => sceneActivity({ personId, speakerId, anchorType, seated });
    expect(at("standing-person", "a")).toBe("speaking");
    expect(at("standing-person", "b")).toBe("listening");
    expect(at("standing-person", null)).toBe("idle");
    expect(at("lectern", null)).toBe("speech");
    expect(at("speaker_podium", "a")).toBe("speech");
    // At a lectern while someone else is answering: listening.
    expect(at("podium", "b")).toBe("listening");
    expect(at("desk-chair", null, "a", true)).toBe("desk");
    expect(at("seated-person", null, "a", true)).toBe("idle");
  });
});

describe("mirrored figures", () => {
  it("composes a mirrored person as the mirror image, with mirrored anchors", () => {
    const pack = manifest.presentations.masculine;
    const base = recipe(pack, {
      presentation: "masculine",
      outfit: pack.outfits[0]!.id,
    });
    const plain = composeEnginePerson(manifest, read, base);
    const mirrored = composeEnginePerson(manifest, read, {
      ...base,
      mirrored: true,
    });
    const { width, height } = plain.raster;
    expect([mirrored.raster.width, mirrored.raster.height]).toEqual([
      width,
      height,
    ]);
    for (let y = 0; y < height; y += 7)
      for (let x = 0; x < width; x += 5) {
        const a = (y * width + x) * 4;
        const b = (y * width + (width - 1 - x)) * 4;
        expect(Array.from(mirrored.raster.data.subarray(b, b + 4))).toEqual(
          Array.from(plain.raster.data.subarray(a, a + 4)),
        );
      }
    expect(mirrored.anchors.neck.centerX).toBe(
      width - 1 - plain.anchors.neck.centerX,
    );
    expect(mirrored.anchors.head.left).toBe(
      width - 1 - plain.anchors.head.right,
    );
    expect(mirrored.anchors.neck.row).toBe(plain.anchors.neck.row);
    expect(mirrored.anchors.feet).toBe(plain.anchors.feet);
    // Opaque at the neck point, as the figure is placed by it.
    const neck =
      (mirrored.anchors.neck.row * width +
        Math.round(mirrored.anchors.neck.centerX)) *
      4;
    expect(mirrored.raster.data[neck + 3]).toBe(255);
  });

  it("mirrors a pose to turn toward a point on the other side of its painting", () => {
    const pack = withArmsFolded(manifest.presentations.feminine);
    const armsFolded = recipe(pack, { pose: "arms-folded" });
    // Painted turned left (the pack entry wins over the default).
    expect(mirrorToFace(pack, armsFolded, 70, 30)).toBe(false);
    expect(mirrorToFace(pack, armsFolded, 30, 70)).toBe(true);
    // Already mirrored or not, the answer is for the painting.
    expect(mirrorToFace(pack, { ...armsFolded, mirrored: true }, 30, 70)).toBe(
      true,
    );
    // Drawn standing (no art for this build), it faces front: never mirrored.
    expect(mirrorToFace(pack, { ...armsFolded, build: "lean" }, 30, 70)).toBe(
      false,
    );
    expect(mirrorToFace(pack, recipe(pack), 70, 30)).toBe(false);
  });
});

/**
 * The feminine pack turned three quarters for the average body, the first
 * outfit, and the first face and hair, standing and explaining.
 */
function withThreeQuarter(pack: PackPresentation): PackPresentation {
  const turned = (file: string) => file.replace(/\.png$/, "-three-quarter.png");
  const body = pack.bodies.average;
  const worn = pack.outfits[0]!.builds.average!;
  const face = pack.faces[0]!;
  const hair = pack.hair[0]!;
  return {
    ...pack,
    views: {
      "three-quarter": {
        canonical: pack.canonical,
        bodies: {
          ...pack.bodies,
          average: { ...body, file: turned(body.file) },
        },
        poses: {
          explaining: {
            bodies: {
              average: {
                ...body,
                file: "body-feminine-average-explaining-three-quarter.png",
              },
            },
          },
        },
        faces: [{ ...face, file: turned(face.file) }],
        hair: [
          { id: hair.id, back: turned(hair.back), front: turned(hair.front) },
        ],
        toward: "left",
      },
    },
    outfits: [
      {
        ...pack.outfits[0]!,
        views: {
          "three-quarter": {
            builds: { average: { ...worn, file: turned(worn.file) } },
            poses: {
              explaining: {
                average: {
                  ...worn,
                  file: turned(worn.file).replace(
                    "-three-quarter",
                    "-explaining-three-quarter",
                  ),
                },
              },
            },
          },
        },
      },
      ...pack.outfits.slice(1).map(unpainted),
    ],
  };
}

describe("turned views", () => {
  const pack = withThreeQuarter(manifest.presentations.feminine);
  const turned = recipe(pack, {
    face: pack.faces[0]!.id,
    hair: pack.hair[0]!.id,
    view: "three-quarter",
  });

  it("turns the whole person, face and hair included, when every piece is painted", () => {
    const pieces = posedPieces(pack, turned);
    expect(pieces.view).toBe("three-quarter");
    expect(pieces.body.file).toBe("body-feminine-average-three-quarter.png");
    expect(pieces.face.file.endsWith("-three-quarter.png")).toBe(true);
    expect(pieces.hair.front.endsWith("-three-quarter.png")).toBe(true);
    expect(pieces.outfit!.file.endsWith("-average-three-quarter.png")).toBe(
      true,
    );
    expect(pieces.toward).toBe("left");
    expect(posedPieces(pack, { ...turned, mirrored: true }).toward).toBe(
      "right",
    );
    const explaining = posedPieces(pack, { ...turned, pose: "explaining" });
    expect([explaining.pose, explaining.view]).toEqual([
      "explaining",
      "three-quarter",
    ]);
  });

  it("faces front when any piece of the turned person is missing", () => {
    // A face, a hairstyle, a build or an outfit not painted turned.
    for (const missing of [
      { face: pack.faces[1]!.id },
      { hair: pack.hair[1]!.id },
      { build: "lean" as const },
      { outfit: pack.outfits[1]!.id },
    ])
      expect(posedPieces(pack, { ...turned, ...missing }).view).toBe("front");
    expect(
      posedPieces(pack, turned, (file) => !file.startsWith("face-")).view,
    ).toBe("front");
    // Front has no turned toward.
    expect(posedPieces(pack, recipe(pack)).toward).toBe(null);
  });

  it("keeps the pose before the turn: a pose with no turned art is drawn in front", () => {
    const withBoth = withArmsFolded(pack);
    const pieces = posedPieces(withBoth, {
      ...turned,
      pose: "arms-folded",
    });
    expect([pieces.pose, pieces.view]).toEqual(["arms-folded", "front"]);
  });

  it("names the view in the recipe key, and front as before", () => {
    expect(engineRecipeKey({ ...turned, view: "front" })).toBe(
      engineRecipeKey({ ...turned, view: undefined }),
    );
    expect(engineRecipeKey(turned)).toContain("three-quarter");
  });

  it("turns a listener toward the speaker and leaves everyone else facing front", () => {
    expect(chooseBodyView("listening")).toBe("three-quarter");
    for (const activity of [
      "speaking",
      "waiting",
      "speech",
      "desk",
      "meeting",
      "idle",
    ] as const)
      expect(chooseBodyView(activity)).toBe("front");
  });
});

describe("a conversation in a room", async () => {
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

  it("has the one answering explain and the others listen, turned toward them", () => {
    const standing = () =>
      planLifeScenePeople(world, present, DOMESTIC_CANONICAL_SCENE_ID).filter(
        (person) => person.engine && !person.seated,
      );
    const quiet = standing();
    expect(quiet.length).toBeGreaterThanOrEqual(2);
    // Nobody talking: nobody posed.
    for (const person of quiet)
      expect(person.engine!.pose ?? "standing").toBe("standing");

    const speakerId = quiet[0]!.personId;
    const talking = planLifeScenePeople(
      world,
      present,
      DOMESTIC_CANONICAL_SCENE_ID,
      undefined,
      undefined,
      { speakerId },
    ).filter((person) => person.engine && !person.seated);
    const speaker = talking.find((person) => person.personId === speakerId)!;
    expect(speaker.engine!.pose).toBe("explaining");
    const listeners = talking.filter((person) => person !== speaker);
    expect(listeners.length).toBeGreaterThanOrEqual(1);
    for (const listener of listeners) {
      expect(["arms-folded", "hand-on-hip"]).toContain(listener.engine!.pose);
      expect(listener.engine!.view).toBe("three-quarter");
    }
    // Until the posed art lands everyone is drawn standing in front, and a
    // figure facing front is never mirrored.
    for (const person of talking)
      expect(person.engine!.mirrored).toBeUndefined();
    // The same room, the same poses.
    expect(
      planLifeScenePeople(
        world,
        present,
        DOMESTIC_CANONICAL_SCENE_ID,
        undefined,
        undefined,
        { speakerId },
      ).map((person) => person.engine),
    ).toEqual(
      planLifeScenePeople(
        world,
        present,
        DOMESTIC_CANONICAL_SCENE_ID,
        undefined,
        undefined,
        { speakerId },
      ).map((person) => person.engine),
    );
  });

  it("draws the speaker and the listener on standing art until the posed art lands", () => {
    const speakerId = present[0]!.personId;
    const placed = planLifeScenePeople(
      world,
      present,
      DOMESTIC_CANONICAL_SCENE_ID,
      undefined,
      undefined,
      { speakerId },
    ).filter((person) => person.engine && !person.seated);
    for (const person of placed) {
      const drawn = composeEnginePerson(manifest, read, person.engine!);
      expect(drawn.pose).toBe(
        manifest.presentations[person.engine!.presentation].poses?.[
          person.engine!.pose as "explaining"
        ]
          ? person.engine!.pose
          : "standing",
      );
      expect([drawn.raster.width, drawn.raster.height]).toEqual([512, 808]);
      const neck =
        (drawn.anchors.neck.row * 512 +
          Math.round(drawn.anchors.neck.centerX)) *
        4;
      expect(drawn.raster.data[neck + 3]).toBe(255);
    }
  }, 60_000);
});
