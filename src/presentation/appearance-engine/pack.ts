import type { BodyAnchors } from "./anchors";
import { OPAQUE_ALPHA } from "./anchors";
import { assemblePerson, type PersonLayer } from "./assemble";
import type { Raster } from "./raster";
import { SKIN_RAMPS, recolorSkin, type MeasuredRamp } from "./skin";
import {
  fabricRamp,
  measureFabricLuminance,
  recolorFabric,
  type FabricRamp,
} from "./fabric";

/**
 * Hair colors, applied by code to hair painted in dark brown. "natural" keeps
 * the painting. PLACEHOLDER(wave2): picked by eye.
 */
export const HAIR_COLORS: readonly (FabricRamp & { readonly label: string })[] =
  [
    {
      id: "natural",
      label: "Dark brown",
      shadow: "#1c130e",
      base: "#3a271c",
      highlight: "#57402f",
    },
    {
      id: "black",
      label: "Black",
      shadow: "#0c0b0b",
      base: "#1a1818",
      highlight: "#2e2b2a",
    },
    {
      id: "brown",
      label: "Brown",
      shadow: "#2e1c10",
      base: "#5c3a22",
      highlight: "#7d5433",
    },
    {
      id: "auburn",
      label: "Auburn",
      shadow: "#3a130a",
      base: "#7a2f18",
      highlight: "#9e4a28",
    },
    {
      id: "blonde",
      label: "Blonde",
      shadow: "#7a5a2e",
      base: "#b99156",
      highlight: "#d7b57a",
    },
    {
      id: "gray",
      label: "Gray",
      shadow: "#4d4b49",
      base: "#8b8884",
      highlight: "#aaa7a2",
    },
    {
      id: "white",
      label: "White",
      shadow: "#8f8c88",
      base: "#c9c6c1",
      highlight: "#e3e0db",
    },
  ];

/**
 * THE PEOPLE ENGINE'S RUNTIME PACK (art/people-engine/v1).
 *
 * Built by scripts/appearance/build-people-pack.ts from the art team's
 * paintings: every piece is already extracted, halved to the size the game
 * draws people at, and measured there. The game composes a person from these
 * files and a recipe, and nothing else.
 */

export const PEOPLE_PACK_VERSION = "people-engine-pack-v1";

export type BodyPresentation = "feminine" | "masculine";
export type BodyBuild = "lean" | "average" | "fuller";
/**
 * What an outfit is worn for. A place asks for everyday, business or formal
 * clothes (src/presentation/dress-code.ts); "cold" is what a person wears
 * outdoors in the cold months; a "uniform" (scrubs, a safety vest, a police
 * uniform, a judge's robe) comes with a job and is never drawn at random.
 */
export type OutfitTag = "casual" | "business" | "formal" | "cold" | "uniform";

export const BODY_BUILDS: readonly BodyBuild[] = ["lean", "average", "fuller"];

/**
 * How the body is posed. Each pose is its own painting of every body and
 * outfit, named with the pose id as a suffix (body-feminine-lean-podium.png),
 * the way the seated ones are named -seated. Every standing pose keeps the
 * head where the standing body has it; every seated pose sits on a chair
 * facing front.
 */
export const BODY_POSES = [
  "standing",
  "seated",
  "arms-folded",
  "explaining",
  "hand-on-hip",
  "podium",
  "seated-leaning",
  "seated-legs-crossed",
  "hands-in-pockets",
  "seated-ankle-on-knee",
] as const;
export type BodyPose = (typeof BODY_POSES)[number];

/**
 * Each presentation's own body language (Lamontae, Sept. 28, 2026: the men
 * read effeminate in the women's poses). A man puts his hands in his pockets
 * where a woman rests a hand on her hip, and sits with an ankle on his knee
 * where she crosses her legs; the rest they share, each painted for their
 * own bodies.
 */
export const POSES_BY_PRESENTATION: Readonly<
  Record<BodyPresentation, readonly BodyPose[]>
> = {
  feminine: [
    "standing",
    "seated",
    "arms-folded",
    "explaining",
    "hand-on-hip",
    "podium",
    "seated-leaning",
    "seated-legs-crossed",
  ],
  masculine: [
    "standing",
    "seated",
    "arms-folded",
    "explaining",
    "hands-in-pockets",
    "podium",
    "seated-leaning",
    "seated-ankle-on-knee",
  ],
};

