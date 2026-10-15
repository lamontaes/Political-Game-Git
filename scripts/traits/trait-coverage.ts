/** Writes data/content/trait-coverage.json from the trait and decision tables. */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildTraitCoverage,
  REPOSITORY_ROOT,
} from "../../src/core2/tooling/trait-coverage";

const coverage = buildTraitCoverage();
writeFileSync(
  resolve(REPOSITORY_ROOT, "data/content/trait-coverage.json"),
  `${JSON.stringify(coverage, null, 2)}\n`,
);
const empty = Object.entries(coverage.traits).filter(
  ([, row]) => !row.high.length || !row.low.length,
);
console.log(
  `${Object.keys(coverage.traits).length} traits; ${empty.length} with a side that changes no decision${empty.length ? `: ${empty.map(([id]) => id).join(", ")}` : ""}.`,
);
