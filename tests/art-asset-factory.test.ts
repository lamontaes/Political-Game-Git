import { describe, it, expect } from "vitest";
import { validateArtAssets } from "../scripts/art-asset-factory/validate";
import { hashArtFile } from "../scripts/art-asset-factory/content-hash";
import {
  generateInventory,
  detectDuplicateHashes,
} from "../scripts/art-asset-factory/inventory";
import {
  generateContactSheetHtml,
  generateComparisonSheetHtml,
  parseImageMetadata,
} from "../scripts/art-asset-factory/qa";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";
import type {
  AssetManifest,
  EnvironmentFamiliesData,
  JurisdictionDeltasData,
  ProvenanceData,
} from "../scripts/art-asset-factory/schemas";
import { extractChromaToPng } from "../scripts/art-asset-factory/chroma-extract";
import * as PImage from "pureimage";
import {
  deriveOfficeRuntimePlate,
  OFFICE_PLATE_LANCZOS_LOBES,
  OFFICE_PLATE_RUNTIME_SCALE,
} from "../scripts/art-asset-factory/office-plate-derive";

const REPO_ROOT = path.resolve(__dirname, "..");

function loadJson(relPath: string) {
  const fullPath = path.join(REPO_ROOT, relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
}

async function writeRgbaPng(
  filePath: string,
  width: number,
  height: number,
  alphaAtPixel: (pixelIndex: number) => number,
) {
  const image = PImage.make(width, height);
  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    image.data[offset] = 40;
    image.data[offset + 1] = 80;
    image.data[offset + 2] = 120;
    image.data[offset + 3] = alphaAtPixel(pixelIndex);
  }
  await PImage.encodePNGToStream(image, fs.createWriteStream(filePath));
}

const EMPTY_FAMILIES: EnvironmentFamiliesData = { families: [] };
const EMPTY_DELTAS: JurisdictionDeltasData = { deltas: [] };

interface SyntheticRuntimeFixture {
  repositoryRoot: string;
  filePath: string;
  manifest: AssetManifest;
  provenance: ProvenanceData;
}

function createSyntheticRuntimeFixture(): SyntheticRuntimeFixture {
  const repositoryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "art-runtime-release-"),
  );
  const filePath = path.join(
    repositoryRoot,
    "art",
    "fixtures",
    "synthetic-runtime.png",
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "synthetic runtime art fixture");

  return {
    repositoryRoot,
    filePath,
    manifest: {
      assets: [
        {
          asset_id: "synthetic_runtime_asset",
          asset_type: "fixture",
          hero_asset: false,
          reuse_allowed: true,
          generation_status: "approved",
          qa_status: "approved",
          runtime_release_status: "released",
          final_path: "art/fixtures/synthetic-runtime.png",
          hash: hashArtFile(filePath),
        },
      ],
    },
    provenance: {
      entries: [
        {
          provenance_id: "prov_synthetic_runtime_asset",
          asset_id: "synthetic_runtime_asset",
          rights_license_status: "owned",
          reference_type: "hand-authored",
          approval_status: "approved",
        },
      ],
    },
  };
}

function validateSyntheticFixture(fixture: SyntheticRuntimeFixture) {
  return validateArtAssets(
    fixture.manifest,
    EMPTY_FAMILIES,
    EMPTY_DELTAS,
    fixture.provenance,
    { repositoryRoot: fixture.repositoryRoot },
  );
}

function removeSyntheticRuntimeFixture(fixture: SyntheticRuntimeFixture) {
  fs.rmSync(fixture.repositoryRoot, { recursive: true, force: true });
}

type ClosedStatusField =
  "generation_status" | "qa_status" | "runtime_release_status";

function setRuntimeParsedStatus(
  fixture: SyntheticRuntimeFixture,
  field: ClosedStatusField,
  value: unknown,
) {
  const runtimeJson = JSON.parse(JSON.stringify(fixture.manifest)) as {
    assets: Array<Record<string, unknown>>;
  };
  if (value === undefined) {
    delete runtimeJson.assets[0][field];
  } else {
    runtimeJson.assets[0][field] = value;
  }
  fixture.manifest = JSON.parse(JSON.stringify(runtimeJson)) as AssetManifest;
}