/** The same gesture in the other presentation's set. */
const COUNTERPART: Partial<Record<BodyPose, BodyPose>> = {
  "hand-on-hip": "hands-in-pockets",
  "hands-in-pockets": "hand-on-hip",
  "seated-legs-crossed": "seated-ankle-on-knee",
  "seated-ankle-on-knee": "seated-legs-crossed",
};

/**
 * A pose as this presentation strikes it: the pose itself when it is theirs,
 * otherwise its counterpart in their set.
 */
export function presentationPose(
  pose: BodyPose,
  presentation: BodyPresentation,
): BodyPose {
  const own = POSES_BY_PRESENTATION[presentation];
  if (own.includes(pose)) return pose;
  const counterpart = COUNTERPART[pose];
  return counterpart && own.includes(counterpart)
    ? counterpart
    : isSeatedPose(pose)
      ? "seated"
      : "standing";
}
/** The poses the pack keeps in its `poses` tables: all but the first two. */
export type NamedBodyPose = Exclude<BodyPose, "standing" | "seated">;

const SEATED_POSES: ReadonlySet<BodyPose> = new Set([
  "seated",
  "seated-leaning",
  "seated-legs-crossed",
  "seated-ankle-on-knee",
]);

export function isSeatedPose(pose: BodyPose): boolean {
  return SEATED_POSES.has(pose);
}

/**
 * The poses tried, in order, until one has art: the pose itself, then plain
 * seated for a seated pose, then standing. Standing always has art.
 */
export function poseFallbacks(pose: BodyPose): readonly BodyPose[] {
  if (pose === "standing") return ["standing"];
  if (pose === "seated") return ["seated", "standing"];
  return isSeatedPose(pose) ? [pose, "seated", "standing"] : [pose, "standing"];
}

/**
 * Which way a pose's painting turns toward: the side of the picture its
 * gesture, lean or gaze points to. A mirrored figure turns the other way.
 * Every front pose faces the viewer (Claude CTO, Sept. 28, 2026: the
 * explaining hand is the figure's own right, on the viewer's left, and is
 * not turned), so only the three-quarter view (PackView.toward) turns. A
 * pack entry's own `toward` wins over this.
 */
export const POSE_PAINTED_TOWARD: Readonly<
  Record<BodyPose, "left" | "right" | null>
> = {
  standing: null,
  seated: null,
  "arms-folded": null,
  explaining: null,
  "hand-on-hip": null,
  podium: null,
  "seated-leaning": null,
  "seated-legs-crossed": null,
  "hands-in-pockets": null,
  "seated-ankle-on-knee": null,
};

export interface PackBody {
  readonly file: string;
  readonly anchors: BodyAnchors;
  readonly skin: MeasuredRamp;
}

/**
 * Which way the whole person is turned: facing front, or turned three
 * quarters (body, outfit, face and hair all painted turned). A turned view is
 * painted turned one way (PackView.toward) and mirrored for the other.
 */
export const BODY_VIEWS = ["front", "three-quarter"] as const;
export type BodyView = (typeof BODY_VIEWS)[number];
export type TurnedBodyView = Exclude<BodyView, "front">;

/** Every pose's bodies, as painted in one view. */
export interface PackPostures {
  readonly bodies: Readonly<Record<BodyBuild, PackBody>>;
  /**
   * The same people seated facing front: the art team's seated bodies,
   * registered so the seat is one row for every build (seatRow).
   */
  readonly seated?: {
    readonly bodies: Readonly<
      Record<BodyBuild, PackBody & { readonly seatRow: number }>
    >;
  };
  /**
   * The other poses, as they are painted: each body in the pose (a seated
   * pose's bodies carry their seatRow), and which way the painting turns.
   */
  readonly poses?: Partial<Readonly<Record<NamedBodyPose, PackPose>>>;
}

/**
 * The faces a person makes. Each face id is painted in every expression, file
 * names ending in the expression (face-feminine-20s30s-01-smile.png, and
 * face-...-01-smile-three-quarter.png turned); neutral is the face itself.
 */
export const FACE_EXPRESSIONS = [
  "neutral",
  "smile",
  "laugh",
  "concerned",
  "angry",
  "skeptical",
  "sad",
  "surprised",
] as const;
export type FaceExpression = (typeof FACE_EXPRESSIONS)[number];

