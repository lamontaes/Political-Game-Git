/**
 * SYSTEM 4 — MEASURED-GEOMETRY EVIDENCE CONTRACT
 *
 * An optional, provenance-backed place to put real measurements of real rooms,
 * so that future research output has somewhere to land other than a comment.
 *
 * Three boundaries hold this module together.
 *
 * FIRST, this is an AUTHORING AID, never a runtime requirement. A scene renders
 * with no evidence attached at all. Evidence exists so that when an author sets
 * a seat plane they can look at what a real committee room's seat spacing
 * actually is, instead of guessing and then defending the guess.
 *
 * SECOND, a generic scene is NOT a replica. Recording that a real chamber is
 * 14.6m wide does not make the reusable `PUBLIC_HEARING_ROOM_01` plate a
 * picture of that chamber, and nothing here should be read as claiming it does.
 * That is why evidence attaches to an ARCHETYPE and why many rooms may inform
 * one: the aggregate teaches proportion, and proportion is what transfers.
 *
 * THIRD, and most sharply: a measurement read off a drawing is not a published
 * measurement. `direct-published` means a source stated the number in words.
 * `scale-derived` means someone measured a drawing and converted. The two have
 * different failure modes — a published number can be stale, a derived number
 * can be wrong by the width of a pen stroke — and collapsing them is how
 * fabricated precision enters a project. The validator refuses the collapse.
 */

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

export interface GeometrySourceDocument {
  readonly sourceId: string;
  /** Document, drawing or page title as published. */
  readonly title: string;
  readonly sourceUrl?: string;
  readonly publisher?: string;
  /** ISO date the document itself carries, when it carries one. */
  readonly publicationDate?: string;
  /** ISO date the document was retrieved. */
  readonly retrievedDate?: string;
  readonly sheetIdentifier?: string;
  /**
   * Rights status. Unknown stays unknown: a plan sheet being visible online is
   * not evidence that it may be redistributed.
   */
  readonly rightsStatus: "public-domain" | "licensed" | "owned" | "unknown";
  readonly note?: string;
}

/**
 * A drawing's scale, and whether it is usable for deriving dimensions.
 *
 * `printedScale` alone is not enough to trust. Drawings are reproduced,
 * cropped and rescaled, and a sheet that says 1:100 in the title block may no
 * longer be 1:100 on the copy in hand. A scale is `resolved` only when a known
 * reference span was measured on THAT reproduction.
 */
export type DrawingScaleState = "resolved" | "printed-only" | "unresolved";

export interface DrawingScale {
  readonly scaleId: string;
  readonly sourceId: string;
  readonly state: DrawingScaleState;
  /** As printed in the title block, e.g. "1:100" or "1/8in = 1ft". */
  readonly printedScale?: string;
  /** Real-world length of the reference span used to resolve the scale. */
  readonly referenceLength?: number;
  /** Length of that same span as measured on the reproduction, in pixels. */
  readonly referencePixelSpan?: number;
  readonly unit?: LengthUnit;
  /** How the reference span was identified. Free text; nothing parses it. */
  readonly method?: string;
  readonly reason?: string;
}

export type LengthUnit = "m" | "cm" | "mm" | "ft" | "in";

export const LENGTH_UNITS: readonly LengthUnit[] = [
  "m",
  "cm",
  "mm",
  "ft",
  "in",
];

/** Whether a scale may be used to derive a dimension. */
export function scaleSupportsDerivation(scale: DrawingScale): boolean {
  return (
    scale.state === "resolved" &&
    typeof scale.referenceLength === "number" &&
    scale.referenceLength > 0 &&
    typeof scale.referencePixelSpan === "number" &&
    scale.referencePixelSpan > 0 &&
    scale.unit !== undefined
  );
}

// ---------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------

/**
 * How a number came to be known.
 *
 * - `direct-published` — a source stated it. It must name that source.
 * - `scale-derived` — measured off a drawing and converted through a RESOLVED
 *   drawing scale. It must name that scale and show its working.
 * - `bounded-estimate` — a range an informed reader can defend, not a
 *   measurement. Kept because "somewhere between 0.9m and 1.2m" is honest and
 *   useful, whereas rounding it to 1.05m is neither.
 */
export type MeasurementBasis =
  "direct-published" | "scale-derived" | "bounded-estimate";

