import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runInventory } from "../scripts/repo-safety/inventory";
import { checkRepositoryState } from "../scripts/repo-safety/guard";
import { generateReceipt } from "../scripts/repo-safety/receipt";
import * as utils from "../scripts/repo-safety/utils";
import { SAFETY_CONFIG } from "../scripts/repo-safety/config";
import fs from "fs";
import path from "path";
import os from "os";

describe("Repo Safety Tooling", () => {
  let testDir: string;

  beforeEach(() => {
    // True isolated temp directory to prevent deleting legitimate future fixtures
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "repo-safety-"));
  });

  afterEach(() => {
    // Cleanup fixtures
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe("Inventory & Duplicate Check", () => {
    it("should detect duplicate hashes and exclude 0-byte placeholders", () => {
      const file1 = path.join(testDir, "dup1.txt");
      const file2 = path.join(testDir, "dup2.txt");
      const fileEmpty = path.join(testDir, ".gitkeep");

      const content = "duplicate content";

      fs.writeFileSync(file1, content);
      fs.writeFileSync(file2, content);
      fs.writeFileSync(fileEmpty, "");

      vi.spyOn(utils, "getAllTrackedFiles").mockReturnValue([
        file1,
        file2,
        fileEmpty,
      ]);
      vi.spyOn(utils, "getUntrackedFiles").mockReturnValue([]);

      const report = runInventory();
      const hashes = Object.keys(report.duplicateHashes);
      expect(hashes.length).toBe(1); // One group of duplicates
      expect(report.duplicateHashes[hashes[0]]).toContain(file1);
      expect(report.duplicateHashes[hashes[0]]).toContain(file2);
      expect(report.duplicateHashes[hashes[0]]).not.toContain(fileEmpty); // 0-byte excluded
    });
  });

  describe("Repository Tree Guard", () => {
    it("tree guard catches violation in clean/no-staged-file state (oversized tracked)", () => {
      const largeFile = path.join(testDir, "huge-asset.png");
      vi.spyOn(utils, "getAllTrackedFiles").mockReturnValue([largeFile]);
      vi.spyOn(utils, "getStagedFiles").mockReturnValue([]);
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      // @ts-expect-error Mocking statSync
      vi.spyOn(fs, "statSync").mockReturnValue({
        isFile: () => true,
        size: SAFETY_CONFIG.SHIPPING_ASSET_FATAL_BYTES + 100,
      });

      const result = checkRepositoryState();
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain(
        "exceeds shipping asset fatal threshold",
      );
    });

    it("tree guard ignores unrelated untracked user workspace files (doesn't fail validation)", () => {
      // Not tracked, not staged
      vi.spyOn(utils, "getAllTrackedFiles").mockReturnValue([]);
      vi.spyOn(utils, "getStagedFiles").mockReturnValue([]);

      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      // @ts-expect-error Mocking statSync
      vi.spyOn(fs, "statSync").mockReturnValue({
        isFile: () => true,
        size: SAFETY_CONFIG.SHIPPING_ASSET_FATAL_BYTES + 1000,
      });

      const result = checkRepositoryState();
      // It should NOT fail the repository validation gate because it's just untracked local user work
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("prohibited master/raw file fails in tracked tree outside fixtures", () => {
      const badMaster = path.join(testDir, "giant_master.tiff"); // It's tracked!
      vi.spyOn(utils, "getAllTrackedFiles").mockReturnValue([badMaster]);
      vi.spyOn(utils, "getStagedFiles").mockReturnValue([]);
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      // @ts-expect-error Mocking statSync
      vi.spyOn(fs, "statSync").mockReturnValue({
        isFile: () => true,
        size: 1000,
      });

      const result = checkRepositoryState();
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Prohibited raw/archival file");
    });

    it("does not globally ban .blend files by default unless overridden", () => {
      const blendFile = path.join(testDir, "my_model.blend");
      vi.spyOn(utils, "getAllTrackedFiles").mockReturnValue([blendFile]);
      vi.spyOn(utils, "getStagedFiles").mockReturnValue([]);
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      // @ts-expect-error Mocking statSync
      vi.spyOn(fs, "statSync").mockReturnValue({
        isFile: () => true,
        size: 1000,
      });

      const result = checkRepositoryState();
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("configurable shipping-asset threshold behavior warns below fatal limit", () => {
      const warnFile = path.join(testDir, "asset.png");
      vi.spyOn(utils, "getAllTrackedFiles").mockReturnValue([warnFile]);
      vi.spyOn(utils, "getStagedFiles").mockReturnValue([]);
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      // @ts-expect-error Mocking statSync
      vi.spyOn(fs, "statSync").mockReturnValue({
        isFile: () => true,
        size: SAFETY_CONFIG.SHIPPING_ASSET_WARNING_BYTES + 100,
      });

      const result = checkRepositoryState();
      expect(result.valid).toBe(true); // Still valid!
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0]).toContain(
        "exceeds shipping asset warning threshold",
      );
    });
  });

  describe("Receipt Generator & Reproducibility", () => {
    it("should record exact commands attempted and separate clock time from deterministic payload", () => {
      vi.spyOn(utils, "getCurrentBranch").mockReturnValue("main");
      vi.spyOn(utils, "getHeadSha").mockReturnValue("123456");
      vi.spyOn(utils, "getStagedFiles").mockReturnValue([]);
      vi.spyOn(utils, "getUnstagedFiles").mockReturnValue([]);
      vi.spyOn(utils, "getUntrackedFiles").mockReturnValue([]);
      vi.spyOn(utils, "getAllTrackedFiles").mockReturnValue([]);
      vi.spyOn(utils, "execGit").mockReturnValue("123456");

      const receipt = generateReceipt("test-run");

      expect(receipt.payload.taskId).toBe("test-run");
      expect(receipt.metadata).toHaveProperty("timestamp");
      expect(receipt.payload).not.toHaveProperty("timestamp"); // Separate clock time

      // Explicit command results instead of blanket "success" / "failed"
      expect(receipt.payload.commandResults.length).toBeGreaterThan(0);
      expect(receipt.payload.commandResults[0]).toHaveProperty("command");
      expect(receipt.payload.commandResults[0]).toHaveProperty("success");
    });

    it("should preserve pre-existing untracked files and not flag them as unexpected generated files", () => {
      // Untracked file existed BEFORE reproducibility run, and still exists AFTER
      vi.spyOn(utils, "getUnstagedFiles").mockReturnValue([]);
      vi.spyOn(utils, "getUntrackedFiles").mockReturnValue(["my-notes.txt"]);
      vi.spyOn(utils, "execGit").mockReturnValue("123456");

      const receipt = generateReceipt("preserve-untracked-run");

      expect(receipt.payload.unexpectedChanges).not.toContain("my-notes.txt");
    });

    it("respects narrow explicit output paths", () => {
      let callCount = 0;
      vi.spyOn(utils, "getUntrackedFiles").mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [];
        // Generated in narrow explicit output
        return ["art/generated/new-output.json"];
      });
      vi.spyOn(utils, "getUnstagedFiles").mockReturnValue([]);
      vi.spyOn(utils, "execGit").mockReturnValue("123456");

      const receipt = generateReceipt("allowlist-run");

      // Not unexpected because it's inside art/generated/
      expect(receipt.payload.unexpectedChanges).not.toContain(
        "art/generated/new-output.json",
      );
    });

    it("flags files generated in prohibited directories", () => {
      let callCount = 0;
      vi.spyOn(utils, "getUntrackedFiles").mockImplementation(() => {
        callCount++;
        if (callCount === 1) return [];
        // The task generated a file in public/ which is NOT blanket allowed
        return ["public/sneaky.png"];
      });
      vi.spyOn(utils, "getUnstagedFiles").mockReturnValue([]);
      vi.spyOn(utils, "execGit").mockReturnValue("123456");

      const receipt = generateReceipt("fail-allowlist-run");

      expect(receipt.payload.unexpectedChanges).toContain("public/sneaky.png");
    });
  });
});
