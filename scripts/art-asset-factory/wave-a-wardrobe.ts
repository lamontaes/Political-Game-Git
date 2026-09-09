import fs from "fs";
import path from "path";

import type {
  CharacterAttachmentAnchor,
  CharacterBodyContacts,
  CharacterComponentCandidateDefinition,
  CharacterComponentManifestRecord,
} from "../../src/presentation/character-components";
import { hashArtFile } from "./content-hash";
import {
  measureEdgeError,
  measureSourceProportion,
  metricFor,
  projectForMeasurement,
  readRasterSpans,
  type EdgeError,
  type FitSubject,
} from "./garment-fit-measure";
import {
  GARMENT_FIT_DEFAULT_BOUNDS,
  type BodyFitReference,
} from "../../src/presentation/garment-fit";
import * as PImage from "pureimage";
import { Writable } from "node:stream";

import {
  PG_BODY_RUNTIME_HEIGHT,
  PG_COMPONENT_SPECS,
  PG_LANCZOS_LOBES,
  PG_MASTER_SOURCE_DIRECTORY,
  cropBitmap,
  keyNeutralBackground,
  measureBodyRig,
  opaqueBounds,
  readPng,
  writePng,
  type BodyRigMeasurement,
  type PgComponentSpec,
} from "./pg-modular-intake";
import { resampleLanczos } from "./resample";

/**
 * Wave A wardrobe derivation.
 *
 * `npm run admit:wave-a-candidates` established that fifty-one Wave A body
 * crops exist and that twelve of them are measurable, front-facing, propless
 * bodies. It stopped there, and the review surface it produced says of every
 * garment "no top declares body family 'wave-a-average-man' as compatible: the
 * art has never been drawn for this morphology."
 *
 * That sentence was wrong in the way that matters. Nothing had been MEASURED
 * against those bodies. "No family label" is the absence of a declaration, not
 * the absence of art, and the correct reading was UNMEASURED COMPATIBILITY.
 * This module measures it, and where the measurement supports it, derives the
 * wardrobe from art the project already owns.
 *
 * Two facts about the admitted crops make that possible and were not used:
 *
 * 1. **They are not on the modular runtime canvas.** A Wave A crop is ~1740 px
 *    tall; every banked garment was normalized against a 960 px body. The
 *    compositor sizes a component as `component.canvas / body.canvas`, so a
 *    banked garment lands on a Wave A crop at ~55% of the size it should be —
 *    a units mismatch, not a morphology one, and far outside any fit bound.
 *    Each admitted crop is therefore resampled DOWN to the same runtime canvas
 *    the pg intake uses. Nothing is enlarged; the source crop is not written.
 *
 * 2. **The garment masters are body-independent flat lays.** The pg intake
 *    already derives one garment per body family from a single master. Pointing
 *    that same accepted derivation at the Wave A rigs costs no new pixels: it
 *    is the operation the pipeline performs for every garment it has.
 *
 * What is NOT claimed here. A derivative is a candidate. Nothing is promoted,
 * no production manifest, catalog entry or generation signature is touched, the
 * admitted registry written at `06a5e200` is read and never rewritten, and the
 * measured residual of every derivative is reported beside it — including the
 * ones that miss, and by how many pixels.
 */

/** Check mode verifies deterministic encoded bytes without repairing its own input. */
export async function writeOrCheckWardrobePng(
  file: string,
  bitmap: PImage.Bitmap,
  check: boolean,
): Promise<void> {
  if (!check) return writePng(file, bitmap);
  const chunks: Buffer[] = [];
  const stream = new Writable({
    write(chunk, _encoding, done) {
      chunks.push(Buffer.from(chunk));
      done();
    },
  });
  await PImage.encodePNGToStream(bitmap, stream);
  const expected = Buffer.concat(chunks);
  if (!fs.existsSync(file) || !fs.readFileSync(file).equals(expected)) {
    throw new Error(`Wardrobe raster is out of date: ${file}`);
  }
}

export const WAVE_A_WARDROBE_VERSION = "wave-a-wardrobe-v1";

export const WAVE_A_ADMITTED_REGISTRY_PATH =
  "art/manifest/character_candidate_registry.json";

export const WAVE_A_RUNTIME_BODY_DIRECTORY =
  "art/generated/candidates/wave-a-runtime";

export const WAVE_A_WARDROBE_DIRECTORY =
  "art/generated/candidates/wave-a-wardrobe";

export const WAVE_A_WARDROBE_REGISTRY_PATH =
  "art/manifest/character_candidate_wardrobe_registry.json";

export const WAVE_A_WARDROBE_REPORT_PATH =
  "art/qa/p95-wave-a-morphology/wave-a-wardrobe-report.json";

export const WAVE_A_WARDROBE_REGISTRY_SCHEMA =
  "character-candidate-wardrobe-registry-v1";

export const WAVE_A_WARDROBE_REPORT_SCHEMA = "wave-a-wardrobe-report-v1";

/**
 * The body whose garments supply the authored proportion.
 *
 * Every pg garment derivative is the same master fitted to one body, so any of
 * them carries the same answer to "how much of the shoulder-to-hip span does
 * this shirt cover". `pg-female-lean` is named here rather than chosen, and the
 * report records the value the other pg body gives so the two can be compared
 * rather than assumed equal.
 */
export const WARDROBE_PROPORTION_REFERENCE_BODY = "pg_body_fl_standing_v1";
export const WARDROBE_PROPORTION_CHECK_BODY = "pg_body_ml_standing_v1";

