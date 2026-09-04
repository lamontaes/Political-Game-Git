import { describe, expect, it } from "vitest";

import {
  DIRECTLY_USABLE_CONTENT_KINDS,
  licenceIsVerified,
  summarizeExternalPacks,
  validateExternalPackRecord,
  type ExternalPackRecord,
} from "./external-packs";
import {
  EXTERNAL_PACK_RECORDS,
  PACK_OFFICE_CUBICLE_SET,
  PACK_UNIVERSAL_ANIMATION_LIBRARY,
  PACK_UNIVERSAL_BASE_CHARACTERS,
} from "./fixtures/external-packs";

function record(
  overrides: Partial<ExternalPackRecord> = {},
): ExternalPackRecord {
  return {
    packId: "test-pack",
    title: "Test pack",
    archiveFileName: "test.zip",
    archiveByteLength: 1_024,
    archiveSha256: "a".repeat(64),
    entryCount: 2,
    contents: [
      { kind: "finished-2d-art", fileCount: 2, extensions: ["png"] },
      { kind: "licence-document", fileCount: 1, extensions: ["txt"] },
    ],
    licence: {
      spdxId: "CC0-1.0",
      statement: "CC0 1.0, stated in LICENSE.txt.",
      evidence: "archive-document",
      evidencePath: "LICENSE.txt",
      attributionRequired: false,
    },
    disposition: "use-now",
    refusalReasons: [],
    rationale: "Finished 2D art under a licence the archive states.",
    harvested: [],
    reviewedOn: "2026-09-03",
    reviewedBy: "test",
    ...overrides,
  };
}

function codes(entry: ExternalPackRecord): string[] {
  return validateExternalPackRecord(entry).findings.map(
    (finding) => finding.code,
  );
}

