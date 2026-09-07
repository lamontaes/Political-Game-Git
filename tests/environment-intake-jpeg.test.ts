import fs from "fs";
import os from "os";
import path from "path";
import { createHash } from "crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  measureCandidateFile,
  runEnvironmentIntake,
} from "../scripts/art-asset-factory/environment-intake";
import {
  readJpegDimensions,
  JpegStructureError,
} from "../scripts/art-asset-factory/jpeg-dimensions";
import {
  readPngHeader,
  pngHasAlphaChannel,
  pngHasVaryingAlpha,
} from "../scripts/art-asset-factory/master-inventory";
import { validateAssetBankManifest } from "../src/authoring/asset-bank";

// Original test-only 17x9 solid RGB fixture, encoded with Pillow as baseline
// and progressive JPEG. No candidate/source image was transformed for fixtures.
const baseline = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAJABEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDGooor2DywooooA//Z",
  "base64",
);
const progressive = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wgARCAAJABEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAT/xAAVAQEBAAAAAAAAAAAAAAAAAAAABP/aAAwDAQACEAMQAAABiFkoH//EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEAAQUCX//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8BP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8BP//EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEABj8CX//EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEAAT8hX//aAAwDAQACAAMAAAAQ88//xAAUEQEAAAAAAAAAAAAAAAAAAAAQ/9oACAEDAQE/ED//xAAUEQEAAAAAAAAAAAAAAAAAAAAQ/9oACAECAQE/ED//xAAUEAEAAAAAAAAAAAAAAAAAAAAg/9oACAEBAAE/EF//2Q==",
  "base64",
);
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "jpeg-intake-test-"));
afterAll(() => fs.rmSync(workspace, { recursive: true, force: true }));
const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
function write(name: string, bytes: Buffer) {
  const file = path.join(workspace, name);
  fs.writeFileSync(file, bytes);
  return file;
}
function request(file: string) {
  const requestPath = path.join(workspace, "request.json");
  fs.writeFileSync(
    requestPath,
    JSON.stringify({
      requestVersion: 1,
      batchId: "jpeg-test",
      candidates: [
        {
          asset_id: "jpeg_candidate",
          file,
          target_class: "environment-plate",
          lineage_class: "original-master",
          native_detail_state: "unverified",
          rights_status: "unknown",
        },
      ],
    }),
  );
  return requestPath;
}

