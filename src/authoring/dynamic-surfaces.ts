/**
 * SYSTEM 6 — DYNAMIC SURFACES AND BAKED DECOR
 *
 * PRODUCTION PRINCIPLE: LIVED-IN, NOT LEGIBLE.
 *
 * A room should look like somewhere people work. It should have art on the
 * walls, books that lean, a plant that needs water, a few coloured papers on a
 * desk, a clock-shaped thing near the door. None of that should be READABLE,
 * because the moment a generated wall carries readable words two bad things
 * happen at once. The words are wrong — generated lettering is malformed, and
 * where it is well formed it says something the simulation never decided. And
 * the words are frozen — a bill number baked into a plate is the same bill
 * number in every session forever.
 *
 * So the line this module draws is not between "detailed" and "plain". It is
 * between decor, which is texture and stays baked, and INFORMATION, which the
 * simulation owns and which must be painted at runtime into a declared slot.
 *
 * A jurisdiction name, a seal, a campaign name, a bill number, a headline, an
 * agenda, an election result, a date on a calendar, a label on a map, a
 * portrait of whoever currently holds the office, a slide in a briefing: every
 * one of those is something the World knows and the picture must not presume.
 *
 * This module is contracts and validation. It does not generate text, and it
 * does not decide what any slot contains — the simulation does that, and a slot
 * only declares where such a thing goes and what class of thing may go there.
 */

import {
  isBakedDecorClass,
  isSemanticContentClass,
  type BakedDecorClass,
  type EnvironmentSceneSpec,
  type SceneSurfaceSlot,
  type SemanticContentClass,
} from "../environment/environment-scene-spec";

// ---------------------------------------------------------------------------
// The two vocabularies
// ---------------------------------------------------------------------------

/**
 * Both vocabularies are DEFINED in `environment-scene-spec.ts` and re-exported
 * here unchanged.
 *
 * They used to be declared in this file, and the scene spec kept a second,
 * shorter list of its own for the same slots — `working-draft` there against
 * `document-body` here, for the same piece of paper. A slot could then be legal
 * in the spec and unrecognised by the binder that has to fill it, and a
 * convergence had to pick one. The spec won because it is the lower layer: the
 * slot being validated lives there, and an authoring contract may depend on a
 * scene contract without the reverse being true.
 *
 * Nothing about the meanings changed. The semantic test is still "could this
 * differ between two saves, two jurisdictions, or two days?", and baked decor
 * is still shape without value.
 */
export {
  SEMANTIC_CONTENT_CLASSES,
  BAKED_DECOR_CLASSES,
  isSemanticContentClass,
  isBakedDecorClass,
  type SemanticContentClass,
  type BakedDecorClass,
} from "../environment/environment-scene-spec";

// ---------------------------------------------------------------------------
// Declarations an author makes about a plate
// ---------------------------------------------------------------------------

/**
 * Whether baked decor in a region is readable as language.
 *
 * `none` is the target for production art. `shapes-only` is the honest state of
 * a book spine or a wall calendar that reads as text-shaped texture without
 * resolving into words. `readable` is a defect: it means the plate is asserting
 * something the simulation did not decide.
 */
export type BakedTextState = "none" | "shapes-only" | "readable";

export interface BakedDecorDeclaration {
  readonly decorId: string;
  readonly decorClass: BakedDecorClass;
  /** Where it is, for review. Percent of plate. */
  readonly regionPercent?: {
    readonly x_percent: number;
    readonly y_percent: number;
    readonly width_percent: number;
    readonly height_percent: number;
  };
  readonly bakedText: BakedTextState;
  readonly note?: string;
}

/**
 * An author's declaration that a slot in the scene spec carries simulation
 * information. It ANNOTATES a `SceneSurfaceSlot`; it does not replace it.
 */
