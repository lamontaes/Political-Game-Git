import bottomAuthoring from "../../art/manifest/people_visual4_bottom_attachments.json";
import { format } from "prettier";
import { writeOrCheckWardrobePng } from "./wave-a-wardrobe";
import fs from "node:fs";
import path from "node:path";
import * as PImage from "pureimage";
import bodyAuthoring from "../../art/manifest/people_visual4_body_authoring.json";
import topAuthoring from "../../art/manifest/people_visual4_top_attachments.json";
import { ARM_MASK_OUTPUT, ARM_MASK_SOURCE } from "./people-visual4-arm-mask";
import { hashArtFile } from "./content-hash";
import { readPng, cropBitmap, opaqueBounds } from "./pg-modular-intake";
import { resampleLanczos } from "./resample";
import {
  readRasterSpans,
  measureBodyFitReference,
  measureSourceProportion,
  measureEdgeError,
  metricFor,
  projectForMeasurement,
  type FitSubject,
  type FitRowCorrespondence,
} from "./garment-fit-measure";
import {
  deriveAffineFit,
  deriveBoundedWarpFit,
  GARMENT_FIT_DEFAULT_BOUNDS,
  type GarmentFitBankData,
  type GarmentFitTransform,
} from "../../src/presentation/garment-fit";
import type {
  CharacterComponentCandidateDefinition,
  CharacterComponentManifestRecord,
} from "../../src/presentation/character-components";