describe("external pack intake", () => {
  it("accepts a pack that answers both questions", () => {
    const result = validateExternalPackRecord(record());
    expect(result.valid).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("treats only a document inside the archive as licence evidence", () => {
    expect(
      licenceIsVerified({
        spdxId: "CC0-1.0",
        statement: "The storefront says CC0.",
        evidence: "distribution-page",
        attributionRequired: false,
      }),
    ).toBe(false);
    expect(
      licenceIsVerified({
        statement: "The creator said so in a message.",
        evidence: "creator-statement",
        attributionRequired: false,
      }),
    ).toBe(false);
    expect(
      licenceIsVerified({
        spdxId: "CC0-1.0",
        statement: "LICENSE.txt says CC0 1.0.",
        evidence: "archive-document",
        attributionRequired: false,
      }),
    ).toBe(true);
  });

  it("refuses to use a pack whose rights are only claimed elsewhere", () => {
    expect(
      codes(
        record({
          licence: {
            spdxId: "CC0-1.0",
            statement: "The download page said CC0.",
            evidence: "distribution-page",
            attributionRequired: false,
          },
        }),
      ),
    ).toContain("use-now-without-verified-licence");
  });

  it("refuses to use a pack that contains no art this renderer can draw", () => {
    expect(
      codes(
        record({
          contents: [
            { kind: "pbr-texture-map", fileCount: 47, extensions: ["png"] },
            { kind: "3d-model", fileCount: 62, extensions: ["fbx"] },
            { kind: "licence-document", fileCount: 1, extensions: ["txt"] },
          ],
        }),
      ),
    ).toContain("use-now-without-usable-content");
  });

  it("counts only finished 2D art as directly usable", () => {
    expect(DIRECTLY_USABLE_CONTENT_KINDS).toEqual(["finished-2d-art"]);
  });

  it("requires a refusal to say why, and a use to say nothing of the kind", () => {
    expect(
      codes(record({ disposition: "archive", refusalReasons: [] })),
    ).toContain("refusal-without-reason");
    expect(
      codes(record({ disposition: "reject", refusalReasons: [] })),
    ).toContain("refusal-without-reason");
    expect(codes(record({ refusalReasons: ["style-mismatch"] }))).toContain(
      "reason-on-use-now",
    );
  });

  it("refuses a harvest from an unverified or rejected pack", () => {
    const harvest = [
      {
        sourcePath: "pack/plate.png",
        repositoryPath: "art/references/external/plate.png",
        contentHash: "b".repeat(64),
      },
    ];
    expect(
      codes(
        record({
          harvested: harvest,
          licence: {
            statement: "No licence file.",
            evidence: "none",
            attributionRequired: false,
          },
        }),
      ),
    ).toContain("harvest-without-verified-licence");
    expect(
      codes(
        record({
          disposition: "reject",
          refusalReasons: ["rights-unverified"],
          harvested: harvest,
        }),
      ),
    ).toContain("harvest-from-refused-pack");
    expect(
      codes(
        record({
          harvested: [
            {
              sourcePath: "pack/plate.png",
              repositoryPath: "src/assets/plate.png",
              contentHash: "b".repeat(64),
            },
          ],
        }),
      ),
    ).toContain("harvest-outside-references");
  });

  it("requires an archive identity, so a record names one exact download", () => {
    expect(codes(record({ archiveSha256: "short" }))).toContain(
      "missing-archive-identity",
    );
    expect(codes(record({ archiveByteLength: 0 }))).toContain(
      "missing-archive-identity",
    );
  });

  it("rejects an empty or repeated content group", () => {
    expect(
      codes(
        record({
          contents: [
            { kind: "finished-2d-art", fileCount: 0, extensions: ["png"] },
          ],
        }),
      ),
    ).toContain("content-group-empty");
    expect(
      codes(
        record({
          contents: [
            { kind: "finished-2d-art", fileCount: 1, extensions: ["png"] },
            { kind: "finished-2d-art", fileCount: 1, extensions: ["webp"] },
          ],
        }),
      ),
    ).toContain("duplicate-content-kind");
  });
});

describe("the three downloaded packs", () => {
  it("records all three as valid, and none of them as usable now", () => {
    expect(EXTERNAL_PACK_RECORDS).toHaveLength(3);
    for (const entry of EXTERNAL_PACK_RECORDS) {
      const result = validateExternalPackRecord(entry);
      expect(result.findings, entry.packId).toEqual([]);
      expect(result.valid, entry.packId).toBe(true);
      expect(entry.disposition, entry.packId).not.toBe("use-now");
      expect(entry.harvested, entry.packId).toEqual([]);
    }
  });

  it("separates the two reasons a pack can be unusable", () => {
    // CC0 and unreachable: the licence is not the problem.
    for (const entry of [
      PACK_UNIVERSAL_BASE_CHARACTERS,
      PACK_UNIVERSAL_ANIMATION_LIBRARY,
    ]) {
      expect(licenceIsVerified(entry.licence), entry.packId).toBe(true);
      expect(entry.licence.spdxId, entry.packId).toBe("CC0-1.0");
      expect(entry.disposition, entry.packId).toBe("archive");
      expect(entry.refusalReasons, entry.packId).toContain(
        "needs-rigging-or-render",
      );
      expect(entry.refusalReasons, entry.packId).not.toContain(
        "rights-unverified",
      );
    }

    // Unknown rights: the technical case never gets to matter.
    expect(licenceIsVerified(PACK_OFFICE_CUBICLE_SET.licence)).toBe(false);
    expect(PACK_OFFICE_CUBICLE_SET.licence.spdxId).toBeUndefined();
    expect(PACK_OFFICE_CUBICLE_SET.disposition).toBe("reject");
    expect(PACK_OFFICE_CUBICLE_SET.refusalReasons[0]).toBe("rights-unverified");
  });

  it("finds no finished 2D art in any of the three", () => {
    for (const entry of EXTERNAL_PACK_RECORDS) {
      expect(
        entry.contents.filter((group) => group.kind === "finished-2d-art"),
        entry.packId,
      ).toEqual([]);
    }
  });

  it("summarizes what the downloads actually came to", () => {
    expect(summarizeExternalPacks(EXTERNAL_PACK_RECORDS)).toEqual({
      packCount: 3,
      useNow: 0,
      archived: 2,
      rejected: 1,
      harvestedFileCount: 0,
      inspectedFileCount: 259,
    });
  });

  it("keeps each record's file counts equal to the archive it names", () => {
    for (const entry of EXTERNAL_PACK_RECORDS) {
      const counted = entry.contents.reduce(
        (total, group) => total + group.fileCount,
        0,
      );
      expect(counted, entry.packId).toBe(entry.entryCount);
    }
  });
});