/* -------------------------------------------------------------------------- */
/* Landmarks                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The rows this module reads a body at, and where each one comes from.
 *
 * Every entry is measured from the raster. `chest` and `knee` are deliberately
 * ABSENT: neither is a feature of a front-on silhouette — a chest row is a
 * width the ribcage shares with the arms beside it, and a knee is not a local
 * extremum on a leg that narrows monotonically to the ankle. The fit
 * derivations drop anchors they were not given, so omitting them costs a row
 * rather than inventing one.
 */
export interface CandidateBodyLandmarks {
  /** Narrowest row under the head: the neck. */
  readonly neck: number;
  /** First row below the neck reaching the shoulder plateau. */
  readonly shoulder: number;
  /** Narrowest central run in the trunk: the natural waist. */
  readonly waist: number;
  /** Widest central run between the waist and the crotch: the hip line. */
  readonly hip: number;
  /** First row where the central run vanishes and the legs separate. */
  readonly crotch: number;
  /** Narrowest total leg width in the lowest quarter of the leg. */
  readonly ankle: number;
  /** Lowest painted row. */
  readonly sole: number;
  /** Topmost painted row. */
  readonly crown: number;
}

/**
 * Fraction of the shoulder plateau a row must reach to be the shoulder line.
 *
 * `measureBodyRig` uses 0.92, which lands on the row where the deltoid is
 * already at full width — below the trapezius, and therefore below where a
 * garment's shoulder seam sits. It is left alone because the banked pg
 * derivatives were built against it and moving it would move them. This module
 * reports both readings so the difference is a number rather than a claim.
 */
export const SHOULDER_PLATEAU_FRACTION = 0.92;

type Bitmap = PImage.Bitmap;

function rowRuns(
  bitmap: Bitmap,
  y: number,
  threshold = 127,
): [number, number][] {
  const runs: [number, number][] = [];
  let start = -1;
  for (let x = 0; x <= bitmap.width; x += 1) {
    const opaque =
      x < bitmap.width &&
      (bitmap.data[(y * bitmap.width + x) * 4 + 3] ?? 0) > threshold;
    if (opaque && start < 0) start = x;
    if (!opaque && start >= 0) {
      runs.push([start, x - 1]);
      start = -1;
    }
  }
  return runs;
}

function rowWidths(bitmap: Bitmap): number[] {
  return Array.from({ length: bitmap.height }, (_, y) =>
    rowRuns(bitmap, y).reduce((sum, [a, b]) => sum + (b - a + 1), 0),
  );
}

function centralWidth(bitmap: Bitmap, y: number, centerX: number): number {
  const run = rowRuns(bitmap, y).find(([a, b]) => a <= centerX && centerX <= b);
  return run ? run[1] - run[0] + 1 : 0;
}

/**
 * Reads the landmark rows of one body from its own silhouette.
 *
 * Fractions of the body canvas, so the result is comparable between bodies of
 * different canvases without either one being read at the other's framing.
 */
export function measureCandidateBodyLandmarks(
  bitmap: Bitmap,
  rig: BodyRigMeasurement,
): CandidateBodyLandmarks {
  const H = bitmap.height;
  const widths = rowWidths(bitmap);

  let hipRow = rig.waistRow;
  for (let y = rig.waistRow; y < rig.crotchRow; y += 1) {
    if (
      centralWidth(bitmap, y, rig.centerX) >
      centralWidth(bitmap, hipRow, rig.centerX)
    ) {
      hipRow = y;
    }
  }

  const legFrom = Math.round(
    rig.crotchRow + 0.7 * (rig.soleRow - rig.crotchRow),
  );
  const legTo = Math.max(legFrom, rig.soleRow - Math.round(H * 0.01));
  let ankleRow = legFrom;
  for (let y = legFrom; y <= legTo; y += 1) {
    if (widths[y]! > 0 && widths[y]! < widths[ankleRow]!) ankleRow = y;
  }

  return {
    crown: rig.headTop / H,
    neck: rig.neckRow / H,
    shoulder: rig.shoulderRow / H,
    waist: rig.waistRow / H,
    hip: hipRow / H,
    crotch: rig.crotchRow / H,
    ankle: ankleRow / H,
    sole: rig.soleRow / H,
  };
}

/**
 * The landmarks as the fit harness wants them, keyed by its anchor names.
 *
 * `torso` is the accessory window's anchor and is read a third of the way down
 * the trunk, which is where a badge sits; it is derived from two measured rows
 * rather than measured itself, and is the only interpolated entry.
 */
export function fitReferenceRows(
  landmarks: CandidateBodyLandmarks,
): Record<string, number> {
  return {
    shoulder: landmarks.shoulder,
    waist: landmarks.waist,
    hip: landmarks.hip,
    crotch: landmarks.crotch,
    ankle: landmarks.ankle,
    sole: landmarks.sole,
    torso:
      landmarks.shoulder + (landmarks.waist - landmarks.shoulder) * (1 / 3),
  };
}

/** Whether a head is painted into this body raster above its neck row. */
export function headIsBakedIn(
  bitmap: Bitmap,
  landmarks: CandidateBodyLandmarks,
): boolean {
  const widths = rowWidths(bitmap);
  const neckRow = Math.round(landmarks.neck * bitmap.height);
  const crownRow = Math.round(landmarks.crown * bitmap.height);
  if (neckRow - crownRow < 4) return false;
  let painted = 0;
  for (let y = crownRow; y < neckRow; y += 1) painted += widths[y]!;
  return painted > 0;
}

/* -------------------------------------------------------------------------- */
/* Runtime bodies                                                              */
/* -------------------------------------------------------------------------- */

