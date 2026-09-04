import fs from "fs";
import path from "path";
import prettier from "prettier";

import assetManifest from "../../art/manifest/asset_manifest.json";
import type { CharacterComponentDefinition } from "../../src/presentation/character-components";
import {
  GARMENT_FIT_AFFINE_DERIVATION,
  GARMENT_FIT_BANK_SCHEMA,
  GARMENT_FIT_DEFAULT_BOUNDS,
  GARMENT_FIT_WARP_DERIVATION,
  type GarmentFitBankData,
  type GarmentFitClass,
  type GarmentFitGarmentData,
  type GarmentFitProfileData,
} from "../../src/presentation/garment-fit";
import {
  BODY_REFERENCE_ROWS_BY_POSE,
  garmentExtent,
  measureBodyFitReference,
  measureFitCase,
  subjectFromManifest,
  type FitCaseResult,
  type FitSubject,
} from "./garment-fit-measure";
import {
  FIT_ACCESSORY_FAMILY,
  FIT_AUTHORING_MORPHOLOGY,
  FIT_BOTTOM_FAMILY,
  FIT_FOOTWEAR_FAMILY,
  FIT_GARMENT_EXTENTS,
  FIT_MORPHOLOGIES,
  FIT_POSE_FAMILY,
  FIT_TOP_FAMILY,
  GARMENT_FIT_FIXTURES,
  GARMENT_FIT_FIXTURE_DIRECTORY,
  GARMENT_FIT_FIXTURE_VERSION,
} from "./garment-fit-fixtures";

/**
 * Measures every reusable garment pairing, then writes the fit bank from what
 * it measured.
 *
 * The order is the point. A human guessing matrices is the thing this replaces:
 * the bank's numbers come from the difference between two measured silhouettes,
 * and its CLASSIFICATIONS come from what those numbers achieved when the real
 * compositor placed the real rasters. Nothing is authored and then confirmed.
 *
 * Two sets are measured, answering different questions.
 *
 * **The bank set** is the released dev components — the same `dev-g2-broad` /
 * `dev-g2-slim` pair Packet 76 measured. It answers "what does the fit layer do
 * for the art that exists today", and it is what the shipped bank is built
 * from.
 *
 * **The fixture set** is the declared lean / average / heavy triple in
 * `art/fixtures/garment-fit`. It answers what the bank cannot: how far a single
 * affine gets across a RANGE of builds before the morphology change stops being
 * uniform. Its geometry is declared rather than observed and every row of the
 * report says so.
 *
 * Run with `npm run derive:garment-fit`.
 */

const repositoryRoot = path.resolve(process.cwd());
const REPORT_PATH = "art/qa/garment-fit/fit_report.json";
const BANK_PATH = "art/manifest/garment_fit_profiles.json";

interface ManifestAsset {
  readonly asset_id: string;
  readonly final_path?: string;
  readonly component?: CharacterComponentDefinition;
  readonly generation_status?: string;
  readonly qa_status?: string;
  readonly runtime_release_status?: string;
}

const manifestAssets = assetManifest.assets as readonly ManifestAsset[];

const isReleased = (asset: ManifestAsset): boolean =>
  asset.generation_status === "approved" &&
  asset.qa_status === "approved" &&
  asset.runtime_release_status === "released";

const GOVERNED_KINDS = ["top", "bottom", "footwear", "accessory"];

/* -------------------------------------------------------------------------- */
/* What the library says is reachable                                          */
/* -------------------------------------------------------------------------- */

interface BodyCell {
  readonly assetId: string;
  readonly family: string;
  readonly poseFamily: string;
}

const bodies: BodyCell[] = manifestAssets
  .filter(
    (asset) =>
      isReleased(asset) &&
      asset.component?.kind === "body" &&
      asset.component.pose_family !== undefined,
  )
  .map((asset) => ({
    assetId: asset.asset_id,
    family: asset.component!.family,
    poseFamily: asset.component!.pose_family!,
  }));

/** One representative body raster per (family, pose). */
const bodyByFamilyPose = new Map<string, BodyCell>();
for (const body of [...bodies].sort((a, b) =>
  a.assetId < b.assetId ? -1 : 1,
)) {
  const key = `${body.family} ${body.poseFamily}`;
  if (!bodyByFamilyPose.has(key)) bodyByFamilyPose.set(key, body);
}

const posesByFamily = new Map<string, Set<string>>();
for (const body of bodies) {
  const set = posesByFamily.get(body.family) ?? new Set<string>();
  set.add(body.poseFamily);
  posesByFamily.set(body.family, set);
}

interface GarmentComponent {
  readonly assetId: string;
  readonly definition: CharacterComponentDefinition;
}

