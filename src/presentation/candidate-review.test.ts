import { createHash } from "crypto";
import { readFileSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import assetManifest from "../../art/manifest/asset_manifest.json";
import candidateRegistry from "../../art/manifest/character_candidate_registry.json";
import admissionReport from "../../art/qa/p95-wave-a-morphology/wave-a-admission-report.json";
import {
  CHARACTER_UNRESOLVED_FAMILY,
  computeCharacterGenerationSignature,
  resolveCharacterRecipe,
  validateCharacterComponentCandidates,
  validateCharacterComponentLibrary,
  validateProductionBodyAnchors,
  type CharacterComponentManifestRecord,
} from "./character-components";
import {
  admittedCandidateBodies,
  composeCandidateReviewSubject,
  findReviewAppearanceForBody,
  reviewCandidateBody,
  reviewAnchorFor,
  reviewPlacementFor,
  CANDIDATE_REVIEW_FLOOR_Y_PERCENT,
  CANDIDATE_REVIEW_PLATE,
  WAVE_A_ADMITTED_ASSET_IDS,
  WAVE_A_CANDIDATE_RECORDS,
  WAVE_A_REVIEW_CHARACTER_LIBRARY,
  WAVE_A_REVIEW_VISUAL_LIBRARY,
} from "./candidate-review";
import { buildCharacterRenderPlan } from "./character-render-plan";
import {
  PRODUCTION_CHARACTER_LIBRARY,
  PRODUCTION_VISUAL_LIBRARY,
} from "./visual-integration";

const REPOSITORY_ROOT = path.resolve(__dirname, "../..");

interface ReportRow {
  readonly assetId: string;
  readonly outputPath: string;
  readonly disposition: string;
  readonly registeredPoseFamily: string | null;
  readonly sourceBytesUnchanged: boolean;
  readonly recordedOutputSha256: string;
  readonly observedOutputSha256: string;
  readonly observation: {
    readonly facing: string;
    readonly bakedProp: string;
    readonly extent: string;
    readonly confidence: string;
  };
  readonly unresolved: readonly string[];
}

const rows = admissionReport.candidates as readonly ReportRow[];

describe("Wave A candidate admission", () => {
  it("registers every admitted body as an honest candidate", () => {
    expect(
      validateCharacterComponentCandidates(WAVE_A_CANDIDATE_RECORDS),
    ).toEqual([]);
    for (const record of WAVE_A_CANDIDATE_RECORDS) {
      expect(record.asset_type).toBe("character-component-candidate");
      expect(record.runtime_release_status).toBe("unreleased");
      expect(record.component).toBeUndefined();
    }
  });

  it("keeps candidates out of the production library and catalog", () => {
    const productionIds = new Set(
      (assetManifest.assets as readonly CharacterComponentManifestRecord[]).map(
        (record) => record.asset_id,
      ),
    );
    for (const record of WAVE_A_CANDIDATE_RECORDS) {
      expect(
        productionIds.has(record.asset_id),
        `${record.asset_id} must not appear in the production manifest`,
      ).toBe(false);
      expect(PRODUCTION_CHARACTER_LIBRARY.components.has(record.asset_id)).toBe(
        false,
      );
      expect(PRODUCTION_VISUAL_LIBRARY.has(record.asset_id)).toBe(false);
    }
    for (const generation of PRODUCTION_CHARACTER_LIBRARY.generations) {
      for (const id of generation.component_ids) {
        expect(WAVE_A_ADMITTED_ASSET_IDS.has(id)).toBe(false);
      }
    }
  });

  it("leaves every frozen production generation signature unchanged", () => {
    // The signature is recomputed from what the library actually holds. If a
    // candidate had leaked into a generation, or a definition had been edited
    // to make one fit, this is where the ledger would stop agreeing with it.
    for (const generation of PRODUCTION_CHARACTER_LIBRARY.generations) {
      const members = generation.component_ids.map((assetId) => {
        const component = PRODUCTION_CHARACTER_LIBRARY.components.get(assetId);
        expect(component, assetId).toBeDefined();
        return { assetId, definition: component!.definition };
      });
      expect(computeCharacterGenerationSignature(members)).toBe(
        generation.signature,
      );
    }
  });

  it("keeps the production library structurally valid", () => {
    expect(
      validateCharacterComponentLibrary(
        assetManifest.assets as readonly CharacterComponentManifestRecord[],
        {
          catalog_generation: PRODUCTION_CHARACTER_LIBRARY.catalogGeneration,
          slots: PRODUCTION_CHARACTER_LIBRARY.slots,
          generations: PRODUCTION_CHARACTER_LIBRARY.generations,
        },
      ),
    ).toEqual([]);
  });

  it("reports the source crop bytes it actually measured", () => {
    for (const row of rows) {
      expect(row.sourceBytesUnchanged, row.assetId).toBe(true);
      expect(row.observedOutputSha256).toBe(row.recordedOutputSha256);
    }
  });

  it("has not modified a single Wave A source crop", () => {
    // Re-hashing here rather than trusting the report: the report is generated
    // by the same run that could have rewritten a raster.
    for (const record of WAVE_A_CANDIDATE_RECORDS) {
      const bytes = readFileSync(
        path.join(REPOSITORY_ROOT, record.final_path!),
      );
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        record.hash,
      );
    }
  });

  it("admits only propless, complete, front-facing figures", () => {
    for (const row of rows) {
      if (row.disposition !== "admitted-candidate-body") continue;
      expect(row.observation.bakedProp, row.assetId).toBe("none");
      expect(row.observation.extent, row.assetId).toBe("complete-figure");
      expect(row.observation.facing, row.assetId).toBe("front");
      expect(row.observation.confidence, row.assetId).toBe("high");
      expect(row.registeredPoseFamily, row.assetId).not.toBeNull();
    }
  });

  it("retains every crop it did not admit, with a named reason", () => {
    const retained = rows.filter(
      (row) => row.disposition !== "admitted-candidate-body",
    );
    expect(rows).toHaveLength(51);
    expect(retained.length + WAVE_A_CANDIDATE_RECORDS.length).toBe(51);
    for (const row of retained) {
      expect(row.disposition, row.assetId).toMatch(/^retained-/);
      expect(row.registeredPoseFamily, row.assetId).toBeNull();
    }
  });

  it("records what it could not measure instead of filling it in", () => {
    for (const row of rows) {
      expect(row.unresolved.join(" "), row.assetId).toContain("brow");
    }
    for (const record of WAVE_A_CANDIDATE_RECORDS) {
      const anchors = record.candidate_component!.attachment_anchors ?? [];
      expect(anchors.map((anchor) => anchor.id)).not.toContain("brow");
    }
  });

  it("is refused by the production body-anchor gate, which is the correct answer", () => {
    for (const record of WAVE_A_CANDIDATE_RECORDS) {
      const errors = validateProductionBodyAnchors(
        record.candidate_component!,
        record.asset_id,
      );
      expect(errors.join(" "), record.asset_id).toContain("brow");
    }
  });

  it("keeps the measured waistband at or below the emitted root", () => {
    for (const record of WAVE_A_CANDIDATE_RECORDS) {
      const definition = record.candidate_component!;
      const hips = (definition.attachment_anchors ?? []).find(
        (anchor) => anchor.id === "hips",
      );
      expect(hips, record.asset_id).toBeDefined();
      expect(hips!.y).toBeGreaterThanOrEqual(definition.root!.y);
    }
  });
});