/** The kinds of dimension this contract knows how to carry. */
export type MeasuredDimensionKind =
  | "room-width"
  | "room-length"
  | "clear-height"
  | "corridor-width"
  | "aisle-width"
  | "dais-width"
  | "dais-depth"
  | "dais-height"
  | "table-width"
  | "table-depth"
  | "table-height"
  | "seat-spacing"
  | "seat-pitch"
  | "row-spacing"
  | "door-width"
  | "door-height"
  | "rail-height"
  | "window-bay-width"
  | "ceiling-to-floor";

export const MEASURED_DIMENSION_KINDS: readonly MeasuredDimensionKind[] = [
  "room-width",
  "room-length",
  "clear-height",
  "corridor-width",
  "aisle-width",
  "dais-width",
  "dais-depth",
  "dais-height",
  "table-width",
  "table-depth",
  "table-height",
  "seat-spacing",
  "seat-pitch",
  "row-spacing",
  "door-width",
  "door-height",
  "rail-height",
  "window-bay-width",
  "ceiling-to-floor",
];

/** The working behind a `scale-derived` number, so a reviewer can redo it. */
export interface ScaleDerivation {
  readonly scaleId: string;
  /** Span measured on the drawing, in the same pixel space as the scale. */
  readonly measuredPixelSpan: number;
  readonly note?: string;
}

export interface MeasuredDimension {
  readonly dimensionId: string;
  readonly kind: MeasuredDimensionKind;
  readonly basis: MeasurementBasis;
  /** Null for a bounded estimate, which carries a range instead. */
  readonly value: number | null;
  readonly unit: LengthUnit;
  /** Inclusive bounds. Required for `bounded-estimate`, optional elsewhere. */
  readonly lowerBound?: number;
  readonly upperBound?: number;
  /** Source that STATED this number. Required for `direct-published`. */
  readonly publishedIn?: string;
  /** Working behind the number. Required for `scale-derived`. */
  readonly derivedFrom?: ScaleDerivation;
  readonly note?: string;
}

// ---------------------------------------------------------------------------
// Rooms and archetypes
// ---------------------------------------------------------------------------

/**
 * One real, identified room, and what is known about it.
 *
 * `buildingIdentifier` and `roomIdentifier` name a real place. That is
 * deliberate and is the whole value of the record — but see the note on
 * `GeometryArchetype` for why naming a real room here does not make any scene a
 * picture of it.
 */
export interface MeasuredRoom {
  readonly roomId: string;
  readonly buildingIdentifier: string;
  readonly roomIdentifier: string;
  /** Free text, e.g. "municipal council chamber". Never a jurisdiction claim. */
  readonly roomUse?: string;
  readonly sources: readonly GeometrySourceDocument[];
  readonly drawingScales: readonly DrawingScale[];
  readonly dimensions: readonly MeasuredDimension[];
  readonly note?: string;
}

/**
 * A reusable geometry archetype informed by one or more real rooms.
 *
 * The relationship is deliberately many-to-one. Five council chambers teach an
 * author what council chambers are LIKE — how deep the dais tends to be
 * relative to the room, how far apart seats sit — without any one of them being
 * reproduced. An archetype that cited exactly one room would be a replica with
 * extra steps, so `contributingRoomIds` is plural and the type says why.
 */
export interface GeometryArchetype {
  readonly archetypeId: string;
  readonly label: string;
  readonly contributingRoomIds: readonly string[];
  /**
   * Proportion relationships the archetype asserts, as ratios rather than
   * absolute sizes. Ratios are what survives generalisation.
   */
  readonly proportions?: readonly ArchetypeProportion[];
  readonly note?: string;
}

export interface ArchetypeProportion {
  readonly proportionId: string;
  /** e.g. "dais-width / room-width". */
  readonly relationship: string;
  readonly ratio: number;
  /** How many contributing rooms this ratio was computed across. */
  readonly observedAcrossRooms: number;
  readonly note?: string;
}

/**
 * A generic scene is never a replica of a measured room, and this constant
 * exists so that the claim is greppable rather than merely intended.
 */