describe("JPEG intake measurement without normalization", () => {
  it.each([
    ["baseline.JPG", baseline],
    ["progressive.jpeg", progressive],
  ] as const)(
    "measures %s and preserves its exact bytes and mtime",
    (name, bytes) => {
      const file = write(name, bytes);
      const before = fs.statSync(file, { bigint: true });
      expect(measureCandidateFile(file)).toEqual({
        width: 17,
        height: 9,
        byteLength: bytes.length,
        format: "jpg",
        contentHash: hash(bytes),
        hasAlphaChannel: false,
        hasVaryingAlpha: false,
      });
      expect(fs.readFileSync(file)).toEqual(bytes);
      expect(fs.statSync(file, { bigint: true }).mtimeNs).toBe(before.mtimeNs);
    },
  );

  it("rejects every truncated prefix, including truncation after SOF and within scans", () => {
    for (const bytes of [baseline, progressive]) {
      for (let end = 0; end < bytes.length; end++) {
        expect(
          () => readJpegDimensions(bytes.subarray(0, end)),
          `prefix ${end}`,
        ).toThrow(JpegStructureError);
      }
    }
  });

  it("rejects misleading extensions and fabricated JPEG signatures", () => {
    expect(() =>
      measureCandidateFile(write("misleading.png", baseline)),
    ).toThrow(/extension/);
    expect(() =>
      measureCandidateFile(write("fake.jpg", Buffer.from("not JPEG"))),
    ).toThrow(/SOI/);
  });

  it("rejects malformed lengths, dimensions, scan components, missing tables and trailing bytes", () => {
    const badLength = Buffer.from(baseline);
    badLength.writeUInt16BE(1, 4);
    const zeroWidth = Buffer.from(baseline);
    zeroWidth.writeUInt16BE(
      0,
      zeroWidth.indexOf(Buffer.from([0xff, 0xc0])) + 7,
    );
    const badScan = Buffer.from(baseline);
    badScan[badScan.indexOf(Buffer.from([0xff, 0xda])) + 5] = 99;
    const missingTables = Buffer.from(baseline);
    let pos = 0;
    while (
      (pos = missingTables.indexOf(Buffer.from([0xff, 0xc4]), pos)) !== -1
    ) {
      missingTables[pos + 1] = 0xfe;
      pos += 2;
    }
    for (const bytes of [
      badLength,
      zeroWidth,
      badScan,
      missingTables,
      Buffer.concat([baseline, Buffer.from([1])]),
      Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    ]) {
      expect(() => readJpegDimensions(bytes)).toThrow(JpegStructureError);
    }
  });

  it("reports a structural finding and no dimensions for malformed JPEG", () => {
    const file = write("truncated.jpg", baseline.subarray(0, -2));
    const result = runEnvironmentIntake(request(file), workspace);
    expect(result.report.rejectCount).toBe(1);
    expect(result.report.records[0]).toMatchObject({
      width: null,
      height: null,
      disposition: "reject",
    });
    expect(result.report.records[0]!.findings).toContainEqual({
      code: "unreadable-dimensions",
      severity: "error",
      message: "JPEG structure: missing EOI (truncated JPEG).",
    });
  });

  it("preserves the prior PNG measurement exactly, including filename format and alpha", () => {
    // Existing original synthetic PNG fixture, including a misleading suffix:
    // the historical PNG path is intentionally unchanged by JPEG support.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==",
      "base64",
    );
    const header = readPngHeader(png)!;
    const alpha = pngHasAlphaChannel(header.colorType);
    for (const name of ["parity.png", "parity.jpg"]) {
      expect(measureCandidateFile(write(name, png))).toEqual({
        width: header.width,
        height: header.height,
        byteLength: png.length,
        format: path.extname(name).slice(1),
        contentHash: hash(png),
        hasAlphaChannel: alpha,
        hasVaryingAlpha: alpha ? pngHasVaryingAlpha(png, header) : false,
      });
    }
    expect(measureCandidateFile(path.join(workspace, "absent.png"))).toBeNull();
  });

  it.each([
    [
      "IMG_5205",
      "c2829c934d7f3aa78dd8a2ed07be75c23189dd7dc6a614176403691edc43439c",
    ],
    [
      "IMG_5189",
      "a538616176e4340aa828fa56dbc61fe18b298552d7604e889233872bbb1179aa",
    ],
  ])(
    "measures exact preserved %s while leaving production promotion blocked",
    (name, expectedHash) => {
      const file = path.resolve(
        "art/references/candidates/recent-drive-sweep/source-images",
        `${name}.JPG`,
      );
      const before = fs.statSync(file, { bigint: true });
      expect(hash(fs.readFileSync(file))).toBe(expectedHash);
      const requestPath = request(file);
      const first = runEnvironmentIntake(requestPath, workspace);
      expect(runEnvironmentIntake(requestPath, workspace)).toEqual(first);
      expect(first.report.records[0]).toMatchObject({
        width: 5504,
        height: 3072,
        contentHash: expectedHash,
        nativeDetailState: "unverified",
        rightsStatus: "unknown",
      });
      expect(first.report.records[0]!.findings.map((f) => f.code)).toEqual([
        "native-detail-unverified",
        "rights-status-unknown",
      ]);
      expect(first.assetBank.entries[0]!.disposition).toBe("undecided");
      const attemptedPromotion = {
        ...first.assetBank,
        entries: first.assetBank.entries.map((entry) => ({
          ...entry,
          disposition: "production" as const,
        })),
      };
      expect(
        validateAssetBankManifest(attemptedPromotion).findings.map(
          (f) => f.code,
        ),
      ).toContain("production-while-unassessed");
      expect(hash(fs.readFileSync(file))).toBe(expectedHash);
      expect(fs.statSync(file, { bigint: true }).mtimeNs).toBe(before.mtimeNs);
    },
  );
});
