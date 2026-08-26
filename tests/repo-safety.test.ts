import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runInventory } from "../scripts/repo-safety/inventory";
import { checkRepositoryState } from "../scripts/repo-safety/guard";
import { generateReceipt } from "../scripts/repo-safety/receipt";
import * as utils from "../scripts/repo-safety/utils";
import { SAFETY_CONFIG } from "../scripts/repo-safety/config";
import fs from "fs";
import path from "path";

const TEST_DIR = path.join(__dirname, "fixtures", "repo-safety");

describe("Repo Safety Tooling", () => {
  beforeEach(() => {
    // Create test fixtures directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup fixtures
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe("Inventory & Duplicate Check", () => {
    it("should detect duplicate hashes and exclude 0-byte placeholders", () => {
      // Actually write small files for real hashing
      const file1 = path.join(TEST_DIR, "dup1.txt");
      const file2 = path.join(TEST_DIR, "dup2.txt");
      const fileEmpty = path.join(TEST_DIR, ".gitkeep");

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
      expect(report.duplicateHashes[hashes[0]]).not.toContain(fileEmpty);
    });

    it("should detect hygiene anomalies like temp files", () => {
      const tempFile = path.join(TEST_DIR, "scratch.txt");
      vi.spyOn(utils, "getAllTrackedFiles").mockReturnValue([tempFile]);
      vi.spyOn(utils, "getUntrackedFiles").mockReturnValue([]);
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      // @ts-expect-error Mocking statSync
      vi.spyOn(fs, "statSync").mockReturnValue({
        isFile: () => true,
        size: 100,
      });

      const report = runInventory();
      expect(report.hygieneAnomalies).toContain(tempFile);
    });
  });

  describe("Repository Tree Guard", () => {
    it("tree guard catches violation in clean/no-staged-file state (oversized)", () => {
      const largeFile = path.join(TEST_DIR, "huge-asset.png");
      vi.spyOn(utils, "getAllTrackedFiles").mockReturnValue([largeFile]);
      vi.spyOn(utils, "getUntrackedFiles").mockReturnValue([]);
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      // @ts-expect-error Mocking statSync
      vi.spyOn(fs, "statSync").mockReturnValue({
        isFile: () => true,
        size: SAFETY_CONFIG.SHIPPING_ASSET_MAX_BYTES + 100,
      });

      const result = checkRepositoryState();
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("exceeds shipping asset threshold");
    });

    it("prohibited master/raw file fails in tracked or untracked tree outside fixtures", () => {
      const badMaster = "art/source/giant_master.tiff";
      vi.spyOn(utils, "getAllTrackedFiles").mockReturnValue([badMaster]);
      vi.spyOn(utils, "getUntrackedFiles").mockReturnValue([]);
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

    it("allows raw file in designated test fixture path", () => {
      const fixtureMaster = "tests/fixtures/art-asset-factory/test.tiff";
      vi.spyOn(utils, "getAllTrackedFiles").mockReturnValue([fixtureMaster]);
      vi.spyOn(utils, "getUntrackedFiles").mockReturnValue([]);
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      // @ts-expect-error Mocking statSync
      vi.spyOn(fs, "statSync").mockReturnValue({
        isFile: () => true,
        size: 1000,
      });

      const result = checkRepositoryState();
      expect(result.valid).toBe(true);
    });

    it("configurable shipping-asset threshold behavior", () => {
      const okFile = path.join(TEST_DIR, "asset.png");
      vi.spyOn(utils, "getAllTrackedFiles").mockReturnValue([okFile]);
      vi.spyOn(utils, "getUntrackedFiles").mockReturnValue([]);
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      // @ts-expect-error Mocking statSync
      vi.spyOn(fs, "statSync").mockReturnValue({
        isFile: () => true,
        size: SAFETY_CONFIG.SHIPPING_ASSET_MAX_BYTES - 100,
      });

      const result = checkRepositoryState();
      expect(result.valid).toBe(true);
    });
  });

  describe("Receipt Generator & Reproducibility", () => {
    it("should generate a clean receipt with deterministic payload structure", () => {
      vi.spyOn(utils, "getCurrentBranch").mockReturnValue("main");
      vi.spyOn(utils, "getHeadSha").mockReturnValue("123456");
      vi.spyOn(utils, "getStagedFiles").mockReturnValue([]);
      vi.spyOn(utils, "getUnstagedFiles").mockReturnValue([]);
      vi.spyOn(utils, "getUntrackedFiles").mockReturnValue([]);
      vi.spyOn(utils, "getAllTrackedFiles").mockReturnValue([]);
      vi.spyOn(utils, "execGit").mockReturnValue("123456"); // for diffBasis

      const receipt = generateReceipt("test-run");

      expect(receipt.payload.taskId).toBe("test-run");
      expect(receipt.payload.branch).toBe("main");
      expect(receipt.payload.isClean).toBe(true);
      expect(receipt.metadata).toHaveProperty("timestamp"); // Separated clock time

      const payloadKeys = Object.keys(receipt.payload);
      const expectedKeys = [
        "taskId",
        "branch",
        "startingHeadSha",
        "endingHeadSha",
        "diffBasis",
        "commandsExecuted",
        "testResults",
        "unresolvedAssumptions",
        "artifactHashes",
        "unexpectedChanges",
        "stagedFiles",
        "unstagedFiles",
        "untrackedFiles",
        "warnings",
        "isClean",
      ];
      expect(payloadKeys).toEqual(expectedKeys);
    });

    it("should preserve pre-existing untracked files and not flag them as unexpected", () => {
      // Mock that an untracked file existed BEFORE reproducibility run, and still exists AFTER
      vi.spyOn(utils, "getUnstagedFiles").mockReturnValue([]);
      vi.spyOn(utils, "getUntrackedFiles").mockReturnValue(["my-notes.txt"]);
      vi.spyOn(utils, "execGit").mockReturnValue("123456");

      const receipt = generateReceipt("preserve-untracked-run");
      // The untracked file is listed
      expect(receipt.payload.untrackedFiles).toContain("my-notes.txt");
      // But it was NOT caused by the command, so it's not an unexpected generated change
      expect(receipt.payload.unexpectedChanges).not.toContain("my-notes.txt");
    });

    it("respects narrow output allowlist for generated files", () => {
      // Mock that nothing existed BEFORE
      let callCount = 0;
      vi.spyOn(utils, "getUntrackedFiles").mockImplementation(() => {
        callCount++;
        // First call is BEFORE tools run (returns []), Second call is AFTER tools run (returns ["art/generated/new.png"])
        // Wait, checkReproducibility calls it twice. receipt calls it once.
        // checkReproducibility: preUntracked (call 1), postUntracked (call 2).
        if (callCount === 1) return [];
        if (callCount === 2) return ["art/generated/new-contact-sheet.html"];
        return ["art/generated/new-contact-sheet.html"];
      });
      vi.spyOn(utils, "getUnstagedFiles").mockReturnValue([]);
      vi.spyOn(utils, "execGit").mockReturnValue("123456");

      const receipt = generateReceipt("allowlist-run");

      // The file was newly generated, but it's in an allowed output path, so it shouldn't be unexpected
      expect(receipt.payload.unexpectedChanges).not.toContain(
        "art/generated/new-contact-sheet.html",
      );
      expect(receipt.payload.isClean).toBe(false); // Because there is an untracked file
    });
  });
});
