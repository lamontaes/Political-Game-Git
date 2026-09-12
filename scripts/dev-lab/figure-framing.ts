import { SCENE_REGISTRY } from "../../src/presentation/scene-registry";
import type {
  RegisteredScene,
  RegisteredSceneAnchor,
} from "../../src/presentation/scene-registry";
import { composeSceneCharacter } from "../../src/presentation/scene-composition";
import type { SceneCharacterPresentation } from "../../src/presentation/scene-composition";
import { fitLayersToBox } from "../../src/presentation/life-scene-people";
import { resolvePerspectiveScale } from "../../src/presentation/scene-placement";
import {
  PRODUCTION_CHARACTER_LIBRARY,
  PRODUCTION_POSE_ART,
  PRODUCTION_POSE_REGISTRY,
  PRODUCTION_VISUAL_LIBRARY,
} from "../../src/presentation/visual-integration";
import { artPreviewLibraries } from "../../src/presentation/art-preview";
import { projectCharacterLayers } from "../../src/presentation/character-components";
import type {
  CharacterComponentLibrary,
  CharacterComponentOrigin,
} from "../../src/presentation/character-components";
import type { PersonAppearance } from "../../src/simulation/types";

/**
 * What the shell actually composes, measured rather than described.
 *
 * This answers three questions that the screen alone cannot, and that a
 * passing test suite was never asked:
 *
 * FRAMING — is the figure whole, is it standing on the floor the anchor
 * declares, and is it large enough on the plate to judge at all? A person
 * composed correctly and then drawn sixteen pixels tall is not a success, and
 * a person whose feet float above the contact line reads as a placement bug in
 * art that has none.
 *
 * REGISTRATION — do the head, hair and garments land where the body says they
 * attach? Every non-body component declares an origin and the anchor it
 * attaches to; the projection folds those into one rectangle each. This
 * recomputes the intended landing independently and reports the residual, so
 * "the hair sits wrong" becomes a number with a side rather than an opinion.
 *
 * WHAT IS MISSING — the compositor already refuses precisely. This collects
 * those refusals into one list of exact remaining asset needs, instead of a
 * reviewer discovering them one room at a time.
 *
 * ## What this does NOT do
 *
 * It measures no physical quantity and promotes nothing. Every number it
 * derives is either EXACT (read straight from authored data or computed from
 * it by arithmetic that adds no information) or a VISUAL ESTIMATE (a ratio
 * this file assumes about human proportion, which no one measured). Each
 * reported value carries its class. A visual estimate must never be copied
 * into a scene's floor calibration: an uncalibrated room is missing a
 * measurement, and the fix for a missing measurement is to measure it.
 */

export type ConfidenceClass = "exact" | "visual-estimate";

export interface MeasuredValue {
  readonly value: number;
  readonly confidence: ConfidenceClass;
  /** Where the number came from, in one clause. */
  readonly derivedFrom: string;
}

const exact = (value: number, derivedFrom: string): MeasuredValue => ({
  value: Number(value.toFixed(4)),
  confidence: "exact",
  derivedFrom,
});

const estimated = (value: number, derivedFrom: string): MeasuredValue => ({
  value: Number(value.toFixed(4)),
  confidence: "visual-estimate",
  derivedFrom,
});

export interface LayerRegistration {
  readonly assetId: string;
  readonly kind: string;
  readonly slotId: string;
  /** The body attachment anchor this component declares it attaches to. */
  readonly attachesTo: string | null;
  /** Drawn, or withheld — and when withheld, the compositor's own reason. */
  readonly drawn: boolean;
  /**
   * How far the layer's placed origin is from the body anchor it attaches to,
   * as a fraction of the body canvas. Zero is perfect registration.
   *
   * Non-zero is not automatically wrong: a fit-bank answer deliberately moves
   * a garment to sit on THIS body in THIS pose, and that displacement is the
   * fit doing its job. The number separates "moved on purpose, by this much"
   * from "never registered at all".
   */
  readonly originResidual: {
    readonly x: MeasuredValue;
    readonly y: MeasuredValue;
    readonly fitted: boolean;
  } | null;
}

/**
 * What KIND of output a placement produced.
 *
 * Counting "a figure drew" in one number was the flaw that let this report be
 * read as a coverage claim. A fixture body drawing is not the game having art;
 * a candidate-review body drawing is not production; and a runtime refusal is a
 * result, not an absence of one. They are four different answers and they are
 * now four different buckets.
 */
