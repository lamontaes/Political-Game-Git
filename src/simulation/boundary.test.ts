import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const FORBIDDEN_IMPORT =
  /(?:from\s+|import\s*(?:\(\s*)?|require\s*\(\s*)["'](?:react(?:-dom)?(?:\/[^"']*)?|node:sqlite|\.\.\/persistence(?:\/[^"']*)?|\.\.\/ui(?:\/[^"']*)?|\.\.\/(?:App|main))["']/;
const FORBIDDEN_RUNTIME =
  /\b(?:document|window|navigator|localStorage|sessionStorage|fetch|WebSocket)\b/;
const FORBIDDEN_AMBIENT_ENTROPY = /\b(?:Math\.random|Date\.now)\b/;

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
      expect(source, moduleName).not.toMatch(FORBIDDEN_IMPORT);
      expect(source, moduleName).not.toMatch(FORBIDDEN_RUNTIME);
      expect(source, moduleName).not.toMatch(FORBIDDEN_AMBIENT_ENTROPY);
    }
  });
});
