import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The asset bank inventory is a committed planning report. Its command-line
 * generator was retired with the old art tooling (Oct 14, 2026), so the
 * byte-for-byte regeneration check went with it; what is tested now is what
 * the committed report says.
 */

const REPO_ROOT = path.resolve(__dirname, "..");
const JSON_REPORT = "art/qa/asset_bank_inventory.json";

function read(relative: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relative), "utf8");
}

describe("asset bank inventory", () => {
  const committedJson = read(JSON_REPORT);

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
    // Four gaps now, not one. Each arrived the same way: a production room was
    // registered and the pose its anchors ask for has no released art. The
    // lectern families came in with the title tableau and the hearing room.
    // The queue growing when rooms are added is the queue working.
    expect(blocking.map((row) => row.poseFamilyId).sort()).toEqual([
      "seated-guest-neutral",
      "standing-conversational",
      "standing-listening",
      "standing-podium-or-lectern",
    ]);
    const seated = blocking.find(
      (row) => row.poseFamilyId === "seated-guest-neutral",
    )!;
    expect(seated.consumingAnchors).toContain(
      "office-council-staff-fixture:left-guest-chair",
    );
    const conversational = blocking.find(
      (row) => row.poseFamilyId === "standing-conversational",
    )!;
    expect(
      conversational.consumingAnchors.some((anchor) =>
        anchor.startsWith("shared-workroom-office-production:"),
      ),
    ).toBe(true);
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
