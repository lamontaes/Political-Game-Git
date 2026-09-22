import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import {
  ART_DESK_CANDIDATE_SIDECAR,
  cachedPrivatePack,
  collectArtDeskInputs,
  PACK_RECEIPT_TTL_MS,
  detectRaster,
  hashBytes,
  inspectPrivatePack,
  listCandidateRecords,
  refuseUnverifiedReviews,
  upsertCandidateRecord,
  verifyCandidate,
} from "./art-desk-inputs";

/** A real 2×3 PNG built from its chunks, so detection reads IHDR, not a name. */
export function tinyPng(width = 2, height = 3): Buffer {
  const crcTable = new Int32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c;
  });
  const crc = (bytes: Buffer) => {
    let c = -1;
    for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((1 + width * 3) * height, 0x40);
  for (let row = 0; row < height; row += 1) raw[row * (1 + width * 3)] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** JPEG SOI + APP0 + SOF0 header carrying real dimensions. */
export function tinyJpegHeader(width = 1280, height = 720): Buffer {
  const app0 = Buffer.from([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0,
    0,
  ]);
  const sof = Buffer.alloc(2 + 2 + 6);
  sof[0] = 0xff;
  sof[1] = 0xc0;
  sof.writeUInt16BE(8, 2);
  sof[4] = 8;
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  sof[9] = 1;
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    app0,
    sof,
    Buffer.from([0xff, 0xd9]),
  ]);
}

