import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import assetManifest from "../art/manifest/asset_manifest.json";
import fitBank from "../art/manifest/garment_fit_profiles.json";
import fitReport from "../art/qa/garment-fit/fit_report.json";
import {
  createGarmentFitBank,
  GARMENT_FIT_DEFAULT_BOUNDS,
  boundsViolations,
  validateGarmentFitBank,
  type GarmentFitBankData,
  type GarmentFitClass,
} from "../src/presentation/garment-fit";
import {
  createCharacterComponentLibrary,
  projectCharacterLayers,
  type CharacterCatalogData,
  type CharacterComponentDefinition,
  type CharacterComponentManifestRecord,
  type CharacterRecipe,
} from "../src/presentation/character-components";
import characterCatalog from "../art/manifest/character_catalog.json";
import {
  garmentExtent,
  measureBodyFitReference,
  measureFitCase,
  readRasterSpans,
  subjectFromManifest,
  type FitSubject,
} from "../scripts/art-asset-factory/garment-fit-measure";
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
  renderGarmentFitFixtures,
} from "../scripts/art-asset-factory/garment-fit-fixtures";

/**
 * The fit layer against real pixels.
 *
 * `src/presentation/garment-fit.test.ts` checks the rules. This file checks
 * what actually comes out of the compositor when the same garment raster is
 * hung on a lean, an average and a heavy body — including the one claim that
 * cannot be made from arithmetic alone: that the fitted silhouette is measurably
 * better than the unfitted one.
 */

const ROOT = path.resolve(__dirname, "..");
const BANK = fitBank as GarmentFitBankData;

function fixtureSubject(assetId: string): FitSubject {
  const fixture = GARMENT_FIT_FIXTURES.find(
    (candidate) => candidate.assetId === assetId,
  )!;
  return {
    assetId,
    definition: fixture.definition,
    file: path.join(ROOT, GARMENT_FIT_FIXTURE_DIRECTORY, `${assetId}.png`),
  };
}

const bodyOf = (label: string) =>
  fixtureSubject(`fit_body_adult_${label}_standing_v1`);

const SOURCE_BODY = bodyOf(FIT_AUTHORING_MORPHOLOGY.label);

const GARMENTS = [
  {
    assetId: "fit_top_knit_average_standing_v1",
    family: FIT_TOP_FAMILY,
    kind: "top",
  },
  {
    assetId: "fit_bottom_trousers_average_standing_v1",
    family: FIT_BOTTOM_FAMILY,
    kind: "bottom",
  },
  {
    assetId: "fit_footwear_derby_standing_v1",
    family: FIT_FOOTWEAR_FAMILY,
    kind: "footwear",
  },
  {
    assetId: "fit_accessory_badge_v1",
    family: FIT_ACCESSORY_FAMILY,
    kind: "accessory",
  },
] as const;

const sha256 = (file: string): string =>
  createHash("sha256").update(fs.readFileSync(file)).digest("hex");

/* -------------------------------------------------------------------------- */

describe("morphology fixtures", () => {
  it("draws three builds that differ non-uniformly, not by one scale", () => {
    const spans = FIT_MORPHOLOGIES.map((morphology) => {
      const reference = measureBodyFitReference(
        bodyOf(morphology.label).file,
        morphology.family,
        FIT_POSE_FAMILY,
      );
      return { label: morphology.label, spans: reference.spans };
    });
    const average = spans.find((entry) => entry.label === "average")!;
    for (const entry of spans) {
      if (entry.label === "average") continue;
      const shoulder = entry.spans.shoulder! / average.spans.shoulder!;
      const waist = entry.spans.waist! / average.spans.waist!;
      // The waist has to move materially more than the shoulder, or the whole
      // experiment is a uniform scale in disguise and the affine result below
      // would prove nothing.
      expect(Math.abs(waist - 1)).toBeGreaterThan(Math.abs(shoulder - 1) * 1.5);
    }
  });

  it("regenerates byte for byte from its own script", async () => {
    // Rendered into a scratch directory, not over the committed files: other
    // test files read those rasters at the same time, and a raster read
    // mid-write is a truncated PNG.
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "garment-fit-"));
    try {
      const outputs = await renderGarmentFitFixtures(ROOT, scratch);
      expect(outputs.map((output) => output.hash)).toEqual(
        GARMENT_FIT_FIXTURES.map((fixture) =>
          sha256(fixtureSubject(fixture.assetId).file),
        ),
      );
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  });
});

