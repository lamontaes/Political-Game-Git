import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import assetManifest from "../../art/manifest/asset_manifest.json";
import poseRegistryData from "../../art/manifest/pose_families.json";
import type { CharacterComponentManifestRecord } from "./character-components";
import { resolveCharacterRecipe } from "./character-components";
import { createCharacterComponentLibrary } from "./character-components";
import characterCatalog from "../../art/manifest/character_catalog.json";
import type { CharacterCatalogData } from "./character-components";
import {
  poseControlPlatePath,
  renderPoseControlPlate,
} from "./pose-control-plate";
import {
  createPoseFamilyRegistry,
  indexPoseArt,
  reportPoseCoverage,
  requirePoseFamily,
  resolvePoseForRequest,
  validatePoseFamilyRegistry,
  type PoseFamilyRegistryData,
} from "./pose-families";

const records = assetManifest.assets as readonly CharacterComponentManifestRecord[];
const data = poseRegistryData as PoseFamilyRegistryData;
const registry = createPoseFamilyRegistry(data);
const art = indexPoseArt(records);
const library = createCharacterComponentLibrary(
  records,
  characterCatalog as CharacterCatalogData,
);

function clone(): PoseFamilyRegistryData {
  return JSON.parse(JSON.stringify(data)) as PoseFamilyRegistryData;
}

function mutate(
  poseFamilyId: string,
  change: (family: Record<string, unknown>) => void,
): PoseFamilyRegistryData {
  const copy = clone();
  const family = copy.families.find(
    (candidate) => candidate.pose_family_id === poseFamilyId,
  );
  if (!family) throw new Error(`No pose family '${poseFamilyId}' to mutate.`);
  change(family as unknown as Record<string, unknown>);
  return copy;
}

describe("pose family registry", () => {
  it("validates the production registry against the production components", () => {
    expect(validatePoseFamilyRegistry(data, records)).toEqual([]);
  });

  it("registers the four P0 families and no unfinished vocabulary", () => {
    const p0 = [...registry.families.values()]
      .filter((family) => family.priority === "P0")
      .map((family) => family.pose_family_id)
      .sort();
    expect(p0).toEqual([
      "seated-at-desk",
      "seated-guest-neutral",
      "standing-conversational",
      "standing-neutral",
    ]);
    for (const family of registry.families.values()) {
      expect(family.facing).toBe("front");
    }
  });

  it("rejects a landmark set that folds the wrong way", () => {
    const broken = mutate("standing-neutral", (family) => {
      (family.landmarks as Record<string, { x: number; y: number }>)[
        "knee-left"
      ] = { x: 0.39, y: 0.1 };
    });
    expect(validatePoseFamilyRegistry(broken, records).join("\n")).toContain(
      "a human body does not fold that way",
    );
  });

  it("rejects foot contacts that are out of order or off the lower body", () => {
    const swapped = mutate("standing-neutral", (family) => {
      family.contacts = {
        leftFoot: { x: 0.62, y: 0.985 },
        rightFoot: { x: 0.38, y: 0.985 },
      };
    });
    expect(validatePoseFamilyRegistry(swapped, records).join("\n")).toContain(
      "foot contacts are ordered",
    );

    const floating = mutate("standing-neutral", (family) => {
      family.contacts = {
        leftFoot: { x: 0.38, y: 0.5 },
        rightFoot: { x: 0.62, y: 0.5 },
      };
    });
    expect(validatePoseFamilyRegistry(floating, records).join("\n")).toContain(
      "above the plausible lower-body band",
    );
  });

  it("requires a seated pose to declare the pelvis that lands on a seat plane", () => {
    const noPelvis = mutate("seated-at-desk", (family) => {
      family.contacts = {
        leftFoot: { x: 0.37, y: 0.975 },
        rightFoot: { x: 0.63, y: 0.975 },
      };
    });
    expect(validatePoseFamilyRegistry(noPelvis, records).join("\n")).toContain(
      "must declare a 'seatedPelvis' contact",
    );
  });

  it("rejects a body whose own contacts drift outside its pose family's tolerance", () => {
    const drifted = records.map((record) =>
      record.asset_id === "dev_g2_body_slim_light_standing_v1"
        ? {
            ...record,
            component: {
              ...record.component!,
              contacts: {
                leftFoot: { x: 0.38, y: 0.7 },
                rightFoot: { x: 0.62, y: 0.7 },
              },
            },
          }
        : record,
    );
    expect(validatePoseFamilyRegistry(data, drifted).join("\n")).toContain(
      "outside pose family 'standing-neutral' tolerance",
    );
  });

  it("rejects a body that claims a pose family the registry does not define", () => {
    const invented = records.map((record) =>
      record.asset_id === "dev_g2_body_slim_light_standing_v1"
        ? {
            ...record,
            component: { ...record.component!, pose_family: "standing-heroic" },
          }
        : record,
    );
    expect(validatePoseFamilyRegistry(data, invented).join("\n")).toContain(
      "declares pose family 'standing-heroic', which the pose registry does not define",
    );
  });

  it("rejects a production status that the library contradicts, in both directions", () => {
    const overclaimed = mutate("standing-conversational", (family) => {
      family.production_status = "production-ready";
    });
    expect(
      validatePoseFamilyRegistry(overclaimed, records).join("\n"),
    ).toContain("but no released body art declares that pose");

    const underclaimed = mutate("standing-neutral", (family) => {
      family.production_status = "pending-generation";
    });
    expect(
      validatePoseFamilyRegistry(underclaimed, records).join("\n"),
    ).toContain("already declare it");
  });

  it("requires an unverified contact claim to say why", () => {
    const silent = mutate("seated-guest-neutral", (family) => {
      family.contact_verification = { status: "declared-unverified" };
    });
    expect(validatePoseFamilyRegistry(silent, records).join("\n")).toContain(
      "must say why in 'contact_verification.reason'",
    );
  });

  it("keeps the frozen generation-1 body family exempt only by explicit record", () => {
    expect(registry.legacyContactlessBodyFamilies.has("dev-adult")).toBe(true);
    const withoutExemption = clone();
    (withoutExemption as { legacy_contactless_body_families: string[] })
      .legacy_contactless_body_families = [];
    expect(
      validatePoseFamilyRegistry(withoutExemption, records).join("\n"),
    ).toContain("is not recorded in 'legacy_contactless_body_families'");
  });
});

