/**
 * Re-runnable, after scripts/refactor/split-executive-family.py: the engine-tables baseline is keyed by the
 * owning family, so splitting `executive` into `offices` and `governing` renames its keys. This writes the
 * baseline as the code is now, but only if nothing rose: for every file and kind, the old `executive` count
 * is at least the new `offices` plus `governing` count (not counting one half opening the other, which must
 * be zero), and no other key is higher. Exits 1 and writes nothing otherwise.
 *
 *   node --import tsx scripts/refactor/rekey-engine-tables-baseline.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { baselineOf, measure } from "../guards/engine-tables";
import { familyOf } from "../../tests/guards/family-map";

const FILE = "tests/guards/engine-tables-baseline.json";
const now = baselineOf(measure());
const old = JSON.parse(readFileSync(FILE, "utf8")) as typeof now;
const problems: string[] = [];
for (const kind of Object.keys(now) as (keyof typeof now)[]) {
  const files = new Set([...Object.keys(now[kind]), ...Object.keys(old[kind])]);
  for (const file of files) {
    const family = familyOf(file);
    const row = now[kind][file] ?? {};
    const before = old[kind][file] ?? {};
    for (const key of Object.keys(row)) {
      const crossHalf =
        (family === "governing" && key === "offices") ||
        (family === "offices" && key === "governing");
      if (crossHalf)
        problems.push(
          `${kind} ${file}: one half opens the other (${row[key]})`,
        );
      else if (
        key !== "offices" &&
        key !== "governing" &&
        row[key]! > (before[key] ?? 0)
      )
        problems.push(
          `${kind} ${file} ${key}: ${row[key]} now, ${before[key] ?? 0} known`,
        );
    }
    const halves = (row["offices"] ?? 0) + (row["governing"] ?? 0);
    if (halves > (before["executive"] ?? 0))
      problems.push(
        `${kind} ${file} offices+governing: ${halves} now, ${before["executive"] ?? 0} executive known`,
      );
  }
}
if (problems.length) {
  console.error(
    `The baseline only shrinks, and these rose:\n${problems.join("\n")}`,
  );
  process.exit(1);
}
writeFileSync(FILE, JSON.stringify(now, null, 2) + "\n");
console.log("engine-tables baseline re-keyed; nothing rose.");
