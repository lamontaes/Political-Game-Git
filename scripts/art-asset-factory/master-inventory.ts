import fs from "fs";
import path from "path";
import zlib from "zlib";

import {
  evaluateEnvironmentMaster,
  evaluateMasterDimensions,
  masterRequirementFor,
  type MeasuredMaster,
} from "../../src/presentation/component-masters";
import type { CharacterComponentKind } from "../../src/presentation/character-components";
import { hashArtFile } from "./content-hash";

/**
 * Deterministic intake measurement for candidate art.
 *
 * Point it at a folder of candidate masters and it reports, for each file, the
 * pixel dimensions, whether the raster carries a genuinely varying alpha
 * channel, its SHA-256, and whether it clears the master minimum for the
 * component class it is being considered for. It never modifies a source file
 * and it never enlarges anything: an undersized master is REJECTED, with the
 * enlargement it would have needed stated so the report is actionable.
 *
 * The whole point is that a batch of paid generations can be handed over as a
 * folder and get a machine-readable verdict before any of it reaches the
 * manifest.
 */

export interface MasterInventoryEntry {
  readonly file: string;
  readonly bytes: number;
  readonly hash: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly longEdge: number | null;
  readonly colorType: number | null;
  /** Null when alpha could not be determined from the container. */
  readonly hasAlphaChannel: boolean | null;
  /** Null when the pixels were not inspected (non-PNG, or unreadable). */
  readonly hasVaryingAlpha: boolean | null;
  readonly assumedKind: CharacterComponentKind | "environment-plate" | null;
  readonly verdict: "PASS" | "FAIL" | "UNMEASURED";
  readonly reasons: readonly string[];
  readonly requiredUpscaleFactor: number | null;
}

export interface MasterInventoryReport {
  readonly tool: string;
  readonly directory: string;
  readonly fileCount: number;
  readonly passCount: number;
  readonly failCount: number;
  readonly unmeasuredCount: number;
  readonly entries: readonly MasterInventoryEntry[];
}

export const MASTER_INVENTORY_TOOL = "master-inventory-v1";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

interface PngHeader {
  readonly width: number;
  readonly height: number;
  readonly bitDepth: number;
  readonly colorType: number;
}

/**
 * Reads a PNG IHDR directly. Deliberately dependency-free and total: a file
 * that is not a PNG returns null rather than throwing, so one bad candidate
 * cannot abort a batch.
 */
export function readPngHeader(buffer: Buffer): PngHeader | null {
  if (buffer.length < 33) return null;
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (buffer.toString("ascii", 12, 16) !== "IHDR") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24]!,
    colorType: buffer[25]!,
  };
}

/** PNG colour types 4 and 6 carry an alpha channel; 0, 2 and 3 do not. */
export function pngHasAlphaChannel(colorType: number): boolean {
  return colorType === 4 || colorType === 6;
}

/**
 * Reverses the per-scanline PNG filters so the returned bytes are real pixel
 * values rather than deltas. Reading filtered bytes directly is the classic way
 * to get a confident, wrong answer about an image's alpha.
 */
function unfilterScanlines(
  raw: Buffer,
  width: number,
  height: number,
  channels: number,
): Buffer | null {
  const stride = width * channels;
  if (raw.length < height * (stride + 1)) return null;
  const out = Buffer.alloc(height * stride);

  for (let row = 0; row < height; row += 1) {
    const filter = raw[row * (stride + 1)]!;
    const source = row * (stride + 1) + 1;
    const target = row * stride;
    const previous = target - stride;

    for (let index = 0; index < stride; index += 1) {
      const value = raw[source + index]!;
      const left = index >= channels ? out[target + index - channels]! : 0;
      const up = row > 0 ? out[previous + index]! : 0;
      const upLeft =
        row > 0 && index >= channels ? out[previous + index - channels]! : 0;

      let restored: number;
      switch (filter) {
        case 0:
          restored = value;
          break;
        case 1:
          restored = value + left;
          break;
        case 2:
          restored = value + up;
          break;
        case 3:
          restored = value + ((left + up) >> 1);
          break;
        case 4: {
          const estimate = left + up - upLeft;
          const distanceLeft = Math.abs(estimate - left);
          const distanceUp = Math.abs(estimate - up);
          const distanceUpLeft = Math.abs(estimate - upLeft);
          restored =
            value +
            (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft
              ? left
              : distanceUp <= distanceUpLeft
                ? up
                : upLeft);
          break;
        }
        default:
          return null;
      }
      out[target + index] = restored & 0xff;
    }
  }
  return out;
}