export interface PackFace {
  readonly id: string;
  /** The neutral face. */
  readonly file: string;
  readonly skin: MeasuredRamp;
  /** The same face in each other expression it has been painted in. */
  readonly expressions?: Partial<
    Readonly<
      Record<
        Exclude<FaceExpression, "neutral">,
        { readonly file: string; readonly skin: MeasuredRamp }
      >
    >
  >;
}

/**
 * A face in an expression: the painting of it when the pack has one and the
 * build has its file, and otherwise the neutral face, never nothing.
 */
export function expressedFace(
  face: PackFace,
  expression: FaceExpression | undefined,
  available: (file: string) => boolean = () => true,
): { readonly face: PackFace; readonly expression: FaceExpression } {
  if (!expression || expression === "neutral")
    return { face, expression: "neutral" };
  const painted = face.expressions?.[expression];
  if (!painted || !available(painted.file))
    return { face, expression: "neutral" };
  return {
    face: { id: face.id, file: painted.file, skin: painted.skin },
    expression,
  };
}

export interface PackHair {
  readonly id: string;
  readonly back: string;
  readonly front: string;
}

/**
 * Facial hair styles, painted in dark brown like the hair and recolored with
 * it (so a beard grays when the hair does).
 */
export const FACIAL_HAIR_STYLES = [
  "stubble",
  "mustache",
  "goatee",
  "short-beard",
  "full-beard",
] as const;
export type FacialHairStyle = (typeof FACIAL_HAIR_STYLES)[number];

/**
 * A layer drawn on the head, over the face and under the front hair: a
 * facial hair style or a pair of glasses, painted for the view's canonical
 * head (facial-hair-masculine-full-beard.png, glasses-round.png, and
 * -three-quarter at the end for a turned head).
 */
export interface PackHeadLayer {
  readonly id: string;
  readonly file: string;
}

/**
 * The whole person turned: every piece of them painted in the view, file
 * names ending in the view id (body-feminine-lean-three-quarter.png,
 * body-feminine-lean-explaining-three-quarter.png, face-...-three-quarter.png).
 */
export interface PackView extends PackPostures {
  /** The average body's anchors in this view, for its heads and hair. */
  readonly canonical: BodyAnchors;
  /** Faces and hair by the same ids as the front ones. */
  readonly faces: readonly PackFace[];
  readonly hair: readonly PackHair[];
  readonly facialHair?: readonly PackHeadLayer[];
  readonly glasses?: readonly PackHeadLayer[];
  /** The side of the picture the painted person is turned toward. */
  readonly toward: "left" | "right";
}

export interface PackPresentation extends PackPostures {
  /** The average body's anchors: every head and hair layer is drawn for them. */
  readonly canonical: BodyAnchors;
  readonly faces: readonly PackFace[];
  readonly hair: readonly PackHair[];
  /** Facial hair styles painted for this presentation, when any are. */
  readonly facialHair?: readonly PackHeadLayer[];
  /** Glasses frames painted for this presentation's heads, when any are. */
  readonly glasses?: readonly PackHeadLayer[];
  /** Every outfit style, in the order the creator's arrows step through. */
  readonly outfits: readonly PackOutfit[];
  /** The whole person turned, when it has been painted. */
  readonly views?: Partial<Readonly<Record<TurnedBodyView, PackView>>>;
}

export interface PackPose {
  readonly bodies: Partial<
    Readonly<Record<BodyBuild, PackBody & { readonly seatRow?: number }>>
  >;
  /** Overrides POSE_PAINTED_TOWARD for this painting. */
  readonly toward?: "left" | "right" | null;
}

/** An outfit's paintings in every pose, in one view. */
export interface OutfitPostures {
  /**
   * Per body: the layer, a mask of the body it hides, a mask per garment
   * part, and a mask of the skin the outfit shows (hands, legs, an open
   * collar). Without a skin mask, every skin-colored pixel counts as skin.
   */
  readonly builds: OutfitBuilds;
  /** The same outfit on the seated bodies, when it has been painted seated. */
  readonly seated?: OutfitBuilds;
  /** The same outfit in each other pose it has been painted in. */
  readonly poses?: Partial<Readonly<Record<NamedBodyPose, OutfitBuilds>>>;
}