const root = process.cwd();
const check = process.argv.includes("--check");
const out = "art/generated/candidates/people-visual4";
const records: CharacterComponentManifestRecord[] = [];
const evidence: Record<string, unknown>[] = [];
const pairs: Record<string, unknown>[] = [];
const profiles: GarmentFitBankData["garments"][number][] = [];
const absolute = (p: string) => path.join(root, p);
const canvas = { width: 512, height: 960 };
function verify(p: string, sha: string) {
  if (hashArtFile(absolute(p)) !== sha)
    throw new Error(`Source bytes changed: ${p}`);
}
function clear(w: number, h: number) {
  const b = PImage.make(w, h);
  b.data.fill(0);
  return b;
}
function paste(to: PImage.Bitmap, from: PImage.Bitmap, x: number, y: number) {
  for (let sy = 0; sy < from.height; sy++)
    for (let sx = 0; sx < from.width; sx++) {
      const tx = sx + x,
        ty = sy + y;
      if (tx < 0 || ty < 0 || tx >= to.width || ty >= to.height) continue;
      const a = (sy * from.width + sx) * 4,
        b = (ty * to.width + tx) * 4;
      for (let c = 0; c < 4; c++) to.data[b + c] = from.data[a + c]!;
    }
}
async function emit(
  id: string,
  b: PImage.Bitmap,
  definition: CharacterComponentCandidateDefinition,
  source: Record<string, unknown>,
) {
  const file = `${out}/${id}.png`;
  await writeOrCheckWardrobePng(absolute(file), b, check);
  const record: CharacterComponentManifestRecord = {
    asset_id: id,
    asset_type: "character-component-candidate",
    fixed_or_modular: "modular",
    availability: "production-candidate",
    generation_status: "draft",
    qa_status: "pending",
    runtime_release_status: "unreleased",
    final_path: file,
    hash: hashArtFile(absolute(file)),
    candidate_component: definition,
  };
  records.push(record);
  evidence.push({
    asset_id: id,
    source,
    derivation:
      "Source crop, uniform reduction and explicit attachment authoring. No generated or enlarged pixels.",
    upscale_lineage:
      "Unknown unless declared in the original source evidence; existing pixel dimensions are not a native-resolution claim.",
    rights_status:
      "Unknown; source bank provenance retained, no reuse approval inferred.",
    acceptance: "Unapproved candidate; production membership absent.",
  });
  return {
    assetId: id,
    file: absolute(file),
    definition: { ...definition, catalog_generation: 1 },
  } satisfies FitSubject;
}
function emitShared(
  id: string,
  sourceId: string,
  definition: CharacterComponentCandidateDefinition,
  source: Record<string, unknown>,
) {
  const original = records.find((record) => record.asset_id === sourceId);
  if (!original?.final_path)
    throw new Error(`Missing shared source ${sourceId}`);
  records.push({
    ...original,
    asset_id: id,
    candidate_component: definition,
  });
  evidence.push({
    asset_id: id,
    source: {
      ...source,
      shared_final_path: original.final_path,
      hash: original.hash,
    },
    derivation:
      "Same game-space pixels as the named source component; new family for additive cross-body membership only.",
    upscale_lineage:
      "Unknown unless declared in the original source evidence; existing pixel dimensions are not a native-resolution claim.",
    rights_status:
      "Unknown; source bank provenance retained, no reuse approval inferred.",
    acceptance:
      "Unapproved candidate-only alias; production membership absent. Original affine component is unchanged.",
  });
}
async function outputJson(p: string, value: unknown) {
  const content = await format(JSON.stringify(value), { parser: "json" });
  if (check) {
    if (fs.readFileSync(absolute(p), "utf8") !== content)
      throw new Error(`Stale ${p}`);
  } else fs.writeFileSync(absolute(p), content);
}
async function reduce(p: string, height: number) {
  const original = await readPng(absolute(p)),
    bounds = opaqueBounds(original, 8);
  if (!bounds) throw new Error(`Empty source: ${p}`);
  const crop = cropBitmap(original, bounds),
    width = Math.round((crop.width * height) / crop.height);
  if (width > crop.width || height > crop.height)
    throw new Error(`Enlargement refused: ${p}`);
  return {
    bitmap: resampleLanczos(crop, width, height),
    bounds,
    scale: height / crop.height,
  };
}
const bodies: {
  subject: FitSubject;
  author: (typeof bodyAuthoring.bodies)[number];
  rows: Record<string, number>;
}[] = [];
for (const a of bodyAuthoring.bodies) {
  verify(a.source_path, a.source_sha256);
  if (!a.front_pairing) {
    pairs.push({
      body: a.source_asset_id,
      status: "view-incompatible",
      reason: a.view_note,
    });
    continue;
  }
  const source = await readPng(absolute(a.source_path)),
    b = clear(512, 960),
    padding = Math.floor((512 - source.width) / 2);
  paste(b, source, padding, 0);
  for (let y = 0; y < a.neck_cut_row; y++)
    for (let x = 0; x < 512; x++) b.data[(y * 512 + x) * 4 + 3] = 0;
  const id = a.source_asset_id.replace("_rt960", "_pv4"),
    family = id.replaceAll("_", "-");
  const rows: Record<string, number> = { ...a.game_authored_rows, sole: 0.96 }; // inspection region begins above the terminal floor row
  const anchors = [
    ["head", a.game_authored_rows.neck],
    ["torso", a.game_authored_rows.neck],
    ["hips", a.game_authored_rows.hip],
    ["feet", 0.998],
    ["crown", 0],
  ] as const;
  const contacts = a.feet
    ? Object.fromEntries(
        Object.entries(a.feet).map(([k, v]) => [
          k,
          {
            x: (v.x * source.width + padding) / 512,
            y: (() => {
              const start = k === "leftFoot" ? 0 : a.center_x,
                end = k === "leftFoot" ? a.center_x : 512;
              for (let y = 959; y >= 720; y--)
                for (let x = start; x < end; x++)
                  if (b.data[(y * 512 + x) * 4 + 3]! > 8) return y / 960;
              throw new Error("No visible foot contact");
            })(),
          },
        ]),
      )
    : undefined;
  rows.floor = contacts
    ? Math.max(...Object.values(contacts).map((c) => c.y))
    : 0.999;
  const subject = await emit(
    id,
    b,
    {
      kind: "body",
      family,
      layer: 20,
      canvas,
      pose_family: a.pose,
      head_orientation: "front",
      root: {
        convention: "pelvis-hip-center",
        x: a.center_x / 512,
        y: rows.hip,
      },
      attachment_anchors: anchors.map(([id, y]) => ({
        id,
        x: a.center_x / 512,
        y,
      })),
      ...(contacts ? { contacts } : {}),
    },
    {
      path: a.source_path,
      sha256: a.source_sha256,
      authoring: "art/manifest/people_visual4_body_authoring.json",
      alpha_cut_above_row: a.neck_cut_row,
      padding_left: padding,
      contact_revision: {
        source_contacts: a.feet,
        contacts,
        alpha_threshold: 8,
        basis:
          "Each foot floor row comes from visible source alpha at the same threshold as coverage. Prior threshold127 contacts can omit the final visible antialiased row.",
      },
    },
  );
  bodies.push({ subject, author: a, rows });
}
const control = bodies.find((b) =>
  b.author.source_asset_id.includes("average_man_standing_neutral_front_a"),
)!;
const femaleControl = bodies.find((b) =>
  b.author.source_asset_id.includes("average_woman_standing_neutral_front_a"),
)!;
const allFamilies = bodies.map((b) => b.subject.definition.family);
// Heads have actual facial pixels. Dark-complexion heads are preserved in the source bank;
// they cannot silently recolour these light/tan body sources.
const headFiles = fs
  .readdirSync(absolute("art/generated/candidates/ocd-p71/heads"))
  .filter((x) => x.endsWith(".png"))
  .sort();