/**
 * Whether the alpha channel actually varies, rather than being a fully opaque
 * channel on a picture that only LOOKS cut out. Painted-white "transparency" is
 * a recorded failure mode, and it is exactly what this catches.
 *
 * Returns null when the pixels cannot be read, so an unreadable candidate is
 * reported as unknown rather than quietly passed or failed.
 */
export function pngHasVaryingAlpha(
  buffer: Buffer,
  header: PngHeader,
): boolean | null {
  if (!pngHasAlphaChannel(header.colorType)) return false;
  if (header.bitDepth !== 8) return null;

  const channels = header.colorType === 6 ? 4 : 2;
  const idat: Buffer[] = [];
  let offset = 8;
  let interlaced = false;
  if (buffer.length > 28) interlaced = buffer[28] !== 0;
  if (interlaced) return null; // Adam7 is not worth decoding for one boolean.

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") {
      idat.push(buffer.subarray(offset + 8, offset + 8 + length));
    }
    if (type === "IEND") break;
    offset += 12 + length;
  }
  if (idat.length === 0) return null;

  let raw: Buffer;
  try {
    raw = zlib.inflateSync(Buffer.concat(idat));
  } catch {
    return null;
  }

  const pixels = unfilterScanlines(raw, header.width, header.height, channels);
  if (!pixels) return null;

  for (let index = channels - 1; index < pixels.length; index += channels) {
    if (pixels[index]! !== 255) return true;
  }
  return false;
}

/**
 * Guesses the component class from a filename, so a folder of candidates can be
 * judged without a hand-written manifest. A name that says nothing recognisable
 * is reported UNMEASURED rather than assigned a class it may not belong to.
 */
export function inferKindFromName(
  fileName: string,
): CharacterComponentKind | "environment-plate" | null {
  const name = fileName.toLowerCase();
  if (/(facial[_-]?hair|beard|moustache|mustache)/.test(name)) {
    return "facial-hair";
  }
  if (/hair.*back/.test(name)) return "hair-back";
  if (/hair/.test(name)) return "hair-front";
  if (/(eyewear|glasses|spectacle)/.test(name)) return "eyewear";
  if (/(head|face)/.test(name)) return "head";
  if (/(body|standing|seated|mannequin|rigfit|torso)/.test(name)) return "body";
  if (/(shoe|footwear|boot|derby|oxford)/.test(name)) return "footwear";
  if (/(top|shirt|blazer|jacket|knit|sweater|blouse)/.test(name)) return "top";
  if (/(bottom|trouser|slack|skirt|pant)/.test(name)) return "bottom";
  if (/(accessory|lanyard|pin|badge)/.test(name)) return "accessory";
  if (/(scene|plate|title|bg|background|office|room|chamber)/.test(name)) {
    return "environment-plate";
  }
  return null;
}

/** Guesses the pose a body candidate is in, for the body minimums. */
export function inferPoseFromName(fileName: string): string | undefined {
  const name = fileName.toLowerCase();
  if (/(seated|sitting|desk)/.test(name)) return "seated-at-desk";
  if (/(standing|a[_-]?pose)/.test(name)) return "standing-neutral";
  return undefined;
}

const MEDIA_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function listFiles(directory: string): string[] {
  const found: string[] = [];
  const walk = (current: string) => {
    for (const entry of fs
      .readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (MEDIA_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        found.push(full);
      }
    }
  };
  if (fs.existsSync(directory)) walk(directory);
  return found;
}