export interface RuntimeBody {
  readonly admittedAssetId: string;
  readonly assetId: string;
  /**
   * The runtime rig's own family, distinct from the source crop's.
   *
   * A body family in this contract is a morphology AS AUTHORED ON A CANVAS —
   * the pg intake gives each normalized body its own family for exactly that
   * reason — and the 1740px crop and the 960px runtime body are the same
   * morphology on two canvases. Sharing one id would let a garment derived
   * against the runtime rig be selected for the raw crop, where the compositor
   * would draw it at 60% of its size. The crop keeps its family and keeps
   * refusing, which is the correct answer for a body no garment was measured
   * against.
   */
  readonly family: string;
  /** The admitted crop's family, carried so the lineage stays readable. */
  readonly sourceFamily: string;
  readonly poseFamily: string;
  readonly bitmap: Bitmap;
  readonly rig: BodyRigMeasurement;
  readonly landmarks: CandidateBodyLandmarks;
  readonly repositoryPath: string;
  readonly sourceCrop: {
    readonly repositoryPath: string;
    readonly hash: string;
    readonly width: number;
    readonly height: number;
  };
  readonly scale: number;
  readonly headBaked: boolean;
}

function anchorsFor(
  body: Bitmap,
  rig: BodyRigMeasurement,
  landmarks: CandidateBodyLandmarks,
): readonly CharacterAttachmentAnchor[] {
  const x = rig.centerX / body.width;
  return [
    { id: "crown", x, y: round6(landmarks.crown) },
    { id: "head", x, y: round6(landmarks.neck) },
    { id: "torso", x, y: round6(landmarks.shoulder) },
    // `hips` is a GARMENT ATTACHMENT — the line a waistband sits on — and the
    // admitted registry put it on the measured WAIST, roughly 0.18 of body
    // height above the hip. Every bottom in the bank hangs from this anchor, so
    // that placed trousers from the ribcage. The hip line is measurable: it is
    // the widest central run between the waist and the crotch.
    { id: "hips", x, y: round6(landmarks.hip) },
    { id: "feet", x, y: round6(landmarks.sole) },
  ];
}

