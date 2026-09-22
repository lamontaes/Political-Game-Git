import fs from "fs";
import path from "path";

import type { CharacterComponentManifestRecord } from "../../src/presentation/character-components";
import { hashArtFile } from "./content-hash";
import { measureBodyRig } from "./pg-modular-intake";
import {
  measuredTurnDirection,
  measureSeatedContact,
  turnOffsetFraction,
  type SeatedContactMeasurement,
} from "./seated-contact";
import {
  anchorsFromMeasurement,
  contactsFromMeasurement,
  dispositionFor,
  headOrientationFor,
  measureWaveACrop,
  readPng,
  registeredPoseFamilyFor,
  rigIsPlausible,
  WAVE_A_BODY_LAYER,
  type WaveADisposition,
  type WaveAMeasurement,
  type WaveAVisualObservation,
} from "./wave-a-candidate-admission";

/**
 * OCD body candidate ADMISSION.
 *
 * Packet 71 chopped eight adult-feminine body poses off one source sheet,
 * measured every rig, and marked all eight REVISE for a single reason: a green
 * contour on two thirds of their soft-edge pixels. Packet 76 then removed
 * exactly that contour, deterministically, writing no alpha and touching no
 * interior pixel. Nothing has happened to these eight since. They appear in no
 * manifest at all, so the game cannot reach them — the same defect the Wave A
 * admission was written to fix, on a different set of rasters.
 *
 * This admits them on the same terms, which is why it reuses that module's
 * measurement, its pose-family mapping and its disposition rules rather than
 * restating them. Three things are specific to this set.
 *
 * 1. **Pixels come from Packet 76, provenance from Packet 71.** The two are
 *    tied together and checked: the despill report must name the Packet 71
 *    raster as its source, the Packet 71 cell's own digest must match what the
 *    despill read, and the file on disk must still be the byte-identical
 *    output the despill wrote. A break anywhere in that chain refuses the
 *    subject rather than admitting art whose lineage cannot be walked.
 * 2. **The turn is measured, not only read.** See `turnOffsetFraction`.
 * 3. **These are furniture-free.** Packet 71's seated poses are drawn on an
 *    unseen chair, so unlike most of the Wave A seated crops there is nothing
 *    painted into them for the room to collide with.
 *
 * Deterministic: the same rasters produce the same records and report.
 */

export const OCD_ADMISSION_VERSION = "ocd-candidate-admission-v1";

/** Packet 71 dispositions: provenance, prior prose reading, rig. Read, never written. */
export const OCD_INTAKE_SOURCE = "art/qa/p71/source_intake_dispositions.json";

/** Packet 76 despill: the pixels these records point at. Read, never written. */
export const OCD_DESPILL_SOURCE = "art/qa/p76/edge_despill_report.json";

export const OCD_REPORT_PATH = "art/qa/p76/ocd-admission-report.json";
export const OCD_REPORT_SCHEMA = "ocd-candidate-admission-report-v1";

/** One source sheet, one morphology, eight poses. */
export const OCD_BODY_FAMILY = "ocd-adult-feminine";

export const OCD_OBSERVATION_METHOD =
  "Direct inspection of each despilled raster at review scale (about 760 px tall per figure) by the character rendering triage lane, 2026-09-22, with the seated turn corroborated by the silhouette measurement below. Packet 71's prose pose descriptions were read afterwards and are carried as the prior claim; where the pixels and the prose disagree the disagreement is reported rather than resolved silently. This is a reviewable candidate observation, not owner acceptance and not a production pose certification.";

// ---------------------------------------------------------------------------
// Reviewed pixel observations
// ---------------------------------------------------------------------------

export interface OcdSubject {
  readonly assetId: string;
  /**
   * The pose category in the Wave A vocabulary, used only to choose between
   * the two standing families. Derived from the asset id, which on this sheet
   * is the chop's own naming rather than a claim about the pixels.
   */
  readonly apparentPoseCategory: string;
  readonly observation: WaveAVisualObservation;
}

