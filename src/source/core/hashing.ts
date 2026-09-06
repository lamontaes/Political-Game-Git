/**
 * The single hashing entry point for the whole source substrate.
 *
 * 13B found a repository where the "shared" hash primitive was not in fact
 * shared, so two call sites disagreed about what a digest meant. Here there is
 * exactly one `createHash` call site under `src/source/`, and a test asserts
 * that stays true. The source substrate is Node-only, so `node:crypto` is the
 * whole implementation — a browser-safe second version is not a requirement
 * anything in this layer has, and a second version is how they drift.
 */

import { createHash } from "node:crypto";

/** SHA-256 of raw bytes, lowercase hex. The only digest this layer computes. */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** SHA-256 of a string's UTF-8 encoding. */
export function sha256HexOfUtf8(text: string): string {
  return sha256Hex(Buffer.from(text, "utf-8"));
}

/** True for a well-formed lowercase SHA-256 hex digest. */
export function isSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}
