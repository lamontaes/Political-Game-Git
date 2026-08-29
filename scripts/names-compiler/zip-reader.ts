/**
 * Zero-dependency ZIP Archive Reader
 *
 * Implements standard PKZIP Central Directory traversal and Deflate decompression
 * using Node.js built-in `zlib.inflateRawSync`.
 */

import zlib from "node:zlib";

export interface ZipEntry {
  readonly filename: string;
  readonly compressionMethod: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly getData: () => Buffer;
  readonly getText: () => string;
}

export class ZipReader {
  private readonly entries = new Map<string, ZipEntry>();

  private constructor(entries: Map<string, ZipEntry>) {
    this.entries = entries;
  }

  public static fromBuffer(buffer: Buffer): ZipReader {
    if (buffer.length < 22) {
      throw new Error(
        "Invalid ZIP file: buffer too small to contain EOCD record.",
      );
    }

    // Locate End of Central Directory record (signature: 0x06054b50) from the end
    let eocdOffset = -1;
    for (let i = buffer.length - 22; i >= 0; i--) {
      if (buffer.readUInt32LE(i) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      throw new Error(
        "Invalid ZIP file: End of Central Directory (EOCD) signature not found.",
      );
    }

    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

    const entries = new Map<string, ZipEntry>();
    let curr = cdOffset;

    for (let i = 0; i < totalEntries; i++) {
      if (curr + 46 > buffer.length) {
        throw new Error(
          `Invalid ZIP file: truncated central directory header at entry ${i}.`,
        );
      }

      const sig = buffer.readUInt32LE(curr);
      if (sig !== 0x02014b50) {
        throw new Error(
          `Invalid ZIP file: expected central directory signature 0x02014b50, got 0x${sig.toString(16)} at offset ${curr}.`,
        );
      }

      const method = buffer.readUInt16LE(curr + 10);
      const compSize = buffer.readUInt32LE(curr + 20);
      const uncompSize = buffer.readUInt32LE(curr + 24);
      const nameLen = buffer.readUInt16LE(curr + 28);
      const extraLen = buffer.readUInt16LE(curr + 30);
      const commentLen = buffer.readUInt16LE(curr + 32);
      const localHeaderOffset = buffer.readUInt32LE(curr + 42);

      const filename = buffer.toString("utf8", curr + 46, curr + 46 + nameLen);

      // Verify local file header
      if (localHeaderOffset + 30 > buffer.length) {
        throw new Error(
          `Invalid ZIP file: truncated local file header for entry "${filename}".`,
        );
      }
      const localSig = buffer.readUInt32LE(localHeaderOffset);
      if (localSig !== 0x04034b50) {
        throw new Error(
          `Invalid ZIP file: expected local header signature 0x04034b50 for "${filename}", got 0x${localSig.toString(16)}.`,
        );
      }

      const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;

      if (dataOffset + compSize > buffer.length) {
        throw new Error(
          `Invalid ZIP file: truncated compressed data for entry "${filename}".`,
        );
      }

      const compData = buffer.subarray(dataOffset, dataOffset + compSize);

      const entry: ZipEntry = {
        filename,
        compressionMethod: method,
        compressedSize: compSize,
        uncompressedSize: uncompSize,
        getData: () => {
          if (method === 0) {
            return compData;
          }
          if (method === 8) {
            return zlib.inflateRawSync(compData);
          }
          throw new Error(
            `Unsupported ZIP compression method ${method} for entry "${filename}".`,
          );
        },
        getText: () => entry.getData().toString("utf8"),
      };

      entries.set(filename, entry);
      curr += 46 + nameLen + extraLen + commentLen;
    }

    return new ZipReader(entries);
  }

  public getEntry(filename: string): ZipEntry | undefined {
    return this.entries.get(filename);
  }

  public has(filename: string): boolean {
    return this.entries.has(filename);
  }

  public listFiles(): string[] {
    return Array.from(this.entries.keys());
  }

  public readText(filename: string): string {
    const entry = this.entries.get(filename);
    if (!entry) {
      throw new Error(`Entry "${filename}" not found in ZIP archive.`);
    }
    return entry.getText();
  }

  public readBuffer(filename: string): Buffer {
    const entry = this.entries.get(filename);
    if (!entry) {
      throw new Error(`Entry "${filename}" not found in ZIP archive.`);
    }
    return entry.getData();
  }
}