export interface PackOutfit extends OutfitPostures {
  readonly id: string;
  /** Player-facing name, for the creator's Outfit arrows. */
  readonly label: string;
  /** Where and when it is worn (see OutfitTag); an outfit may fit several. */
  readonly tags: readonly OutfitTag[];
  /** The palette (PART_PALETTES) of each garment part that takes its own color. */
  readonly parts: Readonly<Record<string, string>>;
  /** The same outfit on the turned person, when it has been painted. */
  readonly views?: Partial<Readonly<Record<TurnedBodyView, OutfitPostures>>>;
}

export type OutfitBuilds = Partial<
  Readonly<
    Record<
      BodyBuild,
      {
        readonly file: string;
        readonly hides: string;
        readonly regions?: Readonly<Record<string, string>>;
        readonly skin?: string;
      }
    >
  >
>;

/** Whether the glasses a recipe owns are on its face right now. */
export function glassesOn(recipe: EngineRecipe): boolean {
  return (
    recipe.glasses !== undefined &&
    (recipe.glassesWear !== "reading" || recipe.reading === true)
  );
}

/** A pose's body for a build, or undefined when that body is not painted. */
function poseBody(
  postures: PackPostures,
  pose: BodyPose,
  build: BodyBuild,
): (PackBody & { readonly seatRow?: number }) | undefined {
  if (pose === "standing") return postures.bodies[build];
  if (pose === "seated") return postures.seated?.bodies[build];
  return postures.poses?.[pose]?.bodies[build];
}

function poseOutfit(
  outfit: OutfitPostures,
  pose: BodyPose,
  build: BodyBuild,
): OutfitBuilds[BodyBuild] {
  if (pose === "standing") return outfit.builds[build];
  if (pose === "seated") return outfit.seated?.[build];
  return outfit.poses?.[pose]?.[build];
}

function outfitFiles(
  outfit: NonNullable<OutfitBuilds[BodyBuild]>,
): readonly string[] {
  return [
    outfit.file,
    outfit.hides,
    ...Object.values(outfit.regions ?? {}),
    ...(outfit.skin ? [outfit.skin] : []),
  ];
}

/**
 * The pieces a recipe draws from, in its pose and view. The pose's fallbacks
 * are tried in order (poseFallbacks), and at each pose the recipe's view and
 * then the front: what a person is doing shows before which way they turn.
 * A pose and view are drawn only when the pack has the body, the recipe's
 * outfit, face and hair in them for the recipe's build, and `available` has
 * every one of their files (every file, when omitted). Standing in front
 * always draws.
 */
export function posedPieces(
  pack: PackPresentation,
  recipe: EngineRecipe,
  available: (file: string) => boolean = () => true,
) {
  const outfit = packOutfit(pack, recipe.outfit);
  const face = pack.faces.find((f) => f.id === recipe.face) ?? pack.faces[0]!;
  const hair = pack.hair.find((h) => h.id === recipe.hair) ?? pack.hair[0]!;
  const views: readonly BodyView[] =
    recipe.view && recipe.view !== "front" ? [recipe.view, "front"] : ["front"];
  for (const pose of poseFallbacks(
    presentationPose(recipe.pose ?? "standing", recipe.presentation),
  ))
    for (const view of views) {
      const turned = view === "front" ? undefined : pack.views?.[view];
      if (view !== "front" && !turned) continue;
      const postures: PackPostures = turned ?? pack;
      const body = poseBody(postures, pose, recipe.build);
      const outfitPostures =
        outfit && (turned ? outfit.views?.[view as TurnedBodyView] : outfit);
      const worn = outfitPostures
        ? poseOutfit(outfitPostures, pose, recipe.build)
        : undefined;
      const viewFace = turned
        ? turned.faces.find((f) => f.id === face.id)
        : face;
      const viewHair = turned
        ? turned.hair.find((h) => h.id === hair.id)
        : hair;
      if (!body || !viewFace || !viewHair) continue;
      const plain = pose === "standing" && view === "front";
      if (
        !plain &&
        ((outfit && !worn) ||
          ![
            body.file,
            ...(worn ? outfitFiles(worn) : []),
            ...(turned ? [viewFace.file, viewHair.back, viewHair.front] : []),
          ].every(available))
      )
        continue;
      const expressed = expressedFace(viewFace, recipe.expression, available);
      const headLayer = (
        layers: readonly PackHeadLayer[] | undefined,
        id: string | undefined,
      ) => {
        if (!id) return undefined;
        const layer = layers?.find((entry) => entry.id === id);
        return layer && available(layer.file) ? layer : undefined;
      };
      const postured: {
        readonly facialHair?: readonly PackHeadLayer[];
        readonly glasses?: readonly PackHeadLayer[];
      } = turned ?? pack;
      return {
        /** Absent when not worn, or when this view has no painting of it. */
        facialHair: headLayer(postured.facialHair, recipe.facialHair),
        glasses: glassesOn(recipe)
          ? headLayer(postured.glasses, recipe.glasses)
          : undefined,
        body,
        outfit: worn,
        face: expressed.face,
        /** The expression drawn: the recipe's, or neutral without its art. */
        expression: expressed.expression,
        hair: viewHair,
        /** The anchors every head and hair layer in this view is drawn for. */
        canonical: turned?.canonical ?? pack.canonical,
        pose,
        view,
        seated: isSeatedPose(pose),
        /** The side of the picture the drawn figure turns toward. */
        toward: towardOf(pack, pose, view, recipe.mirrored === true),
      };
    }
  // Standing in front has no condition above: the loop always returns.
  throw new Error("unreachable: standing in front always resolves");
}