function contactsFor(
  body: Bitmap,
  rig: BodyRigMeasurement,
  landmarks: CandidateBodyLandmarks,
  seated: boolean,
): CharacterBodyContacts | undefined {
  const soleBandTop = Math.max(0, rig.soleRow - Math.round(body.height * 0.02));
  const runs: [number, number][] = [];
  for (let y = soleBandTop; y <= rig.soleRow; y += 1) {
    for (const run of rowRuns(body, y)) runs.push(run);
  }
  const merged: [number, number][] = [];
  for (const [a, b] of runs.slice().sort((p, q) => p[0] - q[0])) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  if (merged.length !== 2) return undefined;
  const soles = {
    leftFoot: {
      x: round6((merged[0]![0] + merged[0]![1]) / 2 / body.width),
      y: round6(landmarks.sole),
    },
    rightFoot: {
      x: round6((merged[1]![0] + merged[1]![1]) / 2 / body.width),
      y: round6(landmarks.sole),
    },
  };
  if (!seated) return soles;
  return {
    ...soles,
    seatedPelvis: {
      x: round6(rig.centerX / body.width),
      y: round6(landmarks.crotch),
    },
  };
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/**
 * Resamples one admitted crop onto the modular runtime canvas.
 *
 * Height is the invariant because both sets depict a whole standing or seated
 * person: normalizing by height is the one normalization that makes "the same
 * garment on two bodies" mean the same thing. The scale is asserted to be a
 * REDUCTION — the pipeline never enlarges a raster, and every admitted crop is
 * taller than the runtime canvas, so an enlargement here would mean the input
 * changed and the assertion should stop the run rather than quietly upscale.
 */
export async function deriveRuntimeBody(
  repositoryRoot: string,
  record: CharacterComponentManifestRecord,
  outputDirectory = WAVE_A_RUNTIME_BODY_DIRECTORY,
  check = false,
): Promise<RuntimeBody> {
  const definition = record.candidate_component!;
  const sourcePath = record.final_path!;
  const source = await readPng(path.join(repositoryRoot, sourcePath));
  const cropped = cropBitmap(source, opaqueBounds(source));
  const scale = PG_BODY_RUNTIME_HEIGHT / cropped.height;
  if (scale > 1) {
    throw new Error(
      `'${record.asset_id}' is ${cropped.height}px of painted height, shorter than the ${PG_BODY_RUNTIME_HEIGHT}px runtime canvas. Reaching it would enlarge the raster, which this pipeline does not do.`,
    );
  }
  const bitmap = resampleLanczos(
    cropped,
    Math.max(1, Math.round(cropped.width * scale)),
    PG_BODY_RUNTIME_HEIGHT,
    PG_LANCZOS_LOBES,
  );
  const rig = measureBodyRig(bitmap);
  const landmarks = measureCandidateBodyLandmarks(bitmap, rig);
  const assetId = `${record.asset_id}_rt${PG_BODY_RUNTIME_HEIGHT}`;
  const runtimeFamily = `${definition.family}-rt${PG_BODY_RUNTIME_HEIGHT}`;
  const repositoryPath = `${outputDirectory}/${assetId}.png`;
  await writeOrCheckWardrobePng(
    path.join(repositoryRoot, repositoryPath),
    bitmap,
    check,
  );
  return {
    admittedAssetId: record.asset_id,
    assetId,
    family: runtimeFamily,
    sourceFamily: definition.family,
    poseFamily: definition.pose_family!,
    bitmap,
    rig,
    landmarks,
    repositoryPath,
    sourceCrop: {
      repositoryPath: sourcePath,
      hash: hashArtFile(path.join(repositoryRoot, sourcePath)),
      width: source.width,
      height: source.height,
    },
    scale: round6(scale),
    headBaked: headIsBakedIn(bitmap, landmarks),
  };
}

export function runtimeBodyRecord(
  body: RuntimeBody,
  hash: string,
): CharacterComponentManifestRecord {
  const contacts = contactsFor(
    body.bitmap,
    body.rig,
    body.landmarks,
    body.poseFamily.startsWith("seated"),
  );
  const candidate: CharacterComponentCandidateDefinition = {
    kind: "body",
    family: body.family,
    layer: 20,
    canvas: { width: body.bitmap.width, height: body.bitmap.height },
    pose_family: body.poseFamily,
    head_orientation: "front",
    root: {
      convention: "pelvis-hip-center",
      x: round6(body.rig.centerX / body.bitmap.width),
      y: round6(body.landmarks.hip),
    },
    attachment_anchors: anchorsFor(body.bitmap, body.rig, body.landmarks),
    ...(contacts ? { contacts } : {}),
    ...(body.headBaked ? { baked_slots: ["head"] as const } : {}),
  };
  return {
    asset_id: body.assetId,
    asset_type: "character-component-candidate",
    fixed_or_modular: "modular",
    availability: "production-candidate",
    generation_status: "approved",
    qa_status: "pending",
    runtime_release_status: "unreleased",
    final_path: body.repositoryPath,
    hash,
    candidate_component: candidate,
  };
}

/* -------------------------------------------------------------------------- */
/* Garment derivation                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The vertical span each garment kind is authored across.
 *
 * A shirt covers shoulder to hip and a pair of trousers hip to ankle, on any
 * body. Deriving the vertical scale from that span rather than from a width
 * ratio is what puts a hem at a hem: the pg intake sizes a garment by ONE
 * width and lets the aspect ratio decide its length, which is why a banked
 * knee skirt reaches mid-thigh on the body it was banked for.
 */
export const GARMENT_VERTICAL_SPAN: Readonly<
  Record<
    string,
    readonly [keyof CandidateBodyLandmarks, keyof CandidateBodyLandmarks]
  >
> = {
  top: ["shoulder", "hip"],
  bottom: ["hip", "ankle"],
};

export const WARDROBE_DERIVED_KINDS = ["top", "bottom", "footwear"] as const;

function referenceWidth(
  rig: BodyRigMeasurement,
  reference: PgComponentSpec["fit"]["reference"],
): number {
  switch (reference) {
    case "headHeight":
      return rig.headHeight;
    case "headWidth":
      return rig.headWidth;
    case "shoulderWidth":
      return rig.shoulderWidth;
    case "waistWidth":
      return rig.waistWidth;
    case "feetSpan":
      return rig.feetSpan;
  }
}

export interface DerivedGarment {
  readonly assetId: string;
  readonly family: string;
  readonly kind: string;
  readonly bodyFamily: string;
  readonly poseFamily: string;
  readonly repositoryPath: string;
  readonly canvas: { readonly width: number; readonly height: number };
  readonly scaleX: number;
  readonly scaleY: number;
  readonly master: {
    readonly repositoryPath: string;
    readonly hash: string;
    readonly set: string;
    readonly width: number;
    readonly height: number;
  };
  readonly definition: CharacterComponentCandidateDefinition;
}

/**
 * Derives one garment for one body from the garment's own master.
 *
 * Vertical scale comes from the anchor span the garment is authored across;
 * horizontal scale from the spec's own measured width reference on this body.
 * Both are measurements of this body. Nothing is warped: the raster is
 * resampled once, from the master, at the two scales, and the result is an
 * ordinary axis-aligned component with an origin and an anchor.
 */
export async function deriveGarment(
  repositoryRoot: string,
  spec: PgComponentSpec,
  body: RuntimeBody,
  proportion: number,
  outputDirectory = WAVE_A_WARDROBE_DIRECTORY,
  check = false,
): Promise<DerivedGarment> {
  const masterRepositoryPath = `${PG_MASTER_SOURCE_DIRECTORY}/${spec.masterFile}`;
  const masterPath = path.join(repositoryRoot, masterRepositoryPath);
  const master = await readPng(masterPath);
  const keyed = keyNeutralBackground(master, spec.keying);
  const crop = opaqueBounds(keyed);
  const cropped = cropBitmap(keyed, crop);

  const scaleX =
    (referenceWidth(body.rig, spec.fit.reference) * spec.fit.ratio) /
    cropped.width;

  let scaleY: number;
  const span = GARMENT_VERTICAL_SPAN[spec.kind];
  if (span) {
    const [from, to] = span;
    const bodySpan =
      (body.landmarks[to] - body.landmarks[from]) * body.bitmap.height;
    scaleY = (bodySpan * proportion) / cropped.height;
  } else {
    // Footwear is sized by the foot it holds, in both axes. A shoe is not
    // lengthened because a shin is long.
    scaleY = scaleX;
  }

  const width = Math.max(1, Math.round(cropped.width * scaleX));
  const height = Math.max(1, Math.round(cropped.height * scaleY));
  if (
    !Number.isFinite(scaleX) ||
    !Number.isFinite(scaleY) ||
    scaleX <= 0 ||
    scaleY <= 0
  ) {
    throw new Error(`Garment '${spec.idStem}' has invalid dimensions.`);
  }
  const enlarges = width > cropped.width || height > cropped.height;
  if (enlarges && !check) {
    throw new Error(
      `Garment '${spec.idStem}' requires enlargement; recover a sufficient native source before deriving new pixels.`,
    );
  }

  // The pose is part of the id because a morphology can be admitted in more
  // than one pose and a garment is derived per pose: `skinny-woman` has both a
  // standing and a seated body, and one id for both would be two files racing
  // for one name.
  const assetId = `${spec.idStem}_${body.family.replace(/-/g, "_")}_${body.poseFamily.replace(/-/g, "_")}_v1`;
  const repositoryPath = `${outputDirectory}/${assetId}.png`;
  if (enlarges) {
    // Historical R1 outputs remain evidence, not reproducible admissible tiers.
    // Verify their banked hash without generating another enlarged raster.
    const bank = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, WAVE_A_WARDROBE_REGISTRY_PATH),
        "utf8",
      ),
    ) as { assets: CharacterComponentManifestRecord[] };
    const retained = bank.assets.find((record) => record.asset_id === assetId);
    if (
      !retained ||
      retained.final_path !== repositoryPath ||
      hashArtFile(path.join(repositoryRoot, repositoryPath)) !== retained.hash
    ) {
      throw new Error(
        `Retained enlarged candidate is missing or changed: ${assetId}`,
      );
    }
  } else {
    const runtime = resampleLanczos(cropped, width, height, PG_LANCZOS_LOBES);
    await writeOrCheckWardrobePng(
      path.join(repositoryRoot, repositoryPath),
      runtime,
      check,
    );
  }

  const definition: CharacterComponentCandidateDefinition = {
    kind: spec.kind,
    family: spec.family,
    layer: spec.layer,
    canvas: { width, height },
    attaches_to: spec.attachesTo,
    origin: spec.origin === "top-center" ? { x: 0.5, y: 0 } : { x: 0.5, y: 1 },
    compatible_body_families: [body.family],
    compatible_pose_families: [body.poseFamily],
  };

  return {
    assetId,
    family: spec.family,
    kind: spec.kind,
    bodyFamily: body.family,
    poseFamily: body.poseFamily,
    repositoryPath,
    canvas: { width, height },
    scaleX: round6(scaleX),
    scaleY: round6(scaleY),
    master: {
      repositoryPath: masterRepositoryPath,
      hash: hashArtFile(masterPath),
      set: spec.masterSet,
      width: master.width,
      height: master.height,
    },
    definition,
  };
}