export const OCD_SUBJECTS: readonly OcdSubject[] = [
  {
    assetId: "ocd_body_adult_fem_seated_conversational_left_v1",
    apparentPoseCategory: "seated_conversational",
    observation: {
      posture: "seated",
      facing: "three-quarter",
      facingDirection: "left",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
      note: "The only plate on this sheet turned the other way: shins and feet swing away from the reference plate's side, and it measures +0.328 where that plate measures -0.271. Packet 71 calls it three-quarter left, and the pixels agree.",
    },
  },
  {
    assetId: "ocd_body_adult_fem_seated_gesture_forward_v1",
    apparentPoseCategory: "seated_gesture",
    observation: {
      posture: "seated",
      facing: "three-quarter",
      facingDirection: "right",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
      note: "Packet 71 describes this as three-quarter left. It is not: the shins and feet swing to the same side as the reference plate and it measures -0.226, where the one genuinely turned the other way measures +0.328. Both hands come forward and low, which is a gesture rather than a turn.",
    },
  },
  {
    assetId: "ocd_body_adult_fem_seated_guest_front_v1",
    apparentPoseCategory: "seated_guest",
    observation: {
      posture: "seated",
      facing: "three-quarter",
      facingDirection: "right",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
      note: "Packet 71 describes this as close to square. It is not: at -0.276 it is turned as far as the plate named for its turn, and a genuinely square seated figure measures within a thousandth of zero. The hands rest on the knees, which is what reads as frontal.",
    },
  },
  {
    assetId: "ocd_body_adult_fem_seated_guest_three_quarter_v1",
    apparentPoseCategory: "seated_guest",
    observation: {
      posture: "seated",
      facing: "three-quarter",
      facingDirection: "right",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
      note: "The reference plate the facing convention is anchored to. Hands rest on the thighs, seated on an unseen chair.",
    },
  },
  {
    assetId: "ocd_body_adult_fem_standing_conversational_a_v1",
    apparentPoseCategory: "standing_conversational",
    observation: {
      posture: "standing",
      facing: "three-quarter",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
      note: "Genuinely turned, agreeing with Packet 71: one shoulder leads, the torso is narrowed and the far foot points away, where the neutral poses on this sheet put both feet square to camera. No direction is recorded, because the measurement that settles a seated turn says nothing about a standing one and this lane will not read a direction it cannot check. It changes nothing here: every standing family declares front, so a turned standing figure has no family whichever way it faces.",
    },
  },
  {
    assetId: "ocd_body_adult_fem_standing_conversational_b_v1",
    apparentPoseCategory: "standing_conversational",
    observation: {
      posture: "standing",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
      note: "Square to camera with both hands raised at waist height; feet symmetric and level.",
    },
  },
  {
    assetId: "ocd_body_adult_fem_standing_neutral_a_v1",
    apparentPoseCategory: "standing_neutral",
    observation: {
      posture: "standing",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
      note: "Square to camera, arms at the sides, feet together.",
    },
  },
  {
    assetId: "ocd_body_adult_fem_standing_neutral_b_v1",
    apparentPoseCategory: "standing_neutral",
    observation: {
      posture: "standing",
      facing: "front",
      bakedProp: "none",
      extent: "complete-figure",
      confidence: "high",
      note: "Square to camera, arms at the sides with the hands slightly open.",
    },
  },
];

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

export interface OcdProvenance {
  readonly intakePath: string;
  readonly intakeSha256: string;
  readonly intakeDisposition: string;
  readonly intakePoseFamily: string | null;
  readonly intakePoseDescription: string | null;
  readonly despilledPath: string;
  readonly despilledSha256: string;
  readonly observedSha256: string;
  /** Every link in Packet 71 -> Packet 76 -> disk holds. */
  readonly lineageIntact: boolean;
  readonly lineageBreaks: readonly string[];
}

interface IntakeCell {
  readonly assetId: string;
  readonly path: string;
  readonly sha256: string;
  readonly poseFamily?: string;
  readonly poseDescription?: string;
  readonly disposition: string;
}

function readIntakeCells(repositoryRoot: string): Map<string, IntakeCell> {
  const raw = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, OCD_INTAKE_SOURCE), "utf8"),
  ) as { sheets: Record<string, { cells?: readonly IntakeCell[] }> };
  const cells = new Map<string, IntakeCell>();
  for (const sheet of Object.values(raw.sheets)) {
    for (const cell of sheet.cells ?? []) cells.set(cell.assetId, cell);
  }
  return cells;
}

