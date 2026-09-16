import { createHash } from "node:crypto";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  POSE41_VARIANTS,
  resolvePose41,
  type Pose41Request,
  type Pose41Variant,
} from "./pose41-adapter";
import { PRIVATE_CANDIDATE_ART_AVAILABLE } from "./private-candidate-manifests";

// POSE41 source art is owner-private and absent from a public checkout.
const legacy = Object.values(
  import.meta.glob<{ readonly variants: readonly Pose41Variant[] }>(
    "../../art/authoring/pose41/legacy-gen9.json",
    { eager: true, import: "default" },
  ),
)[0] ?? { variants: [] };

const request = (index = 0): Pose41Request => {
  const v = POSE41_VARIANTS[index]!;
  return {
    pose: v.pose,
    bodyAssetId: v.sourceBodyAssetIds[0]!,
    headAssetId: v.sourceHeadAssetIds[0]!,
    hairAssetId: v.sourceHairAssetIds[0]!,
    outfitAssetIds: [...v.outfitAssetIds],
    candidatePreview: true,
  };
};
describe.skipIf(!PRIVATE_CANDIDATE_ART_AVAILABLE)(
  "POSE41 source compatibility and identity continuity",
  () => {
    it("retains the frozen pose bank plus the MODULAR41 repaired-head variants", () => {
      expect(POSE41_VARIANTS).toHaveLength(42);
      for (const old of legacy.variants) {
        expect(POSE41_VARIANTS.find((v) => v.id === old.id)).toEqual(old);
        expect(
          resolvePose41({
            pose: "seated-guest-neutral",
            bodyAssetId: old.sourceBodyAssetIds[0]!,
            headAssetId: old.sourceHeadAssetIds[0]!,
            hairAssetId: old.sourceHairAssetIds[0]!,
            outfitAssetIds: old.outfitAssetIds,
            candidatePreview: true,
          }).status,
        ).toBe("ready");
      }
      expect(
        new Set(
          POSE41_VARIANTS.filter((v) =>
            v.sourceBodyAssetIds[0]!.startsWith("ep41-"),
          ).map((v) => v.family),
        ).size,
      ).toBe(6);
    });
    it("requires private preview and preserves ordinary standing eligibility on pose gaps", () => {
      expect(resolvePose41({ ...request(), candidatePreview: false })).toEqual({
        status: "unavailable",
        reason: "private-preview-required",
      });
      expect(
        resolvePose41({ ...request(), bodyAssetId: "uncovered-body" }),
      ).toEqual({ status: "unavailable", reason: "pose-fit-missing" });
    });
    it("refuses another face/hair or an unfitted, missing, extra or duplicate garment", () => {
      const r = request();
      for (const patch of [
        { headAssetId: "someone-else" },
        { hairAssetId: null },
        { outfitAssetIds: r.outfitAssetIds.slice(1) },
        { outfitAssetIds: [...r.outfitAssetIds, "coat"] },
        { outfitAssetIds: r.outfitAssetIds.map(() => r.outfitAssetIds[0]!) },
      ]) {
        expect(resolvePose41({ ...r, ...patch }).status).toBe("unavailable");
      }
    });
    it("resolves deterministic source layers across JSON save/reopen without mutating identity or outfit", () => {
      for (let i = 0; i < POSE41_VARIANTS.length; i++) {
        const r = request(i);
        const saved = JSON.stringify(r);
        Object.freeze(r.outfitAssetIds);
        Object.freeze(r);
        const result = resolvePose41(r);
        expect(result.status).toBe("ready");
        expect(resolvePose41(JSON.parse(saved))).toEqual(result);
        expect(JSON.stringify(r)).toBe(saved);
        expect(
          resolvePose41({
            ...r,
            outfitAssetIds: [...r.outfitAssetIds].reverse(),
          }),
        ).toEqual(result);
      }
    });
    it("fails closed when any source cannot resolve", () => {
      expect(
        resolvePose41(request(), POSE41_VARIANTS, () => undefined),
      ).toEqual({
        status: "unavailable",
        reason: "pose-source-unavailable",
      });
    });
    it("ships exact hashed assets, explicit native contacts and separate identity paint", () => {
      for (const v of POSE41_VARIANTS) {
        expect(v.contacts.leftFoot.y).toBeGreaterThan(
          v.contacts.seatedPelvis?.y ?? v.contacts.crown.y,
        );
        expect(v.contacts.rightFoot.y).toBeGreaterThan(v.contacts.crown.y);
        expect(v.alphaBounds.x).toBeGreaterThanOrEqual(0);
        expect(v.alphaBounds.x + v.alphaBounds.width).toBeLessThanOrEqual(
          v.canvas.width,
        );
        expect(v.standingReference.soleY).toBeGreaterThan(
          v.standingReference.crownY,
        );
        expect(v.humanAcceptance).toBe("pending");
        expect(v.layers.some((l) => l.kind === "head")).toBe(true);
        for (const layer of v.layers)
          expect(
            createHash("sha256")
              .update(fs.readFileSync(layer.path))
              .digest("hex"),
          ).toBe(layer.sha256);
      }
    });
  },
);