export function garmentRecord(
  garment: DerivedGarment,
  hash: string,
): CharacterComponentManifestRecord {
  return {
    asset_id: garment.assetId,
    asset_type: "character-component-candidate",
    fixed_or_modular: "modular",
    availability: "production-candidate",
    generation_status: "approved",
    qa_status: "pending",
    runtime_release_status: "unreleased",
    final_path: garment.repositoryPath,
    hash,
    candidate_component: garment.definition,
  };
}

/* -------------------------------------------------------------------------- */
/* Measurement                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * How much of its anchor span the banked garment covers on the body it was
 * banked for.
 *
 * This is the one number carried across from the pg set, and it is a
 * measurement of the pg pairing rather than an opinion about the garment: a
 * shirt that reaches 1.02 of shoulder-to-hip there reaches 1.02 of it here.
 */
export function authoredProportion(
  garmentCanvasHeight: number,
  bodyCanvasHeight: number,
  landmarks: CandidateBodyLandmarks,
  kind: string,
): number | null {
  const span = GARMENT_VERTICAL_SPAN[kind];
  if (!span) return null;
  const [from, to] = span;
  const bodySpan = (landmarks[to] - landmarks[from]) * bodyCanvasHeight;
  if (!(bodySpan > 0)) return null;
  return round6(garmentCanvasHeight / bodySpan);
}

/**
 * A framing-independent coverage residual, read at the body's own landmark rows.
 *
 * The accepted `measureEdgeError` compares a garment against the EASE the same
 * garment carries on the body it was drawn for, keyed by normalized y. That is
 * exactly right between two bodies that share a canvas and a framing — the
 * generation-2 rigs it was calibrated on — and it is not right here: a Wave A
 * crop puts its shoulder at 0.225 of its canvas where the pg mannequin puts it
 * at 0.198, so reading both at y = 0.3 compares a chest to an upper chest and
 * charges the difference to the garment.
 *
 * This reads instead at the rows each body calls its own. At a landmark inside
 * the garment's extent it asks one question with one answer in pixels: how far
 * is the garment's painted edge from the body's, on the side it is worse on.
 * Positive is overhang, negative is the body sticking out uncovered. Nothing
 * about drape is inferred; a hem that hangs 4px wider than a hip is 4px.
 */
export interface LandmarkResidual {
  readonly anchor: string;
  readonly row: number;
  readonly bodyHalfWidthPx: number;
  readonly garmentHalfWidthPx: number;
  /** Garment edge minus body edge: positive overhangs, negative uncovers. */
  readonly edgeDeltaPx: number;
  readonly fractionOfBodySpan: number;
  /**
   * True when this landmark sits on the garment's own attachment row.
   *
   * A flat-lay garment's first painted row is its collar or its waistband, not
   * its widest point: a shirt is narrow where it buttons at the neck and a shoe
   * is narrow at the sole edge. Comparing that row to the body's full width at
   * the same row measures the shape of a flat lay, so it is measured, reported,
   * and kept out of the summary figure that asks whether the garment follows
   * the body.
   */
  readonly onAttachmentRow: boolean;
}

