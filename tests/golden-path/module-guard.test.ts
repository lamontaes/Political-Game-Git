/**
 * PW-2's guard: every engine built under src/core2/modules runs in the world
 * the owner plays. Builds the bench world (two levels, as /play does) in a
 * place drawn from the commit, imports every module file, and fails when an
 * exported CoreModule is neither installed nor exempted with a reason in
 * src/core2/data/played-world-exemptions.json, when an exemption names an
 * installed module (stale), or when a file listed as a library exports one.
 */
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../src/bench/world";
import exemptions from "../../src/core2/data/played-world-exemptions.json";
import type { CoreModule } from "../../src/core2/types";
import { drawPlace } from "./place";

/** The bench's opening day (src/bench/m0-check.ts). */
const OPENING_DATE = "2026-10-12";
/** Building a two-level world takes one to two minutes on a cloud runner. */
const BUILD_MILLISECONDS = 600_000;
const MODULES_DIRECTORY = resolve("src/core2/modules");
/** Keys only a CoreModule carries besides its id (src/core2/types.ts). */
const MODULE_KEYS = new Set([
  "state",
  "reasonProviders",
  "journalSourceProviders",
  "eventKinds",
  "appraisalEventKinds",
  "relationshipKinds",
  "needEvaluators",
  "offerProviders",
  "effectHandlers",
  "eligibilityRules",
]);

function isCoreModule(value: unknown): value is CoreModule {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    Object.keys(row).some(
      (key) =>
        MODULE_KEYS.has(key) ||
        (key.startsWith("on") && typeof row[key] === "function"),
    )
  );
}

/** Every CoreModule each module file exports, by importing the file. */
async function exportedModules(): Promise<Map<string, readonly string[]>> {
  const byFile = new Map<string, readonly string[]>();
  const files = readdirSync(MODULES_DIRECTORY)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
    .sort();
  for (const file of files) {
    const exported = (await import(
      pathToFileURL(join(MODULES_DIRECTORY, file)).href
    )) as Record<string, unknown>;
    byFile.set(file, [
      ...new Set(
        Object.values(exported)
          .filter(isCoreModule)
          .map((m) => m.id),
      ),
    ]);
  }
  return byFile;
}

function commit(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "working-tree";
  }
}

describe("PW-02: every built module runs in the played world", () => {
  it(
    "installs or exempts every CoreModule under src/core2/modules",
    async () => {
      const place = process.env.GOLDEN_PATH_PLACE_KEY
        ? {
            seed: process.env.GOLDEN_PATH_SEED ?? commit(),
            key: process.env.GOLDEN_PATH_PLACE_KEY,
          }
        : drawPlace(commit(), "PW-02");
      console.log(`PW-02 place ${place.key} seed ${place.seed}`);
      const { core } = buildBenchWorld(place.seed, OPENING_DATE, {
        twoLevel: true,
        placeKey: place.key,
      });
      const installed = new Set(core.modules.keys());
      const byFile = await exportedModules();
      const exempt = new Map(
        exemptions.exemptions.map((row: { id: string; reason: string }) => [
          row.id,
          row.reason,
        ]),
      );
      const libraries = new Map(
        exemptions.libraries.map((row) => [row.file, row.reason]),
      );

      const missing: string[] = [];
      for (const [file, ids] of byFile) {
        if (!ids.length) {
          // A file with no engine must say what it is.
          if (!libraries.get(file)?.trim())
            missing.push(`${file} (no module, not listed as a library)`);
          continue;
        }
        if (libraries.has(file))
          missing.push(
            `${file} is listed as a library but exports ${ids.join(", ")}`,
          );
        for (const id of ids)
          if (!installed.has(id) && !exempt.get(id)?.trim())
            missing.push(`${id} (${file})`);
      }
      expect(missing, "modules neither installed nor exempted").toEqual([]);

      const exported = new Set([...byFile.values()].flat());
      const stale = [...exempt.keys()].filter(
        (id) => installed.has(id) || !exported.has(id),
      );
      expect(stale, "exemptions for installed or missing modules").toEqual([]);
      const staleLibraries = [...libraries.keys()].filter(
        (file) => !byFile.has(file),
      );
      expect(staleLibraries, "libraries that no longer exist").toEqual([]);
    },
    BUILD_MILLISECONDS,
  );
});
