/**
 * A minimal, deterministic ZIP reader.
 *
 * Nearly every publisher in this substrate ships a zip: Census Gazetteer files,
 * FEC bulk downloads, the US Code release points, HUD workbooks. The container
 * and its members are different bytes with different digests (§6.1), so the
 * reader has to hand back the member bytes exactly, without a shell-out whose
 * availability and version would vary by machine.
 *
 * Only the two methods real publishers use are supported — stored and deflate.
 * Anything else throws rather than returning approximate bytes.
 */

import { inflateRawSync } from "node:zlib";
import { SourceParseError } from "../errors";

export interface ZipMember {
  readonly path: string;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly crc32: number;
  readonly method: number;
  readonly localHeaderOffset: number;
}

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_FILE_HEADER = 0x02014b50;
const ZIP64_END_LOCATOR = 0x07064b50;
const ZIP64_END_RECORD = 0x06064b50;

function findEndOfCentralDirectory(bytes: Buffer): number {
  // The record is at the very end unless there is a zip comment; scan back over
  // the largest comment the format allows.
  const earliest = Math.max(0, bytes.length - 22 - 0xffff);
  for (let offset = bytes.length - 22; offset >= earliest; offset -= 1) {
    if (bytes.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  throw new SourceParseError(
    "Not a ZIP archive: no end-of-central-directory record.",
  );
}

/** List the members of a zip archive, in central-directory order. */
export function listZipMembers(archive: Buffer): readonly ZipMember[] {
  const eocd = findEndOfCentralDirectory(archive);
  let entryCount = archive.readUInt16LE(eocd + 10);
  let directoryOffset = archive.readUInt32LE(eocd + 16);

  // ZIP64: the 32-bit fields saturate and the real values live in the ZIP64 record.
  if (directoryOffset === 0xffffffff || entryCount === 0xffff) {
    const locator = eocd - 20;
    if (locator >= 0 && archive.readUInt32LE(locator) === ZIP64_END_LOCATOR) {
      const zip64Offset = Number(archive.readBigUInt64LE(locator + 8));
      if (archive.readUInt32LE(zip64Offset) !== ZIP64_END_RECORD) {
        throw new SourceParseError(
          "ZIP64 locator does not point at a ZIP64 record.",
        );
      }
      entryCount = Number(archive.readBigUInt64LE(zip64Offset + 32));
      directoryOffset = Number(archive.readBigUInt64LE(zip64Offset + 48));
    }
  }

  const members: ZipMember[] = [];
  let cursor = directoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (archive.readUInt32LE(cursor) !== CENTRAL_FILE_HEADER) {
      throw new SourceParseError(
        `ZIP central directory entry ${index} has a bad signature.`,
      );
    }
    const method = archive.readUInt16LE(cursor + 10);
    const crc32 = archive.readUInt32LE(cursor + 16);
    let compressedSize = archive.readUInt32LE(cursor + 20);
    let uncompressedSize = archive.readUInt32LE(cursor + 24);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    let localHeaderOffset = archive.readUInt32LE(cursor + 42);
    const path = archive
      .subarray(cursor + 46, cursor + 46 + nameLength)
      .toString("utf-8");

    if (
      uncompressedSize === 0xffffffff ||
      compressedSize === 0xffffffff ||
      localHeaderOffset === 0xffffffff
    ) {
      const extraStart = cursor + 46 + nameLength;
      let extraCursor = extraStart;
      const extraEnd = extraStart + extraLength;
      while (extraCursor + 4 <= extraEnd) {
        const headerId = archive.readUInt16LE(extraCursor);
        const size = archive.readUInt16LE(extraCursor + 2);
        if (headerId === 0x0001) {
          let field = extraCursor + 4;
          if (uncompressedSize === 0xffffffff) {
            uncompressedSize = Number(archive.readBigUInt64LE(field));
            field += 8;
          }
          if (compressedSize === 0xffffffff) {
            compressedSize = Number(archive.readBigUInt64LE(field));
            field += 8;
          }
          if (localHeaderOffset === 0xffffffff) {
            localHeaderOffset = Number(archive.readBigUInt64LE(field));
          }
          break;
        }
        extraCursor += 4 + size;
      }
    }

    members.push({
      path,
      compressedSize,
      uncompressedSize,
      crc32,
      method,
      localHeaderOffset,
    });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return members;
}

/** Extract one member's bytes exactly. */
export function readZipMember(archive: Buffer, memberPath: string): Buffer {
  const members = listZipMembers(archive);
  const member = members.find((entry) => entry.path === memberPath);
  if (!member) {
    throw new SourceParseError(
      `ZIP archive has no member "${memberPath}"; it holds ${members
        .map((entry) => entry.path)
        .join(", ")}.`,
    );
  }
  return readZipMemberEntry(archive, member);
}

/** Extract the bytes of a member already located in the central directory. */
export function readZipMemberEntry(archive: Buffer, member: ZipMember): Buffer {
  const local = member.localHeaderOffset;
  if (archive.readUInt32LE(local) !== 0x04034b50) {
    throw new SourceParseError(
      `ZIP member "${member.path}" has a bad local header signature.`,
    );
  }
  const nameLength = archive.readUInt16LE(local + 26);
  const extraLength = archive.readUInt16LE(local + 28);
  const dataStart = local + 30 + nameLength + extraLength;
  const compressed = archive.subarray(
    dataStart,
    dataStart + member.compressedSize,
  );

  if (member.method === 0) return Buffer.from(compressed);
  if (member.method === 8) return inflateRawSync(compressed);
  throw new SourceParseError(
    `ZIP member "${member.path}" uses compression method ${member.method}; only stored (0) and deflate (8) are supported.`,
  );
}

/** The single member of a one-member archive, or a throw naming what is inside. */
export function readSoleZipMember(archive: Buffer): {
  path: string;
  bytes: Buffer;
} {
  const members = listZipMembers(archive).filter(
    (entry) => !entry.path.endsWith("/"),
  );
  if (members.length !== 1) {
    throw new SourceParseError(
      `Expected a single-member ZIP; found ${members.length}: ${members
        .map((entry) => entry.path)
        .join(", ")}.`,
    );
  }
  const member = members[0] as ZipMember;
  return { path: member.path, bytes: readZipMemberEntry(archive, member) };
}