const garmentsByFamily = new Map<string, GarmentComponent[]>();
for (const asset of manifestAssets) {
  const definition = asset.component;
  if (!definition || !isReleased(asset)) continue;
  if (!GOVERNED_KINDS.includes(definition.kind)) continue;
  const list = garmentsByFamily.get(definition.family) ?? [];
  list.push({ assetId: asset.asset_id, definition });
  garmentsByFamily.set(definition.family, list);
}

function manifestSubject(assetId: string): FitSubject {
  return subjectFromManifest(repositoryRoot, manifestAssets, assetId);
}

/* -------------------------------------------------------------------------- */
/* Bank set: every reachable (garment family, target family, pose)              */
/* -------------------------------------------------------------------------- */

interface BankPairing {
  readonly componentFamily: string;
  readonly kind: string;
  readonly sourceBodyFamily: string;
  readonly targetBodyFamily: string;
  readonly poseFamily: string;
  readonly garmentAssetId: string;
}

/**
 * The morphology each garment family was drawn against.
 *
 * Declared here, once, because the rasters do not carry it and nothing in the
 * manifest records it. Every generation-2 wearable was drawn to the broad
 * silhouette — 76A section 5.3 measured the olive knit at 7 px overhang on
 * broad against 29 px on slim, which is what "drawn for broad" looks like in
 * pixels. Generation 1 has a single body family, so the question does not
 * arise there.
 */
const AUTHORED_FOR: Readonly<Record<string, string>> = {
  "dev-g2-suit-charcoal": "dev-g2-broad",
  "dev-g2-knit-olive": "dev-g2-broad",
  "dev-g2-trousers-slate": "dev-g2-broad",
  "dev-g2-derby-oxblood": "dev-g2-broad",
  "dev-g2-lanyard": "dev-g2-broad",
};

const pairings: BankPairing[] = [];
for (const [family, components] of [...garmentsByFamily].sort(([a], [b]) =>
  a < b ? -1 : 1,
)) {
  const authoredFor = AUTHORED_FOR[family];
  if (!authoredFor) continue;
  for (const component of components) {
    const targets = component.definition.compatible_body_families ?? [];
    for (const target of [...targets].sort()) {
      if (target === authoredFor) continue;
      const poses = component.definition.compatible_pose_families ?? [
        ...(posesByFamily.get(target) ?? []),
      ];
      for (const pose of [...poses].sort()) {
        if (!(posesByFamily.get(target) ?? new Set()).has(pose)) continue;
        if (!(posesByFamily.get(authoredFor) ?? new Set()).has(pose)) continue;
        pairings.push({
          componentFamily: family,
          kind: component.definition.kind,
          sourceBodyFamily: authoredFor,
          targetBodyFamily: target,
          poseFamily: pose,
          garmentAssetId: component.assetId,
        });
      }
    }
  }
}

const bankCases: FitCaseResult[] = pairings.map((pairing) => {
  const sourceCell = bodyByFamilyPose.get(
    `${pairing.sourceBodyFamily} ${pairing.poseFamily}`,
  )!;
  const targetCell = bodyByFamilyPose.get(
    `${pairing.targetBodyFamily} ${pairing.poseFamily}`,
  )!;
  const sourceBody = manifestSubject(sourceCell.assetId);
  const targetBody = manifestSubject(targetCell.assetId);
  const garment = manifestSubject(pairing.garmentAssetId);
  return measureFitCase({
    garment,
    sourceBody,
    targetBody,
    poseFamily: pairing.poseFamily,
    extent: garmentExtent(
      garment.definition,
      (sourceBody.definition.attachment_anchors ?? []).map((anchor) => ({
        id: anchor.id,
        y: anchor.y,
      })),
      sourceBody.definition.canvas.height,
    ),
  });
});

/* -------------------------------------------------------------------------- */
/* Fixture set                                                                 */
/* -------------------------------------------------------------------------- */

function fixtureSubject(assetId: string): FitSubject {
  const fixture = GARMENT_FIT_FIXTURES.find(
    (candidate) => candidate.assetId === assetId,
  );
  if (!fixture) throw new Error(`No fit fixture named '${assetId}'.`);
  return {
    assetId,
    definition: fixture.definition,
    file: path.join(
      repositoryRoot,
      GARMENT_FIT_FIXTURE_DIRECTORY,
      `${assetId}.png`,
    ),
  };
}

const fixtureBodies = FIT_MORPHOLOGIES.map((morphology) => ({
  morphology,
  subject: fixtureSubject(`fit_body_adult_${morphology.label}_standing_v1`),
}));

