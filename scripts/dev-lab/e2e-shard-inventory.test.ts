import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertShardUnion,
  listPlaywrightTests,
  parsePlaywrightList,
  readShardInventories,
  shardInventory,
} from "./e2e-shard-inventory";

const listing = `
Listing tests:
  [chromium] › run-a.spec.ts:4:1 › Run A proof
  [chromium] › run-b.spec.ts:4:1 › Run B proof
Total: 2 tests in 2 files
`;

describe("Playwright shard inventory", () => {
  it("parses listed tests and refuses an empty shard", () => {
    expect(parsePlaywrightList(listing)).toEqual([
      "run-a.spec.ts:4:1 › Run A proof",
      "run-b.spec.ts:4:1 › Run B proof",
    ]);
    expect(() => shardInventory(1, 2, [])).toThrow("zero tests");
  });

  it("accepts a complete disjoint union and rejects drops, duplicates, and gaps", () => {
    const baseline = parsePlaywrightList(listing);
    const left = shardInventory(1, 2, baseline.slice(0, 1));
    const right = shardInventory(2, 2, baseline.slice(1));
    expect(() => assertShardUnion(baseline, [left, right])).not.toThrow();
    expect(() => assertShardUnion(baseline, [left])).toThrow("Expected 2");
    expect(() =>
      assertShardUnion(baseline, [left, shardInventory(2, 2, baseline)]),
    ).toThrow("more than one shard");
    expect(() =>
      assertShardUnion(baseline, [
        left,
        shardInventory(2, 2, ["other.spec.ts:1:1 › extra"]),
      ]),
    ).toThrow("does not match");
  });

  it("matches Playwright's live file-level shards for this checkout", () => {
    const baseline = listPlaywrightTests();
    expect(baseline.length).toBeGreaterThan(0);
    assertShardUnion(baseline, [
      shardInventory(
        1,
        2,
        listPlaywrightTests(process.cwd(), { shard: 1, total: 2 }),
      ),
      shardInventory(
        2,
        2,
        listPlaywrightTests(process.cwd(), { shard: 2, total: 2 }),
      ),
    ]);
  }, 30_000);

  it("loads uploaded shard JSON from nested artifact folders", () => {
    const root = mkdtempSync(join(tmpdir(), "e2e-shard-"));
    mkdirSync(join(root, "playwright-shard-inventory-1-of-2"));
    writeFileSync(
      join(root, "playwright-shard-inventory-1-of-2", "shard-inventory.json"),
      JSON.stringify(shardInventory(1, 1, ["only.spec.ts:1:1 › only"])),
    );
    expect(readShardInventories(root)).toEqual([
      shardInventory(1, 1, ["only.spec.ts:1:1 › only"]),
    ]);
  });
});
