import fs from "fs";
import path from "path";

import type { CharacterComponentDefinition } from "../../src/presentation/character-components";
import type { ArmPoint, ArmSubject } from "./arm-measure";

/**
 * Which body rasters the arm measurement is pointed at, and where their pose
 * and family come from.
 *
 * Three sources, none of them typed by hand:
 *
 * - **Manifest components** — the released development bodies. One raster per
 *   (family, pose): the complexion variants share a silhouette, and measuring
 *   three identical silhouettes would report one fact three times.
 * - **Manifest candidates** — the banked production candidates
 *   (`pg-female-lean`, `pg-male-lean`), whose definitions carry a pose family
 *   but which are in no catalog generation.
 * - **Packet 71 candidates** — the eight adult feminine poses chopped from the
 *   Drive sheet. They are not in the manifest at all; their pose families are
 *   the ones `art/qa/p71/source_intake_dispositions.json` assigned when the
 *   sheet was taken apart, and their body family is the sheet's own label,
 *   which is NOT a registered component family and is recorded as such.
 *
 * Pointing the tool at a new approved body master is adding it to the
 * manifest with a pose family, or adding its disposition record; nothing in
 * this file is edited.
 */

export const ARM_MEASUREMENT_REPORT_PATH =
  "art/qa/arm-measurements/arm_measurements.json";
export const ARM_MEASUREMENT_OVERLAY_DIRECTORY =
  "art/qa/arm-measurements/overlays";

/** The Packet 71 sheet's own family label. Not a registered component family. */
export const P71_BODY_FAMILY_LABEL = "ocd-adult-feminine (unregistered)";

interface ManifestAsset {
  readonly asset_id: string;
  readonly asset_type?: string;
  readonly final_path?: string;
  readonly component?: CharacterComponentDefinition;
  readonly candidate_component?: Omit<
    CharacterComponentDefinition,
    "catalog_generation"
  >;
  readonly generation_status?: string;
  readonly qa_status?: string;
  readonly runtime_release_status?: string;
}

interface DispositionCell {
  readonly assetId: string;
  readonly path: string;
  readonly sha256: string;
  readonly poseFamily: string;
}

interface PoseFamilyRecord {
  readonly pose_family_id: string;
  readonly landmarks: Readonly<Record<string, ArmPoint>>;
}

export interface ArmSubjectWithFile extends ArmSubject {
  readonly absoluteFile: string;
  /** The sha256 the source record claims for this file, when it records one. */
  readonly expectedSha256: string | null;
}

export function collectArmSubjects(
  repositoryRoot: string,
): ArmSubjectWithFile[] {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(repositoryRoot, "art/manifest/asset_manifest.json"),
      "utf8",
    ),
  ) as { readonly assets: readonly ManifestAsset[] };
  const poses = JSON.parse(
    fs.readFileSync(
      path.join(repositoryRoot, "art/manifest/pose_families.json"),
      "utf8",
    ),
  ) as { readonly families: readonly PoseFamilyRecord[] };
  const nominalFor = (poseFamily: string) =>
    poses.families.find((family) => family.pose_family_id === poseFamily)
      ?.landmarks;

  const subjects: ArmSubjectWithFile[] = [];
  const seen = new Set<string>();

  const sorted = [...manifest.assets].sort((a, b) =>
    a.asset_id < b.asset_id ? -1 : a.asset_id > b.asset_id ? 1 : 0,
  );
  for (const asset of sorted) {
    const definition = asset.component ?? asset.candidate_component;
    if (!definition || definition.kind !== "body" || !asset.final_path)
      continue;
    if (!definition.pose_family) continue;
    const key = `${definition.family} ${definition.pose_family}`;
    if (seen.has(key)) continue;
    seen.add(key);
    subjects.push({
      assetId: asset.asset_id,
      file: asset.final_path,
      absoluteFile: path.join(repositoryRoot, asset.final_path),
      bodyFamily: definition.family,
      poseFamily: definition.pose_family,
      source: asset.component ? "manifest-component" : "manifest-candidate",
      nominalLandmarks: nominalFor(definition.pose_family),
      expectedSha256: null,
    });
  }

  const dispositionsPath = path.join(
    repositoryRoot,
    "art/qa/p71/source_intake_dispositions.json",
  );
  if (fs.existsSync(dispositionsPath)) {
    const dispositions = JSON.parse(
      fs.readFileSync(dispositionsPath, "utf8"),
    ) as {
      readonly sheets: {
        readonly bodyPose?: { readonly cells: readonly DispositionCell[] };
      };
    };
    const cells = [...(dispositions.sheets.bodyPose?.cells ?? [])].sort(
      (a, b) => (a.assetId < b.assetId ? -1 : a.assetId > b.assetId ? 1 : 0),
    );
    for (const cell of cells) {
      subjects.push({
        assetId: cell.assetId,
        file: cell.path,
        absoluteFile: path.join(repositoryRoot, cell.path),
        bodyFamily: P71_BODY_FAMILY_LABEL,
        poseFamily: cell.poseFamily,
        source: "p71-candidate",
        nominalLandmarks: nominalFor(cell.poseFamily),
        expectedSha256: cell.sha256,
      });
    }
  }

  return subjects.filter((subject) => fs.existsSync(subject.absoluteFile));
}
