import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

import { tinyJpegHeader, tinyPng } from "./art-desk-inputs.test";
import { hashBytes, verifyCandidate } from "./art-desk-inputs";
import { decodeRaster } from "./raster-decode";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

function realJpeg(width = 16, height = 8): Buffer {
  const jpeg = require("jpeg-js") as {
    encode(
      image: { width: number; height: number; data: Buffer },
      quality: number,
    ): { data: Buffer };
  };
  const data = Buffer.alloc(width * height * 4, 0x80);
  return Buffer.from(jpeg.encode({ width, height, data }, 80).data);
}

function transparentPng(width = 4, height = 4): Buffer {
  const png = require("pngjs") as {
    PNG: new (options: { width: number; height: number }) => {
      data: Buffer;
    } & { constructor: { sync: { write(png: unknown): Buffer } } };
  };
  const image = new png.PNG({ width, height });
  image.data.fill(0x40);
  for (let index = 3; index < image.data.length; index += 4) {
    image.data[index] = index % 8 === 3 ? 0 : 255;
  }
  const PNGClass = png.PNG as unknown as {
    sync: { write(p: unknown): Buffer };
  };
  return Buffer.from(PNGClass.sync.write(image));
}

describe("bounded real raster decoding (director R1)", () => {
  it("decodes valid PNG and JPEG controls and measures alpha", () => {
    const opaque = decodeRaster(tinyPng(2, 3));
    expect(opaque.ok && opaque.raster).toMatchObject({
      container: "png",
      width: 2,
      height: 3,
      hasAlpha: false,
      decodedPixels: 6,
    });
    const alpha = decodeRaster(transparentPng(4, 4));
    expect(alpha.ok && alpha.raster.hasAlpha).toBe(true);
    const jpeg = decodeRaster(realJpeg(16, 8));
    expect(jpeg.ok && jpeg.raster).toMatchObject({
      container: "jpg",
      width: 16,
      height: 8,
      hasAlpha: false,
      alphaCapable: false,
    });
  });

  it("rejects header-only, truncated and corrupt inputs even under their own hash", () => {
    const headerOnly = tinyPng(1, 1).subarray(0, 24);
    const header = decodeRaster(Buffer.from(headerOnly));
    expect(header.ok).toBe(false);
    if (!header.ok) expect(header.code).toBe("truncated-or-corrupt");
    const full = tinyPng(8, 8);
    const truncatedPng = decodeRaster(full.subarray(0, full.length - 12));
    expect(truncatedPng.ok).toBe(false);
    const corrupt = Buffer.from(full);
    corrupt[corrupt.length - 20] ^= 0xff;
    expect(decodeRaster(corrupt).ok).toBe(false);
    const jpegHeaderOnly = decodeRaster(tinyJpegHeader(1280, 720));
    expect(jpegHeaderOnly.ok).toBe(false);
    const jpeg = realJpeg(16, 8);
    const truncatedJpeg = decodeRaster(jpeg.subarray(0, jpeg.length - 40));
    expect(truncatedJpeg.ok).toBe(false);
    expect(decodeRaster(Buffer.from("plain text")).ok).toBe(false);
  });

  it("enforces byte and pixel ceilings before decoding", () => {
    const small = { maxBytes: 16, maxPixels: 4 };
    const tooLarge = decodeRaster(tinyPng(2, 3), small);
    expect(!tooLarge.ok && tooLarge.code).toBe("too-large");
    const tooMany = decodeRaster(tinyPng(3, 3), {
      maxBytes: 1 << 20,
      maxPixels: 4,
    });
    expect(!tooMany.ok && tooMany.code).toBe("too-many-pixels");
  });

  it("keeps a truncated PNG stored under its real hash out of verified state", () => {
    const workspace = mkdtempSync(join(tmpdir(), "raster-r1-"));
    const bytes = Buffer.from(tinyPng(1, 1).subarray(0, 24));
    const sha = hashBytes(bytes);
    const path = `art/generated/candidates/art-desk/r1/${sha}.png`;
    mkdirSync(dirname(join(workspace, path)), { recursive: true });
    writeFileSync(join(workspace, path), bytes);
    const receipt = verifyCandidate(workspace, {
      requestId: "r1",
      sha256: sha,
      path,
      source: "upload-sidecar",
    });
    expect(receipt.bytes).toBe("not-a-raster");
    expect(receipt.actualSha256).toBe(sha);
  });
});