describe("pose resolution at an anchor", () => {
  const seatedRequest = {
    anchorId: "left-guest-chair",
    permittedPoseFamilies: ["seated-guest-neutral", "seated-at-desk"],
    permittedFacings: ["front"],
    hasSeatContact: true,
    bodyFamily: "dev-g2-slim",
  };

  it("names the exact compatibility gap when the preferred pose has no art", () => {
    const resolution = resolvePoseForRequest(seatedRequest, registry, art);
    expect(resolution.poseFamily?.pose_family_id).toBe("seated-at-desk");
    const substitution = resolution.gaps.find(
      (gap) => gap.code === "preferred-pose-substituted",
    );
    expect(substitution?.poseFamilyId).toBe("seated-guest-neutral");
    expect(substitution?.message).toContain("dev-g2-slim");
    expect(substitution?.message).toContain("seated-at-desk");
  });

  it("never substitutes a pose the anchor did not permit", () => {
    const resolution = resolvePoseForRequest(
      { ...seatedRequest, permittedPoseFamilies: ["seated-guest-neutral"] },
      registry,
      art,
    );
    expect(resolution.poseFamily).toBeNull();
    expect(resolution.gaps.map((gap) => gap.code)).toContain(
      "no-released-art-for-permitted-pose",
    );
    expect(resolution.gaps[0]!.message).toContain("seated-guest-neutral");
  });

  it("reports a body family gap separately from a missing pose", () => {
    const resolution = resolvePoseForRequest(
      { ...seatedRequest, bodyFamily: "dev-not-a-family" },
      registry,
      art,
    );
    expect(resolution.poseFamily).toBeNull();
    const gap = resolution.gaps.find(
      (candidate) => candidate.code === "no-art-for-body-family",
    );
    expect(gap?.message).toContain("dev-not-a-family");
    expect(gap?.message).toContain("dev-adult");
  });

  it("refuses a standing pose at a seat and a seated pose on a floor", () => {
    const atSeat = resolvePoseForRequest(
      { ...seatedRequest, permittedPoseFamilies: ["standing-neutral"] },
      registry,
      art,
    );
    expect(atSeat.poseFamily).toBeNull();
    expect(atSeat.gaps[0]!.code).toBe("posture-class-mismatch");

    const onFloor = resolvePoseForRequest(
      {
        ...seatedRequest,
        anchorId: "doorway-standing",
        hasSeatContact: false,
        permittedPoseFamilies: ["seated-at-desk"],
      },
      registry,
      art,
    );
    expect(onFloor.poseFamily).toBeNull();
    expect(onFloor.gaps[0]!.code).toBe("posture-class-mismatch");
  });

  it("reports an anchor that permits a pose the registry does not define", () => {
    const resolution = resolvePoseForRequest(
      { ...seatedRequest, permittedPoseFamilies: ["seated-in-a-hammock"] },
      registry,
      art,
    );
    expect(resolution.poseFamily).toBeNull();
    expect(resolution.gaps[0]!.code).toBe("anchor-permits-no-registered-pose");
  });
});

