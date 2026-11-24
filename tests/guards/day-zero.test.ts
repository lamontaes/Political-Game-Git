/**
 * Day one in motion (skill day-one-in-motion): the day-zero file is well formed, its known-red list
 * only shrinks, and every module in src/core2 has answered the day-0 question. The worlds themselves
 * are read by src/core2/day-zero.test.ts.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const file = JSON.parse(
  readFileSync(join(root, "src/core2/data/opening/day-zero.json"), "utf8"),
) as {
  rows: {
    table: string;
    call: string;
    reason: string;
    level: string;
    knownRed?: string;
    when?: string;
  }[];
  modules: Record<string, string>;
};
const baseline = JSON.parse(
  readFileSync(join(__dirname, "day-zero-baseline.json"), "utf8"),
) as { knownRed: string[] };

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return name.endsWith(".ts") && !name.endsWith(".test.ts") ? [path] : [];
  });
}

it("every row names a call, a level and a reason; known-red rows name a pool item that exists", () => {
  const problems: string[] = [];
  for (const row of file.rows) {
    if (!["stock", "flow-only", "unsure"].includes(row.call))
      problems.push(`${row.table}: call ${row.call}`);
    if (!row.reason || !row.level)
      problems.push(`${row.table}: reason and level are required`);
    if (row.when && row.when !== "filing-window-open")
      problems.push(`${row.table}: when ${row.when}`);
    if (row.call === "unsure")
      problems.push(`${row.table}: every table is called stock or flow-only`);
    if (row.knownRed && row.call !== "stock")
      problems.push(`${row.table}: only a stock row can be known-red`);
    if (
      row.knownRed &&
      !existsSync(join(root, "docs/pool/items", `${row.knownRed}.md`))
    )
      problems.push(
        `${row.table}: pool item ${row.knownRed} does not exist (no stopgap ids here)`,
      );
  }
  expect(problems).toEqual([]);
});

it("the known-red list only shrinks", () => {
  const now = file.rows.filter((row) => row.knownRed).map((row) => row.table);
  const added = now.filter((table) => !baseline.knownRed.includes(table));
  expect(
    added,
    "new known-red tables need the CTO's word and a baseline entry",
  ).toEqual([]);
});

it("every module has answered the day-0 question", () => {
  const ids = new Set<string>();
  for (const path of sources(join(root, "src/core2")))
    for (const match of readFileSync(path, "utf8").matchAll(
      /export const \w+_MODULE_ID\s*=\s*"([^"]+)"/g,
    ))
      ids.add(match[1]!);
  const missing = [...ids].filter((id) => !(id in file.modules)).sort();
  expect(
    missing,
    "add each to modules in src/core2/data/opening/day-zero.json, with rows for the tables a real place would already hold on day 0, at town, state and federal level (skill day-one-in-motion)",
  ).toEqual([]);
});