for (const name of headFiles) {
  const source = `art/generated/candidates/ocd-p71/heads/${name}`;
  if (name.includes("deep_")) {
    pairs.push({
      source,
      status: "body-palette-unavailable",
      reason:
        "Existing head pixels present. This body revision has no corresponding deep complexion pixels; no runtime recolour.",
    });
    continue;
  }
  const { bitmap } = await reduce(source, 176);
  const neckJoin = Math.round(bitmap.height * 0.94);
  for (let y = neckJoin; y < bitmap.height; y++)
    for (let x = 0; x < bitmap.width; x++)
      bitmap.data[(y * bitmap.width + x) * 4 + 3] = 0;
  await emit(
    `pv4_${name.slice(0, -4)}`,
    bitmap,
    {
      kind: "head",
      family: `pv4-${name.slice(0, -4)}`,
      layer: 40,
      canvas: { width: bitmap.width, height: bitmap.height },
      attaches_to: "head",
      origin: { x: 0.5, y: 0.94 },
      compatible_body_families: allFamilies,
      compatible_head_orientations: ["front"],
    },
    {
      path: source,
      sha256: hashArtFile(absolute(source)),
      neck_join:
        "Game-authored neck join at94% of176px reduced source canvas. Alpha below join withheld; head40 over top35 resolves back-collar occlusion while front garment below join remains visible. Palette/style require human review.",
    },
  );
}
async function garment(
  source: string,
  kind: "top" | "bottom",
  reference: typeof control,
  height: number,
  origin: { x: number; y: number },
  exclusions: readonly string[],
  mapping: Record<string, unknown>,
  sourceHem?: number,
) {
  const { bitmap, bounds } = await reduce(source, height),
    id = `pv4_${path.basename(source, ".png")}`;
  const definition: CharacterComponentCandidateDefinition = {
    kind,
    family: id.replaceAll("_", "-"),
    layer: kind === "top" ? 35 : 30,
    canvas: { width: bitmap.width, height: bitmap.height },
    attaches_to: kind === "top" ? "torso" : "hips",
    origin,
    compatible_body_families: allFamilies,
    compatible_pose_families: ["standing-neutral"],
  };
  const subject = await emit(id, bitmap, definition, {
    path: source,
    sha256: hashArtFile(absolute(source)),
    ...mapping,
  });
  const raster = readRasterSpans(subject.file),
    refRaster = readRasterSpans(reference.subject.file);
  const layer = projectForMeasurement(
    reference.subject,
    subject,
    "standing-neutral",
    null,
  );
  const ease = measureSourceProportion(layer, raster, refRaster, canvas);
  const extent = { topY: layer.top, bottomY: layer.top + layer.height };
  const authoredHem =
    sourceHem === undefined
      ? extent.bottomY
      : layer.top + ((sourceHem - bounds.y) / bounds.height) * layer.height;
  const sourceRef = measureBodyFitReference(
    reference.subject.file,
    reference.subject.definition.family,
    "standing-neutral",
    reference.rows,
  );
  const accepted: string[] = [];
  const extraAccepted: string[] = [];
  const fits: {
    target_body_family: string;
    pose_family: string;
    transform: GarmentFitTransform;
  }[] = [];
  const extraFits: {
    target_body_family: string;
    pose_family: string;
    transform: GarmentFitTransform;
  }[] = [];
  for (const b of bodies) {
    if (b.author.pose !== "standing-neutral") {
      pairs.push({
        body: b.subject.assetId,
        garment: id,
        status: "pose-incompatible",
        reason:
          "Standing garment source is not silently relabeled or warped to a seated pose.",
      });
      continue;
    }
    const targetRef = measureBodyFitReference(
      b.subject.file,
      b.subject.definition.family,
      "standing-neutral",
      b.rows,
    );
    const rows = Object.keys(reference.rows)
      .filter((k) => k !== "sole")
      .sort((a, c) => reference.rows[a]! - reference.rows[c]!);
    const correspondence: FitRowCorrespondence = {
      sourcePoseFamily: "standing-neutral",
      targetPoseFamily: "standing-neutral",
      points: rows.map((anchor) => ({
        anchor,
        sourceY: reference.rows[anchor]!,
        targetY: b.rows[anchor]!,
      })),
    };
    let transform: GarmentFitTransform = { kind: "direct" };
    let refusal: string | null = null;
    const sourceFitRows: Record<string, number> = { ...sourceRef.rows };
    const targetFitRows: Record<string, number> = { ...targetRef.rows };
    try {
      const mapRow = (sourceY: number) => {
        for (let i = 1; i < correspondence.points.length; i++) {
          const a = correspondence.points[i - 1]!,
            z = correspondence.points[i]!;
          if (sourceY >= a.sourceY && sourceY <= z.sourceY)
            return (
              a.targetY +
              ((sourceY - a.sourceY) / (z.sourceY - a.sourceY)) *
                (z.targetY - a.targetY)
            );
        }
        return null;
      };
      const targetHem = mapRow(authoredHem);
      if (kind === "bottom") {
        delete sourceFitRows.shoulder;
        delete targetFitRows.shoulder;
      }
      if (targetHem !== null) {
        sourceFitRows.hem = authoredHem;
        targetFitRows.hem = targetHem;
      }
      const derived = deriveAffineFit(
        { ...sourceRef, rows: sourceFitRows },
        { ...targetRef, rows: targetFitRows },
        kind,
        extent,
      ).transform;
      const start = kind === "top" ? "shoulder" : "waist",
        attachment = kind === "top" ? "neck" : "hip";
      transform = {
        ...derived,
        translateY:
          targetRef.rows[start]! -
          b.rows[attachment]! -
          (sourceRef.rows[start]! - reference.rows[attachment]!) *
            derived.scaleY,
      };
    } catch (e) {
      refusal = String(e);
    }
    let measurement = null;
    try {
      const projected = projectForMeasurement(
        b.subject,
        subject,
        "standing-neutral",
        transform.kind === "direct" ? null : transform,
      );
      const metric = metricFor(
        kind,
        targetRef,
        { topY: projected.top, bottomY: projected.top + projected.height },
        960,
      );
      measurement = measureEdgeError(
        projected,
        raster,
        readRasterSpans(b.subject.file),
        canvas,
        metric,
        ease,
        correspondence,
      );
    } catch (e) {
      refusal = String(e);
    }
    const within =
      measurement?.status === "measured" &&
      measurement.worstFractionOfBodySpan <=
        GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction &&
      !refusal;
    // Known source-content constraints are independent of a silhouette metric.
    // The unmasked burgundy polo still paints baked forearms; the additive
    // arm-masked candidate is a different source and is measured normally.
    const blocked =
      source.includes("female_top_burgundy_short_sleeve_polo") &&
      !source.includes("armmasked");
    if (within && !blocked) {
      accepted.push(b.subject.definition.family);
      fits.push({
        target_body_family: b.subject.definition.family,
        pose_family: "standing-neutral",
        transform,
      });
    } else if (!within && !blocked && measurement?.status === "measured") {
      try {
        const derivedWarp = deriveBoundedWarpFit(
          { ...sourceRef, rows: sourceFitRows },
          { ...targetRef, rows: targetFitRows },
          kind,
          extent,
        ).transform;
        const projectedWarp = projectForMeasurement(
          b.subject,
          subject,
          "standing-neutral",
          derivedWarp,
        );
        const warpMeasurement = measureEdgeError(
          projectedWarp,
          raster,
          readRasterSpans(b.subject.file),
          canvas,
          metricFor(
            kind,
            targetRef,
            {
              topY: projectedWarp.top,
              bottomY: projectedWarp.top + projectedWarp.height,
            },
            960,
          ),
          ease,
          correspondence,
        );
        if (
          warpMeasurement.status === "measured" &&
          warpMeasurement.worstFractionOfBodySpan <=
            GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction
        ) {
          extraAccepted.push(b.subject.definition.family);
          extraFits.push({
            target_body_family: b.subject.definition.family,
            pose_family: "standing-neutral",
            transform: derivedWarp,
          });
          pairs.push({
            body: b.subject.assetId,
            garment: `${id}_crossbody`,
            source_reference: reference.subject.assetId,
            reference_control: b === reference,
            transform: derivedWarp,
            measurement: warpMeasurement,
            status: "measured-candidate",
            additive: true,
            refusal: null,
            source_constraints: exclusions,
            acceptance:
              "Candidate-only bounded-warp pairing; the original affine component is unchanged. Not human visual approval.",
          });
        }
      } catch {
        /* Warp derivation can refuse a pairing; the affine failure already stands. */
      }
    }
    pairs.push({
      body: b.subject.assetId,
      garment: id,
      source_reference: reference.subject.assetId,
      reference_control: b === reference,
      transform,
      measurement,
      status: blocked
        ? "source-layer-engineering-required"
        : within
          ? "measured-candidate"
          : measurement?.status === "measured"
            ? "failed-fit"
            : "measurement-limitation",
      refusal,
      source_constraints: exclusions,
      acceptance:
        "Not human visual approval; self-pair is a diagnostic control only.",
    });
  }
  // Per-asset declaration matches only the exact measured pairs. Failed pairs stay in report.
  const record = records.find((r) => r.asset_id === id)!;
  (
    record as { candidate_component: CharacterComponentCandidateDefinition }
  ).candidate_component = { ...definition, compatible_body_families: accepted };
  profiles.push({
    component_family: definition.family,
    kind,
    classification: "affine-reusable",
    authored_for_body_family: reference.subject.definition.family,
    basis:
      "New source-based game-space authoring; exact-pair accepted-bound pixel measurement. Human acceptance pending.",
    profiles: fits,
  });
  if (extraAccepted.length > 0) {
    const aliasId = `${id}_crossbody`;
    emitShared(
      aliasId,
      id,
      {
        ...definition,
        family: aliasId.replaceAll("_", "-"),
        compatible_body_families: extraAccepted,
      },
      {
        shared_pixels_of: id,
        role: "candidate-only-cross-body-warp",
        admission: "Not production; owner visual acceptance still required.",
      },
    );
    profiles.push({
      component_family: aliasId.replaceAll("_", "-"),
      kind,
      classification: "bounded-warp-reusable",
      authored_for_body_family: reference.subject.definition.family,
      basis:
        "Bounded warp recovered pairings the affine step refused at the same 3% bound; original component membership is unchanged.",
      profiles: extraFits,
    });
  }
}
for (const a of topAuthoring.assets) {
  const source = a.source.repository_path;
  verify(source, a.source.sha256);
  const image = await readPng(absolute(source)),
    bounds = opaqueBounds(image, 8)!;
  const isFemale = source.includes("/female-tops/"),
    height = a.asset_id.includes("parka") ? 450 : isFemale ? 365 : 385;
  const origin = {
    x: (a.collar_attachment.x_px - bounds.x) / bounds.width,
    y: (a.collar_attachment.y_px - bounds.y) / bounds.height,
  };
  await garment(
    source,
    "top",
    isFemale ? femaleControl : control,
    height,
    origin,
    a.visual_exclusions_or_uncertainty,
    {
      attachment_authoring: "art/manifest/people_visual4_top_attachments.json",
      uniform_source_height: height,
    },
    a.hem_reference.y_px,
  );
}
{
  const polo = topAuthoring.assets.find((asset) =>
    asset.asset_id.includes("burgundy_short_sleeve_polo"),
  )!;
  const masked = await readPng(absolute(ARM_MASK_OUTPUT));
  const bounds = opaqueBounds(masked, 8)!;
  const origin = {
    x: (polo.collar_attachment.x_px - bounds.x) / bounds.width,
    y: (polo.collar_attachment.y_px - bounds.y) / bounds.height,
  };
  await garment(
    ARM_MASK_OUTPUT,
    "top",
    femaleControl,
    365,
    origin,
    [
      ...polo.visual_exclusions_or_uncertainty,
      "Arm-masked additive candidate: baked forearms cleared. Candidate-only; not production admission.",
    ],
    {
      attachment_authoring: "art/manifest/people_visual4_top_attachments.json",
      uniform_source_height: 365,
      masked_from: ARM_MASK_SOURCE,
      role: "candidate-only-arm-masked-polo",
    },
    polo.hem_reference.y_px,
  );
}
for (const a of bottomAuthoring.assets) {
  const source = a.source.repository_path;
  verify(source, a.source.sha256);
  const bitmap = await readPng(absolute(source)),
    bounds = opaqueBounds(bitmap, 8);
  const height = Math.round(
    (bounds.height * 200) / a.waistband_reference.width_px,
  );
  const sourceScale = height / bounds.height;
  const waistbandOffset = (a.waistband_reference.y_px - bounds.y) * sourceScale;
  const top = 442 - waistbandOffset;
  await garment(
    source,
    "bottom",
    control,
    height,
    {
      x:
        ((a.waistband_reference.left_x_px + a.waistband_reference.right_x_px) /
          2 -
          bounds.x) /
        bounds.width,
      y: (control.rows.hip * 960 - top) / height,
    },
    a.visual_exclusions_or_uncertainty,
    {
      attachment_authoring:
        "art/manifest/people_visual4_bottom_attachments.json",
      basis:
        "One game-authored200px waistband width in the reference frame; preserve source aspect and authored style hem. Source waistband reference lands at442; hip origin remains inside garment rather than at its top or crotch.",
      source_waistband: a.waistband_reference,
      source_crotch: a.crotch_opening,
      sourceScale,
    },
    a.hem_reference.y_px,
  );
}
// Front pair halves share one source scale. Only independent contact translations
// vary by body; coverage is measured on EACH foot, not the outer pair span.
for (const name of fs
  .readdirSync(
    absolute(
      "art/generated/candidates/recent-drive-sweep/front-facing-footwear",
    ),
  )
  .filter((x) => x.endsWith(".png"))
  .sort()) {
  const source = `art/generated/candidates/recent-drive-sweep/front-facing-footwear/${name}`;
  const original = await readPng(absolute(source)),
    halves = [0, 1].map((i) => {
      const start = Math.floor((original.width * i) / 2),
        end = Math.floor((original.width * (i + 1)) / 2);
      const half = cropBitmap(original, {
        x: start,
        y: 0,
        width: end - start,
        height: original.height,
      });
      return cropBitmap(half, opaqueBounds(half, 8));
    });
  const scale = 86 / Math.max(...halves.map((x) => x.width));
  if (scale > 1) throw new Error("Footwear enlargement refused");
  const shoes = halves.map((b) =>
    resampleLanczos(
      b,
      Math.round(b.width * scale),
      Math.round(b.height * scale),
    ),
  );
  for (const b of bodies) {
    if (b.author.pose !== "standing-neutral") {
      pairs.push({
        body: b.subject.assetId,
        source,
        status: "pose-incompatible",
        reason: "Front standing shoes do not prove seated foot perspective.",
      });
      continue;
    }
    const contacts = b.subject.definition.contacts;
    if (!contacts?.leftFoot || !contacts.rightFoot) {
      pairs.push({
        body: b.subject.assetId,
        source,
        status: "measurement-limitation",
        reason: "Two independent foot contacts required.",
      });
      continue;
    }
    const body = await readPng(b.subject.file);
    const footMapping = [0, 1].map((side) => {
      const start = side === 0 ? 0 : b.author.center_x;
      const end = side === 0 ? b.author.center_x : 512;
      const spans = [];
      for (let y = 920; y < 960; y++) {
        const xs = [];
        for (let x = start; x < end; x++)
          if (body.data[(y * 512 + x) * 4 + 3]! > 8) xs.push(x);
        if (xs.length)
          spans.push({
            y,
            left: xs[0]!,
            right: xs[xs.length - 1]!,
            width: xs[xs.length - 1]! - xs[0]! + 1,
          });
      }
      const upper = spans[0]!,
        widest = [...spans].sort((a, z) => z.width - a.width)[0]!;
      const forefoot = spans[Math.floor(spans.length / 2)]!;
      return {
        upper,
        forefoot,
        widest,
        authoredAxisX:
          (upper.left + upper.right + forefoot.left + forefoot.right) / 4,
      };
    });
    const image = clear(512, 960),
      centers = [contacts.leftFoot, contacts.rightFoot].map((contact, i) => ({
        ...contact,
        x: footMapping[i]!.authoredAxisX / 512,
      }));
    shoes.forEach((shoe, i) =>
      paste(
        image,
        shoe,
        Math.round(centers[i]!.x * 512 - shoe.width / 2),
        Math.round(centers[i]!.y * 960) -
          (opaqueBounds(shoe, 8).y + opaqueBounds(shoe, 8).height - 1),
      ),
    );
    let worst = 0,
      rows = 0,
      availableRows = 0;
    const footResults = [];
    for (let side = 0; side < 2; side++) {
      let footWorst = 0,
        footRows = 0,
        footAvailableRows = 0;
      const start = side === 0 ? 0 : b.author.center_x,
        end = side === 0 ? b.author.center_x : 512;
      for (let y = 920; y < 960; y++) {
        const span = (im: PImage.Bitmap) => {
          let lo = Infinity,
            hi = -Infinity;
          for (let x = start; x < end; x++)
            if (im.data[(y * 512 + x) * 4 + 3]! > 8) {
              lo = Math.min(lo, x);
              hi = Math.max(hi, x);
            }
          return hi >= lo ? { lo, hi } : null;
        };
        const bs = span(body);
        if (!bs) continue;
        availableRows++;
        footAvailableRows++;
        const gs = span(image);
        if (!gs) {
          footWorst = Math.max(footWorst, 1);
          continue;
        }
        footRows++;
        let unsupported = 0;
        for (let x = bs.lo; x <= bs.hi; x++) {
          const offset = (y * 512 + x) * 4 + 3;
          if (body.data[offset]! > 8 && image.data[offset]! <= 8) unsupported++;
        }
        const residual =
          Math.max(unsupported, gs.lo - bs.lo, bs.hi - gs.hi, 0) /
          (bs.hi - bs.lo + 1);
        footWorst = Math.max(footWorst, residual);
      }
      footResults.push({
        side: side === 0 ? "left" : "right",
        rows: footRows,
        availableRows: footAvailableRows,
        worstFraction: footWorst,
      });
      rows += footRows;
      worst = Math.max(worst, footWorst);
    }
    const measured = footResults.every(
      (f) => f.rows >= 4 && f.rows >= f.availableRows * 0.25,
    );
    const fits =
      measured &&
      !/pump_|sandal_/.test(name) &&
      worst <= GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction;
    const id = `pv4_${path.basename(source, ".png")}_${b.subject.assetId}`;
    const family = id.replaceAll("_", "-");
    await emit(
      id,
      image,
      {
        kind: "footwear",
        family,
        layer: 45,
        canvas,
        attaches_to: "feet",
        origin: { x: b.author.center_x / 512, y: 0.998 },
        compatible_body_families: fits ? [b.subject.definition.family] : [],
        compatible_pose_families: ["standing-neutral"],
      },
      {
        path: source,
        sha256: hashArtFile(absolute(source)),
        split:
          "Transparent middle gap; preserve both source halves at one scale.",
        scale,
        contacts,
        footMapping,
        inspection_window_rows: [920, 960],
        source_unit_basis:
          "Game-authored maximum shoe width86px against average-man-A visible forefoot69/70px plus approximately8px shell per side; fixed across targets, not a fit threshold. Axis averages visible upper-foot and middle-lower-foot centers so baked outward toes do not get mistaken for ankle centers. One uniform source scale preserves style height. Width100 probe concealed excess shell; width80 with old contacts exposed misalignment. Exact coverage and remaining perspective remain separately reported.",
      },
    );
    profiles.push({
      component_family: family,
      kind: "footwear",
      classification: "safe-direct-reuse",
      authored_for_body_family: null,
      basis:
        "Fixed source-unit normalization; independent per-foot contact translation and coverage, unchanged3% bound.",
      profiles: [],
    });
    pairs.push({
      body: b.subject.assetId,
      garment: id,
      status:
        !measured || /pump_|sandal_/.test(name)
          ? "measurement-limitation"
          : fits
            ? "measured-candidate"
            : "failed-fit",
      metric: "independent-foot-undercoverage",
      metric_limitation: /pump_|sandal_/.test(name)
        ? "Open styles intentionally expose foot pixels; full-foot coverage cannot alone classify their fit. Raised-heel/insole and contact mapping remain separately unverified."
        : null,
      footResults,
      footMapping,
      shellWidthRatio: footMapping.map(
        (f, i) => shoes[i]!.width / f.widest.width,
      ),
      measurement_limitations:
        "Coverage includes interior alpha holes but does not approve ankle-opening perspective, sole fringe, or shell allowance; inspect exact overlays.",
      availableRows,
      measuredRows: rows,
      worstFraction: worst,
      sourceScale: scale,
      acceptance:
        "Candidate only; object perspective and ankle join need visual acceptance.",
    });
  }
}
await outputJson("art/manifest/character_candidate_visual4_registry.json", {
  schema: "people-visual4-candidate-registry-v1",
  release_status: "candidate-review-only",
  production_pixels_released: false,
  assets: records,
});
await outputJson("art/manifest/character_candidate_visual4_fit.json", {
  schema: "garment-fit-profiles-v1",
  garments: profiles,
});
await outputJson("art/qa/people-visual4/derivation.json", {
  schema: "people-visual4-derivation-v1",
  sources: evidence,
  pairs,
});
console.log(
  JSON.stringify({
    records: records.length,
    pairs: pairs.length,
    statuses: pairs.reduce(
      (a, p) => {
        const k = String(p.status);
        a[k] = (a[k] ?? 0) + 1;
        return a;
      },
      {} as Record<string, number>,
    ),
  }),
);