export function landmarkResiduals(
  garment: DerivedGarment,
  body: RuntimeBody,
  garmentSpans: ReturnType<typeof readRasterSpans>,
  bodySpans: ReturnType<typeof readRasterSpans>,
  anchorY: number,
  originY: number,
): readonly LandmarkResidual[] {
  const H = body.bitmap.height;
  const W = body.bitmap.width;
  const topY = anchorY - originY * (garment.canvas.height / H);
  const bottomY = topY + garment.canvas.height / H;
  const rows = fitReferenceRows(body.landmarks);
  const out: LandmarkResidual[] = [];
  for (const anchor of [
    "shoulder",
    "waist",
    "hip",
    "crotch",
    "ankle",
    "sole",
  ]) {
    const fraction = rows[anchor];
    if (fraction === undefined) continue;
    if (fraction < topY || fraction > bottomY) continue;
    const y = Math.min(H - 1, Math.max(0, Math.round(fraction * H)));
    const bodySpan = bodySpans.rows[y];
    if (!bodySpan) continue;
    const within = (fraction - topY) / (bottomY - topY);
    const sourceRow = Math.min(
      garmentSpans.height - 1,
      Math.max(0, Math.floor(within * garmentSpans.height)),
    );
    const gSpan = garmentSpans.rows[sourceRow];
    if (!gSpan) continue;
    const gScale = garment.canvas.width / garmentSpans.width;
    const gLeftPx =
      (0.5 - 0.5 * (garment.canvas.width / W)) * W + gSpan.lo * gScale;
    const gRightPx =
      (0.5 - 0.5 * (garment.canvas.width / W)) * W + (gSpan.hi + 1) * gScale;
    const bodyHalf = (bodySpan.hi - bodySpan.lo + 1) / 2;
    const garmentHalf = (gRightPx - gLeftPx) / 2;
    const deltaLeft = bodySpan.lo - gLeftPx;
    const deltaRight = gRightPx - (bodySpan.hi + 1);
    const worst =
      Math.abs(deltaLeft) >= Math.abs(deltaRight) ? deltaLeft : deltaRight;
    out.push({
      anchor,
      row: y,
      onAttachmentRow: Math.abs(fraction - anchorY) <= 0.02,
      bodyHalfWidthPx: round6(bodyHalf),
      garmentHalfWidthPx: round6(garmentHalf),
      edgeDeltaPx: round6(worst),
      fractionOfBodySpan: round6(
        Math.abs(worst) / Math.max(1, bodySpan.hi - bodySpan.lo + 1),
      ),
    });
  }
  return out;
}

export interface WardrobeFitMeasurement {
  readonly garmentAssetId: string;
  readonly bodyAssetId: string;
  readonly kind: string;
  readonly derived: EdgeError;
  readonly banked: EdgeError;
  readonly withinBound: boolean;
  readonly bankedWithinBound: boolean;
  readonly maxEdgeErrorFraction: number;
  readonly landmarks: readonly LandmarkResidual[];
  /** Worst landmark residual as a share of the body span at that row. */
  readonly worstLandmarkFraction: number | null;
  /** The same, over the landmarks that are not the garment's own attachment row. */
  readonly worstCoverageFraction: number | null;
  readonly note: string;
}

function subject(
  repositoryRoot: string,
  assetId: string,
  definition: CharacterComponentCandidateDefinition,
  repositoryPath: string,
): FitSubject {
  return {
    assetId,
    definition: { ...definition, catalog_generation: 1 },
    file: path.join(repositoryRoot, repositoryPath),
  };
}

/**
 * Measures one derived garment against the body it was derived for.
 *
 * The yardstick is the EASE the same master carries on the body it was banked
 * for: `measureSourceProportion` reads the banked pairing row by row, and
 * `measureEdgeError` then asks whether the derivative sits the same way on this
 * body. A garment that hangs where it hangs on the pg mannequin scores near
 * zero; one that has been dragged onto a shape it does not fit scores the
 * distance, in body-canvas pixels, and is reported with it.
 *
 * The banked derivative is measured on the same body as well, unfitted, so the
 * report carries a before and an after rather than only an after.
 */
