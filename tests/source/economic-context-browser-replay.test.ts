import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { exportEconomicContextBrowser } from "../../scripts/source/export-economic-context-browser";

const ROOT = resolve(import.meta.dirname, "../..");
const TRACKED_OUTPUT = resolve(ROOT, "public/data/economic-context/v1");

describe("economic browser export replay", () => {
  it("reproduces every tracked manifest and shard byte-for-byte", () => {
    const replayOutput = mkdtempSync(
      join(tmpdir(), "economic-context-replay-"),
    );
    try {
      const result = exportEconomicContextBrowser(replayOutput);

      expect(result).toEqual({ recordCount: 58_106, shardCount: 292 });
      expect(digestTree(replayOutput)).toEqual(digestTree(TRACKED_OUTPUT));
    } finally {
      rmSync(replayOutput, { recursive: true, force: true });
    }
  });
});

function digestTree(root: string): readonly {
  readonly path: string;
  readonly sha256: string;
}[] {
  return walk(root)
    .map((path) => ({
      path: relative(root, path),
      sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
