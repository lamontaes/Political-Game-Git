/** Snapshot existing exports without rerunning their upstream generators. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const tables = [
  ["town-pay", () => import("../../src/core2/reference/town-pay.generated")],
  ["town-rent", () => import("../../src/core2/reference/town-rent.generated")],
  [
    "town-employment",
    () => import("../../src/core2/reference/town-employment.generated"),
  ],
  [
    "town-bank-shapes",
    () =>
      import("../../src/simulation/living-world/town-bank-shapes.generated"),
  ],
  [
    "town-deposits",
    () => import("../../src/simulation/living-world/town-deposits.generated"),
  ],
  [
    "local-business-counts",
    () => import("../../src/simulation/local-business-counts.generated"),
  ],
  [
    "county-home-value",
    () => import("../../src/simulation/county-home-value.generated"),
  ],
  [
    "place-population",
    () =>
      import("../../src/simulation/nationwide-world/place-population.generated"),
  ],
] as const;

const directory = new URL("../../data/tables/", import.meta.url);
const check = process.argv.includes("--check");
if (!check) mkdirSync(directory, { recursive: true });

for (const [name, load] of tables) {
  const table = await load();
  const output = await format(JSON.stringify(table), { parser: "json" });
  const path = new URL(`${name}.json`, directory);
  if (check) {
    if (readFileSync(path, "utf8") !== output) {
      throw new Error(
        `${fileURLToPath(path)} is stale; rerun export-data-tables.ts`,
      );
    }
  } else {
    writeFileSync(path, output);
  }
  console.log(
    `${name}: ${Buffer.byteLength(output)} bytes${check ? " (current)" : ""}`,
  );
}