export type ArtClass =
  "production-real" | "production-fixture" | "candidate-review" | "refused";

export interface FigureMeasurement {
  readonly sceneId: string;
  readonly anchorId: string;
  readonly anchorKind: string | null;
  readonly bodyFamily: string | null;
  readonly poseFamily: string | null;
  /** Whether the room declares the measurement a body is sized against. */
  readonly floorCalibrated: boolean;
  /** The composed figure's union box on the plate, before any fitting. */
  readonly composedHeightPercent: MeasuredValue | null;
  /** The same after the preview's fallback fit, when one applies. */
  readonly fittedHeightPercent: MeasuredValue | null;
  /**
   * Feet-to-floor: the figure's own bottom edge minus the anchor's declared
   * contact line, in plate percent. Positive means the figure sinks below the
   * floor; negative means it floats above it.
   */
  readonly contactResidualPercent: MeasuredValue | null;
  /** True when the union box escapes the plate on any side. */
  readonly cropped: boolean | null;
  /** Which of the four output classes this placement produced. */
  readonly artClass: ArtClass;
  /**
   * True only when the compositor had NOTHING to say about this composition.
   *
   * A placement that drew some layers and reported a missing slot is a partial
   * draw, and lumping it in with a clean one is how a layer count turns into a
   * false completion claim.
   */
  readonly completeRecipe: boolean;
  readonly layers: readonly LayerRegistration[];
  /** Why nothing drew, when nothing drew. */
  readonly refusal: string | null;
  /** What the compositor objected to about what DID draw. */
  readonly diagnostics: readonly string[];
}

export interface FigureFramingReport {
  readonly tool: string;
  readonly note: string;
  readonly confidenceClasses: Readonly<Record<ConfidenceClass, string>>;
  readonly measurements: readonly FigureMeasurement[];
  /** Exactly what is missing, deduplicated, in the compositor's own words. */
  readonly remainingAssetNeeds: readonly string[];
  /** Rooms that declare no standard body width, which is a measurement gap. */
  readonly roomsWithoutFloorCalibration: readonly string[];
}

export const FIGURE_FRAMING_TOOL = "dev-lab/figure-framing";

function placeableAnchors(
  scene: RegisteredScene,
): readonly RegisteredSceneAnchor[] {
  return [...scene.anchors.values()]
    .filter(
      (anchor) => anchor.kind === "seat" || anchor.kind === "floor-standing",
    )
    .sort((left, right) => left.xPercent - right.xPercent);
}

function unionBox(
  layers: readonly {
    readonly leftPercent: number;
    readonly topPercent: number;
    readonly widthPercent: number;
    readonly heightPercent: number;
  }[],
) {
  if (layers.length === 0) return null;
  const left = Math.min(...layers.map((l) => l.leftPercent));
  const top = Math.min(...layers.map((l) => l.topPercent));
  const right = Math.max(...layers.map((l) => l.leftPercent + l.widthPercent));
  const bottom = Math.max(...layers.map((l) => l.topPercent + l.heightPercent));
  return { left, top, right, bottom };
}

/** A standing figure is roughly this many times as tall as it is wide. */
const STANDING_HEIGHT_RATIO = 2.55;
const SEATED_HEIGHT_RATIO = 1.5;

/**
 * The box the shell reserves for a person at an anchor.
 *
 * Every input is the authored one the runtime uses, INCLUDING the scene's own
 * perspective ramp. Leaving the ramp out of an early draft of this function
 * produced contact residuals of twenty-odd percent of the plate and read
 * exactly like a placement defect: the figures looked as though they sank
 * through the floor in half the rooms. They do not. The box was wrong, not the
 * game. A measurement that omits one of the runtime's terms does not measure
 * the runtime.
 */
function reservedBox(scene: RegisteredScene, anchor: RegisteredSceneAnchor) {
  const plateAspect = scene.plate.width / scene.plate.height;
  const seated = anchor.kind === "seat";
  const bodyWidth = anchor.footprintPercent ?? scene.standardBodyWidthPercent;
  if (bodyWidth === null || bodyWidth === undefined) return null;
  const scale = resolvePerspectiveScale(scene, anchor.contactFloorYPercent);
  const widthPercent = Math.min(30, Math.max(6, bodyWidth * scale));
  const ratio = seated ? SEATED_HEIGHT_RATIO : STANDING_HEIGHT_RATIO;
  const heightPercent = widthPercent * plateAspect * ratio;
  return {
    leftPercent: anchor.xPercent - widthPercent / 2,
    // Unclamped, exactly as the runtime places it: clamping this moves the
    // figure's feet rather than its head. See the note in planLifeScenePeople.
    topPercent: anchor.contactFloorYPercent - heightPercent,
    widthPercent,
    heightPercent,
  };
}

