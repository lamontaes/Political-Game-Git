import { describe, expect, it } from "vitest";

import {
  AssetBankParseError,
  createAssetBankEntry,
  createAssetBankManifest,
  parseAssetBankManifest,
  serializeAssetBankManifest,
  summarizeAssetBank,
  validateAssetBankManifest,
  type AssetBankEntry,
} from "./asset-bank";

function entry(overrides: Partial<AssetBankEntry> = {}): AssetBankEntry {
  return {
    ...createAssetBankEntry({
      entryId: "cand-001",
      proposedFilename: "env_generic_hearing_room_01.png",
    }),
    ...overrides,
  };
}

function codes(result: { findings: readonly { code: string }[] }): string[] {
  return result.findings.map((finding) => finding.code);
}

describe("a blank entry answers nothing it has not been asked", () => {
  it("starts every judgement unassessed and the disposition undecided", () => {
    const blank = createAssetBankEntry({
      entryId: "cand-001",
      proposedFilename: "plate.png",
    });
    expect(blank.bakedPeople).toBe("unassessed");
    expect(blank.bakedReadableText).toBe("unassessed");
    expect(blank.floorUsable).toBe("unassessed");
    expect(blank.seatUsable).toBe("unassessed");
    expect(blank.heroSlot).toBe("unassessed");
    expect(blank.styleFamilyStatus).toBe("unassessed");
    expect(blank.disposition).toBe("undecided");
    expect(blank.assessedBy).toBe("unassessed");
  });

  it("keeps unassessed distinct from a negative answer", () => {
    // "Nobody looked" and "we looked and found none" are different facts.
    const blank = createAssetBankEntry({
      entryId: "c",
      proposedFilename: "p.png",
    });
    expect(blank.bakedPeople).not.toBe("no");
  });

  it("records the measurable facts intake really knows", () => {
    const seeded = createAssetBankEntry({
      entryId: "cand-002",
      proposedFilename: "plate.png",
      sourcePath: "art/candidates/plate.png",
      contentHash: "f".repeat(64),
      width: 5_120,
      height: 2_880,
    });
    expect(seeded.width).toBe(5_120);
    expect(seeded.contentHash).toHaveLength(64);
  });
});

describe("nothing unreviewed reaches production", () => {
  it("refuses a production disposition while the deciding questions are open", () => {
    const result = validateAssetBankManifest(
      createAssetBankManifest("batch-1", [
        entry({ disposition: "production" }),
      ]),
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("production-while-unassessed");
  });

  it("refuses a production plate with people painted into it", () => {
    const result = validateAssetBankManifest(
      createAssetBankManifest("batch-1", [
        entry({
          disposition: "production",
          bakedPeople: "yes",
          bakedReadableText: "no",
          floorUsable: "yes",
          assessedBy: "human-review",
        }),
      ]),
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("production-with-baked-people");
  });

  it("refuses a production plate carrying readable text", () => {
    const result = validateAssetBankManifest(
      createAssetBankManifest("batch-1", [
        entry({
          disposition: "production",
          bakedPeople: "no",
          bakedReadableText: "yes",
          floorUsable: "yes",
          assessedBy: "human-review",
        }),
      ]),
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("production-with-readable-text");
  });

  it("accepts a fully reviewed production entry", () => {
    const result = validateAssetBankManifest(
      createAssetBankManifest("batch-1", [
        entry({
          disposition: "production",
          bakedPeople: "no",
          bakedReadableText: "no",
          floorUsable: "yes",
          seatUsable: "yes",
          styleFamilyStatus: "in-family",
          assessedBy: "human-review",
        }),
      ]),
    );
    expect(result.valid).toBe(true);
  });

  it("warns about an unjustified hero claim", () => {
    const result = validateAssetBankManifest(
      createAssetBankManifest("batch-1", [entry({ heroSlot: "yes" })]),
    );
    expect(codes(result)).toContain("hero-without-justification");
  });

  it("catches a duplicate reference pointing at itself", () => {
    const result = validateAssetBankManifest(
      createAssetBankManifest("batch-1", [
        entry({ entryId: "cand-001", duplicateOf: "cand-001" }),
      ]),
    );
    expect(result.valid).toBe(false);
    expect(codes(result)).toContain("self-duplicate");
  });

  it("warns about a duplicate reference outside the batch", () => {
    const result = validateAssetBankManifest(
      createAssetBankManifest("batch-1", [
        entry({ entryId: "cand-001", nearDuplicateOf: ["cand-999"] }),
      ]),
    );
    expect(codes(result)).toContain("duplicate-reference-unknown");
  });
});

describe("import and export seam", () => {
  it("round-trips a manifest without losing anything", () => {
    const manifest = createAssetBankManifest(
      "batch-7",
      [
        entry({
          entryId: "cand-002",
          sceneFamilyId: "PUBLIC_HEARING_ROOM_01",
          cameraAngle: "eye level, three-quarter from the doorway",
          floorUsable: "yes",
          occluderCandidates: ["dais-front", "rail"],
          uiSafeRegions: [
            {
              regionId: "bottom-left-shell",
              x_percent: 0,
              y_percent: 72,
              width_percent: 26,
              height_percent: 28,
            },
          ],
          artifactFlags: ["warped-geometry"],
          reuseContexts: ["public-hearing", "board-meeting"],
          disposition: "reference",
          assessedBy: "external-multimodal-qa",
        }),
        entry({ entryId: "cand-001" }),
      ],
      "First Antigravity QA pass.",
    );
    const parsed = parseAssetBankManifest(serializeAssetBankManifest(manifest));
    expect(parsed).toEqual(manifest);
  });

  it("serializes deterministically regardless of entry order", () => {
    const a = createAssetBankManifest("b", [
      entry({ entryId: "z" }),
      entry({ entryId: "a" }),
    ]);
    const b = createAssetBankManifest("b", [
      entry({ entryId: "a" }),
      entry({ entryId: "z" }),
    ]);
    expect(serializeAssetBankManifest(a)).toBe(serializeAssetBankManifest(b));
  });

  it("degrades an unrecognised judgement to unassessed instead of losing the batch", () => {
    const parsed = parseAssetBankManifest(
      JSON.stringify({
        batchId: "batch-9",
        entries: [
          {
            entryId: "cand-001",
            proposedFilename: "plate.png",
            bakedPeople: "probably",
            disposition: "ship-it",
            styleFamilyStatus: "sort-of",
          },
        ],
      }),
    );
    expect(parsed.entries[0]!.bakedPeople).toBe("unassessed");
    expect(parsed.entries[0]!.disposition).toBe("undecided");
    expect(parsed.entries[0]!.styleFamilyStatus).toBe("unassessed");
  });

  it("throws on structural damage rather than guessing", () => {
    expect(() => parseAssetBankManifest("not json")).toThrow(
      AssetBankParseError,
    );
    expect(() =>
      parseAssetBankManifest(JSON.stringify({ entries: [] })),
    ).toThrow(AssetBankParseError);
    expect(() =>
      parseAssetBankManifest(
        JSON.stringify({ batchId: "b", entries: [{ proposedFilename: "x" }] }),
      ),
    ).toThrow(AssetBankParseError);
  });

  it("summarises a batch by disposition", () => {
    const manifest = createAssetBankManifest("batch-1", [
      entry({ entryId: "a", disposition: "reject" }),
      entry({ entryId: "b", disposition: "reference" }),
      entry({ entryId: "c" }),
    ]);
    expect(summarizeAssetBank(manifest)).toEqual({
      production: 0,
      reference: 1,
      reject: 1,
      undecided: 1,
    });
  });
});
