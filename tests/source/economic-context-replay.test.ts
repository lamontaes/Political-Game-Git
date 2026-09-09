import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { replayEconomicContextArtifact } from "../../scripts/source/replay";

const ROOT = resolve(import.meta.dirname, "../..");
const TRACKED_ARTIFACT = resolve(
  ROOT,
  "src/presentation/generated/economic-context-lexington.json",
);

describe("compact economic context replay", () => {
  it("reproduces the tracked Lexington artifact byte-for-byte", () => {
    expect(replayEconomicContextArtifact()).toEqual([]);
  });

  it("rejects a corrupted endpoint release instead of blessing the snapshot", () => {
    const scratch = mkdtempSync(resolve(tmpdir(), "economic-context-corrupt-"));
    try {
      const corruptedPath = resolve(scratch, "economic-context-lexington.json");
      const tracked = readFileSync(TRACKED_ARTIFACT, "utf8");
      const corrupted = tracked.replace(
        '"laterRelease": "PRELIMINARY"',
        '"laterRelease": "FINAL"',
      );
      expect(corrupted).not.toBe(tracked);
      writeFileSync(corruptedPath, corrupted);

      expect(replayEconomicContextArtifact(corruptedPath)).toEqual([
        {
          path: "src/presentation/generated/economic-context-lexington.json",
          reason: expect.stringContaining(
            'tracked "      \\"laterRelease\\": \\"FINAL\\"," vs generated "      \\"laterRelease\\": \\"PRELIMINARY\\","',
          ),
        },
      ]);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