export function inventoryMasters(directory: string): MasterInventoryReport {
  const entries: MasterInventoryEntry[] = [];

  for (const filePath of listFiles(directory)) {
    const relative = path.relative(directory, filePath).replace(/\\/g, "/");
    const buffer = fs.readFileSync(filePath);
    const header = readPngHeader(buffer);
    const hash = hashArtFile(filePath);
    const bytes = buffer.length;

    if (!header) {
      entries.push({
        file: relative,
        bytes,
        hash,
        width: null,
        height: null,
        longEdge: null,
        colorType: null,
        hasAlphaChannel: null,
        hasVaryingAlpha: null,
        assumedKind: inferKindFromName(relative),
        verdict: "UNMEASURED",
        reasons: [
          "Dimensions could not be read. Only PNG candidates are measured; convert to PNG before intake.",
        ],
        requiredUpscaleFactor: null,
      });
      continue;
    }

    const hasAlphaChannel = pngHasAlphaChannel(header.colorType);
    const hasVaryingAlpha = pngHasVaryingAlpha(buffer, header);
    const kind = inferKindFromName(relative);
    const measured: MeasuredMaster = {
      width: header.width,
      height: header.height,
      ...(hasAlphaChannel
        ? hasVaryingAlpha === null
          ? {}
          : { hasAlpha: hasVaryingAlpha }
        : { hasAlpha: false }),
    };

    if (kind === null) {
      entries.push({
        file: relative,
        bytes,
        hash,
        width: header.width,
        height: header.height,
        longEdge: Math.max(header.width, header.height),
        colorType: header.colorType,
        hasAlphaChannel,
        hasVaryingAlpha,
        assumedKind: null,
        verdict: "UNMEASURED",
        reasons: [
          "The filename does not say which component class this is, so no minimum was applied. Rename it or declare its kind before intake.",
        ],
        requiredUpscaleFactor: null,
      });
      continue;
    }

    if (kind === "environment-plate") {
      const verdict = evaluateEnvironmentMaster(measured);
      entries.push({
        file: relative,
        bytes,
        hash,
        width: header.width,
        height: header.height,
        longEdge: Math.max(header.width, header.height),
        colorType: header.colorType,
        hasAlphaChannel,
        hasVaryingAlpha,
        assumedKind: kind,
        verdict: verdict.accepted ? "PASS" : "FAIL",
        reasons: verdict.accepted
          ? verdict.meetsRecommendation
            ? []
            : [
                "Above the absolute minimum but below the recommended generation width; a 4096 tier will not survive a crop.",
              ]
          : verdict.reasons,
        requiredUpscaleFactor: null,
      });
      continue;
    }

    const pose = kind === "body" ? inferPoseFromName(relative) : undefined;
    const verdict = evaluateMasterDimensions(kind, measured, pose);
    const requirement = masterRequirementFor(kind, pose);
    entries.push({
      file: relative,
      bytes,
      hash,
      width: header.width,
      height: header.height,
      longEdge: Math.max(header.width, header.height),
      colorType: header.colorType,
      hasAlphaChannel,
      hasVaryingAlpha,
      assumedKind: kind,
      verdict: verdict.accepted ? "PASS" : "FAIL",
      reasons: verdict.accepted ? [] : [...verdict.reasons, requirement.note],
      requiredUpscaleFactor: verdict.accepted
        ? null
        : verdict.requiredUpscaleFactor,
    });
  }

  return {
    tool: MASTER_INVENTORY_TOOL,
    directory: path.basename(path.resolve(directory)),
    fileCount: entries.length,
    passCount: entries.filter((entry) => entry.verdict === "PASS").length,
    failCount: entries.filter((entry) => entry.verdict === "FAIL").length,
    unmeasuredCount: entries.filter((entry) => entry.verdict === "UNMEASURED")
      .length,
    entries,
  };
}