export interface SemanticSurfaceDeclaration {
  readonly slotId: string;
  readonly contentClasses: readonly SemanticContentClass[];
  /**
   * What is painted when the simulation has nothing for this slot. It must be
   * decor, never placeholder information: a blank board is honest, a board
   * reading "BILL 1042" is a lie with a fallback's job.
   */
  readonly emptyStateDecor?: BakedDecorClass;
  readonly note?: string;
}

export interface SceneDynamicSurfaceAuthoring {
  readonly sceneId: string;
  readonly semanticSurfaces: readonly SemanticSurfaceDeclaration[];
  readonly bakedDecor: readonly BakedDecorDeclaration[];
  /**
   * Whether a human has actually looked at the plate for readable text. Until
   * someone has, the answer is `unreviewed` rather than `none`.
   */
  readonly bakedTextReview: "unreviewed" | "reviewed";
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type DynamicSurfaceFindingCode =
  | "semantic-class-baked-as-decor"
  | "readable-baked-text"
  | "unreviewed-baked-text"
  | "slot-not-declared-in-spec"
  | "spec-slot-carries-semantic-class-without-declaration"
  | "semantic-declaration-without-classes"
  | "unknown-semantic-class"
  | "unknown-decor-class"
  | "fallback-decor-is-semantic"
  | "required-slot-missing"
  | "duplicate-slot-declaration";

export interface DynamicSurfaceFinding {
  readonly code: DynamicSurfaceFindingCode;
  readonly severity: "error" | "warning";
  readonly subjectId: string;
  readonly message: string;
}

export interface DynamicSurfaceValidation {
  readonly valid: boolean;
  readonly findings: readonly DynamicSurfaceFinding[];
}

function makeFinding(
  code: DynamicSurfaceFindingCode,
  severity: "error" | "warning",
  subjectId: string,
  message: string,
): DynamicSurfaceFinding {
  return { code, severity, subjectId, message };
}

/**
 * Checks an authoring declaration against the scene spec it describes.
 *
 * The two rules that matter most, stated as code rather than as guidance:
 *
 * 1. A surface slot whose allowed content includes a semantic class MUST be
 *    declared as a semantic surface. Otherwise a slot quietly carries live
 *    information nobody registered as dynamic.
 * 2. Baked decor may NEVER claim a semantic class, and readable baked text is
 *    an error. That is the anti-slop rule with teeth.
 */
export function validateDynamicSurfaceAuthoring(
  authoring: SceneDynamicSurfaceAuthoring,
  spec: Pick<EnvironmentSceneSpec, "surface_slots">,
  requiredSlotIds: readonly string[] = [],
): DynamicSurfaceValidation {
  const findings: DynamicSurfaceFinding[] = [];
  const specSlots: readonly SceneSurfaceSlot[] = spec.surface_slots ?? [];
  const specSlotsById = new Map(
    specSlots.map((slot) => [slot.slot_id, slot] as const),
  );
  const declaredIds = new Set<string>();

  for (const declaration of authoring.semanticSurfaces) {
    if (declaredIds.has(declaration.slotId)) {
      findings.push(
        makeFinding(
          "duplicate-slot-declaration",
          "error",
          declaration.slotId,
          `Slot '${declaration.slotId}' is declared as a semantic surface more than once.`,
        ),
      );
    }
    declaredIds.add(declaration.slotId);

    if (!specSlotsById.has(declaration.slotId)) {
      findings.push(
        makeFinding(
          "slot-not-declared-in-spec",
          "error",
          declaration.slotId,
          `Semantic surface '${declaration.slotId}' has no matching surface slot in the scene spec, so there is nowhere on the plate to paint it.`,
        ),
      );
    }
    if (declaration.contentClasses.length === 0) {
      findings.push(
        makeFinding(
          "semantic-declaration-without-classes",
          "error",
          declaration.slotId,
          `Semantic surface '${declaration.slotId}' declares no content classes, so nothing may ever legitimately fill it.`,
        ),
      );
    }
    for (const contentClass of declaration.contentClasses) {
      if (!isSemanticContentClass(contentClass)) {
        findings.push(
          makeFinding(
            "unknown-semantic-class",
            "error",
            declaration.slotId,
            `Semantic surface '${declaration.slotId}' declares unknown content class '${contentClass}'.`,
          ),
        );
      }
    }
    if (
      declaration.emptyStateDecor !== undefined &&
      !isBakedDecorClass(declaration.emptyStateDecor)
    ) {
      findings.push(
        makeFinding(
          "fallback-decor-is-semantic",
          "error",
          declaration.slotId,
          `Slot '${declaration.slotId}' falls back to '${declaration.emptyStateDecor}', which is not restrained decor. An empty slot shows decor or nothing; it never shows placeholder information.`,
        ),
      );
    }
  }

  // Rule 1: every spec slot allowing semantic content must be declared.
  for (const slot of specSlots) {
    const semanticClasses = slot.allowed_content_classes.filter((entry) =>
      isSemanticContentClass(entry),
    );
    if (semanticClasses.length > 0 && !declaredIds.has(slot.slot_id)) {
      findings.push(
        makeFinding(
          "spec-slot-carries-semantic-class-without-declaration",
          "error",
          slot.slot_id,
          `Scene slot '${slot.slot_id}' allows simulation-owned content (${semanticClasses.join(", ")}) but is not declared as a dynamic semantic surface. Information the World owns must be registered as dynamic, not left implicit.`,
        ),
      );
    }
  }

  // Rule 2: baked decor is decor.
  for (const decor of authoring.bakedDecor) {
    if (isSemanticContentClass(decor.decorClass as string)) {
      findings.push(
        makeFinding(
          "semantic-class-baked-as-decor",
          "error",
          decor.decorId,
          `Baked decor '${decor.decorId}' claims class '${decor.decorClass}', which is information the simulation owns. It must be a declared dynamic surface, not paint.`,
        ),
      );
    } else if (!isBakedDecorClass(decor.decorClass)) {
      findings.push(
        makeFinding(
          "unknown-decor-class",
          "error",
          decor.decorId,
          `Baked decor '${decor.decorId}' declares unknown class '${decor.decorClass}'.`,
        ),
      );
    }
    if (decor.bakedText === "readable") {
      findings.push(
        makeFinding(
          "readable-baked-text",
          "error",
          decor.decorId,
          `Baked decor '${decor.decorId}' contains readable text. A plate must be lived-in, not legible: readable words are either wrong or are asserting something the simulation never decided, and they are frozen either way.`,
        ),
      );
    }
  }

  if (authoring.bakedTextReview === "unreviewed") {
    findings.push(
      makeFinding(
        "unreviewed-baked-text",
        "warning",
        authoring.sceneId,
        `Scene '${authoring.sceneId}' has not been reviewed for readable baked text. Until someone has looked, the honest state is unreviewed rather than clean.`,
      ),
    );
  }

  for (const slotId of requiredSlotIds) {
    if (!specSlotsById.has(slotId)) {
      findings.push(
        makeFinding(
          "required-slot-missing",
          "error",
          slotId,
          `Scene '${authoring.sceneId}' is missing required surface slot '${slotId}'; a semantic use bound to this scene would have nowhere to put its content.`,
        ),
      );
    }
  }

  return { valid: !findings.some((f) => f.severity === "error"), findings };
}

/**
 * Splits a slot's allowed content classes into the simulation-owned half and
 * the decor half, so a reviewer can see at a glance which is which.
 */
export function partitionContentClasses(classes: readonly string[]): {
  readonly semantic: readonly SemanticContentClass[];
  readonly decor: readonly BakedDecorClass[];
  readonly unrecognized: readonly string[];
} {
  const semantic: SemanticContentClass[] = [];
  const decor: BakedDecorClass[] = [];
  const unrecognized: string[] = [];
  for (const entry of classes) {
    if (isSemanticContentClass(entry)) semantic.push(entry);
    else if (isBakedDecorClass(entry)) decor.push(entry);
    else unrecognized.push(entry);
  }
  return { semantic, decor, unrecognized };
}