describe("one garment raster, three morphologies", () => {
  const targets = FIT_MORPHOLOGIES.filter(
    (morphology) => morphology.label !== FIT_AUTHORING_MORPHOLOGY.label,
  );

  for (const garment of GARMENTS) {
    for (const target of targets) {
      it(`${garment.family} on ${target.label}: fitting does not make it worse`, () => {
        const result = measureFitCase({
          garment: fixtureSubject(garment.assetId),
          sourceBody: SOURCE_BODY,
          targetBody: bodyOf(target.label),
          poseFamily: FIT_POSE_FAMILY,
          extent: FIT_GARMENT_EXTENTS[garment.family]!,
        });
        const best =
          result.classification === "bounded-warp-reusable"
            ? result.boundedWarp!.result
            : result.classification === "affine-reusable"
              ? result.affine!.result
              : result.unfitted;
        expect(best.worstPx).toBeLessThanOrEqual(result.unfitted.worstPx);
        expect(best.worstFractionOfBodySpan).toBeLessThanOrEqual(
          GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction,
        );
      });
    }
  }

  it("materially improves the fitted categories against the current compositor", () => {
    for (const label of ["lean", "heavy"] as const) {
      for (const family of [FIT_TOP_FAMILY, FIT_BOTTOM_FAMILY]) {
        const garment = GARMENTS.find((entry) => entry.family === family)!;
        const result = measureFitCase({
          garment: fixtureSubject(garment.assetId),
          sourceBody: SOURCE_BODY,
          targetBody: bodyOf(label),
          poseFamily: FIT_POSE_FAMILY,
          extent: FIT_GARMENT_EXTENTS[family]!,
        });
        const fitted =
          result.classification === "bounded-warp-reusable"
            ? result.boundedWarp!.result
            : result.affine!.result;
        // The unfitted placement is outside the bound and the fitted one is
        // inside it. Anything less than that is not worth a contract change.
        expect(result.unfitted.worstFractionOfBodySpan).toBeGreaterThan(
          GARMENT_FIT_DEFAULT_BOUNDS.maxEdgeErrorFraction,
        );
        expect(fitted.worstPx).toBeLessThan(result.unfitted.worstPx / 2);
      }
    }
  });

  it("classifies each fixture garment explicitly", () => {
    const classified: Record<string, GarmentFitClass> = {};
    for (const garment of GARMENTS) {
      for (const target of targets) {
        const result = measureFitCase({
          garment: fixtureSubject(garment.assetId),
          sourceBody: SOURCE_BODY,
          targetBody: bodyOf(target.label),
          poseFamily: FIT_POSE_FAMILY,
          extent: FIT_GARMENT_EXTENTS[garment.family]!,
        });
        classified[`${garment.family}->${target.label}`] =
          result.classification;
      }
    }
    expect(classified).toEqual({
      // A knit follows the torso, and the torso is where the builds differ.
      // Lean is a near-uniform narrowing, so one scale reaches it. Heavy is
      // not: the waist grows three times as much as the shoulder, and one
      // scale cannot sit on both.
      "fit-knit-olive->lean": "affine-reusable",
      "fit-knit-olive->heavy": "bounded-warp-reusable",
      "fit-trousers-slate->lean": "affine-reusable",
      "fit-trousers-slate->heavy": "affine-reusable",
      // A shoe is not sized by the ankle above it, and a badge is not sized by
      // the torso behind it. Both share as drawn.
      "fit-derby-oxblood->lean": "safe-direct-reuse",
      "fit-derby-oxblood->heavy": "safe-direct-reuse",
      "fit-badge->lean": "safe-direct-reuse",
      "fit-badge->heavy": "safe-direct-reuse",
    });
  });

  it("shows a single affine failing the heavy direction it cannot solve", () => {
    const result = measureFitCase({
      garment: fixtureSubject("fit_top_knit_average_standing_v1"),
      sourceBody: SOURCE_BODY,
      targetBody: bodyOf("heavy"),
      poseFamily: FIT_POSE_FAMILY,
      extent: FIT_GARMENT_EXTENTS[FIT_TOP_FAMILY]!,
    });
    // Stated plainly so nobody has to read the report to know the affine did
    // not solve this one: it improves the placement and still misses.
    expect(result.affine!.result.worstPx).toBeLessThan(result.unfitted.worstPx);
    expect(result.affine!.withinBound).toBe(false);
    expect(result.boundedWarp!.withinBound).toBe(true);
    expect(result.boundedWarp!.result.worstPx).toBeLessThan(
      result.affine!.result.worstPx,
    );
  });

  it("leaves the source rasters untouched", () => {
    const digests = Object.fromEntries(
      GARMENT_FIT_FIXTURES.map((fixture) => [
        fixture.assetId,
        sha256(fixtureSubject(fixture.assetId).file),
      ]),
    );
    for (const garment of GARMENTS) {
      for (const target of targets) {
        measureFitCase({
          garment: fixtureSubject(garment.assetId),
          sourceBody: SOURCE_BODY,
          targetBody: bodyOf(target.label),
          poseFamily: FIT_POSE_FAMILY,
          extent: FIT_GARMENT_EXTENTS[garment.family]!,
        });
      }
    }
    for (const fixture of GARMENT_FIT_FIXTURES) {
      expect(sha256(fixtureSubject(fixture.assetId).file)).toBe(
        digests[fixture.assetId],
      );
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("the shipped fit bank", () => {
  const library = createCharacterComponentLibrary(
    assetManifest.assets as readonly CharacterComponentManifestRecord[],
    characterCatalog as CharacterCatalogData,
  );

  it("validates against the components it fits", () => {
    expect(validateGarmentFitBank(BANK, library)).toEqual([]);
  });

  it("keeps every transform inside the declared bounds", () => {
    for (const garment of BANK.garments) {
      for (const profile of garment.profiles) {
        expect(
          boundsViolations(profile.transform, {
            ...GARMENT_FIT_DEFAULT_BOUNDS,
            ...(BANK.bounds ?? {}),
          }),
        ).toEqual([]);
      }
    }
  });

  it("says where every profile's numbers came from", () => {
    for (const garment of BANK.garments) {
      for (const profile of garment.profiles) {
        expect(profile.derivation?.method).toMatch(/^anchor-span-/);
        expect(profile.derivation?.source_body_family).toBe(
          garment.authored_for_body_family,
        );
        expect(profile.derivation?.anchors.length).toBeGreaterThan(0);
      }
    }
  });

  it("carries only numbers a fresh measurement reproduces", () => {
    // The bank is derived, not typed. Re-deriving every shipped profile from
    // the rasters in the manifest has to land on the same transform, or a hand
    // edit has crept in and the classification beside it means nothing.
    const assets = assetManifest.assets as readonly {
      asset_id: string;
      final_path?: string;
      component?: CharacterComponentDefinition;
    }[];
    const bodyFor = (family: string, pose: string) =>
      assets
        .filter(
          (asset) =>
            asset.component?.kind === "body" &&
            asset.component.family === family &&
            asset.component.pose_family === pose,
        )
        .map((asset) => asset.asset_id)
        .sort()[0]!;

    let checked = 0;
    for (const garment of BANK.garments) {
      for (const profile of garment.profiles) {
        const component = assets.find(
          (asset) =>
            asset.component?.family === garment.component_family &&
            (
              asset.component.compatible_pose_families ?? [profile.pose_family]
            ).includes(profile.pose_family),
        )!;
        const source = subjectFromManifest(
          ROOT,
          assets,
          bodyFor(garment.authored_for_body_family!, profile.pose_family),
        );
        const target = subjectFromManifest(
          ROOT,
          assets,
          bodyFor(profile.target_body_family, profile.pose_family),
        );
        const fresh = measureFitCase({
          garment: subjectFromManifest(ROOT, assets, component.asset_id),
          sourceBody: source,
          targetBody: target,
          poseFamily: profile.pose_family,
          extent: garmentExtent(
            component.component!,
            source.definition.attachment_anchors ?? [],
            source.definition.canvas.height,
          ),
        });
        const derived =
          garment.classification === "bounded-warp-reusable"
            ? fresh.boundedWarp!.transform
            : fresh.affine!.transform;
        expect(derived).toEqual(profile.transform);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("holds footwear and accessories to direct reuse, as 76A measured", () => {
    const byFamily = new Map(
      BANK.garments.map((garment) => [garment.component_family, garment]),
    );
    for (const family of ["dev-g2-derby-oxblood", "dev-g2-lanyard"]) {
      expect(byFamily.get(family)!.classification).toBe("safe-direct-reuse");
      expect(byFamily.get(family)!.profiles).toEqual([]);
    }
  });

  it("carries a fit for every top and bottom that crosses a family", () => {
    const byFamily = new Map(
      BANK.garments.map((garment) => [garment.component_family, garment]),
    );
    for (const family of [
      "dev-g2-knit-olive",
      "dev-g2-suit-charcoal",
      "dev-g2-trousers-slate",
    ]) {
      const garment = byFamily.get(family)!;
      expect(garment.classification).toBe("affine-reusable");
      expect(garment.authored_for_body_family).toBe("dev-g2-broad");
      expect(
        garment.profiles.map((profile) => profile.pose_family).sort(),
      ).toEqual(["seated-at-desk", "standing-neutral"]);
      for (const profile of garment.profiles) {
        expect(profile.target_body_family).toBe("dev-g2-slim");
      }
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("the fit report", () => {
  it("reproduces itself from the rasters it names", () => {
    for (const entry of fitReport.fixture_set.cases) {
      const garment = GARMENTS.find(
        (candidate) => candidate.family === entry.garmentFamily,
      )!;
      const target = FIT_MORPHOLOGIES.find(
        (morphology) => morphology.family === entry.targetBodyFamily,
      )!;
      const fresh = measureFitCase({
        garment: fixtureSubject(garment.assetId),
        sourceBody: SOURCE_BODY,
        targetBody: bodyOf(target.label),
        poseFamily: FIT_POSE_FAMILY,
        extent: FIT_GARMENT_EXTENTS[garment.family]!,
      });
      expect(fresh.unfitted.worstPx).toBe(entry.unfitted.worstPx);
      expect(fresh.unfitted.status).toBe("measured");
      expect(fresh.classification).toBe(entry.classification);
      expect(fresh.evidence).toBe("measured");
    }
  });

  it("says out loud that its morphology table is declared, not observed", () => {
    expect(fitReport.fixture_set.note).toContain("DECLARED, NOT OBSERVED");
  });
});

/* -------------------------------------------------------------------------- */

describe("the composited result", () => {
  const CATALOG = characterCatalog as CharacterCatalogData;

  function fixtureLibrary(withBank: boolean) {
    const records: CharacterComponentManifestRecord[] =
      GARMENT_FIT_FIXTURES.map((fixture) => ({
        asset_id: fixture.assetId,
        asset_type: "character-component",
        generation_status: "approved",
        qa_status: "approved",
        runtime_release_status: "released",
        component: fixture.definition as CharacterComponentDefinition,
      }));
    const bank: GarmentFitBankData = {
      schema: "garment-fit-profiles-v1",
      garments: GARMENTS.map((garment) => {
        const measured = measureFitCase({
          garment: fixtureSubject(garment.assetId),
          sourceBody: SOURCE_BODY,
          targetBody: bodyOf("heavy"),
          poseFamily: FIT_POSE_FAMILY,
          extent: FIT_GARMENT_EXTENTS[garment.family]!,
        });
        const direct = measured.classification === "safe-direct-reuse";
        const chosen =
          measured.classification === "bounded-warp-reusable"
            ? measured.boundedWarp!.transform
            : measured.affine?.transform;
        return {
          component_family: garment.family,
          kind: garment.kind,
          classification: measured.classification,
          authored_for_body_family: direct
            ? null
            : FIT_AUTHORING_MORPHOLOGY.family,
          basis: measured.reason,
          profiles:
            direct || !chosen
              ? []
              : [
                  {
                    target_body_family: "fit-adult-heavy",
                    pose_family: FIT_POSE_FAMILY,
                    transform: chosen,
                  },
                ],
        };
      }),
    };
    return createCharacterComponentLibrary(
      records,
      CATALOG,
      withBank ? createGarmentFitBank(bank) : null,
    );
  }

  function recipeOnHeavy(): CharacterRecipe {
    return {
      appearanceSeed: "fit-test",
      recipeVersion: "v1",
      catalogGeneration: 1,
      identity: {
        bodyFamily: "fit-adult-heavy",
        headFamily: "none",
        complexion: null,
        slots: {},
      },
      context: {
        poseFamily: FIT_POSE_FAMILY,
        headOrientation: "front",
        components: [
          {
            slotId: "body",
            kind: "body",
            family: "fit-adult-heavy",
            assetId: "fit_body_adult_heavy_standing_v1",
            layer: 20,
            released: true,
          },
          ...GARMENTS.map((garment) => {
            const fixture = GARMENT_FIT_FIXTURES.find(
              (candidate) => candidate.assetId === garment.assetId,
            )!;
            return {
              slotId: `${garment.kind}-slot`,
              kind: fixture.definition.kind,
              family: garment.family,
              assetId: garment.assetId,
              layer: fixture.definition.layer,
              released: true,
            };
          }),
        ],
        diagnostics: [],
      },
    };
  }

  it("moves only the garments that needed moving", () => {
    const unfitted = projectCharacterLayers(
      recipeOnHeavy(),
      fixtureLibrary(false),
    )!;
    const fitted = projectCharacterLayers(
      recipeOnHeavy(),
      fixtureLibrary(true),
    )!;

    const before = new Map(
      unfitted.layers.map((layer) => [layer.assetId, layer]),
    );
    const moved: string[] = [];
    for (const layer of fitted.layers) {
      const original = before.get(layer.assetId)!;
      const same =
        layer.left === original.left &&
        layer.top === original.top &&
        layer.width === original.width &&
        layer.height === original.height &&
        layer.fit?.bands == null;
      if (!same) moved.push(layer.assetId);
    }
    expect(moved.sort()).toEqual([
      "fit_bottom_trousers_average_standing_v1",
      "fit_top_knit_average_standing_v1",
    ]);
  });

  it("leaves the body geometry exactly as it was", () => {
    const unfitted = projectCharacterLayers(
      recipeOnHeavy(),
      fixtureLibrary(false),
    )!;
    const fitted = projectCharacterLayers(
      recipeOnHeavy(),
      fixtureLibrary(true),
    )!;
    expect(fitted.root).toEqual(unfitted.root);
    expect(fitted.bodyCanvas).toEqual(unfitted.bodyCanvas);
    const body = (projected: typeof fitted) =>
      projected.layers.find((layer) => layer.kind === "body")!;
    expect(body(fitted)).toMatchObject({
      left: body(unfitted).left,
      top: body(unfitted).top,
      width: body(unfitted).width,
      height: body(unfitted).height,
    });
  });

  it("keeps z-order and layer membership identical", () => {
    const unfitted = projectCharacterLayers(
      recipeOnHeavy(),
      fixtureLibrary(false),
    )!;
    const fitted = projectCharacterLayers(
      recipeOnHeavy(),
      fixtureLibrary(true),
    )!;
    expect(fitted.layers.map((layer) => layer.assetId)).toEqual(
      unfitted.layers.map((layer) => layer.assetId),
    );
    expect(fitted.layers.map((layer) => layer.layer)).toEqual(
      unfitted.layers.map((layer) => layer.layer),
    );
  });

  it("produces the same projection twice", () => {
    const library = fixtureLibrary(true);
    const first = projectCharacterLayers(recipeOnHeavy(), library);
    const second = projectCharacterLayers(recipeOnHeavy(), library);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("withholds the warped garment and keeps its bands only as evidence", () => {
    const fitted = projectCharacterLayers(
      recipeOnHeavy(),
      fixtureLibrary(true),
    )!;
    const unfitted = projectCharacterLayers(
      recipeOnHeavy(),
      fixtureLibrary(false),
    )!;
    const top = fitted.layers.find(
      (layer) => layer.assetId === "fit_top_knit_average_standing_v1",
    )!;
    // A bounded warp is NOT RENDERABLE. The projection refuses it in one place
    // for every consumer: the layer is unreleased, named, and keeps the
    // UNFITTED rectangle rather than a bounding box somebody could paint.
    expect(top.released).toBe(false);
    expect(top.fitRefusal?.code).toBe("fit-warp-not-renderable");
    expect(fitted.fitRefusals.map((refusal) => refusal.assetId)).toEqual([
      top.assetId,
    ]);
    const before = unfitted.layers.find(
      (layer) => layer.assetId === top.assetId,
    )!;
    expect([top.left, top.top, top.width, top.height]).toEqual([
      before.left,
      before.top,
      before.width,
      before.height,
    ]);
    // The bands ride along as derivation evidence, fully described.
    const bands = top.fit!.bands!;
    expect(bands).toHaveLength(16);
    expect(bands[0]!.sourceTopFraction).toBe(0);
    expect(bands[bands.length - 1]!.sourceBottomFraction).toBe(1);
    for (let index = 1; index < bands.length; index += 1) {
      expect(bands[index]!.sourceTopFraction).toBe(
        bands[index - 1]!.sourceBottomFraction,
      );
      expect(bands[index]!.top).toBeCloseTo(
        bands[index - 1]!.top + bands[index - 1]!.height,
        10,
      );
    }
    // Each band says where the WHOLE raster would sit so that exactly its own
    // source rows land in its slice: the slice is that image's row window.
    for (const band of bands) {
      expect(band.image.left).toBe(band.left);
      expect(band.image.width).toBe(band.width);
      expect(band.top).toBeCloseTo(
        band.image.top + band.sourceTopFraction * band.image.height,
        10,
      );
      expect(band.height).toBeCloseTo(
        (band.sourceBottomFraction - band.sourceTopFraction) *
          band.image.height,
        10,
      );
    }
  });

  it("lets only the measurement harness see a warp as geometry", () => {
    const admitted = projectCharacterLayers(
      recipeOnHeavy(),
      fixtureLibrary(true),
      { admitUnrenderableWarps: true },
    )!;
    const top = admitted.layers.find(
      (layer) => layer.assetId === "fit_top_knit_average_standing_v1",
    )!;
    expect(top.fitRefusal).toBeNull();
    expect(top.released).toBe(true);
    const bands = top.fit!.bands!;
    expect(top.left).toBeCloseTo(
      Math.min(...bands.map((band) => band.left)),
      10,
    );
    expect(top.left + top.width).toBeCloseTo(
      Math.max(...bands.map((band) => band.left + band.width)),
      10,
    );
  });

  it("moves the affine garment and withholds the warped one, nothing else", () => {
    const fitted = projectCharacterLayers(
      recipeOnHeavy(),
      fixtureLibrary(true),
    )!;
    const byId = new Map(fitted.layers.map((layer) => [layer.assetId, layer]));
    expect(
      byId.get("fit_bottom_trousers_average_standing_v1")!.fit?.transformKind,
    ).toBe("affine");
    expect(byId.get("fit_bottom_trousers_average_standing_v1")!.released).toBe(
      true,
    );
    expect(byId.get("fit_footwear_derby_standing_v1")!.fit?.transformKind).toBe(
      "direct",
    );
    expect(byId.get("fit_accessory_badge_v1")!.fit?.transformKind).toBe(
      "direct",
    );
  });
});

/* -------------------------------------------------------------------------- */

describe("what the fit layer refuses", () => {
  it("never admits an unrenderable warp anywhere that renders", () => {
    // `admitUnrenderableWarps` exists for the measurement harness alone. If it
    // appears under src/, some consumer has started drawing a warp's bounding
    // rectangle, and the audit finding this repairs is back.
    const walk = (directory: string): string[] =>
      fs
        .readdirSync(directory, { withFileTypes: true })
        .flatMap((entry) =>
          entry.isDirectory()
            ? walk(path.join(directory, entry.name))
            : [path.join(directory, entry.name)],
        );
    const offenders = walk(path.join(ROOT, "src")).filter(
      (file) =>
        /\.tsx?$/.test(file) &&
        !/\.test\.tsx?$/.test(file) &&
        !file.endsWith("character-components.ts") &&
        fs.readFileSync(file, "utf-8").includes("admitUnrenderableWarps"),
    );
    expect(offenders).toEqual([]);
  });

  it("does not read or write any raster", () => {
    // The compositor and the fit module are pure geometry. If either ever
    // reaches for the filesystem, this is where it is noticed.
    for (const file of [
      "src/presentation/garment-fit.ts",
      "src/presentation/character-components.ts",
      "src/presentation/character-render-plan.ts",
    ]) {
      const source = fs.readFileSync(path.join(ROOT, file), "utf-8");
      expect(source).not.toMatch(/from "(node:)?fs"/);
      expect(source).not.toMatch(/require\(["'](node:)?fs["']\)/);
    }
  });

  it("keeps the fit out of the frozen catalog signature", () => {
    // A fit lives in its own bank precisely so a generation's signature cannot
    // move. If a fit field ever appeared on a component definition, the
    // signature of generation 2 would change and every person pinned to it
    // would resolve to different parts.
    const definitions = (
      assetManifest.assets as readonly { component?: Record<string, unknown> }[]
    )
      .map((asset) => asset.component)
      .filter((component): component is Record<string, unknown> => !!component);
    for (const definition of definitions) {
      expect(Object.keys(definition)).not.toContain("fit");
      expect(Object.keys(definition)).not.toContain("fit_profiles");
    }
  });

  it("reads a garment raster through its alpha, not its canvas", () => {
    // A sanity check on the harness itself. Every number in the report is a
    // painted extent: a transparent row is absent rather than reported as the
    // width of the canvas, and a painted row is narrower than the canvas it
    // sits in. Measuring canvases instead of paint is exactly the mistake 76A
    // section 5.2 found in the original sharing proof.
    const spans = readRasterSpans(
      fixtureSubject("fit_accessory_badge_v1").file,
    );
    const painted = spans.rows.filter((row) => row !== null);
    expect(painted.length).toBeGreaterThan(0);
    expect(painted.length).toBeLessThan(spans.rows.length);
    for (const row of painted) {
      expect(row!.hi - row!.lo + 1).toBeLessThan(spans.width);
    }
  });
});