export const ARCHETYPE_IS_NOT_A_REPLICA_CLAIM = true as const;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type GeometryEvidenceFindingCode =
  | "direct-published-without-source"
  | "direct-published-with-scale-derivation"
  | "scale-derived-without-derivation"
  | "scale-derived-without-resolved-scale"
  | "scale-derived-references-unknown-scale"
  | "bounded-estimate-without-bounds"
  | "bounded-estimate-with-value"
  | "value-missing"
  | "bounds-inverted"
  | "value-outside-bounds"
  | "unknown-unit"
  | "unknown-dimension-kind"
  | "duplicate-dimension-id"
  | "published-source-not-declared"
  | "archetype-references-unknown-room"
  | "archetype-single-room";

export interface GeometryEvidenceFinding {
  readonly code: GeometryEvidenceFindingCode;
  readonly severity: "error" | "warning";
  readonly subjectId: string;
  readonly message: string;
}

export interface GeometryEvidenceValidation {
  readonly valid: boolean;
  readonly findings: readonly GeometryEvidenceFinding[];
}

function error(
  code: GeometryEvidenceFindingCode,
  subjectId: string,
  message: string,
): GeometryEvidenceFinding {
  return { code, severity: "error", subjectId, message };
}

function warn(
  code: GeometryEvidenceFindingCode,
  subjectId: string,
  message: string,
): GeometryEvidenceFinding {
  return { code, severity: "warning", subjectId, message };
}

/**
 * Validates one measured room.
 *
 * The load-bearing rule is the one about basis. A dimension may not be labelled
 * `direct-published` while carrying the working of a scale derivation, and a
 * `scale-derived` dimension may not exist without a RESOLVED scale to have
 * derived it from. Together those two make "we measured it off the drawing and
 * called it published" unrepresentable rather than merely discouraged.
 */
export function validateMeasuredRoom(
  room: MeasuredRoom,
): GeometryEvidenceValidation {
  const findings: GeometryEvidenceFinding[] = [];
  const sourceIds = new Set(room.sources.map((source) => source.sourceId));
  const scalesById = new Map(
    room.drawingScales.map((scale) => [scale.scaleId, scale]),
  );
  const seenDimensionIds = new Set<string>();

  for (const scale of room.drawingScales) {
    if (!sourceIds.has(scale.sourceId)) {
      findings.push(
        warn(
          "published-source-not-declared",
          scale.scaleId,
          `Drawing scale '${scale.scaleId}' cites source '${scale.sourceId}', which this room does not declare.`,
        ),
      );
    }
  }

  for (const dimension of room.dimensions) {
    const id = dimension.dimensionId;
    if (seenDimensionIds.has(id)) {
      findings.push(
        error(
          "duplicate-dimension-id",
          id,
          `Dimension id '${id}' appears more than once in room '${room.roomId}'.`,
        ),
      );
    }
    seenDimensionIds.add(id);

    if (!LENGTH_UNITS.includes(dimension.unit)) {
      findings.push(
        error(
          "unknown-unit",
          id,
          `Dimension '${id}' declares unit '${dimension.unit}', which is not a supported length unit.`,
        ),
      );
    }
    if (!MEASURED_DIMENSION_KINDS.includes(dimension.kind)) {
      findings.push(
        error(
          "unknown-dimension-kind",
          id,
          `Dimension '${id}' declares kind '${dimension.kind}', which this contract does not carry.`,
        ),
      );
    }

    switch (dimension.basis) {
      case "direct-published": {
        if (!dimension.publishedIn) {
          findings.push(
            error(
              "direct-published-without-source",
              id,
              `Dimension '${id}' claims to be directly published but names no source that published it.`,
            ),
          );
        } else if (!sourceIds.has(dimension.publishedIn)) {
          findings.push(
            error(
              "published-source-not-declared",
              id,
              `Dimension '${id}' cites published source '${dimension.publishedIn}', which this room does not declare.`,
            ),
          );
        }
        if (dimension.derivedFrom) {
          findings.push(
            error(
              "direct-published-with-scale-derivation",
              id,
              `Dimension '${id}' is marked 'direct-published' but carries the working of a scale derivation. A number measured off a drawing is 'scale-derived'; calling it published overstates its authority.`,
            ),
          );
        }
        if (dimension.value === null) {
          findings.push(
            error(
              "value-missing",
              id,
              `Dimension '${id}' is published but carries no value.`,
            ),
          );
        }
        break;
      }
      case "scale-derived": {
        if (!dimension.derivedFrom) {
          findings.push(
            error(
              "scale-derived-without-derivation",
              id,
              `Dimension '${id}' is marked 'scale-derived' but shows no working, so no reviewer can check it.`,
            ),
          );
          break;
        }
        const scale = scalesById.get(dimension.derivedFrom.scaleId);
        if (!scale) {
          findings.push(
            error(
              "scale-derived-references-unknown-scale",
              id,
              `Dimension '${id}' derives from scale '${dimension.derivedFrom.scaleId}', which this room does not declare.`,
            ),
          );
          break;
        }
        if (!scaleSupportsDerivation(scale)) {
          findings.push(
            error(
              "scale-derived-without-resolved-scale",
              id,
              `Dimension '${id}' derives from scale '${scale.scaleId}', whose state is '${scale.state}'. A dimension may only be derived through a scale resolved against a known reference span on the same reproduction.`,
            ),
          );
        }
        if (dimension.value === null) {
          findings.push(
            error(
              "value-missing",
              id,
              `Dimension '${id}' is scale-derived but carries no value.`,
            ),
          );
        }
        break;
      }
      case "bounded-estimate": {
        if (
          dimension.lowerBound === undefined ||
          dimension.upperBound === undefined
        ) {
          findings.push(
            error(
              "bounded-estimate-without-bounds",
              id,
              `Dimension '${id}' is a bounded estimate and must state both bounds. An estimate without a range is a guess wearing a number.`,
            ),
          );
        }
        if (dimension.value !== null) {
          findings.push(
            error(
              "bounded-estimate-with-value",
              id,
              `Dimension '${id}' is a bounded estimate and must not also carry a single value; collapsing the range is precisely the fabrication this class avoids.`,
            ),
          );
        }
        break;
      }
    }

    if (
      dimension.lowerBound !== undefined &&
      dimension.upperBound !== undefined &&
      dimension.lowerBound > dimension.upperBound
    ) {
      findings.push(
        error(
          "bounds-inverted",
          id,
          `Dimension '${id}' declares a lower bound above its upper bound.`,
        ),
      );
    }
    if (
      dimension.value !== null &&
      dimension.lowerBound !== undefined &&
      dimension.upperBound !== undefined &&
      (dimension.value < dimension.lowerBound ||
        dimension.value > dimension.upperBound)
    ) {
      findings.push(
        error(
          "value-outside-bounds",
          id,
          `Dimension '${id}' carries a value outside its own declared bounds.`,
        ),
      );
    }
  }

  return {
    valid: !findings.some((f) => f.severity === "error"),
    findings,
  };
}