describe("raster detection", () => {
  it("reads PNG and JPEG dimensions from bytes and refuses non-rasters", () => {
    expect(detectRaster(tinyPng(2, 3))).toEqual({
      container: "png",
      width: 2,
      height: 3,
    });
    expect(detectRaster(tinyJpegHeader(1280, 720))).toEqual({
      container: "jpg",
      width: 1280,
      height: 720,
    });
    expect(detectRaster(Buffer.from("not an image at all"))).toBeNull();
    expect(detectRaster(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });
});

describe("candidate byte verification", () => {
  const workspace = mkdtempSync(join(tmpdir(), "art-desk-inputs-"));
  const png = tinyPng();
  const sha = hashBytes(png);
  const requestId = "qa-round-trip";
  const path = `art/generated/candidates/art-desk/${requestId}/${sha}.png`;
  mkdirSync(dirname(join(workspace, path)), { recursive: true });
  writeFileSync(join(workspace, path), png);

  it("verifies present bytes that hash to the record and decode", () => {
    const receipt = verifyCandidate(workspace, {
      requestId,
      sha256: sha,
      path,
      source: "upload-sidecar",
    });
    expect(receipt.bytes).toBe("verified");
    expect(receipt.raster).toEqual({
      container: "png",
      width: 2,
      height: 3,
      hasAlpha: false,
    });
    expect(receipt.actualSha256).toBe(sha);
  });

  it("reports missing bytes without inventing them", () => {
    const receipt = verifyCandidate(workspace, {
      requestId: "env-neighborhood-doorstep-generic",
      sha256:
        "b0ced60cf0ea130db316f6d63ae61e34009795a6a04a4abebe79c55926e47266",
      path: "art/generated/candidates/art-desk/env-neighborhood-doorstep-generic/b0ced60cf0ea130db316f6d63ae61e34009795a6a04a4abebe79c55926e47266.jpg",
      source: "generation-batch",
    });
    expect(receipt.bytes).toBe("missing");
    expect(receipt.actualSha256).toBeUndefined();
  });

  it("reports a hash mismatch when the file changed under a recorded hash", () => {
    const corruptPath = `art/generated/candidates/art-desk/${requestId}/corrupt.png`;
    writeFileSync(
      join(workspace, corruptPath),
      Buffer.concat([png, Buffer.from([1])]),
    );
    const receipt = verifyCandidate(workspace, {
      requestId,
      sha256: sha,
      path: corruptPath,
      source: "upload-sidecar",
    });
    expect(receipt.bytes).toBe("hash-mismatch");
    expect(receipt.actualSha256).not.toBe(sha);
  });

  it("reports bytes that match but do not decode", () => {
    const text = Buffer.from("plain text under a real hash");
    const textSha = hashBytes(text);
    const textPath = `art/generated/candidates/art-desk/${requestId}/${textSha}.png`;
    writeFileSync(join(workspace, textPath), text);
    expect(
      verifyCandidate(workspace, {
        requestId,
        sha256: textSha,
        path: textPath,
        source: "upload-sidecar",
      }).bytes,
    ).toBe("not-a-raster");
  });

  it("refuses paths outside the workspace and malformed hashes", () => {
    expect(
      verifyCandidate(workspace, {
        requestId,
        sha256: sha,
        path: "../../etc/passwd",
        source: "upload-sidecar",
      }).bytes,
    ).toBe("missing");
    expect(
      verifyCandidate(workspace, {
        requestId,
        sha256: "nothex",
        path,
        source: "upload-sidecar",
      }).bytes,
    ).toBe("missing");
  });

  it("merges the batch registry with the upload sidecar, sidecar winning per request", () => {
    mkdirSync(join(workspace, "art/requests"), { recursive: true });
    writeFileSync(
      join(workspace, "art/requests/art-desk-generation-batch.json"),
      JSON.stringify({
        records: [
          {
            requestId: "env-x",
            outputSha256: "a".repeat(64),
            privatePath: "art/generated/candidates/art-desk/env-x/a.jpg",
          },
        ],
      }),
    );
    const sidecar = upsertCandidateRecord(
      { documentVersion: 1, candidates: [] },
      {
        requestId,
        sha256: sha,
        path,
        byteLength: png.length,
        container: "png",
        width: 2,
        height: 3,
        storedAt: "2026-09-16T00:00:00.000Z",
        declaredBy: "test-fixture",
        rightsStatus: "unknown",
        sourceDeclaration: "fixture",
      },
    );
    writeFileSync(
      join(workspace, ART_DESK_CANDIDATE_SIDECAR),
      JSON.stringify(sidecar),
    );
    const records = listCandidateRecords(workspace);
    expect(records.map((r) => [r.requestId, r.source])).toEqual([
      ["env-x", "generation-batch"],
      [requestId, "upload-sidecar"],
    ]);
    const receipt = collectArtDeskInputs(workspace, undefined, "now");
    expect(receipt.privatePack.status).toBe("not-configured");
    expect(receipt.candidates.map((c) => c.bytes)).toEqual([
      "missing",
      "verified",
    ]);
  });
});

describe("private pack receipt", () => {
  const workspace = mkdtempSync(join(tmpdir(), "art-desk-pack-ws-"));
  const packDir = mkdtempSync(join(tmpdir(), "art-desk-pack-"));

  it("stays not-configured, missing or invalid without guessing", () => {
    expect(inspectPrivatePack(workspace, undefined, "t").status).toBe(
      "not-configured",
    );
    expect(
      inspectPrivatePack(workspace, join(packDir, "nope"), "t").status,
    ).toBe("missing");
    writeFileSync(join(packDir, "pack.json"), "{not json");
    expect(inspectPrivatePack(workspace, packDir, "t").status).toBe("invalid");
  });

  it("verifies a staged pack and reports partial staging as incomplete", () => {
    const files = [
      ["art/authoring/x/a.svg", "<svg a/>"],
      ["art/authoring/x/b.svg", "<svg b/>"],
      ["art/authoring/x/c.svg", "<svg c/>"],
    ] as const;
    const manifest = files
      .map(([relative, body]) => `${hashBytes(body)}  ${relative}`)
      .join("\n");
    writeFileSync(join(packDir, "sha256.txt"), manifest + "\n");
    writeFileSync(
      join(packDir, "pack.json"),
      JSON.stringify({
        packId: "test-pack",
        manifest: "sha256.txt",
        manifestSha256: hashBytes(manifest + "\n"),
      }),
    );
    for (const [relative, body] of files.slice(0, 2)) {
      mkdirSync(dirname(join(workspace, relative)), { recursive: true });
      writeFileSync(join(workspace, relative), body);
    }
    const partial = inspectPrivatePack(workspace, packDir, "t");
    expect(partial.status).toBe("incomplete");
    expect(partial.filesPresent).toBe(2);
    expect(partial.filesTotal).toBe(3);
    writeFileSync(join(workspace, files[2][0]), files[2][1]);
    const full = inspectPrivatePack(workspace, packDir, "t");
    expect(full.status).toBe("verified");
    expect(full.packId).toBe("test-pack");
    expect(full.sampleVerified).toBe(full.sampleSize);
    writeFileSync(join(workspace, files[0][0]), "tampered");
    expect(inspectPrivatePack(workspace, packDir, "t").status).toBe(
      "incomplete",
    );
  });

  it("refuses empty or malformed manifests and an absent declared identity", () => {
    writeFileSync(join(packDir, "sha256.txt"), "");
    writeFileSync(
      join(packDir, "pack.json"),
      JSON.stringify({ packId: "p", manifestSha256: hashBytes("") }),
    );
    const empty = inspectPrivatePack(workspace, packDir, "t");
    expect(empty.status).toBe("invalid");
    expect(empty.note).toContain("empty");
    const malformed = "not-a-hash  art/x.svg\n";
    writeFileSync(join(packDir, "sha256.txt"), malformed);
    writeFileSync(
      join(packDir, "pack.json"),
      JSON.stringify({ packId: "p", manifestSha256: hashBytes(malformed) }),
    );
    const bad = inspectPrivatePack(workspace, packDir, "t");
    expect(bad.status).toBe("invalid");
    expect(bad.note).toContain("malformed");
    const good = `${hashBytes("<svg a/>")}  art/authoring/x/a.svg\n`;
    writeFileSync(join(packDir, "sha256.txt"), good);
    writeFileSync(join(packDir, "pack.json"), JSON.stringify({ packId: "p" }));
    const undeclared = inspectPrivatePack(workspace, packDir, "t");
    expect(undeclared.status).toBe("invalid");
    expect(undeclared.note).toContain("declares no manifest SHA-256");
  });

  it("marks a manifest that does not hash to its declaration invalid", () => {
    writeFileSync(
      join(packDir, "pack.json"),
      JSON.stringify({ packId: "p", manifestSha256: "0".repeat(64) }),
    );
    expect(inspectPrivatePack(workspace, packDir, "t").status).toBe("invalid");
  });
});

describe("review write boundary", () => {
  const verified = {
    requestId: "qa",
    sha256: "1".repeat(64),
    path: "p",
    source: "upload-sidecar" as const,
    bytes: "verified" as const,
    note: "",
  };
  const review = (id: string, sha: string) => ({
    reviewId: id,
    requestId: "qa",
    outputSha256: sha,
    decision: "approve",
  });

  it("refuses changed, deleted or duplicated historical records (director R2)", () => {
    const history = {
      reviewId: "old",
      requestId: "qa",
      requestVersion: 1,
      outputSha256: "9".repeat(64),
      decision: "reject",
    };
    const current = { reviews: [history] };
    // Same id, changed request / hash / decision / version.
    for (const mutation of [
      { requestId: "other" },
      { outputSha256: "1".repeat(64) },
      { decision: "approve" },
      { requestVersion: 2 },
    ]) {
      const refusals = refuseUnverifiedReviews(
        current,
        { reviews: [{ ...history, ...mutation }] },
        [verified],
      );
      expect(refusals.map((r) => r.reviewId)).toEqual(["old"]);
      expect(refusals[0]?.reason).toContain("changed under its id");
    }
    // Dropped history.
    expect(
      refuseUnverifiedReviews(current, { reviews: [] }, [verified])[0]?.reason,
    ).toContain("deleted");
    // Duplicate ids in the submission.
    const dup = refuseUnverifiedReviews(
      current,
      {
        reviews: [
          history,
          { ...history, reviewId: "new", outputSha256: "1".repeat(64) },
          { ...history, reviewId: "new", outputSha256: "1".repeat(64) },
        ],
      },
      [verified],
    );
    expect(dup.some((r) => r.reason.includes("Duplicate"))).toBe(true);
    // Unchanged history with a verified new record passes.
    expect(
      refuseUnverifiedReviews(
        current,
        {
          reviews: [
            history,
            {
              ...history,
              reviewId: "new",
              outputSha256: "1".repeat(64),
              decision: "approve",
            },
          ],
        },
        [verified],
      ),
    ).toEqual([]);
  });

  it("lets history stand and refuses new decisions on unverified bytes", () => {
    const current = { reviews: [review("old", "9".repeat(64))] };
    expect(
      refuseUnverifiedReviews(
        current,
        { reviews: [...current.reviews, review("new", "1".repeat(64))] },
        [verified],
      ),
    ).toEqual([]);
    expect(
      refuseUnverifiedReviews(
        current,
        { reviews: [...current.reviews, review("new", "2".repeat(64))] },
        [verified],
      ),
    ).toHaveLength(1);
    expect(
      refuseUnverifiedReviews(
        current,
        { reviews: [...current.reviews, review("new", "1".repeat(64))] },
        [{ ...verified, bytes: "missing" }],
      )[0]?.reason,
    ).toContain("missing");
    expect(
      refuseUnverifiedReviews(
        null,
        { reviews: [review("new", "1".repeat(64))] },
        [{ ...verified, bytes: "hash-mismatch" }],
      )[0]?.reason,
    ).toContain("hash-mismatch");
  });
});

describe("receipts the Art Desk asks for on every load", () => {
  it("re-verifies a candidate only when its bytes change", () => {
    const workspace = mkdtempSync(join(tmpdir(), "art-desk-inputs-cache-"));
    const png = tinyPng();
    const record = {
      requestId: "cached",
      sha256: hashBytes(png),
      path: `art/generated/candidates/cached/${hashBytes(png)}.png`,
      source: "upload-sidecar" as const,
    };
    mkdirSync(dirname(join(workspace, record.path)), { recursive: true });
    writeFileSync(join(workspace, record.path), png);
    const first = verifyCandidate(workspace, record);
    expect(first.bytes).toBe("verified");
    expect(verifyCandidate(workspace, record)).toBe(first);
    writeFileSync(join(workspace, record.path), "replaced bytes");
    expect(verifyCandidate(workspace, record).bytes).toBe("hash-mismatch");
  });

  it("reuses a pack receipt for a minute unless the pack itself changes", () => {
    const workspace = mkdtempSync(join(tmpdir(), "art-desk-pack-cache-ws-"));
    const packDir = mkdtempSync(join(tmpdir(), "art-desk-pack-cache-"));
    const relative = "art/authoring/x/a.svg";
    const manifest = `${hashBytes("<svg a/>")}  ${relative}\n`;
    writeFileSync(join(packDir, "sha256.txt"), manifest);
    writeFileSync(
      join(packDir, "pack.json"),
      JSON.stringify({ packId: "p", manifestSha256: hashBytes(manifest) }),
    );
    let now = 1_000;
    const clock = () => now;
    const missing = cachedPrivatePack(workspace, packDir, "t1", clock);
    expect(missing.status).toBe("incomplete");
    mkdirSync(dirname(join(workspace, relative)), { recursive: true });
    writeFileSync(join(workspace, relative), "<svg a/>");
    // Within the minute the earlier receipt, with its own checkedAt, stands.
    expect(cachedPrivatePack(workspace, packDir, "t2", clock)).toBe(missing);
    now += PACK_RECEIPT_TTL_MS;
    const fresh = cachedPrivatePack(workspace, packDir, "t3", clock);
    expect(fresh.status).toBe("verified");
    expect(fresh.checkedAt).toBe("t3");
    // A changed pack.json is noticed at once.
    writeFileSync(join(packDir, "pack.json"), JSON.stringify({ packId: "p" }));
    expect(cachedPrivatePack(workspace, packDir, "t4", clock).status).toBe(
      "invalid",
    );
  });
});
