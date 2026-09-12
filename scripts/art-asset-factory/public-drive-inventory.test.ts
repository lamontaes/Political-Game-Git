import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { publicDriveInventory } from "./public-drive-inventory";

describe("public gallery inventory projection", () => {
  it("preserves every source classification/family without importing private provenance", () => {
    const source = JSON.parse(
      readFileSync(
        "art/qa/p95-recent-drive-sweep/drive-image-inventory.json",
        "utf8",
      ),
    );
    const actual = JSON.parse(
      readFileSync(
        "src/environment/public-drive-inventory.generated.json",
        "utf8",
      ),
    );
    expect(actual).toEqual(publicDriveInventory(source));
    expect(actual.files).toHaveLength(source.files.length);
    const sensitive = {
      files: [
        {
          classification: "REFERENCE_ONLY",
          likelyAssetFamily: "environment",
          localMatches: [{ localPath: "/private/control" }],
          pid: 123,
        },
      ],
    };
    expect(JSON.stringify(publicDriveInventory(sensitive))).not.toMatch(
      /private|localMatches|pid/,
    );
    expect(publicDriveInventory(sensitive).files).toEqual([
      { classification: "REFERENCE_ONLY", likelyAssetFamily: "environment" },
    ]);
  });
});
