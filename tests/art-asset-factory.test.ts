import { describe, it, expect } from "vitest";
import { validateArtAssets } from "../scripts/art-asset-factory/validate";
import {
  generateInventory,
  detectDuplicateHashes,
} from "../scripts/art-asset-factory/inventory";
import {
  generateContactSheetHtml,
  generateComparisonSheetHtml,
} from "../scripts/art-asset-factory/qa";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const REPO_ROOT = path.resolve(__dirname, "..");

function loadJson(relPath: string) {
  const fullPath = path.join(REPO_ROOT, relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
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
      // 12. invalid/missing era ranges
      expect(errStr).toContain(
        "invalid era range: start (2000) is greater than end (1900)",
      );
      // 13. missing-vs-zero measurement correctness
      expect(errStr).toContain(
        "Asset 'missing_vs_zero' dimension 'room_length' is missing confidence",
      );
    });
  });

  describe("Inventory and Hashing", () => {
    it("generates a deterministic inventory with duplicate detection", () => {
      // Create a temporary directory with some mock images
      const tempDir = path.join(__dirname, "temp_inventory");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

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

      // Cleanup
      fs.unlinkSync(file1);
      fs.unlinkSync(file2);
      fs.unlinkSync(file3);
      fs.rmdirSync(tempDir);
    });
  });

  describe("QA & Contact Sheet Tooling", () => {
    it("generates deterministic HTML and QA reports", () => {
      const mockImages = [
        path.join(REPO_ROOT, "art/shared/img_B.png"),
        path.join(REPO_ROOT, "art/shared/img_A.png"),
      ];

      // Use dependency-light metadata mock parsing logic inside qa tooling if actual file is missing
      const manifestReqs = {
        "art/shared/img_A.png": true,
      };

      const { html, report } = generateContactSheetHtml(
        mockImages,
        "Test",
        REPO_ROOT,
        manifestReqs,
      );

      // Deterministic Ordering
      expect(report[0].file).toBe("art/shared/img_A.png");
      expect(report[1].file).toBe("art/shared/img_B.png");

      // Metadata fields exist in report
      expect(report[0].metadata).toHaveProperty("width");
      expect(report[0].metadata).toHaveProperty("aspectRatio");

      // Transparency requirement checking outputted to report
      expect(report[0].meetsTransparencyReq).not.toBeNull();

      // HTML output checks
      expect(html).toContain("img_A.png");
      expect(html).toContain("img_B.png");
      // Assert that ordering is preserved in HTML via index check
      expect(html.indexOf("img_A.png")).toBeLessThan(html.indexOf("img_B.png"));
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