describe("Art Asset Factory Foundation", () => {
  describe("Validation Tooling", () => {
    it("accepts valid fixtures", () => {
      const manifest = loadJson("art/fixtures/valid_manifest.json");
      const families = loadJson("art/fixtures/valid_families.json");
      const deltas = loadJson("art/fixtures/valid_deltas.json");
      const provenance = loadJson("art/fixtures/valid_provenance.json");

      const result = validateArtAssets(manifest, families, deltas, provenance);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects invalid fixtures with explicit error messages", () => {
      const manifest = loadJson(
        "tests/fixtures/art-asset-factory/invalid_manifest.json",
      );
      // For this test, reuse valid families/deltas/provenance where they are not the subject of the error
      const families = loadJson("art/fixtures/valid_families.json");
      const deltas = loadJson(
        "tests/fixtures/art-asset-factory/invalid_deltas.json",
      );
      const provenance = loadJson(
        "tests/fixtures/art-asset-factory/invalid_provenance.json",
      );

      const result = validateArtAssets(manifest, families, deltas, provenance);
      expect(result.valid).toBe(false);

      const errStr = result.errors.join("\n");

      // 1. duplicate asset IDs
      expect(errStr).toContain("Duplicate asset_id found: 'duplicate_id'");
      // 2. missing required fields
      expect(errStr).toContain("missing one or more required fields");
      // 3. invalid family references
      expect(errStr).toContain(
        "references invalid family_id 'nonexistent_family'",
      );
      // 4. invalid delta base-family references
      expect(errStr).toContain(
        "references invalid base_family_id 'nonexistent_base_family'",
      );
      // 5. hero without justification
      expect(errStr).toContain(
        "marked as hero_asset but lacks a hero_justification",
      );
      // 6. precise measurements without valid source/confidence
      expect(errStr).toContain(
        "precise measurement but lacks valid confidence metadata",
      );
      expect(errStr).toContain(
        "Asset 'precise_measure_valid_confidence_no_source' dimension 'room_width' has a precise measurement but lacks required source metadata.",
      );
      // 7. invalid confidence values
      expect(errStr).toContain("invalid confidence 'made-up-guess'");
      // 8. missing provenance where required
      expect(errStr).toContain(
        "Asset 'missing_provenance_for_approved' is marked as approved but lacks a provenance entry",
      );
      // 9. approved output lacking required final path/hash
      expect(errStr).toContain(
        "Asset 'approved_missing_hash' is marked as approved but lacks a final_path or hash",
      );
      // 10. rejected/anti-reference material used as approved output (Approval/rejection state separation)
      expect(errStr).toContain(
        "Asset 'rejected_used_as_approved' is marked as approved but references rejected/anti-reference provenance",
      );
      // 11. duplicate hashes
      expect(errStr).toContain("duplicate hash 'same_hash'");
      expect(errStr).toContain(
        "Asset 'duplicate_hash_draft' has duplicate hash 'same_hash'",
      );
      // 12. invalid/missing era ranges
      expect(errStr).toContain(
        "invalid era range: start (2000) is greater than end (1900)",
      );
      expect(errStr).toContain(
        "Asset 'one_sided_era' has a one-sided era range",
      );
      // 13. missing-vs-zero measurement correctness
      expect(errStr).toContain(
        "Asset 'missing_vs_zero' dimension 'room_length' is missing confidence",
      );
    });

    it("accepts empty bootstrap manifests without promoting runtime art", () => {
      const result = validateArtAssets(
        { assets: [] },
        EMPTY_FAMILIES,
        EMPTY_DELTAS,
        { entries: [] },
      );

      expect(result).toEqual({
        valid: true,
        errors: [],
        runtimeEligibleAssetIds: [],
      });
    });

    it("distinguishes ordinary approval from explicit runtime release", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        const asset = fixture.manifest.assets[0];
        asset.runtime_release_status = "unreleased";

        const result = validateSyntheticFixture(fixture);
        expect(result.valid).toBe(true);
        expect(result.runtimeEligibleAssetIds).toEqual([]);
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("accepts a fully approved, released, file-backed asset", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        const result = validateSyntheticFixture(fixture);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.runtimeEligibleAssetIds).toEqual([
          "synthetic_runtime_asset",
        ]);
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it.each([
      ["null", null],
      ["an empty string", ""],
    ])("rejects runtime_release_status parsed from JSON as %s", (_, value) => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        setRuntimeParsedStatus(fixture, "runtime_release_status", value);
        const result = validateSyntheticFixture(fixture);
        expect(result.valid).toBe(false);
        expect(result.errors.join("\n")).toContain(
          `invalid runtime_release_status '${value}'`,
        );
        expect(result.runtimeEligibleAssetIds).toEqual([]);
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it.each([
      ["generation_status", false],
      ["qa_status", 0],
    ] as const)("rejects falsy JSON value for %s", (field, value) => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        setRuntimeParsedStatus(fixture, field, value);
        const result = validateSyntheticFixture(fixture);
        expect(result.valid).toBe(false);
        expect(result.errors.join("\n")).toContain(`invalid ${field}`);
        expect(result.runtimeEligibleAssetIds).toEqual([]);
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it.each([
      "generation_status",
      "qa_status",
      "runtime_release_status",
    ] as const)("rejects an arbitrary out-of-enum %s", (field) => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        setRuntimeParsedStatus(fixture, field, "future-status");
        const result = validateSyntheticFixture(fixture);
        expect(result.valid).toBe(false);
        expect(result.errors.join("\n")).toContain(
          `invalid ${field} 'future-status'`,
        );
        expect(result.runtimeEligibleAssetIds).toEqual([]);
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it.each([
      "generation_status",
      "qa_status",
      "runtime_release_status",
    ] as const)("rejects missing JSON field %s", (field) => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        setRuntimeParsedStatus(fixture, field, undefined);
        const result = validateSyntheticFixture(fixture);
        expect(result.valid).toBe(false);
        expect(result.errors.join("\n")).toContain(`invalid ${field}`);
        expect(result.runtimeEligibleAssetIds).toEqual([]);
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("rejects runtime release without both required approvals", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        fixture.manifest.assets[0].generation_status = "pending";
        const result = validateSyntheticFixture(fixture);
        expect(result.valid).toBe(false);
        expect(result.errors.join("\n")).toContain(
          "generation_status and qa_status are not both approved",
        );
        expect(result.runtimeEligibleAssetIds).toEqual([]);
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("rejects a claimed final file that is missing", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        fs.unlinkSync(fixture.filePath);
        const result = validateSyntheticFixture(fixture);
        expect(result.valid).toBe(false);
        expect(result.errors.join("\n")).toContain(
          "final_path 'art/fixtures/synthetic-runtime.png' does not exist",
        );
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("checks a claimed final path even when the asset is unreleased", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        Object.assign(fixture.manifest.assets[0], {
          generation_status: "draft",
          qa_status: "pending",
          runtime_release_status: "unreleased",
          hash: undefined,
        });
        fs.unlinkSync(fixture.filePath);
        const result = validateSyntheticFixture(fixture);
        expect(result.errors.join("\n")).toContain(
          "final_path 'art/fixtures/synthetic-runtime.png' does not exist",
        );
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("rejects parent traversal and paths outside the art root", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        const asset = fixture.manifest.assets[0];
        asset.final_path = "art/fixtures/../fixtures/synthetic-runtime.png";
        const traversalResult = validateSyntheticFixture(fixture);
        expect(traversalResult.errors.join("\n")).toContain(
          "contains forbidden path traversal",
        );

        asset.final_path = "outside.png";
        fs.writeFileSync(
          path.join(fixture.repositoryRoot, "outside.png"),
          "synthetic runtime art fixture",
        );
        const escapeResult = validateSyntheticFixture(fixture);
        expect(escapeResult.errors.join("\n")).toContain(
          "escapes the repository art root",
        );
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("rejects a runtime release with a missing hash", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        fixture.manifest.assets[0].hash = undefined;
        const result = validateSyntheticFixture(fixture);
        expect(result.errors.join("\n")).toContain(
          "runtime-released but lacks a content hash",
        );
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("rejects a malformed runtime hash", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        fixture.manifest.assets[0].hash = "not-a-sha256-digest";
        const result = validateSyntheticFixture(fixture);
        expect(result.errors.join("\n")).toContain(
          "must be a lowercase 64-character SHA-256 digest",
        );
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("rejects a runtime hash that does not match the actual bytes", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        fixture.manifest.assets[0].hash = "0".repeat(64);
        const result = validateSyntheticFixture(fixture);
        expect(result.errors.join("\n")).toContain(
          "runtime content hash does not match its final file",
        );
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("rejects missing required runtime provenance", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        fixture.provenance.entries = [];
        const result = validateSyntheticFixture(fixture);
        expect(result.errors.join("\n")).toContain(
          "runtime-released but lacks required provenance",
        );
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("rejects dangling provenance asset references", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        fixture.provenance.entries.push({
          provenance_id: "prov_dangling",
          asset_id: "missing_asset",
          rights_license_status: "unknown",
          approval_status: "pending",
        });
        const result = validateSyntheticFixture(fixture);
        expect(result.errors.join("\n")).toContain(
          "Provenance 'prov_dangling' references missing asset_id 'missing_asset'",
        );
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("keeps duplicate provenance IDs invalid", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        fixture.provenance.entries.push({
          ...fixture.provenance.entries[0],
        });
        const result = validateSyntheticFixture(fixture);
        expect(result.errors.join("\n")).toContain(
          "Duplicate provenance_id found: 'prov_synthetic_runtime_asset'",
        );
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("requires generation metadata for released AI-generated art", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        fixture.provenance.entries[0].reference_type = "ai-generated";
        const result = validateSyntheticFixture(fixture);
        const errors = result.errors.join("\n");
        expect(errors).toContain("is missing required generation metadata");
        expect(errors).toContain("generator_tool");
        expect(errors).toContain("generated_model_version");
        expect(errors).toContain("prompt_spec_manifest_id");
        expect(errors).toContain("generation_edit_date");
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("does not impose AI metadata on equivalent non-generated art", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        fixture.provenance.entries[0].reference_type = "measured-drawing";
        const result = validateSyntheticFixture(fixture);
        expect(result.valid).toBe(true);
        expect(result.runtimeEligibleAssetIds).toEqual([
          "synthetic_runtime_asset",
        ]);
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("accepts complete generated metadata for released AI-generated art", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        Object.assign(fixture.provenance.entries[0], {
          reference_type: "ai-generated",
          generator_tool: "synthetic-generator",
          generated_model_version: "fixture-model-v1",
          prompt_spec_manifest_id: "prompt-fixture-1",
          generation_edit_date: "2026-08-27T12:00:00.000Z",
        });
        const result = validateSyntheticFixture(fixture);
        expect(result.valid).toBe(true);
        expect(result.runtimeEligibleAssetIds).toEqual([
          "synthetic_runtime_asset",
        ]);
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });

    it("rejects invalid generation dates for released AI-generated art", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        Object.assign(fixture.provenance.entries[0], {
          reference_type: "ai-generated",
          generator_tool: "synthetic-generator",
          generated_model_version: "fixture-model-v1",
          prompt_spec_manifest_id: "prompt-fixture-1",
          generation_edit_date: "not-a-date",
        });
        const result = validateSyntheticFixture(fixture);
        expect(result.errors.join("\n")).toContain(
          "has an invalid generation_edit_date",
        );
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });
  });

  describe("Inventory and Hashing", () => {
    it("generates a deterministic inventory with duplicate detection", () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "art-inventory-"));

      const file1 = path.join(tempDir, "b.png");
      const file2 = path.join(tempDir, "a.png");
      const file3 = path.join(tempDir, "c.png");

      fs.writeFileSync(file1, "mock content 1");
      fs.writeFileSync(file2, "mock content 2");
      fs.writeFileSync(file3, "mock content 1"); // Duplicate of b.png

      const items = generateInventory(tempDir);

      // Deterministic sorting (a.png, b.png, c.png)
      expect(items.length).toBe(3);
      expect(items[0].filePath).toBe("a.png");
      expect(items[1].filePath).toBe("b.png");
      expect(items[2].filePath).toBe("c.png");

      const duplicates = detectDuplicateHashes(items);
      expect(duplicates.length).toBe(1);
      const expectedHash = crypto
        .createHash("sha256")
        .update("mock content 1")
        .digest("hex");
      expect(duplicates[0]).toContain(expectedHash);

      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it("uses the same digest in inventory and runtime validation", () => {
      const fixture = createSyntheticRuntimeFixture();
      try {
        const inventory = generateInventory(
          path.join(fixture.repositoryRoot, "art"),
        );
        expect(inventory).toHaveLength(1);
        expect(inventory[0].hash).toBe(hashArtFile(fixture.filePath));
        expect(inventory[0].hash).toBe(fixture.manifest.assets[0].hash);
        expect(validateSyntheticFixture(fixture).valid).toBe(true);
      } finally {
        removeSyntheticRuntimeFixture(fixture);
      }
    });
  });

  describe("QA & Contact Sheet Tooling", () => {
    it("generates deterministic HTML and QA reports from real file buffers", async () => {
      // 20x20 JPG
      const jpgBufferB = Buffer.from(
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAUABQBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
        "base64",
      );
      // Create temp fixture dir
      const tempQADir = fs.mkdtempSync(path.join(os.tmpdir(), "qa-test-"));

      const fileA = path.join(tempQADir, "img_A.png");
      const fileB = path.join(tempQADir, "img_B.jpg");
      await writeRgbaPng(fileA, 10, 20, (pixelIndex) =>
        pixelIndex === 0 ? 0 : 255,
      );
      fs.writeFileSync(fileB, jpgBufferB);

      const mockImages = [fileB, fileA];

      // Use dependency-light metadata mock parsing logic inside qa tooling
      const relA = path.relative(tempQADir, fileA).replace(/\\/g, "/");
      const relB = path.relative(tempQADir, fileB).replace(/\\/g, "/");

      const manifestReqs = {
        [relA]: true,
        [relB]: true,
      };

      const { html, report } = await generateContactSheetHtml(
        mockImages,
        "Test",
        tempQADir,
        manifestReqs,
      );

      // Deterministic Ordering
      expect(report[0].file).toBe(relA);
      expect(report[1].file).toBe(relB);

      // Metadata parsing assertions (A is a 10x20 PNG)
      expect(report[0].metadata.width).toBe(10);
      expect(report[0].metadata.height).toBe(20);
      expect(report[0].metadata.aspectRatio).toBe("1:2");
      expect(report[0].metadata.hasTransparency).toBe("confirmed");
      expect(report[0].meetsTransparencyReq).toBe(true);

      // Metadata parsing assertions (B is a 20x20 JPG)
      expect(report[1].metadata.width).toBe(20);
      expect(report[1].metadata.height).toBe(20);
      expect(report[1].metadata.aspectRatio).toBe("1:1");
      expect(report[1].metadata.hasTransparency).toBe("none");
      expect(report[1].meetsTransparencyReq).toBe(false); // fails the manifest req for transparency

      // HTML output checks
      expect(html).toContain("img_A.png");
      expect(html).toContain("img_B.jpg");

      // Assert that ordering is preserved in HTML via index check
      expect(html.indexOf("img_A.png")).toBeLessThan(html.indexOf("img_B.jpg"));

      // Cleanup
      fs.unlinkSync(fileA);
      fs.unlinkSync(fileB);
      fs.rmdirSync(tempQADir);
    });

    it("requires an actually transparent pixel in an RGBA PNG", async () => {
      const tempQADir = fs.mkdtempSync(
        path.join(os.tmpdir(), "qa-alpha-pixels-"),
      );
      const opaquePath = path.join(tempQADir, "opaque-rgba.png");
      const transparentPath = path.join(tempQADir, "transparent-rgba.png");
      try {
        await writeRgbaPng(opaquePath, 2, 1, () => 255);
        await writeRgbaPng(transparentPath, 2, 1, (pixelIndex) =>
          pixelIndex === 1 ? 254 : 255,
        );

        expect(fs.readFileSync(opaquePath)[25]).toBe(6);
        expect(fs.readFileSync(transparentPath)[25]).toBe(6);
        expect((await parseImageMetadata(opaquePath)).hasTransparency).toBe(
          "none",
        );
        expect(
          (await parseImageMetadata(transparentPath)).hasTransparency,
        ).toBe("confirmed");

        const { report } = await generateContactSheetHtml(
          [transparentPath, opaquePath],
          "Actual alpha proof",
          tempQADir,
          { "opaque-rgba.png": true, "transparent-rgba.png": true },
        );
        expect(report).toMatchObject([
          {
            file: "opaque-rgba.png",
            metadata: { hasTransparency: "none" },
            meetsTransparencyReq: false,
          },
          {
            file: "transparent-rgba.png",
            metadata: { hasTransparency: "confirmed" },
            meetsTransparencyReq: true,
          },
        ]);
      } finally {
        fs.rmSync(tempQADir, { recursive: true, force: true });
      }
    });

    it("generates source vs generated comparison sheet deterministically", () => {
      const pairs = [
        {
          source: path.join(REPO_ROOT, "ref2.png"),
          generated: path.join(REPO_ROOT, "gen_Z.png"),
        },
        {
          source: path.join(REPO_ROOT, "ref1.png"),
          generated: path.join(REPO_ROOT, "gen_A.png"),
        },
      ];

      const { html, report } = generateComparisonSheetHtml(pairs, REPO_ROOT);

      // Deterministically sorted by generated path
      expect(report[0].generated).toBe("gen_A.png");
      expect(report[1].generated).toBe("gen_Z.png");

      expect(html).toContain("gen_A.png");
    });
  });
});

describe("Packet 76 approved runtime art", () => {
  const environmentSource = path.join(
    REPO_ROOT,
    "art/families/council-staff-office/env_lexington_council_staff_office_prompt30_v1.png",
  );
  const rawA = path.join(
    REPO_ROOT,
    "art/references/approved/packet76/GEMINI_OUTPUT_31_PROMPT34_human_candidate_A01_primary_desk_seated_base_APPROVED_v1.png",
  );
  const rawB = path.join(
    REPO_ROOT,
    "art/references/approved/packet76/GEMINI_OUTPUT_32_PROMPT35_human_candidate_B01_left_guest_seated_base_APPROVED_v1.png",
  );

  it("validates the real released manifest, files, hashes, and provenance", () => {
    const manifest = loadJson("art/manifest/asset_manifest.json");
    const families = loadJson("art/manifest/environment_families.json");
    const result = validateArtAssets(
      manifest,
      families,
      loadJson("art/manifest/jurisdiction_deltas.json"),
      loadJson("art/manifest/provenance.json"),
      {
        repositoryRoot: REPO_ROOT,
        characterCatalog: loadJson("art/manifest/character_catalog.json"),
      },
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    // The four Packet 76 office fixtures remain released, followed by the
    // sixteen DEV/NON-PRODUCTION modular character components.
    expect(result.runtimeEligibleAssetIds.slice(0, 4)).toEqual([
      "env_lexington_council_staff_office_prompt30_v1",
      "env_lexington_council_staff_office_prompt30_foreground_mask_v1",
      "human_candidate_A01_primary_desk_seated_v1",
      "human_candidate_B01_left_guest_seated_v1",
    ]);
    expect(result.runtimeEligibleAssetIds).toHaveLength(20);
    expect(
      result.runtimeEligibleAssetIds
        .slice(4)
        .every((assetId: string) => assetId.startsWith("dev_")),
    ).toBe(true);
    const environment = manifest.assets.find(
      (asset: { asset_id: string }) =>
        asset.asset_id === "env_lexington_council_staff_office_prompt30_v1",
    );
    expect(environment).toMatchObject({
      family_id: "council-staff-office",
      final_path:
        "art/families/council-staff-office/env_lexington_council_staff_office_prompt30_runtime_2x_v1.png",
      hash: "66678f0e91c52ca86f851ae4ba73d1a736a56be9cb7875512ab6bd1235de07f0",
    });
    expect(
      families.families.map(
        (family: { family_id: string }) => family.family_id,
      ),
    ).toEqual(["council-staff-office"]);
  });

  it("reproduces the 2x Lanczos office plate and furniture-only alpha mask", async () => {
    expect(OFFICE_PLATE_RUNTIME_SCALE).toBe(2);
    expect(OFFICE_PLATE_LANCZOS_LOBES).toBe(3);
    expect(hashArtFile(environmentSource)).toBe(
      "76d9ae5878acbd0050c60695bebd2f3f9f0da36c75ce2e9e392d30254ab64b43",
    );
    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "packet-76-office-derive-"),
    );
    try {
      const runtimePath = path.join(temporaryDirectory, "runtime.png");
      const foregroundPath = path.join(temporaryDirectory, "foreground.png");
      const result = await deriveOfficeRuntimePlate(
        environmentSource,
        runtimePath,
        foregroundPath,
      );
      expect(result).toEqual({
        sourceWidth: 1024,
        sourceHeight: 572,
        runtimeWidth: 2048,
        runtimeHeight: 1144,
        foregroundPixelCount: 269_313,
      });
      expect(hashArtFile(runtimePath)).toBe(
        "66678f0e91c52ca86f851ae4ba73d1a736a56be9cb7875512ab6bd1235de07f0",
      );
      expect(hashArtFile(foregroundPath)).toBe(
        "11a1420a6c5663ae13b744372e81558576bfb314fa5d665a1404fa677d7456fe",
      );
      expect((await parseImageMetadata(runtimePath)).hasTransparency).toBe(
        "none",
      );
      expect((await parseImageMetadata(foregroundPath)).hasTransparency).toBe(
        "confirmed",
      );
      expect(hashArtFile(environmentSource)).toBe(
        "76d9ae5878acbd0050c60695bebd2f3f9f0da36c75ce2e9e392d30254ab64b43",
      );
    } finally {
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it.each([
    [
      rawA,
      "8270689800e31006ae54497253845c3bf619ffb46b1bbc3c8d2bafd7136a7827",
      "8e5882e26eab1c6cf966cff188bfebd4e40cd117804e87930a0b06d67ca66e43",
    ],
    [
      rawB,
      "6484bfe77edd4a46f35e2572c6be37ca06ce1c98ab72af1d2b48125df0bf245a",
      "fd880e52fb191d6c32019ba451d006176ebc7762db89590c437c67586906be8d",
    ],
  ])(
    "reproduces alpha extraction without changing approved source bytes",
    async (sourcePath, expectedSourceHash, expectedOutputHash) => {
      const sourceHashBefore = hashArtFile(sourcePath);
      const temporaryDirectory = fs.mkdtempSync(
        path.join(os.tmpdir(), "packet-76-chroma-"),
      );
      try {
        const first = path.join(temporaryDirectory, "first.png");
        const second = path.join(temporaryDirectory, "second.png");
        const firstResult = await extractChromaToPng(sourcePath, first);
        const secondResult = await extractChromaToPng(sourcePath, second);
        expect(firstResult).toEqual(secondResult);
        expect(firstResult.transparentPixelCount).toBeGreaterThan(500_000);
        expect(hashArtFile(first)).toBe(expectedOutputHash);
        expect(hashArtFile(second)).toBe(expectedOutputHash);
        expect((await parseImageMetadata(first)).hasTransparency).toBe(
          "confirmed",
        );
        expect(hashArtFile(sourcePath)).toBe(sourceHashBefore);
        expect(sourceHashBefore).toBe(expectedSourceHash);
      } finally {
        fs.rmSync(temporaryDirectory, { recursive: true, force: true });
      }
    },
  );
});
