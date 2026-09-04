import crypto from "crypto";
import fs from "fs";
import path from "path";
import * as PImage from "pureimage";

import { resampleLanczos } from "./resample";

/**
 * Scene master intake and runtime tier derivation.
 *
 * One master goes in; runtime tiers come out, and every tier is a REDUCTION.
 * This module is the only place a scene plate enters the runtime bank, which
 * is what makes "nothing in this repository enlarged anything" checkable
 * rather than asserted: `deriveSceneTiers` refuses a target wider than the
 * master, so an enlargement is a thrown error and not a quiet bicubic.
 *
 * It also refuses to trust a filename. Adobe Firefly has shipped JPEG streams
 * inside files named `.png` in this project before; a PNG decoder handed one
 * of those either crashes or, worse, is worked around by someone renaming the
 * file and laundering the provenance. So the container is read from the magic
 * bytes and reported, and the decoder is chosen from what the bytes actually
 * are.
 */

export type MasterContainer = "png" | "jpeg";

export interface MasterMeasurement {
  readonly path: string;
  /** What the bytes are, not what the extension claims. */
  readonly container: MasterContainer;
  /** True when the extension disagrees with the container. */
  readonly containerMismatch: boolean;
  readonly byteLength: number;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
}

export interface DerivedTier {
  readonly width: number;
  readonly height: number;
  readonly path: string;
  readonly hash: string;
  readonly derivation: "deterministic-downscale";
  readonly reductionFactor: number;
}

export interface SceneTierDerivation {
  readonly master: MasterMeasurement;
  readonly tiers: readonly DerivedTier[];
  /** Widths asked for and refused, with the reason, so a skip is never silent. */
  readonly refused: readonly {
    readonly width: number;
    readonly reason: string;
  }[];
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

export function sniffContainer(bytes: Buffer): MasterContainer {
  if (bytes.subarray(0, 4).equals(PNG_MAGIC)) return "png";
  if (bytes.subarray(0, 3).equals(JPEG_MAGIC)) return "jpeg";
  throw new Error(
    `Unrecognised image container; leading bytes were ${bytes.subarray(0, 4).toString("hex")}. Only PNG and JPEG masters are accepted.`,
  );
}

function extensionContainer(filePath: string): MasterContainer | null {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "png";
  if (extension === ".jpg" || extension === ".jpeg") return "jpeg";
  return null;
}

export async function decodeMaster(masterPath: string): Promise<{
  readonly bitmap: PImage.Bitmap;
  readonly measurement: MasterMeasurement;
}> {
  const bytes = await fs.promises.readFile(masterPath);
  const container = sniffContainer(bytes);
  const bitmap =
    container === "png"
      ? await PImage.decodePNGFromStream(fs.createReadStream(masterPath))
      : await PImage.decodeJPEGFromStream(fs.createReadStream(masterPath));
  return {
    bitmap,
    measurement: {
      path: masterPath,
      container,
      containerMismatch: extensionContainer(masterPath) !== container,
      byteLength: bytes.byteLength,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      width: bitmap.width,
      height: bitmap.height,
    },
  };
}

export function sha256OfFile(filePath: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

export interface TierRequest {
  readonly width: number;
  readonly path: string;
}

/**
 * Derives each requested tier by separable Lanczos-3 reduction of the master.
 *
 * Height is computed from the master's own aspect ratio and rounded once, so a
 * tier is never a differently-cropped picture of the same room. A request at or
 * above the master's width is refused rather than being satisfied by
 * enlargement or by copying the master under a tier's name.
 */
export async function deriveSceneTiers(
  masterPath: string,
  requests: readonly TierRequest[],
): Promise<SceneTierDerivation> {
  const { bitmap, measurement } = await decodeMaster(masterPath);
  const tiers: DerivedTier[] = [];
  const refused: { width: number; reason: string }[] = [];

  for (const request of requests) {
    if (request.width >= measurement.width) {
      refused.push({
        width: request.width,
        reason: `Master is ${measurement.width}px wide; a ${request.width}px tier would enlarge it.`,
      });
      continue;
    }
    const height = Math.round(
      (request.width * measurement.height) / measurement.width,
    );
    const reduced = resampleLanczos(bitmap, request.width, height);
    await fs.promises.mkdir(path.dirname(request.path), { recursive: true });
    await new Promise<void>((resolve, reject) => {
      const stream = fs.createWriteStream(request.path);
      stream.on("error", reject);
      PImage.encodePNGToStream(reduced, stream).then(resolve, reject);
    });
    tiers.push({
      width: request.width,
      height,
      path: request.path,
      hash: sha256OfFile(request.path),
      derivation: "deterministic-downscale",
      reductionFactor:
        Math.round((measurement.width / request.width) * 1000) / 1000,
    });
  }

  return { master: measurement, tiers, refused };
}
