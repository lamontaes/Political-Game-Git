// Lowers tests/guards/english/pieces-one-place-baseline.json to today's counts. It refuses to raise
// any count: a copy built outside the one function is fixed, never added to the baseline.
//   node --import tsx scripts/story/lower-pieces-baseline.mts
import { readFileSync, writeFileSync } from "node:fs";
import { copies } from "../../tests/guards/english/pieces-one-place-scan";

const FILE = "tests/guards/english/pieces-one-place-baseline.json";
const baseline = JSON.parse(readFileSync(FILE, "utf8")) as {
  about: string;
  copies: Record<string, Record<string, number>>;
};
const found = copies();
const raised = Object.entries(found).flatMap(([file, kinds]) =>
  Object.entries(kinds)
    .filter(([kind, n]) => n > (baseline.copies[file]?.[kind] ?? 0))
    .map(([kind, n]) => `${file} ${kind} ${n}`),
);
if (raised.length)
  throw new Error(`Refusing to raise a count: ${raised.join("; ")}`);
const sorted = Object.fromEntries(
  Object.entries(found).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(
  FILE,
  `${JSON.stringify({ about: baseline.about, copies: sorted }, null, 2)}\n`,
);
const total = (c: Record<string, Record<string, number>>) =>
  Object.values(c).reduce(
    (sum, k) => sum + Object.values(k).reduce((a, b) => a + b, 0),
    0,
  );
console.log(
  `copies ${total(baseline.copies)} -> ${total(sorted)} in ${Object.keys(sorted).length} files`,
);