const fixtureGarments = [
  { assetId: "fit_top_knit_average_standing_v1", family: FIT_TOP_FAMILY },
  {
    assetId: "fit_bottom_trousers_average_standing_v1",
    family: FIT_BOTTOM_FAMILY,
  },
  { assetId: "fit_footwear_derby_standing_v1", family: FIT_FOOTWEAR_FAMILY },
  { assetId: "fit_accessory_badge_v1", family: FIT_ACCESSORY_FAMILY },
];

const fixtureSourceBody = fixtureBodies.find(
  (entry) => entry.morphology.family === FIT_AUTHORING_MORPHOLOGY.family,
)!.subject;

const fixtureCases: FitCaseResult[] = [];
for (const garment of fixtureGarments) {
  for (const target of fixtureBodies) {
    if (
      target.subject.definition.family === fixtureSourceBody.definition.family
    ) {
      continue;
    }
    fixtureCases.push(
      measureFitCase({
        garment: fixtureSubject(garment.assetId),
        sourceBody: fixtureSourceBody,
        targetBody: target.subject,
        poseFamily: FIT_POSE_FAMILY,
        extent: FIT_GARMENT_EXTENTS[garment.family]!,
      }),
    );
  }
}

/* -------------------------------------------------------------------------- */
/* The bank, written from what was measured                                    */
/* -------------------------------------------------------------------------- */

/**
 * A family's classification is the WORST of its measured pairings.
 *
 * A garment that shares safely onto one family and needs a warp onto another is
 * not a safe sharer; it is a warp case that got lucky once. Taking the worst
 * keeps the class a statement about the garment rather than about the pairing
 * someone happened to look at first.
 */
const CLASS_ORDER: readonly GarmentFitClass[] = [
  "safe-direct-reuse",
  "affine-reusable",
  "bounded-warp-reusable",
  "morphology-specific",
];

function worstClass(cases: readonly FitCaseResult[]): GarmentFitClass | null {
  let worst: GarmentFitClass | null = null;
  for (const entry of cases) {
    if (
      worst === null ||
      CLASS_ORDER.indexOf(entry.classification) > CLASS_ORDER.indexOf(worst)
    ) {
      worst = entry.classification;
    }
  }
  return worst;
}

const garmentEntries: GarmentFitGarmentData[] = [];
for (const [family, components] of [...garmentsByFamily].sort(([a], [b]) =>
  a < b ? -1 : 1,
)) {
  const kind = components[0]!.definition.kind;
  const authoredFor = AUTHORED_FOR[family] ?? null;
  const familyCases = bankCases.filter(
    (entry) => entry.garmentFamily === family,
  );

  if (authoredFor === null) {
    // Generation 1: one body family, and no second morphology has ever been
    // measured against it. `morphology-specific` is what "no evidence" means
    // here, and it costs nothing: the only family these components reach is
    // the one they were drawn for.
    const only = [
      ...new Set(
        components.flatMap(
          (component) => component.definition.compatible_body_families ?? [],
        ),
      ),
    ];
    garmentEntries.push({
      component_family: family,
      kind,
      classification: "morphology-specific",
      authored_for_body_family: only[0] ?? null,
      basis: `Declares one body family (${only.join(", ") || "none"}) and no second morphology has been measured against it. Classified by the absence of evidence, not by a judgement about the art: nothing is reused, so nothing needs a fit.`,
      profiles: [],
    });
    continue;
  }

  const classification = worstClass(familyCases) ?? "morphology-specific";
  const profiles: GarmentFitProfileData[] = [];
  for (const entry of familyCases) {
    if (classification === "safe-direct-reuse") continue;
    const chosen =
      classification === "bounded-warp-reusable" && entry.boundedWarp
        ? entry.boundedWarp
        : entry.affine;
    if (!chosen) continue;
    profiles.push({
      target_body_family: entry.targetBodyFamily,
      pose_family: entry.poseFamily,
      transform: chosen.transform,
      derivation: {
        method:
          chosen.transform.kind === "bounded-warp"
            ? GARMENT_FIT_WARP_DERIVATION
            : GARMENT_FIT_AFFINE_DERIVATION,
        source_body_family: entry.sourceBodyFamily,
        anchors: chosen.anchors,
        note: `Worst per-side residual ${entry.unfitted.worstPx}px unfitted, ${chosen.result.worstPx}px fitted, over rows ${entry.metric.fromRow}-${entry.metric.toRow} (${entry.metric.mode}).`,
      },
    });
  }

  garmentEntries.push({
    component_family: family,
    kind,
    classification,
    authored_for_body_family:
      classification === "safe-direct-reuse" ? null : authoredFor,
    basis:
      familyCases.map((entry) => entry.reason).join(" ") ||
      "No cross-morphology pairing is reachable for this family.",
    profiles,
  });
}