interface DespillEntry {
  readonly assetId: string;
  readonly source: string;
  readonly output: string;
  readonly sourceSha256: string;
  readonly outputSha256: string;
}

function readDespillEntries(repositoryRoot: string): Map<string, DespillEntry> {
  const raw = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, OCD_DESPILL_SOURCE), "utf8"),
  ) as { entries: readonly DespillEntry[] };
  return new Map(raw.entries.map((entry) => [entry.assetId, entry]));
}

// ---------------------------------------------------------------------------
// The admission run
// ---------------------------------------------------------------------------

export interface OcdAdmissionRow {
  readonly assetId: string;
  readonly family: string;
  readonly provenance: OcdProvenance;
  readonly priorClaim: {
    readonly poseFamily: string | null;
    readonly poseDescription: string | null;
  };
  readonly observation: WaveAVisualObservation;
  readonly measurement: WaveAMeasurement;
  readonly turnOffsetFraction: number;
  readonly measuredTurnDirection: "left" | "right" | null;
  readonly seatedContact: SeatedContactMeasurement | null;
  readonly rigPlausible: boolean;
  readonly registeredPoseFamily: string | null;
  readonly disposition: OcdDisposition;
  readonly priorClaimDisagreements: readonly string[];
}

export type OcdDisposition =
  WaveADisposition | "retained-broken-lineage" | "retained-turn-disagreement";

/**
 * Where the reviewed observation and Packet 71's prose part company.
 *
 * Reported, never resolved. Packet 71 read these plates once and its rig
 * measurements are a pure function of the raster; its pose prose is not, and
 * on this sheet it is wrong twice. Saying so in the record is the point.
 */
export function ocdPriorClaimDisagreements(
  observation: WaveAVisualObservation,
  cell: IntakeCell | undefined,
): readonly string[] {
  if (!cell) return [];
  const disagreements: string[] = [];
  const prose = (cell.poseDescription ?? "").toLowerCase();
  const proseDirection = prose.includes("three-quarter right")
    ? "right"
    : prose.includes("three-quarter left")
      ? "left"
      : null;
  const proseSquare =
    prose.includes("square to camera") || prose.includes("close to square");
  if (
    proseDirection &&
    observation.facingDirection &&
    proseDirection !== observation.facingDirection
  ) {
    disagreements.push(
      `Packet 71 describes this as three-quarter ${proseDirection}; the pixels and the silhouette measurement both read three-quarter ${observation.facingDirection}.`,
    );
  }
  if (proseSquare && observation.facing !== "front") {
    disagreements.push(
      `Packet 71 describes this as square to camera; the pixels read ${observation.facing}.`,
    );
  }
  if (
    !proseSquare &&
    !proseDirection &&
    observation.facing === "front" &&
    prose.includes("three-quarter")
  ) {
    disagreements.push(
      "Packet 71 describes a three-quarter turn; the pixels read front.",
    );
  }
  return disagreements;
}

export interface OcdAdmissionResult {
  readonly rows: readonly OcdAdmissionRow[];
  readonly records: readonly CharacterComponentManifestRecord[];
}

