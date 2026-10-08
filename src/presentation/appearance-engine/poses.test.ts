import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it, vi } from "vitest";
import manifestJson from "../../../art/people-engine/v1/manifest.json" with { type: "json" };
import poseData from "../../../data/content/pose-by-activity.json" with { type: "json" };
import {
  BODY_BUILDS,
  BODY_POSES,
  POSES_BY_PRESENTATION,
  composeEnginePerson,
  engineRecipeKey,
  isSeatedPose,
  mirrorToFace,
  posedPieces,
  presentationFallbacks,
  presentationPose,
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
            // Always a body, and always the outfit, in one of the fallbacks
            // of the pose this presentation uses (a woman's hand on the hip
            // for a man's hands in pockets); never nothing and never a layer
            // from another pose.
            expect(presentationFallbacks(pose, presentation)).toContain(
              pieces.pose,
            );
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

  /** The poses data/content/pose-by-activity.json lists for one situation. */
  const listed = (
    activity: string,
    view: "front" | "three-quarter" | "back",
    spot: "stand" | "sit" | "podium" | "lean",
  ): string[] =>
    (
      (
        poseData.activities as unknown as Record<
          string,
          Record<string, Record<string, { pose: string }[]>>
        >
      )[activity]?.[view]?.[spot] ?? []
    ).map((entry) => entry.pose);

  it("poses each activity as the scene has it, from the pose data", () => {
    for (const [activity, views] of Object.entries(poseData.activities))
      for (const [view, spots] of Object.entries(views))
        for (const spot of Object.keys(spots)) {
          const allowed = listed(activity, view as "front", spot as "stand");
          expect(allowed.length).toBeGreaterThan(0);
          const chosen = seeds.map((seed) =>
            chooseBodyPose({
              activity: activity as "idle",
              seated: spot === "sit",
              spot: spot as "stand",
              view: view as "front",
              seed,
            }),
          );
          // Only what the data allows, and every pose it allows is used.
          expect(new Set(chosen)).toEqual(new Set(allowed));
        }
    // The core cases the scene relies on.
    for (const seed of seeds) {
      expect(chooseBodyPose({ activity: "speech", seated: false, seed })).toBe(
        "podium",
      );
      expect(chooseBodyPose({ activity: "speaking", seated: true, seed })).toBe(
        "seated-leaning",
      );
      expect(["seated-writing", "seated-reading"]).toContain(
        chooseBodyPose({ activity: "desk", seated: true, seed }),
      );
      expect(["seated-legs-crossed", "seated-phone"]).toContain(
        chooseBodyPose({ activity: "waiting", seated: true, seed }),
      );
    }
  });

  it("poses a speaker gesturing, a greeter greeting and a crowd applauding", () => {
    const chosen = (
      activity: "speaking" | "greeting" | "crowd",
      seed: string,
    ) => chooseBodyPose({ activity, seated: false, seed });
    expect(new Set(seeds.map((seed) => chosen("speaking", seed)))).toEqual(
      new Set([
        "explaining",
        "arms-wide",
        "pointing",
        "hand-on-heart",
        "hands-on-hips",
      ]),
    );
    expect(new Set(seeds.map((seed) => chosen("greeting", seed)))).toEqual(
      new Set(["handshake", "waving", "arms-wide", "hand-on-heart"]),
    );
    const crowd = seeds.map((seed) => chosen("crowd", seed));
    expect(crowd.filter((pose) => pose === "clapping").length).toBeGreaterThan(
      seeds.length * 0.35,
    );
  });

  it("poses a face that shows a feeling the way it reads, most of the time", () => {
    const sad = seeds.map((seed) =>
      chooseBodyPose({
        activity: "listening",
        seated: false,
        seed,
        expression: "sad",
      }),
    );
    const reads = sad.filter((pose) =>
      (poseData.byExpression.sad as string[]).includes(pose),
    );
    expect(reads.length).toBeGreaterThan(seeds.length * 0.5);
    expect(reads.length).toBeLessThan(seeds.length);
    // Never from a podium, and never someone seated.
    for (const seed of seeds) {
      expect(
        chooseBodyPose({
          activity: "speech",
          seated: false,
          seed,
          expression: "angry",
        }),
      ).toBe("podium");
      expect(
        chooseBodyPose({
          activity: "listening",
          seated: true,
          seed,
          expression: "angry",
        }),
      ).toMatch(/^seated/);
    }
  });

  it("poses an audience seen from behind in the poses painted from behind", () => {
    const behind = seeds.map((seed) =>
      chooseBodyPose({
        activity: "audience",
        seated: false,
        seed,
        view: "back",
      }),
    );
    expect(new Set(behind)).toEqual(
      new Set(listed("audience", "back", "stand")),
    );
    for (const pose of behind) expect(pose.startsWith("back-")).toBe(true);
  });

  it("chooses only from each presentation's own poses", () => {
    for (const presentation of ["feminine", "masculine"] as const)
      for (const seed of seeds)
        for (const activity of [
          "speaking",
          "listening",
          "waiting",
          "speech",
          "desk",
          "meeting",
          "greeting",
          "crowd",
          "audience",
          "transit",
          "idle",
        ] as const)
          for (const seated of [false, true])
            expect(POSES_BY_PRESENTATION[presentation]).toContain(
              chooseBodyPose({ activity, seated, seed, presentation }),
            );
    // A man listening puts his hands in his pockets where a woman rests a
    // hand on her hip; seated, he rests an ankle on his knee.
    const men = seeds.map((seed) =>
      chooseBodyPose({
        activity: "listening",
        seated: false,
        seed,
        presentation: "masculine",
      }),
    );
    expect(new Set(men)).toEqual(
      new Set(
        listed("listening", "front", "stand").map((pose) =>
          presentationPose(pose as BodyPose, "masculine"),
        ),
      ),
    );
    expect(men).toContain("hands-in-pockets");
    expect(men).not.toContain("hand-on-hip");
    expect(
      new Set(
        seeds.map((seed) =>
          chooseBodyPose({
            activity: "desk",
            seated: true,
            seed,
            presentation: "masculine",
          }),
        ),
      ),
    ).toEqual(new Set(["seated-writing", "seated-reading"]));
    // A seated man waiting crosses an ankle over his knee where a woman
    // crosses her legs.
    expect(
      new Set(
        seeds.map((seed) =>
          chooseBodyPose({
            activity: "waiting",
            seated: true,
            seed,
            presentation: "masculine",
          }),
        ),
      ),
    ).toEqual(new Set(["seated-ankle-on-knee", "seated-phone"]));
    // A pose from the other set, asked of the engine, is drawn as this one's.
    expect(presentationPose("hand-on-hip", "masculine")).toBe(
      "hands-in-pockets",
    );
    expect(presentationPose("seated-ankle-on-knee", "feminine")).toBe(
      "seated-legs-crossed",
    );
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
    // A crowd of listeners stands several ways, folded arms most often.
    const folded = listening.filter((pose) => pose === "arms-folded").length;
    expect(folded).toBeGreaterThan(seeds.length * 0.15);
    expect(folded).toBeLessThan(seeds.length * 0.45);
    expect(new Set(listening).size).toBeGreaterThanOrEqual(5);
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
    // A door, a crowd and a street.
    expect(at("front-doorway", null)).toBe("greeting");
    expect(at("rally-crowd", null)).toBe("crowd");
    expect(at("sidewalk", null)).toBe("transit");
    expect(
      sceneActivity({
        personId: "a",
        speakerId: null,
        anchorType: "audience",
        seated: false,
        facing: "away",
      }),
    ).toBe("audience");
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

  it("falls side and back views through three-quarter before front", () => {
    expect(posedPieces(pack, { ...turned, view: "side" }).view).toBe(
      "three-quarter",
    );
    expect(posedPieces(pack, { ...turned, view: "back" }).view).toBe(
      "three-quarter",
    );
  });

  it("mirrors three-quarter art to honor an explicit facing", () => {
    const towardLeft = posedPieces(pack, { ...turned, facing: "left" });
    const towardRight = posedPieces(pack, { ...turned, facing: "right" });
    expect([towardLeft.toward, towardLeft.mirrored]).toEqual(["left", false]);
    expect([towardRight.toward, towardRight.mirrored]).toEqual(["right", true]);
    expect(engineRecipeKey({ ...turned, facing: "right" })).toContain(
      "facing:right",
    );
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
    // A spot facing away from the camera is seen from behind.
    expect(chooseBodyView("audience", "away")).toBe("back");
    expect(chooseBodyView("idle", "away")).toBe("back");
    expect(chooseBodyView("listening", "viewer")).toBe("three-quarter");
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
    // (Waiting and idle people may shift their weight, as the pose data has
    // them do; nobody explains, points or folds their arms in a listening
    // stance.)
    const resting = new Set<string>(["standing"]);
    for (const activity of ["idle", "waiting"] as const)
      for (const spots of Object.values(poseData.activities[activity]))
        for (const entries of Object.values(spots))
          for (const entry of entries) resting.add(entry.pose);
    for (const person of quiet)
      expect(resting).toContain(person.engine!.pose ?? "standing");

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
    expect(
      poseData.activities.speaking.front.stand.map((entry) => entry.pose),
    ).toContain(speaker.engine!.pose);
    const listeners = talking.filter((person) => person !== speaker);
    expect(listeners.length).toBeGreaterThanOrEqual(1);
    for (const listener of listeners) {
      expect(
        poseData.activities.listening["three-quarter"].stand.map((entry) =>
          presentationPose(
            entry.pose as BodyPose,
            listener.engine!.presentation,
          ),
        ),
      ).toContain(listener.engine!.pose);
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
      // The chosen pose, or the nearest one painted in this person's outfit.
      expect(
        presentationFallbacks(
          person.engine!.pose as BodyPose,
          person.engine!.presentation,
        ),
      ).toContain(drawn.pose);
      expect([drawn.raster.width, drawn.raster.height]).toEqual([512, 808]);
      const neck =
        (drawn.anchors.neck.row * 512 +
          Math.round(drawn.anchors.neck.centerX)) *
        4;
      expect(drawn.raster.data[neck + 3]).toBe(255);
    }
  }, 60_000);
});