function towardOf(
  pack: PackPresentation,
  pose: BodyPose,
  view: BodyView,
  mirrored: boolean,
): "left" | "right" | null {
  const posed = pack.views?.[view as TurnedBodyView] ?? pack;
  const painted =
    view !== "front"
      ? pack.views![view]!.toward
      : pose === "standing" || pose === "seated"
        ? POSE_PAINTED_TOWARD[pose]
        : posed.poses?.[pose]?.toward !== undefined
          ? posed.poses[pose]!.toward!
          : POSE_PAINTED_TOWARD[pose];
  if (!painted || !mirrored) return painted;
  return painted === "left" ? "right" : "left";
}

/**
 * Whether a person must be mirrored to turn toward a point: a figure drawn
 * turned right (in the pose and view the recipe actually resolves to) is
 * mirrored for a point on its left, and the reverse. A figure that turns
 * neither way is never mirrored.
 */
export function mirrorToFace(
  pack: PackPresentation,
  recipe: EngineRecipe,
  fromXPercent: number,
  towardXPercent: number,
  available?: (file: string) => boolean,
): boolean {
  const { toward } = posedPieces(
    pack,
    { ...recipe, mirrored: false },
    available,
  );
  if (!toward || towardXPercent === fromXPercent) return false;
  return (towardXPercent < fromXPercent ? "left" : "right") !== toward;
}

export interface PeoplePackManifest {
  readonly version: string;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly presentations: Readonly<Record<BodyPresentation, PackPresentation>>;
}

/**
 * The colors a garment part may take, by palette, from fabric.ts. Each
 * outfit names a palette for each of its parts. PLACEHOLDER(wave2): picked by
 * eye for variety; suits, shirts and ties stay in conservative colors.
 */
export const PART_PALETTES: Readonly<Record<string, readonly string[]>> = {
  top: [
    "burgundy",
    "forest",
    "navy",
    "slate-blue",
    "light-blue",
    "white",
    "gray",
    "teal",
    "plum",
    "mustard",
    "cream",
    "pink",
    "olive",
    "black",
  ],
  bottom: [
    "gray",
    "charcoal",
    "navy",
    "black",
    "khaki",
    "denim",
    "brown",
    "olive",
  ],
  suit: ["navy", "charcoal", "black", "gray", "slate-blue", "brown"],
  shirt: ["white", "light-blue", "cream", "pink", "gray"],
  tie: ["navy", "burgundy", "forest", "black", "slate-blue"],
  dress: [
    "burgundy",
    "navy",
    "black",
    "forest",
    "plum",
    "teal",
    "slate-blue",
    "charcoal",
  ],
  sweater: [
    "mustard",
    "burgundy",
    "forest",
    "navy",
    "gray",
    "cream",
    "olive",
    "teal",
    "plum",
    "slate-blue",
  ],
  coat: [
    "brown",
    "khaki",
    "charcoal",
    "navy",
    "black",
    "burgundy",
    "olive",
    "gray",
    "cream",
  ],
  scarf: [
    "burgundy",
    "navy",
    "forest",
    "mustard",
    "gray",
    "cream",
    "plum",
    "teal",
  ],
  scrubs: ["light-blue", "navy", "teal", "plum", "forest", "black", "burgundy"],
};

