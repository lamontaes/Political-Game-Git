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
    it("generates deterministic HTML and QA reports from real file buffers", () => {
      // Create minimal valid PNG headers to satisfy image-size checking
      // 10x20 transparent PNG
      const pngBufferA = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAUCAYAAAC9c+tuAAAAF0lEQVR42mNkYPhfz0AEYBxVyKhCBgYADnQBHc++1FkAAAAASUVORK5CYII=",
        "base64",
      );
      // 20x20 JPG
      const jpgBufferB = Buffer.from(
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAAUABQBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
        "base64",
      );
      // Create temp fixture dir
      const tempQADir = path.join(__dirname, "temp_qa_fixtures");
      if (!fs.existsSync(tempQADir))
        fs.mkdirSync(tempQADir, { recursive: true });

      const fileA = path.join(tempQADir, "img_A.png");
      const fileB = path.join(tempQADir, "img_B.jpg");
      fs.writeFileSync(fileA, pngBufferA);
      fs.writeFileSync(fileB, jpgBufferB);

      const mockImages = [fileB, fileA];

      // Use dependency-light metadata mock parsing logic inside qa tooling
      const relA = path.relative(__dirname, fileA).replace(/\\/g, "/");
      const relB = path.relative(__dirname, fileB).replace(/\\/g, "/");

      const manifestReqs = {
        [relA]: true,
        [relB]: true,
      };

      const { html, report } = generateContactSheetHtml(
        mockImages,
        "Test",
        __dirname,
        manifestReqs,
      );

      // Deterministic Ordering
      expect(report[0].file).toBe(relA);
      expect(report[1].file).toBe(relB);

      // Metadata parsing assertions (A is a 10x20 PNG)
      expect(report[0].metadata.width).toBe(10);
      expect(report[0].metadata.height).toBe(20);
      expect(report[0].metadata.aspectRatio).toBe("1:2");
      expect(report[0].metadata.hasTransparency).toBe("not-confirmed");
      expect(report[0].meetsTransparencyReq).toBe("not-confirmed");

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