/**
 * Computes a scale-derived length from a resolved scale, or refuses.
 *
 * Returns null when the scale is not resolved. There is deliberately no
 * fallback to the printed scale: falling back is how an unverified reproduction
 * produces a confident number.
 */
export function deriveLengthFromScale(
  scale: DrawingScale,
  measuredPixelSpan: number,
): { readonly value: number; readonly unit: LengthUnit } | null {
  if (!scaleSupportsDerivation(scale)) return null;
  if (!Number.isFinite(measuredPixelSpan) || measuredPixelSpan <= 0)
    return null;
  const value =
    (measuredPixelSpan / scale.referencePixelSpan!) * scale.referenceLength!;
  return { value, unit: scale.unit! };
}

export function validateGeometryArchetype(
  archetype: GeometryArchetype,
  knownRoomIds: ReadonlySet<string>,
): GeometryEvidenceValidation {
  const findings: GeometryEvidenceFinding[] = [];
  for (const roomId of archetype.contributingRoomIds) {
    if (!knownRoomIds.has(roomId)) {
      findings.push(
        error(
          "archetype-references-unknown-room",
          archetype.archetypeId,
          `Archetype '${archetype.archetypeId}' cites room '${roomId}', which is not in the evidence set.`,
        ),
      );
    }
  }
  if (archetype.contributingRoomIds.length === 1) {
    findings.push(
      warn(
        "archetype-single-room",
        archetype.archetypeId,
        `Archetype '${archetype.archetypeId}' is informed by a single room. An archetype generalises; one room generalises nothing, and a scene built from it edges toward being a replica of a real place.`,
      ),
    );
  }
  return {
    valid: !findings.some((f) => f.severity === "error"),
    findings,
  };
}

/** A room's dimensions of one kind, in declaration order. */
export function dimensionsOfKind(
  room: MeasuredRoom,
  kind: MeasuredDimensionKind,
): readonly MeasuredDimension[] {
  return room.dimensions.filter((dimension) => dimension.kind === kind);
}