const bank: GarmentFitBankData = {
  schema: GARMENT_FIT_BANK_SCHEMA,
  note: "Derived, not authored. Every transform below is the difference between two MEASURED silhouettes, and every classification is what that transform achieved when projectCharacterLayers placed the real rasters. Regenerate with `npm run derive:garment-fit`; the numbers are reproducible from the rasters in the bank.",
  bounds: GARMENT_FIT_DEFAULT_BOUNDS,
  garments: garmentEntries,
};

/* -------------------------------------------------------------------------- */
/* Write                                                                       */
/* -------------------------------------------------------------------------- */

const report = {
  tool: "garment-fit-measure-v1",
  fixture_version: GARMENT_FIT_FIXTURE_VERSION,
  bounds: GARMENT_FIT_DEFAULT_BOUNDS,
  reference_rows: BODY_REFERENCE_ROWS_BY_POSE,
  note: "Worst per-side fit residual in body-canvas pixels, read from the alpha of the rasters AFTER projectCharacterLayers placed them. For tops and bottoms the residual is PROPORTIONAL: how far the garment's edge sits from where the same garment sits on the body it was drawn for, so the garment's own ease is not counted as error. Footwear is judged on whether it contains the foot; an accessory on whether it stays inside the silhouette. Regenerate with `npm run derive:garment-fit`.",
  bank_set: {
    note: "The released development components. Real rasters; the dev-g2 pair is the same one Packet 76 measured in 76A section 5.3.",
    cases: bankCases,
    body_references: [...bodyByFamilyPose.values()].map((cell) =>
      measureBodyFitReference(
        manifestSubject(cell.assetId).file,
        cell.family,
        cell.poseFamily,
      ),
    ),
  },
  fixture_set: {
    note: "DECLARED, NOT OBSERVED. The lean / average / heavy morphology table is a stated fixture geometry in scripts/art-asset-factory/garment-fit-fixtures.ts, because no measured lean/average/heavy production body exists in this repository yet. Every conclusion below is conditional on that table. Re-point this at real morphology masters when Pack 74 wave A lands; nothing in the derivation, the bounds or the tests changes.",
    source_body_family: FIT_AUTHORING_MORPHOLOGY.family,
    pose_family: FIT_POSE_FAMILY,
    morphologies: FIT_MORPHOLOGIES,
    body_references: fixtureBodies.map((entry) =>
      measureBodyFitReference(
        entry.subject.file,
        entry.morphology.family,
        FIT_POSE_FAMILY,
      ),
    ),
    cases: fixtureCases,
  },
};

/**
 * Written through the repository's own formatter.
 *
 * Both files are checked in and both are regenerated, so the bytes a run
 * produces have to be the bytes `npm run format` would leave behind. Otherwise
 * regenerating the bank makes the build fail on whitespace, and the next person
 * reaches for `--write` instead of asking why the numbers moved.
 */
for (const [target, value] of [
  [REPORT_PATH, report],
  [BANK_PATH, bank],
] as const) {
  const outputPath = path.join(repositoryRoot, target);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const options = await prettier.resolveConfig(outputPath);
  fs.writeFileSync(
    outputPath,
    await prettier.format(JSON.stringify(value, null, 2), {
      ...options,
      filepath: outputPath,
      parser: "json",
    }),
  );
}

const summarise = (label: string, cases: readonly FitCaseResult[]): void => {
  console.log(`\n${label}`);
  for (const entry of cases) {
    const affine = entry.affine
      ? `${entry.affine.result.worstPx.toFixed(1).padStart(6)}px`
      : "     --";
    const warp = entry.boundedWarp
      ? `${entry.boundedWarp.result.worstPx.toFixed(1).padStart(6)}px`
      : "     --";
    console.log(
      `  ${entry.garmentFamily.padEnd(24)} -> ${entry.targetBodyFamily.padEnd(16)} ${entry.poseFamily.padEnd(16)} ` +
        `unfitted ${entry.unfitted.worstPx.toFixed(1).padStart(6)}px  affine ${affine}  warp ${warp}   ${entry.classification}`,
    );
  }
};

summarise("Bank set (released components):", bankCases);
summarise("Fixture set (fit-adult-average -> lean/heavy):", fixtureCases);
console.log("\nClassification written to the bank:");
for (const entry of bank.garments) {
  console.log(
    `  ${entry.component_family.padEnd(24)} ${entry.kind.padEnd(10)} ${entry.classification} (${entry.profiles.length} profile${entry.profiles.length === 1 ? "" : "s"})`,
  );
}
console.log(`\nWrote ${REPORT_PATH} and ${BANK_PATH}`);
