import crypto from "crypto";
import fs from "fs";

export const ART_CONTENT_HASH_ALGORITHM = "sha256";

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

export function hashArtFile(filePath: string): string {
  return crypto
    .createHash(ART_CONTENT_HASH_ALGORITHM)
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

export function isArtContentHash(value: unknown): value is string {
  return typeof value === "string" && SHA256_HEX_PATTERN.test(value);
}
