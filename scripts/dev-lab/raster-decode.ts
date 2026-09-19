/**
 * Bounded, genuine raster decoding for the private authoring boundary.
 *
 * A matching hash proves identity, not validity. Before bytes can become a
 * reviewable candidate — at upload and again at decision time — they are
 * decoded fully by a real decoder (pngjs / jpeg-js, both locked in the
 * repository through pureimage), under explicit byte and pixel ceilings.
 * Header sniffing (`detectRaster`) remains a cheap pre-check only.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export interface DecodeLimits {
  /** Refuse inputs larger than this many bytes before decoding. */
  readonly maxBytes: number;
  /** Refuse images whose header declares more pixels than this. */
  readonly maxPixels: number;
}

export const DEFAULT_DECODE_LIMITS: DecodeLimits = {
  maxBytes: 96 * 1024 * 1024,
  maxPixels: 64 * 1024 * 1024,
};

export type DecodedContainer = "png" | "jpg";

export interface DecodedRaster {
  readonly container: DecodedContainer;
  readonly width: number;
  readonly height: number;
  /** True only when at least one pixel decoded with alpha below 255. */
  readonly hasAlpha: boolean;
  /** True when the container can carry per-pixel alpha at all. */
  readonly alphaCapable: boolean;
  readonly decodedPixels: number;
}

export type DecodeFailureCode =
  | "too-large"
  | "too-many-pixels"
  | "not-a-raster"
  | "truncated-or-corrupt"
  | "decoder-unavailable";

export type DecodeResult =
  | { readonly ok: true; readonly raster: DecodedRaster }
  | {
      readonly ok: false;
      readonly code: DecodeFailureCode;
      readonly message: string;
    };

function fail(code: DecodeFailureCode, message: string): DecodeResult {
  return { ok: false, code, message };
}

function looksPng(bytes: Buffer): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  );
}

function looksJpeg(bytes: Buffer): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

function declaredPngPixels(bytes: Buffer): number | null {
  if (bytes.length < 24 || bytes.toString("ascii", 12, 16) !== "IHDR") {
    return null;
  }
  return bytes.readUInt32BE(16) * bytes.readUInt32BE(20);
}

function declaredJpegPixels(bytes: Buffer): number | null {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 2;
      continue;
    }
    const length = bytes.readUInt16BE(offset + 2);
    const isFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isFrame) {
      return bytes.readUInt16BE(offset + 5) * bytes.readUInt16BE(offset + 7);
    }
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}

interface PngModule {
  readonly PNG: {
    readonly sync: {
      read(buffer: Buffer): {
        readonly width: number;
        readonly height: number;
        readonly data: Buffer;
      };
    };
  };
}

interface JpegModule {
  decode(
    buffer: Buffer,
    options: {
      readonly useTArray: boolean;
      readonly maxMemoryUsageInMB?: number;
      readonly maxResolutionInMP?: number;
      readonly tolerantDecoding?: boolean;
    },
  ): {
    readonly width: number;
    readonly height: number;
    readonly data: Uint8Array;
  };
}

function loadPng(): PngModule | null {
  try {
    return require("pngjs") as PngModule;
  } catch {
    return null;
  }
}

function loadJpeg(): JpegModule | null {
  try {
    return require("jpeg-js") as JpegModule;
  } catch {
    return null;
  }
}

function alphaBelowOpaque(data: Uint8Array | Buffer, pixels: number): boolean {
  const limit = Math.min(data.length, pixels * 4);
  for (let index = 3; index < limit; index += 4) {
    if (data[index] !== 255) return true;
  }
  return false;
}

/** Decode fully, or say exactly why the bytes are not a reviewable raster. */
export function decodeRaster(
  bytes: Buffer,
  limits: DecodeLimits = DEFAULT_DECODE_LIMITS,
): DecodeResult {
  if (bytes.length > limits.maxBytes) {
    return fail(
      "too-large",
      `Input is ${bytes.length} bytes; the authoring boundary decodes at most ${limits.maxBytes}.`,
    );
  }
  if (looksPng(bytes)) {
    const declared = declaredPngPixels(bytes);
    if (declared === null) {
      return fail(
        "truncated-or-corrupt",
        "PNG signature without a readable IHDR.",
      );
    }
    if (declared > limits.maxPixels) {
      return fail(
        "too-many-pixels",
        `PNG declares ${declared} pixels; the ceiling is ${limits.maxPixels}.`,
      );
    }
    const png = loadPng();
    if (!png) return fail("decoder-unavailable", "pngjs is not installed.");
    try {
      const image = png.PNG.sync.read(bytes);
      const pixels = image.width * image.height;
      if (image.data.length < pixels * 4) {
        return fail(
          "truncated-or-corrupt",
          "PNG decoded fewer pixels than its header declares.",
        );
      }
      return {
        ok: true,
        raster: {
          container: "png",
          width: image.width,
          height: image.height,
          hasAlpha: alphaBelowOpaque(image.data, pixels),
          alphaCapable: true,
          decodedPixels: pixels,
        },
      };
    } catch (error) {
      return fail(
        "truncated-or-corrupt",
        `PNG did not decode: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (looksJpeg(bytes)) {
    const declared = declaredJpegPixels(bytes);
    if (declared === null) {
      return fail("truncated-or-corrupt", "JPEG has no readable frame header.");
    }
    if (declared > limits.maxPixels) {
      return fail(
        "too-many-pixels",
        `JPEG declares ${declared} pixels; the ceiling is ${limits.maxPixels}.`,
      );
    }
    // A decodable JPEG ends with EOI; a cut-off stream never reaches it.
    if (bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
      return fail(
        "truncated-or-corrupt",
        "JPEG stream does not end with an EOI marker; the file is truncated.",
      );
    }
    const jpeg = loadJpeg();
    if (!jpeg) return fail("decoder-unavailable", "jpeg-js is not installed.");
    try {
      const image = jpeg.decode(bytes, {
        useTArray: true,
        maxMemoryUsageInMB:
          Math.ceil((limits.maxPixels * 4) / (1024 * 1024)) + 64,
        maxResolutionInMP: Math.ceil(limits.maxPixels / 1_000_000),
        tolerantDecoding: false,
      });
      const pixels = image.width * image.height;
      if (image.data.length < pixels * 4) {
        return fail(
          "truncated-or-corrupt",
          "JPEG decoded fewer pixels than its frame declares.",
        );
      }
      return {
        ok: true,
        raster: {
          container: "jpg",
          width: image.width,
          height: image.height,
          hasAlpha: false,
          alphaCapable: false,
          decodedPixels: pixels,
        },
      };
    } catch (error) {
      return fail(
        "truncated-or-corrupt",
        `JPEG did not decode: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return fail("not-a-raster", "Bytes are neither PNG nor JPEG.");
}
