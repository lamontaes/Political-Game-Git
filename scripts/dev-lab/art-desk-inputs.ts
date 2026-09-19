/**
 * Identified-server Art Desk input receipts.
 *
 * Everything the browser used to assume about private inputs is inspected here
 * instead: whether an authorized private pack is configured, present and hash
 * verified; whether each recorded candidate's bytes exist on disk, decode as a
 * raster and still hash to the recorded value. The browser renders the receipt;
 * it never guesses a path and labels it verified.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { decodeRaster } from "./raster-decode";

export const ART_DESK_CANDIDATE_PREFIX = "art/generated/candidates/art-desk/";
export const ART_DESK_CANDIDATE_SIDECAR = `${ART_DESK_CANDIDATE_PREFIX}candidates.json`;
export const ART_DESK_QA_REQUEST_SIDECAR = `${ART_DESK_CANDIDATE_PREFIX}qa-requests.json`;
export const GENERATION_BATCH_PATH =
  "art/requests/art-desk-generation-batch.json";
export const PRIVATE_PACK_ENV = "PG_PRIVATE_ART_PACK";

const SHA256 = /^[a-f0-9]{64}$/;
const PACK_SAMPLE_SIZE = 8;

export type RasterContainer = "png" | "jpg";

export interface RasterFacts {
  readonly container: RasterContainer;
  readonly width: number;
  readonly height: number;
  /** Present only after a real decode; header sniffing cannot know it. */
  readonly hasAlpha?: boolean;
}

export function hashBytes(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Magic bytes and real dimensions, never the filename. */
export function detectRaster(bytes: Buffer): RasterFacts | null {
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes.toString("ascii", 12, 16) === "IHDR"
  ) {
    return {
      container: "png",
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
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
        return {
          container: "jpg",
          height: bytes.readUInt16BE(offset + 5),
          width: bytes.readUInt16BE(offset + 7),
        };
      }
      if (length < 2) return null;
      offset += 2 + length;
    }
  }
  return null;
}

export type CandidateBytesState =
  "verified" | "missing" | "hash-mismatch" | "not-a-raster";

export interface CandidateReceipt {
  readonly requestId: string;
  /** Recorded hash from the registry or sidecar; history, never overwritten. */
  readonly sha256: string;
  readonly path: string;
  readonly source: "generation-batch" | "upload-sidecar";
  readonly bytes: CandidateBytesState;
  readonly actualSha256?: string;
  readonly byteLength?: number;
  readonly raster?: RasterFacts;
  readonly note: string;
}

export interface CandidateRecordInput {
  readonly requestId: string;
  readonly sha256: string;
  readonly path: string;
  readonly source: CandidateReceipt["source"];
}

export interface UploadedCandidateRecord {
  readonly requestId: string;
  readonly sha256: string;
  readonly path: string;
  readonly byteLength: number;
  readonly container: RasterContainer;
  readonly width: number;
  readonly height: number;
  readonly storedAt: string;
  readonly declaredBy: string;
  readonly rightsStatus: "unknown";
  readonly sourceDeclaration: string;
}

export interface CandidateSidecarDocument {
  readonly documentVersion: 1;
  readonly candidates: readonly UploadedCandidateRecord[];
}

export function emptyCandidateSidecar(): CandidateSidecarDocument {
  return { documentVersion: 1, candidates: [] };
}

/** Replace any earlier record for the same request; one current candidate per request. */
export function upsertCandidateRecord(
  document: CandidateSidecarDocument,
  record: UploadedCandidateRecord,
): CandidateSidecarDocument {
  return {
    documentVersion: 1,
    candidates: [
      ...document.candidates.filter(
        (item) => item.requestId !== record.requestId,
      ),
      record,
    ],
  };
}

export function isInsideWorkspace(
  workspace: string,
  relative: string,
): boolean {
  const root = resolve(workspace);
  const absolute = resolve(root, relative);
  return absolute === root || absolute.startsWith(root + sep);
}

