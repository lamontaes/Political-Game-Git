#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const file = join(root, "vite.config.ts");
const original = readFileSync(file, "utf8");
const edits = [
  [
    "import { identifiedBuild }",
    'import { shippedFiles } from "./scripts/dev-lab/shipped-files";\nimport { identifiedBuild }',
  ],
  ["    identifiedBuild(),", "    identifiedBuild(),\n    shippedFiles(),"],
];
let output = original;
for (const [anchor, replacement] of edits) {
  if (output.includes(replacement)) continue;
  if (output.split(anchor).length !== 2)
    throw new Error("Missing unique Vite config anchor: " + anchor);
  output = output.replace(anchor, replacement);
}
if (output !== original) writeFileSync(file, output);
console.log(
  output === original
    ? "Shipping inventory is already installed."
    : "Installed shipping inventory.",
);
