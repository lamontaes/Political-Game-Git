/**
 * The placement checks (Words lead, rules 110 to 113) over the scene-talk bank:
 * a counted report. The count of breaks per check may only fall; a lower count
 * is written into placement-baseline.json (`npm run words:placement --
 * --write-baseline`) in the same change. No line is pulled and no build is red
 * for a line already in the bank.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import {
  PLACEMENT_CHECK_IDS,
  placementBreaks,
  type PlacedPiece,
} from "../../../src/english/placement-checks";

const ROOT = path.resolve(__dirname, "../../..");
const pieces = (
  JSON.parse(
    readFileSync(path.join(ROOT, "data/english/parts/scene-talk.json"), "utf8"),
  ) as { parts: PlacedPiece[] }
).parts;
const pulled = new Set<string>(
  Object.keys(
    (
      JSON.parse(
        readFileSync(path.join(ROOT, "data/english/pulled.json"), "utf8"),
      ) as { pulled: Record<string, unknown> }
    ).pulled,
  ),
);
const baseline = (
  JSON.parse(
    readFileSync(
      path.join(ROOT, "tests/guards/english/placement-baseline.json"),
      "utf8",
    ),
  ) as { counts: Record<string, number> }
).counts;

it("every placement check has a baseline", () => {
  expect(Object.keys(baseline).sort()).toEqual([...PLACEMENT_CHECK_IDS].sort());
});

for (const id of PLACEMENT_CHECK_IDS)
  it(`${id}: the uses that break it may only fall`, () => {
    const breaks = placementBreaks(id, pieces, pulled);
    expect(
      breaks.length,
      `${breaks.length} uses break ${id}, more than the ${baseline[id]} on record; place each with the fact it needs or remove it. List: npm run words:placement`,
    ).toBeLessThanOrEqual(baseline[id]!);
  });