export function verifyCandidate(
  workspace: string,
  record: CandidateRecordInput,
): CandidateReceipt {
  const base = { ...record };
  if (
    !SHA256.test(record.sha256) ||
    !isInsideWorkspace(workspace, record.path)
  ) {
    return {
      ...base,
      bytes: "missing",
      note: "Recorded candidate has no usable hash or path; nothing on disk was consulted.",
    };
  }
  const absolute = resolve(workspace, record.path);
  if (!existsSync(absolute) || !statSync(absolute).isFile()) {
    return {
      ...base,
      bytes: "missing",
      note: "Candidate hash is recorded. Its private bytes are not in this checkout.",
    };
  }
  const bytes = readFileSync(absolute);
  const actualSha256 = hashBytes(bytes);
  if (actualSha256 !== record.sha256) {
    const sniffed = detectRaster(bytes);
    return {
      ...base,
      bytes: "hash-mismatch",
      actualSha256,
      byteLength: bytes.length,
      raster: sniffed ?? undefined,
      note: "Bytes on disk do not hash to the recorded candidate. They are a different candidate; prior decisions do not apply.",
    };
  }
  // Identity proven; now validity. A real bounded decode, not a header read.
  const decoded = decodeRaster(bytes);
  if (!decoded.ok) {
    return {
      ...base,
      bytes: "not-a-raster",
      actualSha256,
      byteLength: bytes.length,
      note: `Bytes match the recorded hash but are not a decodable raster (${decoded.code}): ${decoded.message}`,
    };
  }
  const raster: RasterFacts = {
    container: decoded.raster.container,
    width: decoded.raster.width,
    height: decoded.raster.height,
    hasAlpha: decoded.raster.hasAlpha,
  };
  return {
    ...base,
    bytes: "verified",
    actualSha256,
    byteLength: bytes.length,
    raster,
    note: `Bytes present, hash-verified and fully decoded: ${raster.width}×${raster.height} ${raster.container}${raster.hasAlpha ? " with alpha" : ""}.`,
  };
}