/**
 * Where each component actually landed against the anchor it declares.
 *
 * The projection places a component so its declared origin sits on its
 * declared body anchor, then folds in whatever the fit bank says this garment
 * needs on THIS body in THIS pose. Recomputing the intended landing here and
 * subtracting gives a residual that separates the two cases: zero means the
 * component registered exactly as authored, and non-zero is the fit's own
 * displacement, which is the fit working rather than a defect. A component
 * that never registered at all cannot produce a small residual by accident.
 *
 * Units are fractions of the body canvas, so the numbers are comparable
 * between bodies of different pixel sizes.
 */
function registrationOf(
  presentation: SceneCharacterPresentation,
  library: CharacterComponentLibrary,
  drawnAssetIds: ReadonlySet<string>,
): readonly LayerRegistration[] {
  const projected = projectCharacterLayers(presentation.recipe, library);
  if (!projected) return [];
  const bodyEntry = presentation.recipe.context.components.find(
    (component) => component.kind === "body",
  );
  const body = bodyEntry
    ? library.components.get(bodyEntry.assetId)
    : undefined;
  const anchors = new Map(
    (body?.definition.attachment_anchors ?? []).map((a) => [a.id, a]),
  );

  return projected.layers.map((layer) => {
    const component = library.components.get(layer.assetId);
    const origin: CharacterComponentOrigin | undefined =
      component?.definition.origin;
    const anchor = layer.attachmentAnchorId
      ? anchors.get(layer.attachmentAnchorId)
      : undefined;
    const residual =
      origin && anchor
        ? {
            x: exact(
              layer.left + origin.x * layer.width - anchor.x,
              "placed origin minus the declared body anchor, in body-canvas fractions",
            ),
            y: exact(
              layer.top + origin.y * layer.height - anchor.y,
              "placed origin minus the declared body anchor, in body-canvas fractions",
            ),
            fitted: layer.fit !== null,
          }
        : null;
    return {
      assetId: layer.assetId,
      kind: layer.kind,
      slotId: layer.slotId,
      attachesTo: layer.attachmentAnchorId,
      drawn: drawnAssetIds.has(layer.assetId),
      originResidual: residual,
    };
  });
}

