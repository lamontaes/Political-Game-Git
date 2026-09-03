import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The asset bank inventory is generated, so the only thing worth testing is
 * that the committed copy is what the current library actually produces. A
 * planning report that has drifted from the art is worse than no report.
 */

const REPO_ROOT = path.resolve(__dirname, "..");
const MARKDOWN = "art/qa/asset_bank_inventory.md";
const JSON_REPORT = "art/qa/asset_bank_inventory.json";

function read(relative: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relative), "utf8");
}

describe("asset bank inventory", () => {
  const committedMarkdown = read(MARKDOWN);
  const committedJson = read(JSON_REPORT);

  it("matches a fresh regeneration byte for byte", () => {
    execFileSync("npm", ["run", "--silent", "inventory:asset-bank"], {
      cwd: REPO_ROOT,
      stdio: "pipe",
    });
    expect(read(MARKDOWN)).toBe(committedMarkdown);
    expect(read(JSON_REPORT)).toBe(committedJson);
  }, 60_000);

  it("names the one missing pose that a live scene anchor already asks for", () => {
    const report = JSON.parse(committedJson) as {
      generationQueue: {
        poseFamilyId: string;
        blocks: string;
        consumingAnchors: string[];
      }[];
    };
    const blocking = report.generationQueue.filter(
      (row) => row.blocks === "current-gameplay",
    );
    expect(blocking.map((row) => row.poseFamilyId)).toEqual([
      "seated-guest-neutral",
    ]);
    expect(blocking[0]!.consumingAnchors).toContain(
      "office-council-staff-fixture:left-guest-chair",
    );
  });

  it("reports no production character art as released", () => {
    const report = JSON.parse(committedJson) as {
      characterComponents: { productionCount: number };
      masters: { released: boolean }[];
    };
    expect(report.characterComponents.productionCount).toBe(0);
    expect(report.masters.every((master) => !master.released)).toBe(true);
  });
});
