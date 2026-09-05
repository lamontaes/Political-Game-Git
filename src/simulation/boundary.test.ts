import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const FORBIDDEN_IMPORT =
  /(?:from\s+|import\s*(?:\(\s*)?|require\s*\(\s*)["'](?:react(?:-dom)?(?:\/[^"']*)?|node:sqlite|\.\.\/persistence(?:\/[^"']*)?|\.\.\/ui(?:\/[^"']*)?|\.\.\/(?:App|main))["']/;
const FORBIDDEN_RUNTIME =
  /\b(?:document|window|navigator|localStorage|sessionStorage|fetch|WebSocket)\b/;
const FORBIDDEN_AMBIENT_ENTROPY = /\b(?:Math\.random|Date\.now)\b/;

/**
 * The runtime and entropy scans are about *code*, so they are run against code.
 *
 * Scanning raw source made a comment that says the word "document" and an
 * authored sentence containing "the leaked document" indistinguishable from a
 * module reaching for the DOM. Stripping comments and string literals first
 * keeps the guard's whole force — a browser global actually referenced by this
 * layer is still caught, in exactly the position that would matter — while
 * letting the layer describe itself in English. The import scan stays on the
 * raw source, because an import is the thing most worth catching and its text
 * is never prose.
 */
function codeOnly(source: string): string {
  let output = "";
  let index = 0;
  while (index < source.length) {
    const character = source[index]!;
    const next = source[index + 1];
    if (character === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        index += 1;
      }
      index += 2;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      const quote = character;
      index += 1;
      while (index < source.length && source[index] !== quote) {
        if (source[index] === "\\") index += 1;
        index += 1;
      }
      index += 1;
      // A placeholder, so `"window"` cannot become an accidental identifier
      // boundary and hide a neighbouring one.
      output += " ";
      continue;
    }
    output += character;
    index += 1;
  }
  return output;
}

describe("simulation dependency boundary", () => {
  it("keeps production simulation modules independent of React, UI, and SQLite persistence", async () => {
    const simulationDirectory = dirname(fileURLToPath(import.meta.url));
    const productionModules = (await readdir(simulationDirectory)).filter(
      (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
    );

    for (const moduleName of productionModules) {
      const source = await readFile(
        join(simulationDirectory, moduleName),
        "utf8",
      );
      const code = codeOnly(source);
      expect(source, moduleName).not.toMatch(FORBIDDEN_IMPORT);
      expect(code, moduleName).not.toMatch(FORBIDDEN_RUNTIME);
      expect(code, moduleName).not.toMatch(FORBIDDEN_AMBIENT_ENTROPY);
    }
  });
});
