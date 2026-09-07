import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { resolvePlayerCapabilities } from "../presentation/player-capabilities";

const devtoolsDirectory = dirname(fileURLToPath(import.meta.url));
const sourceRoot = join(devtoolsDirectory, "..");

const FORBIDDEN_IMPORT =
  /(?:from\s+|import\s*(?:\(\s*)?|require\s*\(\s*)["'](?:react(?:-dom)?(?:\/[^"']*)?|\.\.\/ui(?:\/[^"']*)?|\.\.\/player(?:\/[^"']*)?|\.\.\/persistence(?:\/[^"']*)?|\.\.\/(?:App|main))["']/;
const FORBIDDEN_RUNTIME =
  /\b(?:document|window|navigator|localStorage|sessionStorage|WebSocket)\b/;
const FORBIDDEN_AMBIENT_ENTROPY = /\b(?:Math\.random|Date\.now)\b/;

async function readSourceFiles(
  directory: string,
  predicate: (path: string) => boolean,
): Promise<readonly { path: string; source: string }[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: { path: string; source: string }[] = [];
  for (const entry of entries) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await readSourceFiles(full, predicate)));
      continue;
    }
    if (!predicate(full)) continue;
    files.push({ path: full, source: await readFile(full, "utf8") });
  }
  return files;
}

describe("the devtools dependency boundary", () => {
  it("keeps the inspector headless, deterministic and independent of the UI", async () => {
    const modules = await readSourceFiles(
      devtoolsDirectory,
      (path) => path.endsWith(".ts") && !path.endsWith(".test.ts"),
    );
    expect(modules.length).toBeGreaterThan(0);
    for (const module of modules) {
      const name = relative(sourceRoot, module.path);
      expect(module.source, name).not.toMatch(FORBIDDEN_IMPORT);
      expect(module.source, name).not.toMatch(FORBIDDEN_RUNTIME);
      // A trace that changed between two runs of the same request would be
      // useless in a bug report, so ambient entropy is barred here for the same
      // reason it is barred in the simulation.
      expect(module.source, name).not.toMatch(FORBIDDEN_AMBIENT_ENTROPY);
    }
  });
});

describe("ordinary play cannot reach the development route", () => {
  it("is referenced by nothing a player navigates through", async () => {
    const playerFacing = [
      ...(await readSourceFiles(
        join(sourceRoot, "player"),
        (path) => path.endsWith(".ts") || path.endsWith(".tsx"),
      )),
      ...(await readSourceFiles(
        join(sourceRoot, "presentation"),
        (path) =>
          (path.endsWith(".ts") || path.endsWith(".tsx")) &&
          !path.endsWith(".test.ts"),
      )),
      ...(await readSourceFiles(
        join(sourceRoot, "ui"),
        (path) =>
          (path.endsWith(".ts") || path.endsWith(".tsx")) &&
          !path.endsWith("CausalTraceView.tsx"),
      )),
    ];
    expect(playerFacing.length).toBeGreaterThan(0);
    for (const module of playerFacing) {
      const name = relative(sourceRoot, module.path);
      // The thing barred is reaching the route, not naming the concept. The
      // route id only ever appears in code as a quoted string literal — the
      // `view === "causal-trace"` comparison and any link that would set it —
      // so that is what player-facing code may not contain. A prose mention,
      // such as a presentation module documenting that it is deliberately NOT
      // the causal-trace export, names the boundary rather than crossing it.
      expect(module.source, name).not.toMatch(/["']causal-trace["']/);
      expect(module.source, name).not.toContain("CausalTraceView");
      expect(module.source, name).not.toContain("../devtools");
    }
  });

  it("is reachable only from the App route table, behind an explicit query parameter", async () => {
    const app = await readFile(join(sourceRoot, "App.tsx"), "utf8");
    expect(app).toContain('view === "causal-trace"');
    // The route table is the only place that names it, and it only answers to
    // a `view` the player never sets.
    const occurrences = app.split("causal-trace").length - 1;
    expect(occurrences).toBe(1);
  });

  it("is not a capability the world ever grants a character", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "dev-route-capability-check",
    });
    const capabilities = resolvePlayerCapabilities(game.world);
    const surfaces = [
      ...capabilities.withheld.map((entry) => entry.surface),
      ...(capabilities.office ? ["office"] : []),
      ...(capabilities.legislation ? ["legislation"] : []),
    ];
    for (const surface of surfaces) {
      expect(["office", "legislation"]).toContain(surface);
    }
    expect(JSON.stringify(capabilities)).not.toContain("trace");
  });
});