/** The outfit a recipe names, or the first one when it names none known. */
export function packOutfit(
  pack: PackPresentation,
  id: string,
): PackOutfit | undefined {
  return pack.outfits.find((outfit) => outfit.id === id) ?? pack.outfits[0];
}

/** One whole person, as the engine draws them. */
export interface EngineRecipe {
  readonly presentation: BodyPresentation;
  readonly build: BodyBuild;
  /** Skin shade 1 (lightest) to 7 (darkest). */
  readonly shade: number;
  readonly face: string;
  readonly hair: string;
  /** One of HAIR_COLORS. */
  readonly hairColor: string;
  /** One of the presentation's outfit ids (PackOutfit). */
  readonly outfit: string;
  /** Fabric color per garment part of the outfit (PART_PALETTES). */
  readonly colors?: Readonly<Record<string, string>>;
  /** Standing unless the place calls for sitting or the scene for a pose. */
  readonly pose?: BodyPose;
  /** Facing front unless the scene turns them (pose-chooser.ts). */
  readonly view?: BodyView;
  /** Neutral unless the moment shows on their face (expression-chooser.ts). */
  readonly expression?: FaceExpression;
  /** A facial hair style (FACIAL_HAIR_STYLES), when they wear one. */
  readonly facialHair?: string;
  /** A glasses frame id, when they own glasses. */
  readonly glasses?: string;
  /** Glasses worn only to read; absent means worn all day. */
  readonly glassesWear?: "reading";
  /** Reading or at a desk now, so reading glasses are on. */
  readonly reading?: boolean;
  /** The whole figure flipped left to right, to turn the other way. */
  readonly mirrored?: boolean;
}

export function engineRecipeKey(recipe: EngineRecipe): string {
  return [
    recipe.presentation,
    recipe.build,
    recipe.shade,
    recipe.face,
    recipe.hair,
    recipe.hairColor,
    recipe.outfit,
    recipe.pose ?? "standing",
    ...(recipe.view && recipe.view !== "front" ? [recipe.view] : []),
    ...(recipe.expression && recipe.expression !== "neutral"
      ? [`face:${recipe.expression}`]
      : []),
    ...(recipe.facialHair ? [`beard:${recipe.facialHair}`] : []),
    ...(glassesOn(recipe) ? [`glasses:${recipe.glasses}`] : []),
    ...(recipe.mirrored ? ["mirrored"] : []),
    ...Object.entries(recipe.colors ?? {})
      .sort()
      .map(([part, color]) => `${part}=${color}`),
  ].join("|");
}

/** Every file the recipe draws from, so a caller can load them first. */
export function recipeFiles(
  manifest: PeoplePackManifest,
  recipe: EngineRecipe,
  available?: (file: string) => boolean,
): readonly string[] {
  const pack = manifest.presentations[recipe.presentation];
  const { body, outfit, face, hair, facialHair, glasses } = posedPieces(
    pack,
    recipe,
    available,
  );
  return [
    body.file,
    face.file,
    hair.back,
    hair.front,
    ...(facialHair ? [facialHair.file] : []),
    ...(glasses ? [glasses.file] : []),
    ...(outfit ? outfitFiles(outfit) : []),
  ];
}

/** The raster flipped left to right. */
function mirrorRaster(raster: Raster): Raster {
  const { width, height, data } = raster;
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const from = (y * width + x) * 4;
      const to = (y * width + (width - 1 - x)) * 4;
      out.set(data.subarray(from, from + 4), to);
    }
  return { width, height, data: out };
}

/** Anchors measured on a raster, as they fall on its mirror image. */
export function mirrorAnchors(
  anchors: BodyAnchors,
  width: number,
): BodyAnchors {
  const flip = (x: number) => width - 1 - x;
  return {
    ...anchors,
    neck: { ...anchors.neck, centerX: flip(anchors.neck.centerX) },
    head: {
      ...anchors.head,
      left: flip(anchors.head.right),
      right: flip(anchors.head.left),
    },
  };
}

