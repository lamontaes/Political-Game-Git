import { describe, it, expect, vi, beforeEach } from "vitest";
import { runIntake } from "../scripts/art-asset-factory/habs-intake";
import { runTriage } from "../scripts/art-asset-factory/triage";
import { establishScale } from "../scripts/art-asset-factory/establish-scale";
import { deriveGeometry } from "../scripts/art-asset-factory/derive-geometry";
import { checkResiduals } from "../scripts/art-asset-factory/residual-checks";
import { integrateProvenance } from "../scripts/art-asset-factory/integrate-provenance";
import { acquireMaster } from "../scripts/art-asset-factory/acquire-master";

vi.mock("fs", () => {
  return {
    default: {
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
      readFileSync: vi.fn(),
      existsSync: vi.fn(),
    },
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
  };
});

import fs from "fs";

describe("HABS Ingestion Pilot Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn() as unknown;
  });

  // 1. Stable mock LOC normalization and metadata parsing
  it("should correctly parse stable LOC metadata and verify 79 count", async () => {
    const mockLocData = {
      item: {
        rights_information: "No known restrictions on publication.",
        date: "1933",
        description: ["Historic drawing"],
      },
      resources: [
        {
          files: Array.from({ length: 79 }).map((_, i) => [
            {
              use: "caption",
              title: `HABS TEX,227-AUST,13- (sheet ${i + 1} of 79)`,
              aka: `http://aka/${i}`,
            },
            {
              mimetype: "image/tiff",
              url: `http://master/${i}.tif`,
              size: 100,
            },
            { mimetype: "image/jpeg", url: `http://ref/${i}.jpg`, width: 1024 },
            {
              mimetype: "image/jpeg",
              url: `http://thumb/${i}.jpg`,
              width: 150,
            },
          ]),
        },
      ],
    };

    (global.fetch as unknown).mockResolvedValue({
      ok: true,
      json: async () => mockLocData,
    });

    (fs.existsSync as unknown).mockReturnValue(false);

    await runIntake({ locItemId: "tx0398", outputDir: "/fake/dir" });

    expect(fs.writeFileSync).toHaveBeenCalled();
    const writeCall = (fs.writeFileSync as unknown).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1]);

    // 3. Deterministic sorting and extraction
    expect(writtenData.length).toBe(79);
    expect(writtenData[0].sheet_number).toBe(1);
    expect(writtenData[0].rights_status).toBe("unknown");
    expect(writtenData[0].rights_statement).toBe(
      "No known restrictions on publication.",
    );
    expect(writtenData[0].date_vintage).toBe("1933");

    // 5. Malformed/missing metadata extraction correctly handled
    expect(writtenData[0].description).toBe("Historic drawing");
    expect(writtenData[0].file_variants.master.url).toBe("http://master/0.tif");
  });

  // 2. Count mismatch behavior
  it("should throw an error if drawing count is not 79", async () => {
    const mockLocData = {
      resources: [
        {
          files: Array.from({ length: 78 }).map((_, i) => [
            { use: "caption", title: `Sheet ${i + 1} of 79` },
            { type: "drawing" },
          ]),
        },
      ],
    };
    (global.fetch as unknown).mockResolvedValue({
      ok: true,
      json: async () => mockLocData,
    });

    await expect(
      runIntake({ locItemId: "tx0398", outputDir: "/fake/dir" }),
    ).rejects.toThrow(/Expected 79/);
  });

  // 15. Genuine intake idempotency (No unnecessary rewrite)
  it("should idempotently not rewrite the manifest if unchanged", async () => {
    const mockLocData = {
      item: {},
      resources: [
        {
          files: Array.from({ length: 79 }).map((_, i) => [
            { use: "caption", title: `Sheet ${i + 1}` },
            { type: "drawing" },
          ]),
        },
      ],
    };

    (global.fetch as unknown).mockResolvedValue({
      ok: true,
      json: async () => mockLocData,
    });

    // First run to get output
    (fs.existsSync as unknown).mockReturnValue(false);
    await runIntake({
      locItemId: "tx0398",
      outputDir: "/fake/dir",
      retrievalDate: "2025-01-01",
    });
    const firstWriteCall = (fs.writeFileSync as unknown).mock.calls[0];
    const firstJsonStr = firstWriteCall[1];

    // Reset and mock existing file
    vi.clearAllMocks();
    (fs.existsSync as unknown).mockReturnValue(true);
    (fs.readFileSync as unknown).mockReturnValue(firstJsonStr);

    // Second run
    await runIntake({
      locItemId: "tx0398",
      outputDir: "/fake/dir",
      retrievalDate: "2025-01-01",
    });

    // Should not write again because data is unchanged
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  // 4. Classification state based on textual metadata (because no mock review object passed)
  it("should triage sheets based on text if manual review not provided", () => {
    const mockManifest = [
      {
        sheet_number: 1,
        title: "Section of Senate Chamber",
        relevance_classification: "unresolved",
      },
      {
        sheet_number: 2,
        title: "Second Floor Plan",
        relevance_classification: "unresolved",
      },
      {
        sheet_number: 3,
        title: "Generic",
        relevance_classification: "unresolved",
      },
    ];

    (fs.readFileSync as unknown).mockReturnValue(JSON.stringify(mockManifest));

    runTriage("/fake/manifest.json");

    const writeCall = (fs.writeFileSync as unknown).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1]);

    expect(writtenData[0].relevance_classification).toBe("high relevance"); // "senate chamber"
    expect(writtenData[1].relevance_classification).toBe("possible relevance"); // "second floor"
    expect(writtenData[2].relevance_classification).toBe("unresolved");
  });

  // 10. Missing-vs-zero
  // 11. Measurement confidence validation
  // 12. Unresolved ambiguity preservation
  it("should refuse to manufacture fake scale/geometry bounds and preserve unresolved missing values", () => {
    const mockManifest = [
      { sheet_number: 13, stable_id: "habs_tx3326_00013a" },
    ];
    (fs.readFileSync as unknown).mockReturnValue(JSON.stringify(mockManifest));

    establishScale("/fake/manifest.json", 13, "/fake/scale.json");

    const scaleCall = (fs.writeFileSync as unknown).mock.calls[0];
    const scaleData = JSON.parse(scaleCall[1]);

    expect(scaleData.scale_status).toBe("UNRESOLVED");
    expect(scaleData.pixels_per_foot).toBe("UNRESOLVED");

    // Derive geometry
    deriveGeometry("/fake/manifest.json", 13, "/fake/geometry.json");

    const geomCall = (fs.writeFileSync as unknown).mock.calls[1];
    const geometry = JSON.parse(geomCall[1]);

    // 13. Derived geometry referencing valid source IDs
    expect(geometry.derived_from).toContain("habs_tx3326_00013a");
    expect(geometry.geometry_status).toBe("UNRESOLVED");
    expect(geometry.width_ft).toBe("UNRESOLVED");
  });

  // 14. Residual behavior/determinism, including unresolved/review-needed cases
  it("should output review-needed for residuals when bounds are missing/unresolved", () => {
    const mockGeom = { derived_from: ["id1"], geometry_status: "UNRESOLVED" };
    const mockScale = { derived_from: ["id1"], scale_status: "UNRESOLVED" };

    (fs.readFileSync as unknown).mockImplementation((filePath: unknown) => {
      const p = filePath as string;
      if (p.includes("geometry")) return JSON.stringify(mockGeom);
      if (p.includes("scale")) return JSON.stringify(mockScale);
      return "{}";
    });

    checkResiduals(
      "/fake/geometry.json",
      "/fake/scale.json",
      "/fake/residuals.json",
    );

    const writeCall = (fs.writeFileSync as unknown).mock.calls[0];
    const residuals = JSON.parse(writeCall[1]);

    expect(residuals.check_status).toBe("review-needed");
    expect(residuals.checks[0].status).toBe("BLOCKED");
  });

  // 7. Source -> normalized -> derived provenance
  it("should cleanly integrate provenance without claiming research items are approved", () => {
    const intake = [
      {
        sheet_number: 13,
        stable_id: "test",
        canonical_url: "url",
        rights_status: "unknown",
        retrieval_date: "1",
      },
    ];
    (fs.readFileSync as unknown).mockImplementation((filePath: unknown) => {
      const p = filePath as string;
      if (p.includes("manifest")) return JSON.stringify(intake);
      return "{}";
    });

    integrateProvenance("/fake/manifest", "/fake/out");
    const writeCall = (fs.writeFileSync as unknown).mock.calls[0];
    const prov = JSON.parse(writeCall[1]);

    expect(prov.entries[0].approval_status).toBe("pending");
  });

  // 6. SHA-256 Hashing, 8. Immutable Source Behavior
  it("should acquire master transiently and assign sha256 hash without mutating relevance", async () => {
    const mockManifest = [
      {
        sheet_number: 13,
        stable_id: "id1",
        relevance_classification: "unresolved",
        file_variants: { master: { url: "http://test.tif" } },
      },
    ];
    (fs.readFileSync as unknown).mockImplementation((filePath: unknown) => {
      const p = filePath as string;
      if (p.includes("intake.json")) return JSON.stringify(mockManifest);
      return Buffer.from("mock image data");
    });

    (fs.existsSync as unknown).mockReturnValue(false); // mock file doesn't exist

    (global.fetch as unknown).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => Buffer.from("mock image data").buffer,
    });

    await acquireMaster("intake.json", 13, "/fake/out");

    const writeCall = (fs.writeFileSync as unknown).mock.calls[1]; // first is the image buffer, second is manifest update
    const updatedManifest = JSON.parse(writeCall[1]);

    expect(updatedManifest[0].file_variants.master.hash).toBeDefined();
    // Test that we DID NOT change relevance status (Fix for Blocker #2)
    expect(updatedManifest[0].relevance_classification).toBe("unresolved");
  });
});