export function measureFigureFraming(options: {
  readonly appearance: PersonAppearance;
  readonly personId: string;
  readonly displayName: string;
  readonly candidate: boolean;
}): FigureFramingReport {
  /*
   * The preview accessor answers null for anything but candidate review, on
   * purpose: a caller holding null passes nothing on and every downstream
   * default stays the default. So production is named here rather than coaxed
   * out of that accessor.
   */
  const preview = options.candidate
    ? artPreviewLibraries("candidate-review")
    : null;
  const characters = preview?.characters ?? PRODUCTION_CHARACTER_LIBRARY;
  const visuals = preview?.visuals ?? PRODUCTION_VISUAL_LIBRARY;
  const poseArt = preview?.poseArt ?? PRODUCTION_POSE_ART;

  const measurements: FigureMeasurement[] = [];
  const needs = new Set<string>();
  const uncalibrated: string[] = [];

  for (const scene of SCENE_REGISTRY.scenes.values()) {
    if (!scene.raster) continue;
    if (scene.standardBodyWidthPercent === null)
      uncalibrated.push(scene.sceneId);
    for (const anchor of placeableAnchors(scene)) {
      let presentation: SceneCharacterPresentation;
      try {
        presentation = composeSceneCharacter({
          scene,
          anchor,
          personId: options.personId,
          displayName: options.displayName,
          appearance: options.appearance,
          library: characters,
          visualLibrary: visuals,
          poseRegistry: PRODUCTION_POSE_REGISTRY,
          poseArt,
        });
      } catch (error) {
        measurements.push({
          sceneId: scene.sceneId,
          anchorId: anchor.id,
          anchorKind: anchor.kind,
          bodyFamily: "(threw)",
          poseFamily: "(threw)",
          floorCalibrated: scene.standardBodyWidthPercent !== null,
          composedHeightPercent: null,
          fittedHeightPercent: null,
          contactResidualPercent: null,
          cropped: null,
          artClass: "refused",
          completeRecipe: false,
          layers: [],
          refusal: error instanceof Error ? error.message : String(error),
          diagnostics: [],
        });
        continue;
      }

      const diagnostics = presentation.diagnostics.map((d) => d.code);
      for (const diagnostic of presentation.diagnostics)
        if (
          diagnostic.code === "required-slot-empty" ||
          diagnostic.code === "asset-not-runtime-approved" ||
          diagnostic.code === "pose-not-permitted-at-anchor" ||
          diagnostic.code === "facing-not-permitted-at-anchor"
        )
          needs.add(`${diagnostic.code}: ${diagnostic.message}`);

      const drawn = presentation.layers.filter((layer) => layer.url !== null);
      const composed = unionBox(drawn);
      const reserved = reservedBox(scene, anchor);

      /*
       * Classify by what the LIBRARY says these components are, not by whether
       * pixels appeared. `fixture` is the manifest's own development-fixture
       * flag and `released` is runtime eligibility; a candidate library's
       * records are lifted copies stamped released for a throwaway ledger, so
       * the candidate run is named by which library it is, not by that stamp.
       */
      const anyFixture = drawn.some(
        (layer) => characters.components.get(layer.assetId)?.fixture === true,
      );
      const artClass: ArtClass =
        drawn.length === 0
          ? "refused"
          : options.candidate
            ? "candidate-review"
            : anyFixture
              ? "production-fixture"
              : "production-real";

      let fittedHeight: MeasuredValue | null = null;
      let contactResidual: MeasuredValue | null = null;
      let cropped: boolean | null = null;

      if (composed && reserved) {
        const fitted = unionBox(
          fitLayersToBox(
            drawn.map((layer) => ({
              url: layer.url!,
              leftPercent: layer.leftPercent,
              topPercent: layer.topPercent,
              widthPercent: layer.widthPercent,
              heightPercent: layer.heightPercent,
            })),
            reserved,
          ),
        );
        if (fitted) {
          fittedHeight = exact(
            fitted.bottom - fitted.top,
            "union of the fitted layer rectangles",
          );
          contactResidual = exact(
            fitted.bottom - anchor.contactFloorYPercent,
            "fitted figure's bottom edge minus the anchor's declared contact line",
          );
          cropped =
            fitted.left < 0 ||
            fitted.top < 0 ||
            fitted.right > 100 ||
            fitted.bottom > 100;
        }
      }

      measurements.push({
        sceneId: scene.sceneId,
        anchorId: anchor.id,
        anchorKind: anchor.kind,
        bodyFamily: presentation.recipe.identity.bodyFamily,
        // The presentation carries either the resolved definition or its id.
        poseFamily:
          typeof presentation.poseFamily === "string"
            ? presentation.poseFamily
            : (presentation.poseFamily?.pose_family_id ?? null),
        floorCalibrated: scene.standardBodyWidthPercent !== null,
        composedHeightPercent: composed
          ? exact(
              composed.bottom - composed.top,
              "union of the composed layer rectangles, before any fit",
            )
          : null,
        fittedHeightPercent: fittedHeight,
        contactResidualPercent: contactResidual,
        cropped,
        artClass,
        completeRecipe:
          drawn.length > 0 && presentation.diagnostics.length === 0,
        layers: registrationOf(
          presentation,
          characters,
          new Set(drawn.map((layer) => layer.assetId)),
        ),
        refusal: drawn.length === 0 ? presentation.fallbackDescription : null,
        diagnostics,
      });
    }
  }

  return {
    tool: FIGURE_FRAMING_TOOL,
    note:
      "Development measurement of what the shell composes. Derives no physical " +
      "quantity and promotes nothing. A visual estimate here must never be " +
      "copied into a scene's floor calibration.",
    confidenceClasses: {
      exact:
        "Read from authored data, or computed from it by arithmetic that adds no information.",
      "visual-estimate":
        "A proportion this tool assumes about human figures. Nobody measured it.",
    },
    measurements,
    remainingAssetNeeds: [...needs].sort(),
    roomsWithoutFloorCalibration: uncalibrated.sort(),
  };
}

/** Kept so the standing-ratio constants above are declared, not inlined. */
export const FRAMING_RATIOS = {
  standing: estimated(
    STANDING_HEIGHT_RATIO,
    "assumed standing height-to-width ratio; the runtime uses the same number",
  ),
  seated: estimated(
    SEATED_HEIGHT_RATIO,
    "assumed seated height-to-width ratio; the runtime uses the same number",
  ),
};
