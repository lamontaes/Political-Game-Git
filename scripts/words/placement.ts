/**
 * The placement checks' report (Words lead, rules 110 to 113):
 *   npm run words:placement                 counts per check, and each break
 *   npm run words:placement -- --write-baseline   record the counts (they may only fall)
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  PLACEMENT_CHECK_IDS,
  placementBreaks,
  typesWithoutOpening,
  type PlacedPiece,
} from "../../src/english/placement-checks";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BASELINE = path.join(
  ROOT,
  "tests/guards/english/placement-baseline.json",
);

export function readSceneTalk(): PlacedPiece[] {
  return (
    JSON.parse(
      readFileSync(
        path.join(ROOT, "data/english/parts/scene-talk.json"),
        "utf8",
      ),
    ) as { parts: PlacedPiece[] }
  ).parts;
}

const pulled = new Set<string>(
  Object.keys(
    (
      JSON.parse(
        readFileSync(path.join(ROOT, "data/english/pulled.json"), "utf8"),
      ) as { pulled: Record<string, unknown> }
    ).pulled,
  ),
);
const pieces = readSceneTalk();
const counts: Record<string, number> = {};
for (const id of PLACEMENT_CHECK_IDS) {
  const breaks = placementBreaks(id, pieces, pulled);
  counts[id] = breaks.length;
  console.log(`## ${id}: ${breaks.length} uses break it`);
  for (const row of breaks)
    console.log(`- ${row.purpose} | ${row.pieceKey} | "${row.text}"`);
  const bare = typesWithoutOpening(id, pieces, pulled);
  if (bare.length)
    console.log(
      `Listed, not flagged: ${bare.length} types have no narration: ${bare.join(", ")}`,
    );
}
if (process.argv.includes("--write-baseline")) {
  writeFileSync(BASELINE, `${JSON.stringify({ counts }, null, 2)}\n`);
  console.log(`Wrote ${BASELINE}`);
}
