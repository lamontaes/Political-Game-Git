/**
 * Writes .github/CODEOWNERS from tests/guards/families.json, so the owners
 * file and the family guard read one map. Each family is a commented block
 * naming it; GitHub asks the owner to review a change to its files.
 *
 *   node --import tsx scripts/guards/codeowners.ts          write the file
 *   node --import tsx scripts/guards/codeowners.ts --check  fail when stale
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const MAP = path.join(ROOT, "tests", "guards", "families.json");
export const CODEOWNERS_PATH = path.join(ROOT, ".github", "CODEOWNERS");

type Map = {
  owner: string;
  shared: string[];
  families: { id: string; name: string; paths: string[] }[];
};

export function codeowners(
  map: Map = JSON.parse(readFileSync(MAP, "utf8")),
): string {
  const lines = [
    "# Written by scripts/guards/codeowners.ts from tests/guards/families.json.",
    "# Edit the families there, then run the script; a hand edit here fails the guard.",
    "# One engine per mechanic: each block is one engine family (docs/design/guards.md).",
    "",
    "# The shared kernel",
    ...map.shared.map((glob) => `/${glob} ${map.owner}`),
  ];
  for (const family of map.families)
    lines.push(
      "",
      `# ${family.name} (${family.id})`,
      ...family.paths.map((glob) => `/${glob} ${map.owner}`),
    );
  return `${lines.join("\n")}\n`;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const text = codeowners();
  if (process.argv.includes("--check")) {
    if (readFileSync(CODEOWNERS_PATH, "utf8") !== text) {
      console.error(
        ".github/CODEOWNERS is stale: run node --import tsx scripts/guards/codeowners.ts",
      );
      process.exit(1);
    }
    console.log("CODEOWNERS matches the families");
  } else writeFileSync(CODEOWNERS_PATH, text);
}