export function measureDerivedGarment(
  repositoryRoot: string,
  garment: DerivedGarment,
  body: RuntimeBody,
  banked: {
    readonly subject: FitSubject;
    readonly body: FitSubject;
    readonly landmarks: CandidateBodyLandmarks;
  },
  maxEdgeErrorFraction = GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction,
): WardrobeFitMeasurement {
  const targetSubject = subject(
    repositoryRoot,
    garment.assetId,
    garment.definition,
    garment.repositoryPath,
  );
  const bodySubject = subject(
    repositoryRoot,
    body.assetId,
    runtimeBodyRecord(body, "").candidate_component!,
    body.repositoryPath,
  );

  const bodySpans = readRasterSpans(bodySubject.file);
  const bankedBodySpans = readRasterSpans(banked.body.file);
  const bankedGarmentSpans = readRasterSpans(banked.subject.file);
  const derivedGarmentSpans = readRasterSpans(targetSubject.file);

  const targetReference: BodyFitReference = {
    bodyFamily: body.family,
    poseFamily: body.poseFamily,
    spans: {},
    rows: fitReferenceRows(body.landmarks),
  };
  const extentTop =
    (bodySubject.definition.attachment_anchors ?? []).find(
      (anchor) => anchor.id === garment.definition.attaches_to,
    )!.y -
    (garment.definition.origin?.y ?? 0) *
      (garment.canvas.height / body.bitmap.height);
  const extent = {
    topY: extentTop,
    bottomY: extentTop + garment.canvas.height / body.bitmap.height,
  };
  const metric = metricFor(
    garment.kind,
    targetReference,
    extent,
    body.bitmap.height,
  );

  const ease = measureSourceProportion(
    projectForMeasurement(
      banked.body,
      banked.subject,
      garment.poseFamily,
      null,
    ),
    bankedGarmentSpans,
    bankedBodySpans,
    banked.body.definition.canvas,
  );

  const derived = measureEdgeError(
    projectForMeasurement(bodySubject, targetSubject, garment.poseFamily, null),
    derivedGarmentSpans,
    bodySpans,
    bodySubject.definition.canvas,
    metric,
    ease,
  );

  const bankedOnTarget = measureEdgeError(
    projectForMeasurement(
      bodySubject,
      banked.subject,
      garment.poseFamily,
      null,
    ),
    bankedGarmentSpans,
    bodySpans,
    bodySubject.definition.canvas,
    metric,
    ease,
  );

  const residuals = landmarkResiduals(
    garment,
    body,
    derivedGarmentSpans,
    bodySpans,
    (bodySubject.definition.attachment_anchors ?? []).find(
      (anchor) => anchor.id === garment.definition.attaches_to,
    )!.y,
    garment.definition.origin?.y ?? 0,
  );
  const worstLandmarkFraction =
    residuals.length === 0
      ? null
      : round6(Math.max(...residuals.map((r) => r.fractionOfBodySpan)));
  const covering = residuals.filter((r) => !r.onAttachmentRow);
  const worstCoverageFraction =
    covering.length === 0
      ? null
      : round6(Math.max(...covering.map((r) => r.fractionOfBodySpan)));

  const withinBound =
    worstCoverageFraction !== null &&
    worstCoverageFraction <= maxEdgeErrorFraction;
  const bankedWithinBound =
    bankedOnTarget.status === "measured" &&
    bankedOnTarget.worstFractionOfBodySpan <= maxEdgeErrorFraction;

  const worstResidual = covering.reduce<LandmarkResidual | null>(
    (worst, entry) =>
      worst === null || entry.fractionOfBodySpan > worst.fractionOfBodySpan
        ? entry
        : worst,
    null,
  );
  const note =
    worstResidual === null
      ? `No landmark row of '${body.assetId}' falls inside this ${garment.kind}'s extent, so its coverage was not measured and nothing is concluded about it.`
      : withinBound
        ? `The derived ${garment.kind} follows '${body.family}' to within ${(worstResidual.fractionOfBodySpan * 100).toFixed(2)}% of the body's span at every landmark it covers; worst is ${worstResidual.edgeDeltaPx.toFixed(1)}px at the ${worstResidual.anchor}.`
        : `The derived ${garment.kind} is ${worstResidual.edgeDeltaPx.toFixed(1)}px from the body edge at the ${worstResidual.anchor} (${(worstResidual.fractionOfBodySpan * 100).toFixed(2)}% of the body span there), outside the ${(maxEdgeErrorFraction * 100).toFixed(1)}% bound. ${worstResidual.edgeDeltaPx < 0 ? "The body is uncovered there." : "The garment hangs past the body there."} It is a candidate for review, not an accepted fit.`;

  return {
    garmentAssetId: garment.assetId,
    bodyAssetId: body.assetId,
    kind: garment.kind,
    derived,
    banked: bankedOnTarget,
    withinBound,
    bankedWithinBound,
    maxEdgeErrorFraction,
    landmarks: residuals,
    worstLandmarkFraction,
    worstCoverageFraction,
    note,
  };
}

/* -------------------------------------------------------------------------- */
/* The run                                                                     */
/* -------------------------------------------------------------------------- */

export interface WaveAWardrobeResult {
  readonly bodies: readonly RuntimeBody[];
  readonly bodyRecords: readonly CharacterComponentManifestRecord[];
  readonly garments: readonly DerivedGarment[];
  readonly garmentRecords: readonly CharacterComponentManifestRecord[];
  readonly measurements: readonly WardrobeFitMeasurement[];
  readonly proportions: Readonly<
    Record<
      string,
      { readonly reference: number; readonly check: number | null }
    >
  >;
  readonly skipped: readonly {
    readonly bodyAssetId: string;
    readonly kind: string;
    readonly reason: string;
  }[];
}

/**
 * Which kinds a pose can carry, and why the rest are refused.
 *
 * A seated body keeps its torso upright, so a top derived across its own
 * measured shoulder-to-hip span is that body's own garment and not a standing
 * garment reused. Its legs are not: a flat-lay trouser drawn straight cannot
 * be placed on a bent thigh, and the accepted fit contract refuses
 * cross-viewpoint fitting outright rather than inventing the geometry. Nothing
 * here flattens a seated person into a standing one to raise a count.
 */
export function kindsForPose(poseFamily: string): {
  readonly allowed: readonly string[];
  readonly refused: readonly {
    readonly kind: string;
    readonly reason: string;
  }[];
} {
  if (!poseFamily.startsWith("seated")) {
    return { allowed: [...WARDROBE_DERIVED_KINDS], refused: [] };
  }
  return {
    allowed: ["top"],
    refused: [
      {
        kind: "bottom",
        reason:
          "The banked bottoms are straight flat lays drawn for standing legs. A seated body's thighs run forward and its shins drop from the knee; placing a straight trouser on them would be a cross-viewpoint fit, which the accepted contract refuses because the source does not contain the geometry.",
      },
      {
        kind: "footwear",
        reason:
          "The banked footwear is drawn from the front of a standing foot. A seated body presents the top of the shoe at a different angle, and no measurement recovers a viewpoint the raster does not carry.",
      },
    ],
  };
}