export async function runOcdAdmission(
  repositoryRoot: string,
): Promise<OcdAdmissionResult> {
  const cells = readIntakeCells(repositoryRoot);
  const despilled = readDespillEntries(repositoryRoot);
  const rows: OcdAdmissionRow[] = [];
  const records: CharacterComponentManifestRecord[] = [];

  for (const subject of [...OCD_SUBJECTS].sort((a, b) =>
    a.assetId < b.assetId ? -1 : 1,
  )) {
    const cell = cells.get(subject.assetId);
    const entry = despilled.get(subject.assetId);
    if (!entry) {
      throw new Error(
        `'${subject.assetId}' has no Packet 76 despill entry. These records point at despilled pixels; admitting one without that entry would point at a raster nothing measured.`,
      );
    }

    const absolute = path.join(repositoryRoot, entry.output);
    const observedSha256 = hashArtFile(absolute);
    const lineageBreaks: string[] = [];
    if (!cell) {
      lineageBreaks.push(
        `Packet 71 has no cell for '${subject.assetId}', so the raster the despill read has no recorded provenance.`,
      );
    } else {
      if (entry.source !== cell.path) {
        lineageBreaks.push(
          `the despill read '${entry.source}' but Packet 71 recorded the cell at '${cell.path}'`,
        );
      }
      if (entry.sourceSha256 !== cell.sha256) {
        lineageBreaks.push(
          `the despill read a source digest of ${entry.sourceSha256} but Packet 71 recorded ${cell.sha256}`,
        );
      }
    }
    if (observedSha256 !== entry.outputSha256) {
      lineageBreaks.push(
        `the despilled raster on disk digests to ${observedSha256} but the despill wrote ${entry.outputSha256}`,
      );
    }

    const bitmap = await readPng(absolute);
    const measurement = measureWaveACrop(bitmap);
    const offset = turnOffsetFraction(bitmap);
    const measured = measuredTurnDirection(offset);
    const plausible = rigIsPlausible(measurement);
    const seatedContact =
      subject.observation.posture === "seated"
        ? measureSeatedContact(
            bitmap,
            measureBodyRig(bitmap),
            offset,
            measurement.soleRunCount,
          )
        : null;
    const poseFamily = registeredPoseFamilyFor(
      subject.observation,
      subject.apparentPoseCategory,
    );

    // A seated figure whose declared turn and measured turn disagree is not
    // admitted under either of them. The whole point of registering a facing
    // is that the figure sits the way its family says it does, and two
    // readings that contradict each other cannot both be that.
    const turnDisagrees =
      subject.observation.posture === "seated" &&
      measured !== null &&
      subject.observation.facingDirection !== undefined &&
      measured !== subject.observation.facingDirection;

    let disposition: OcdDisposition = dispositionFor(
      subject.observation,
      poseFamily,
      plausible,
    );
    if (turnDisagrees) disposition = "retained-turn-disagreement";
    if (lineageBreaks.length > 0) disposition = "retained-broken-lineage";

    rows.push({
      assetId: subject.assetId,
      family: OCD_BODY_FAMILY,
      provenance: {
        intakePath: cell?.path ?? "",
        intakeSha256: cell?.sha256 ?? "",
        intakeDisposition: cell?.disposition ?? "",
        intakePoseFamily: cell?.poseFamily ?? null,
        intakePoseDescription: cell?.poseDescription ?? null,
        despilledPath: entry.output,
        despilledSha256: entry.outputSha256,
        observedSha256,
        lineageIntact: lineageBreaks.length === 0,
        lineageBreaks,
      },
      priorClaim: {
        poseFamily: cell?.poseFamily ?? null,
        poseDescription: cell?.poseDescription ?? null,
      },
      observation: subject.observation,
      measurement,
      turnOffsetFraction: offset,
      measuredTurnDirection: measured,
      seatedContact,
      rigPlausible: plausible,
      registeredPoseFamily: poseFamily,
      disposition,
      priorClaimDisagreements: ocdPriorClaimDisagreements(
        subject.observation,
        cell,
      ),
    });

    if (disposition === "admitted-candidate-body" && poseFamily) {
      const contacts = contactsFromMeasurement(
        measurement,
        subject.observation.posture,
        seatedContact ?? undefined,
      );
      records.push({
        asset_id: subject.assetId,
        asset_type: "character-component-candidate",
        fixed_or_modular: "modular",
        availability: "production-candidate",
        generation_status: "approved",
        qa_status: "pending",
        runtime_release_status: "unreleased",
        final_path: entry.output,
        hash: observedSha256,
        candidate_component: {
          kind: "body",
          family: OCD_BODY_FAMILY,
          layer: WAVE_A_BODY_LAYER,
          canvas: {
            width: measurement.cropWidth,
            height: measurement.cropHeight,
          },
          pose_family: poseFamily,
          head_orientation: headOrientationFor(subject.observation),
          root: {
            convention: "pelvis-hip-center",
            x: measurement.rig.centerXFraction,
            y: measurement.rig.waistYFraction,
          },
          attachment_anchors: anchorsFromMeasurement(measurement),
          ...(contacts ? { contacts } : {}),
        },
      });
    }
  }

  return {
    rows,
    records: records.slice().sort((a, b) => (a.asset_id < b.asset_id ? -1 : 1)),
  };
}