describe("pose coverage", () => {
  const coverage = reportPoseCoverage(registry, art);

  it("reports the P0 gaps by name rather than as a count", () => {
    expect(coverage.p0Gaps.map((row) => row.poseFamilyId).sort()).toEqual([
      "seated-guest-neutral",
      "standing-conversational",
    ]);
    for (const row of coverage.p0Gaps) {
      expect(row.coveredBodyFamilies).toEqual([]);
      expect(row.missingBodyFamilies.length).toBeGreaterThan(0);
    }
  });

  it("reports the two families that do have art as covered", () => {
    const covered = coverage.rows
      .filter((row) => row.covered)
      .map((row) => row.poseFamilyId)
      .sort();
    expect(covered).toEqual(["seated-at-desk", "standing-neutral"]);
  });
});

describe("pose identity independence", () => {
  it("keeps one person's identity fixed across every pose family with art", () => {
    const appearance = { seed: "app_pose_probe_1", recipeVersion: "appearance-recipe-v1" };
    const identities = ["standing-neutral", "seated-at-desk"].map(
      (poseFamily) =>
        JSON.stringify(
          resolveCharacterRecipe({ appearance, poseFamily }, library).identity,
        ),
    );
    expect(new Set(identities).size).toBe(1);
  });
});

describe("pose control plates", () => {
  const repositoryRoot = path.resolve(__dirname, "../..");

  it("re-derives byte-for-byte to the plate recorded on every family", () => {
    for (const family of registry.families.values()) {
      const expectedPath = poseControlPlatePath(family);
      expect(family.control_plate.path).toBe(expectedPath);
      const onDisk = fs.readFileSync(
        path.join(repositoryRoot, expectedPath),
        "utf8",
      );
      expect(onDisk).toBe(renderPoseControlPlate(family));
    }
  });

  it("is deterministic and carries no text a generator could read", () => {
    const family = requirePoseFamily(registry, "standing-neutral");
    const first = renderPoseControlPlate(family);
    expect(renderPoseControlPlate(family)).toBe(first);
    expect(first).not.toContain("<text");
    expect(first).not.toContain("font-");
  });

  it("draws every landmark, both contacts and the skull above the body canvas", () => {
    const family = requirePoseFamily(registry, "standing-neutral");
    const plate = renderPoseControlPlate(family);
    // 18 landmark joints, drawn as filled circles.
    expect(plate.match(/<circle[^>]*fill="#ffffff"/g)?.length).toBe(18);
    // Two contacts, drawn as open rings in the contact colour.
    expect(plate.match(/stroke="#ff6a3d"/g)?.length).toBe(2);
    // The skull sits above y=0 because the body canvas is headless.
    expect(plate).toMatch(/<ellipse cx="540.00" cy="\d+\.\d+"/);
    expect(plate).toContain('viewBox="0 -76.80');
  });

  it("changes when a landmark changes, so a stale plate cannot pass", () => {
    const family = requirePoseFamily(registry, "standing-neutral");
    const moved = {
      ...family,
      landmarks: {
        ...family.landmarks,
        "hand-left": { x: 0.2, y: 0.5 },
      },
    };
    expect(renderPoseControlPlate(moved)).not.toBe(
      renderPoseControlPlate(family),
    );
  });
});