/** The layer with one garment part (its mask's opaque pixels) recolored. */
function recolorPart(layer: Raster, mask: Raster, color: FabricRamp): Raster {
  const part = new Uint8ClampedArray(layer.data.length);
  for (let i = 3; i < part.length; i += 4)
    if (mask.data[i]! > OPAQUE_ALPHA) {
      part.set(layer.data.subarray(i - 3, i + 1), i - 3);
    }
  const source = measureFabricLuminance({
    width: layer.width,
    height: layer.height,
    data: part,
  });
  const tinted = recolorFabric(layer, color, source);
  const out = new Uint8ClampedArray(layer.data);
  for (let i = 3; i < out.length; i += 4) {
    const t = mask.data[i]! / 255;
    if (t === 0) continue;
    for (let c = 1; c <= 3; c += 1)
      out[i - c] = out[i - c]! * (1 - t) + tinted.data[i - c]! * t;
  }
  return { width: layer.width, height: layer.height, data: out };
}

/**
 * Compose one person from decoded pack files. Skin on the body, the head and
 * any skin an outfit shows (hands, an open collar) takes the same shade, each
 * read against its own painting's measured shading.
 */
export function composeEnginePerson(
  manifest: PeoplePackManifest,
  image: (file: string) => Raster,
  recipe: EngineRecipe,
  available?: (file: string) => boolean,
): {
  readonly raster: Raster;
  readonly anchors: BodyAnchors;
  /** The pose drawn: the recipe's, or the one it fell back to. */
  readonly pose: BodyPose;
  /** The view drawn: the recipe's, or front when it has no art. */
  readonly view: BodyView;
  /** The expression drawn: the recipe's, or neutral when it has no art. */
  readonly expression: FaceExpression;
  /** For a seated person: the row the seat is at. */
  readonly seatRow?: number;
} {
  const pack = manifest.presentations[recipe.presentation];
  const {
    body,
    outfit,
    face,
    hair,
    canonical,
    pose,
    view,
    expression,
    seated,
    facialHair,
    glasses,
  } = posedPieces(pack, recipe, available);
  const ramp =
    SKIN_RAMPS[Math.min(SKIN_RAMPS.length, Math.max(1, recipe.shade)) - 1]!;
  const color = HAIR_COLORS.find((c) => c.id === recipe.hairColor);
  const front = image(hair.front);
  const tint = (layer: Raster) =>
    color && color.id !== "natural"
      ? recolorFabric(layer, color, measureFabricLuminance(front))
      : layer;
  const layers: PersonLayer[] = [
    {
      slot: "back-hair",
      raster: tint(image(hair.back)),
      authoredFor: canonical,
    },
    { slot: "body", raster: recolorSkin(image(body.file), ramp, body.skin) },
  ];
  if (outfit) {
    const hides = image(outfit.hides);
    const mask = new Uint8Array(hides.width * hides.height);
    for (let p = 0; p < mask.length; p += 1)
      mask[p] = hides.data[p * 4 + 3]! > OPAQUE_ALPHA ? 1 : 0;
    let clothes = recolorSkin(
      image(outfit.file),
      ramp,
      body.skin,
      outfit.skin ? image(outfit.skin) : undefined,
    );
    for (const [part, file] of Object.entries(outfit.regions ?? {})) {
      const color = recipe.colors?.[part];
      if (color) clothes = recolorPart(clothes, image(file), fabricRamp(color));
    }
    layers.push({ slot: "outfit", raster: clothes, hidesBody: mask });
  }
  layers.push(
    {
      slot: "head",
      raster: recolorSkin(image(face.file), ramp, face.skin),
      authoredFor: canonical,
    },
    ...(facialHair
      ? [
          {
            slot: "facial-hair" as const,
            raster: tint(image(facialHair.file)),
            authoredFor: canonical,
          },
        ]
      : []),
    ...(glasses
      ? [
          {
            slot: "glasses" as const,
            raster: image(glasses.file),
            authoredFor: canonical,
          },
        ]
      : []),
    {
      slot: "front-hair",
      raster: tint(front),
      authoredFor: canonical,
    },
  );
  const raster = assemblePerson(body.anchors, layers);
  const seatRow = seated ? body.seatRow : undefined;
  return recipe.mirrored
    ? {
        raster: mirrorRaster(raster),
        anchors: mirrorAnchors(body.anchors, raster.width),
        pose,
        view,
        expression,
        ...(seatRow === undefined ? {} : { seatRow }),
      }
    : {
        raster,
        anchors: body.anchors,
        pose,
        view,
        expression,
        ...(seatRow === undefined ? {} : { seatRow }),
      };
}