export async function runWaveAWardrobeDerivation(
  repositoryRoot: string,
  options: { readonly check?: boolean } = {},
): Promise<WaveAWardrobeResult> {
  const admitted = JSON.parse(
    fs.readFileSync(
      path.join(repositoryRoot, WAVE_A_ADMITTED_REGISTRY_PATH),
      "utf8",
    ),
  ) as { readonly assets: readonly CharacterComponentManifestRecord[] };

  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(repositoryRoot, "art/manifest/asset_manifest.json"),
      "utf8",
    ),
  ) as { readonly assets: readonly CharacterComponentManifestRecord[] };

  const manifestRecord = (
    assetId: string,
  ): CharacterComponentManifestRecord => {
    const record = manifest.assets.find((a) => a.asset_id === assetId);
    if (!record)
      throw new Error(`Manifest carries no record for '${assetId}'.`);
    return record;
  };

  const referenceBodyRecord = manifestRecord(
    WARDROBE_PROPORTION_REFERENCE_BODY,
  );
  const referenceBitmap = await readPng(
    path.join(repositoryRoot, referenceBodyRecord.final_path!),
  );
  const referenceRig = measureBodyRig(referenceBitmap);
  const referenceLandmarks = measureCandidateBodyLandmarks(
    referenceBitmap,
    referenceRig,
  );
  const checkBodyRecord = manifestRecord(WARDROBE_PROPORTION_CHECK_BODY);
  const checkBitmap = await readPng(
    path.join(repositoryRoot, checkBodyRecord.final_path!),
  );
  const checkLandmarks = measureCandidateBodyLandmarks(
    checkBitmap,
    measureBodyRig(checkBitmap),
  );

  const bankedSuffix = (assetId: string): string => assetId;
  void bankedSuffix;

  const specs = PG_COMPONENT_SPECS.filter((spec) =>
    (WARDROBE_DERIVED_KINDS as readonly string[]).includes(spec.kind),
  );

  const proportions: Record<
    string,
    { reference: number; check: number | null }
  > = {};
  for (const spec of specs) {
    const referenceDerivative = manifestRecord(`${spec.idStem}_fl_v1`);
    const checkDerivative = manifest.assets.find(
      (a) => a.asset_id === `${spec.idStem}_ml_v1`,
    );
    const reference = authoredProportion(
      referenceDerivative.candidate_component!.canvas.height,
      referenceBitmap.height,
      referenceLandmarks,
      spec.kind,
    );
    const check = checkDerivative
      ? authoredProportion(
          checkDerivative.candidate_component!.canvas.height,
          checkBitmap.height,
          checkLandmarks,
          spec.kind,
        )
      : null;
    if (reference !== null) proportions[spec.idStem] = { reference, check };
  }

  const bodies: RuntimeBody[] = [];
  for (const record of [...admitted.assets].sort((a, b) =>
    a.asset_id < b.asset_id ? -1 : 1,
  )) {
    bodies.push(
      await deriveRuntimeBody(
        repositoryRoot,
        record,
        WAVE_A_RUNTIME_BODY_DIRECTORY,
        options.check ?? false,
      ),
    );
  }

  const bodyRecords = bodies.map((body) =>
    runtimeBodyRecord(
      body,
      hashArtFile(path.join(repositoryRoot, body.repositoryPath)),
    ),
  );

  // One derivative per (garment, body FAMILY + POSE): a family is a morphology,
  // and two crops of the same morphology in the same pose wear the same clothes.
  const representative = new Map<string, RuntimeBody>();
  for (const body of bodies) {
    const key = `${body.family} ${body.poseFamily}`;
    if (!representative.has(key)) representative.set(key, body);
  }

  const garments: DerivedGarment[] = [];
  const measurements: WardrobeFitMeasurement[] = [];
  const skipped: { bodyAssetId: string; kind: string; reason: string }[] = [];

  for (const [, body] of [...representative].sort(([a], [b]) =>
    a < b ? -1 : 1,
  )) {
    const { allowed, refused } = kindsForPose(body.poseFamily);
    for (const entry of refused) {
      skipped.push({
        bodyAssetId: body.assetId,
        kind: entry.kind,
        reason: entry.reason,
      });
    }
    for (const spec of specs) {
      if (!allowed.includes(spec.kind)) continue;
      const proportion = proportions[spec.idStem]?.reference ?? 1;
      const garment = await deriveGarment(
        repositoryRoot,
        spec,
        body,
        proportion,
        WAVE_A_WARDROBE_DIRECTORY,
        options.check ?? false,
      );
      garments.push(garment);

      const bankedRecord = manifestRecord(`${spec.idStem}_fl_v1`);
      measurements.push(
        measureDerivedGarment(repositoryRoot, garment, body, {
          subject: subject(
            repositoryRoot,
            bankedRecord.asset_id,
            bankedRecord.candidate_component!,
            bankedRecord.final_path!,
          ),
          body: subject(
            repositoryRoot,
            referenceBodyRecord.asset_id,
            referenceBodyRecord.candidate_component!,
            referenceBodyRecord.final_path!,
          ),
          landmarks: referenceLandmarks,
        }),
      );
    }
  }

  const garmentRecords = garments.map((garment) =>
    garmentRecord(
      garment,
      hashArtFile(path.join(repositoryRoot, garment.repositoryPath)),
    ),
  );

  return {
    bodies,
    bodyRecords,
    garments,
    garmentRecords,
    measurements,
    proportions,
    skipped,
  };
}