function readJson<T>(workspace: string, relative: string): T | null {
  const absolute = resolve(workspace, relative);
  if (!existsSync(absolute)) return null;
  try {
    return JSON.parse(readFileSync(absolute, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Every recorded candidate the desk knows about: the batch registry plus uploads. */
export function listCandidateRecords(
  workspace: string,
): CandidateRecordInput[] {
  const batch = readJson<{
    records?: readonly {
      requestId: string;
      outputSha256: string;
      privatePath: string;
    }[];
  }>(workspace, GENERATION_BATCH_PATH);
  const sidecar = readJson<CandidateSidecarDocument>(
    workspace,
    ART_DESK_CANDIDATE_SIDECAR,
  );
  const byRequest = new Map<string, CandidateRecordInput>();
  for (const record of batch?.records ?? []) {
    byRequest.set(record.requestId, {
      requestId: record.requestId,
      sha256: record.outputSha256,
      path: record.privatePath,
      source: "generation-batch",
    });
  }
  for (const record of sidecar?.candidates ?? []) {
    byRequest.set(record.requestId, {
      requestId: record.requestId,
      sha256: record.sha256,
      path: record.path,
      source: "upload-sidecar",
    });
  }
  return [...byRequest.values()];
}

export type PrivatePackStatus =
  "not-configured" | "missing" | "invalid" | "incomplete" | "verified";

export interface PrivatePackReceipt {
  readonly status: PrivatePackStatus;
  readonly note: string;
  readonly packId?: string;
  readonly manifestSha256?: string;
  readonly declaredManifestSha256?: string;
  readonly filesTotal?: number;
  readonly filesPresent?: number;
  readonly sampleVerified?: number;
  readonly sampleSize?: number;
  readonly checkedAt: string;
}

interface PackJson {
  readonly packId?: string;
  readonly manifest?: string;
  readonly manifestSha256?: string;
  readonly filesRoot?: string;
}

/**
 * Inspect an authorized private pack directory against the workspace it should
 * have been staged into. The directory is named by an environment variable the
 * operator sets; the receipt never invents one. Machine paths stay on the
 * server: the receipt carries identity, not locations.
 */
export function inspectPrivatePack(
  workspace: string,
  packDirectory: string | undefined,
  now: string,
): PrivatePackReceipt {
  if (!packDirectory) {
    return {
      status: "not-configured",
      note: `No authorized private pack is configured for this server (${PRIVATE_PACK_ENV} unset). That is an access/input state, not proof modern people are absent from the bank.`,
      checkedAt: now,
    };
  }
  const packJsonPath = join(packDirectory, "pack.json");
  if (!existsSync(packJsonPath)) {
    return {
      status: "missing",
      note: "Configured private pack directory has no pack.json; nothing was verified.",
      checkedAt: now,
    };
  }
  let pack: PackJson;
  try {
    pack = JSON.parse(readFileSync(packJsonPath, "utf8")) as PackJson;
  } catch {
    return {
      status: "invalid",
      note: "pack.json is not readable JSON.",
      checkedAt: now,
    };
  }
  const manifestPath = join(packDirectory, pack.manifest ?? "sha256.txt");
  if (!existsSync(manifestPath)) {
    return {
      status: "invalid",
      packId: pack.packId,
      declaredManifestSha256: pack.manifestSha256,
      note: "Pack manifest is missing; the declared manifest hash cannot be checked.",
      checkedAt: now,
    };
  }
  const manifestBytes = readFileSync(manifestPath);
  const manifestSha256 = hashBytes(manifestBytes);
  if (!pack.manifestSha256 || !SHA256.test(pack.manifestSha256)) {
    return {
      status: "invalid",
      packId: pack.packId,
      manifestSha256,
      note: "pack.json declares no manifest SHA-256; without an expected identity nothing can be called verified.",
      checkedAt: now,
    };
  }
  if (manifestSha256 !== pack.manifestSha256) {
    return {
      status: "invalid",
      packId: pack.packId,
      manifestSha256,
      declaredManifestSha256: pack.manifestSha256,
      note: "Pack manifest does not hash to the value pack.json declares.",
      checkedAt: now,
    };
  }
  const rows = manifestBytes
    .toString("utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash, ...rest] = line.split(/\s+/);
      return { hash, relative: rest.join(" ").replace(/^\*/, "") };
    });
  const entries = rows.filter(
    (entry) => SHA256.test(entry.hash) && entry.relative,
  );
  if (rows.length === 0 || entries.length !== rows.length) {
    return {
      status: "invalid",
      packId: pack.packId,
      manifestSha256,
      declaredManifestSha256: pack.manifestSha256,
      filesTotal: entries.length,
      note:
        rows.length === 0
          ? "Pack manifest is empty; an empty manifest verifies nothing."
          : `Pack manifest has ${rows.length - entries.length} malformed row(s); refusing to verify against a partial manifest.`,
      checkedAt: now,
    };
  }
  let filesPresent = 0;
  for (const entry of entries) {
    const absolute = resolve(workspace, entry.relative);
    if (
      isInsideWorkspace(workspace, entry.relative) &&
      existsSync(absolute) &&
      statSync(absolute).isFile()
    ) {
      filesPresent += 1;
    }
  }
  const step = Math.max(1, Math.floor(entries.length / PACK_SAMPLE_SIZE));
  const sample = entries
    .filter((_, index) => index % step === 0)
    .slice(0, PACK_SAMPLE_SIZE);
  let sampleVerified = 0;
  for (const entry of sample) {
    const absolute = resolve(workspace, entry.relative);
    if (
      existsSync(absolute) &&
      hashBytes(readFileSync(absolute)) === entry.hash
    ) {
      sampleVerified += 1;
    }
  }
  const complete =
    filesPresent === entries.length && sampleVerified === sample.length;
  return {
    status: complete ? "verified" : "incomplete",
    packId: pack.packId,
    manifestSha256,
    declaredManifestSha256: pack.manifestSha256,
    filesTotal: entries.length,
    filesPresent,
    sampleVerified,
    sampleSize: sample.length,
    note: complete
      ? `Authorized private pack ${pack.packId ?? "(unnamed)"} is staged in this workspace: manifest hash matches, ${filesPresent}/${entries.length} files present, ${sampleVerified}/${sample.length} sampled hashes verified (sampled, not a full rehash).`
      : `Authorized private pack ${pack.packId ?? "(unnamed)"} is only partly staged: ${filesPresent}/${entries.length} files present, ${sampleVerified}/${sample.length} sampled hashes verified (sampled, not a full rehash).`,
    checkedAt: now,
  };
}

export interface ArtDeskInputsReceipt {
  readonly contractVersion: "alive43-art-desk-v1";
  readonly checkedAt: string;
  readonly privatePack: PrivatePackReceipt;
  readonly candidates: readonly CandidateReceipt[];
}

export function collectArtDeskInputs(
  workspace: string,
  packDirectory: string | undefined,
  now: string,
): ArtDeskInputsReceipt {
  return {
    contractVersion: "alive43-art-desk-v1",
    checkedAt: now,
    privatePack: inspectPrivatePack(workspace, packDirectory, now),
    candidates: listCandidateRecords(workspace).map((record) =>
      verifyCandidate(workspace, record),
    ),
  };
}

interface ReviewLike {
  readonly reviewId: string;
  readonly requestId: string;
  readonly outputSha256: string;
  readonly decision: string;
  readonly [field: string]: unknown;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export type ReviewWriteRefusal = {
  readonly reviewId: string;
  readonly reason: string;
};

/**
 * The write boundary for decisions. History already on disk is immutable:
 * a record may neither change under its id nor disappear, and an id may not
 * appear twice. Every genuinely new review must bind bytes that are present,
 * decoded and hash-verified for that request right now. A superseding
 * decision is a new record with a new id, never an edit.
 */
export function refuseUnverifiedReviews(
  current: { readonly reviews?: readonly ReviewLike[] } | null,
  next: { readonly reviews?: readonly ReviewLike[] },
  receipts: readonly CandidateReceipt[],
): ReviewWriteRefusal[] {
  const existing = new Map<string, string>();
  for (const review of current?.reviews ?? []) {
    existing.set(review.reviewId, canonical(review));
  }
  const refusals: ReviewWriteRefusal[] = [];
  const seen = new Set<string>();
  const nextIds = new Set((next.reviews ?? []).map((item) => item.reviewId));
  for (const [reviewId] of existing) {
    if (!nextIds.has(reviewId)) {
      refusals.push({
        reviewId,
        reason:
          "Historical review would be deleted; decisions are append-only.",
      });
    }
  }
  for (const review of next.reviews ?? []) {
    if (seen.has(review.reviewId)) {
      refusals.push({
        reviewId: review.reviewId,
        reason:
          "Duplicate review id in the submitted document; identity is ambiguous.",
      });
      continue;
    }
    seen.add(review.reviewId);
    const prior = existing.get(review.reviewId);
    if (prior !== undefined) {
      if (prior !== canonical(review)) {
        refusals.push({
          reviewId: review.reviewId,
          reason:
            "Historical review changed under its id; record a superseding decision with a new id instead.",
        });
      }
      continue;
    }
    const receipt = receipts.find(
      (item) =>
        item.requestId === review.requestId &&
        item.sha256 === review.outputSha256,
    );
    if (!receipt) {
      refusals.push({
        reviewId: review.reviewId,
        reason: `No recorded candidate for '${review.requestId}' hashes to ${review.outputSha256.slice(0, 12)}…`,
      });
    } else if (receipt.bytes !== "verified") {
      refusals.push({
        reviewId: review.reviewId,
        reason: `Candidate bytes for '${review.requestId}' are ${receipt.bytes}; a decision binds present, decoded, hash-verified bytes.`,
      });
    }
  }
  return refusals;
}