describe("Wave A review composition", () => {
  const admitted = [...WAVE_A_ADMITTED_ASSET_IDS].sort();

  it("composes every admitted body through the accepted render plan", () => {
    for (const assetId of admitted) {
      const subject = composeCandidateReviewSubject({
        library: WAVE_A_REVIEW_CHARACTER_LIBRARY,
        visualLibrary: WAVE_A_REVIEW_VISUAL_LIBRARY,
        bodyAssetId: assetId,
        plate: CANDIDATE_REVIEW_PLATE,
      });
      expect(subject, assetId).not.toBeNull();
      const bodyLayer = subject!.plan.layers.find(
        (layer) => layer.kind === "body",
      );
      expect(bodyLayer?.assetId, assetId).toBe(assetId);
      expect(bodyLayer?.url, assetId).toBeTruthy();
      expect(subject!.plan.box.widthPercent).toBeGreaterThan(0);
      expect(subject!.plan.box.heightPercent).toBeGreaterThan(0);
    }
  });

  it("refuses to call a Wave A body complete, and names every empty slot", () => {
    for (const assetId of admitted) {
      const subject = composeCandidateReviewSubject({
        library: WAVE_A_REVIEW_CHARACTER_LIBRARY,
        visualLibrary: WAVE_A_REVIEW_VISUAL_LIBRARY,
        bodyAssetId: assetId,
        plate: CANDIDATE_REVIEW_PLATE,
      });
      expect(subject!.plan.complete, assetId).toBe(false);
      expect(subject!.plan.missing.sort()).toEqual([
        "slot:bottom",
        "slot:footwear",
        "slot:head",
        "slot:top",
      ]);
      expect(subject!.plan.layers).toHaveLength(1);
      expect(
        subject!.plan.diagnostics.some(
          (diagnostic) => diagnostic.code === "required-family-unavailable",
        ),
        assetId,
      ).toBe(true);
    }
  });

  it("gives every refused slot a contract reason, never silence", () => {
    for (const assetId of admitted) {
      const review = reviewCandidateBody(
        WAVE_A_REVIEW_CHARACTER_LIBRARY,
        assetId,
      );
      expect(review.completable, assetId).toBe(false);
      for (const slot of review.slots) {
        if (slot.compatible.length === 0) {
          expect(slot.refusal, `${assetId}:${slot.slotId}`).toBeTruthy();
        } else {
          expect(slot.refusal, `${assetId}:${slot.slotId}`).toBeNull();
        }
      }
    }
  });

  it("still finishes the banked pg bodies, so the review pool is not simply broken", () => {
    const pg = reviewCandidateBody(
      WAVE_A_REVIEW_CHARACTER_LIBRARY,
      "pg_body_fl_standing_v1",
    );
    expect(pg.completable).toBe(true);
    const subject = composeCandidateReviewSubject({
      library: WAVE_A_REVIEW_CHARACTER_LIBRARY,
      visualLibrary: WAVE_A_REVIEW_VISUAL_LIBRARY,
      bodyAssetId: "pg_body_fl_standing_v1",
      plate: CANDIDATE_REVIEW_PLATE,
    });
    expect(subject!.plan.complete).toBe(true);
    expect(subject!.plan.missing).toEqual([]);
  });

  it("holds identity across a repeat render and a second scene context", () => {
    const assetId = "wave_a_average_woman_seated_front_neutral_v1";
    const poseFamily = "seated-guest-neutral";
    const appearance = findReviewAppearanceForBody(
      WAVE_A_REVIEW_CHARACTER_LIBRARY,
      assetId,
      poseFamily,
    )!;
    expect(appearance).toBeDefined();

    const here = buildCharacterRenderPlan({
      personId: "review-subject",
      appearance,
      anchor: reviewAnchorFor(poseFamily, "a", 30),
      plate: CANDIDATE_REVIEW_PLATE,
      library: WAVE_A_REVIEW_CHARACTER_LIBRARY,
      visualLibrary: WAVE_A_REVIEW_VISUAL_LIBRARY,
      unresolvableRequiredSlots: "diagnose",
    });
    const again = buildCharacterRenderPlan({
      personId: "review-subject",
      appearance,
      anchor: reviewAnchorFor(poseFamily, "a", 30),
      plate: CANDIDATE_REVIEW_PLATE,
      library: WAVE_A_REVIEW_CHARACTER_LIBRARY,
      visualLibrary: WAVE_A_REVIEW_VISUAL_LIBRARY,
      unresolvableRequiredSlots: "diagnose",
    });
    const elsewhere = buildCharacterRenderPlan({
      personId: "review-subject",
      appearance,
      anchor: reviewAnchorFor(poseFamily, "b", 78),
      plate: CANDIDATE_REVIEW_PLATE,
      library: WAVE_A_REVIEW_CHARACTER_LIBRARY,
      visualLibrary: WAVE_A_REVIEW_VISUAL_LIBRARY,
      unresolvableRequiredSlots: "diagnose",
    });

    expect(again.recipeKey).toBe(here.recipeKey);
    expect(elsewhere.recipeKey).toBe(here.recipeKey);
    expect(elsewhere.identity).toEqual(here.identity);
    // Only the placement moved.
    expect(elsewhere.box.leftPercent).not.toBe(here.box.leftPercent);
  });

  it("does not change a saved production person when the registry grows", () => {
    // A person saved against the production catalog is resolved here from the
    // production library, which the admission never touches. The assertion is
    // that the recipe key is a pure function of appearance and catalog, so a
    // new candidate registry file cannot reach it.
    const appearance = {
      seed: "app_02b4075ba151f919",
      recipeVersion: "appearance-recipe-v1",
      catalogGeneration: 1,
    };
    const before = resolveCharacterRecipe(
      { appearance, poseFamily: "standing-neutral", catalogGeneration: 1 },
      PRODUCTION_CHARACTER_LIBRARY,
    );
    expect(before.identity.bodyFamily).not.toMatch(/^wave-a-/);
    expect(before.identity.headFamily).not.toBe(CHARACTER_UNRESOLVED_FAMILY);
    expect(
      Object.values(before.identity.slots).every(
        (family) => family === null || !family.startsWith("wave-a-"),
      ),
    ).toBe(true);
  });

  it("still throws for an unfinishable identity outside review admission", () => {
    // The narrow review escape must stay narrow: without it, a body the library
    // cannot dress is an error, not a half-drawn person.
    const appearance = findReviewAppearanceForBody(
      WAVE_A_REVIEW_CHARACTER_LIBRARY,
      "wave_a_fat_man_standing_neutral_front_a_v1",
      "standing-neutral",
    )!;
    expect(() =>
      resolveCharacterRecipe(
        { appearance, poseFamily: "standing-neutral" },
        WAVE_A_REVIEW_CHARACTER_LIBRARY,
      ),
    ).toThrow(/No head family is compatible/);
  });

  it("refuses a pose no admitted body was measured in", () => {
    const appearance = findReviewAppearanceForBody(
      WAVE_A_REVIEW_CHARACTER_LIBRARY,
      "wave_a_fat_man_standing_neutral_front_a_v1",
      "standing-neutral",
    )!;
    const plan = buildCharacterRenderPlan({
      personId: "review-subject",
      appearance,
      anchor: reviewAnchorFor("standing-podium-or-lectern"),
      plate: CANDIDATE_REVIEW_PLATE,
      library: WAVE_A_REVIEW_CHARACTER_LIBRARY,
      visualLibrary: WAVE_A_REVIEW_VISUAL_LIBRARY,
      unresolvableRequiredSlots: "diagnose",
    });
    expect(plan.complete).toBe(false);
    expect(plan.layers).toEqual([]);
    expect(plan.missing.join(" ")).toContain("standing-podium-or-lectern");
  });

  it("stands a measured body on the declared floor line, and says so when it cannot", () => {
    const withContacts = reviewPlacementFor(
      WAVE_A_REVIEW_CHARACTER_LIBRARY,
      "wave_a_fat_man_standing_neutral_front_a_v1",
      CANDIDATE_REVIEW_PLATE,
    );
    expect(withContacts.basis).toBe("measured-foot-contact");
    expect(withContacts.note).toBeNull();

    // This crop's sole band resolves something other than two feet, so the
    // admission declined to declare a floor line for it. The review surface
    // must repeat that refusal rather than place it as if it were measured.
    const withoutContacts = reviewPlacementFor(
      WAVE_A_REVIEW_CHARACTER_LIBRARY,
      "wave_a_average_man_standing_neutral_front_b_v1",
      CANDIDATE_REVIEW_PLATE,
    );
    expect(withoutContacts.basis).toBe("rig-root");
    expect(withoutContacts.note).toContain("foot contacts");
  });

  it("puts every contact-placed sole on the same line", () => {
    const soles = [...WAVE_A_ADMITTED_ASSET_IDS]
      .map((assetId) => {
        const placement = reviewPlacementFor(
          WAVE_A_REVIEW_CHARACTER_LIBRARY,
          assetId,
          CANDIDATE_REVIEW_PLATE,
        );
        if (placement.basis !== "measured-foot-contact") return null;
        const body =
          WAVE_A_REVIEW_CHARACTER_LIBRARY.components.get(assetId)!.definition;
        const widthPercent =
          placement.anchor.bodyWidthPercent * placement.anchor.scale;
        const heightPercent =
          (widthPercent / (body.canvas.width / body.canvas.height)) *
          (CANDIDATE_REVIEW_PLATE.width / CANDIDATE_REVIEW_PLATE.height);
        const top = placement.anchor.yPercent - body.root!.y * heightPercent;
        return top + body.contacts!.leftFoot!.y * heightPercent;
      })
      .filter((value): value is number => value !== null);
    expect(soles.length).toBeGreaterThanOrEqual(10);
    for (const sole of soles) {
      expect(sole).toBeCloseTo(CANDIDATE_REVIEW_FLOOR_Y_PERCENT, 6);
    }
  });

  it("enumerates a stable review set", () => {
    const bodies = admittedCandidateBodies();
    expect(
      bodies.filter((b) => WAVE_A_ADMITTED_ASSET_IDS.has(b.assetId)),
    ).toHaveLength(12);
    expect(admittedCandidateBodies()).toEqual(bodies);
  });
});

describe("candidate registry file", () => {
  it("declares itself candidate-only", () => {
    expect(candidateRegistry.release_status).toBe("CANDIDATE_REFERENCE_ONLY");
    expect(candidateRegistry.production_pixels_released).toBe(false);
  });
});
