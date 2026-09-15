import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { runtimeReachable } from "../../scripts/dehardwire-census.mjs";
import { legislativeBlueprint } from "../simulation";
import { LEGISLATIVE_RULE_PACKS } from "../simulation/legislature-rule-packs";

/**
 * DIRECTOR42 ROLE B — the bank's name for a bill stays in the bank.
 *
 * `LegislativeBlueprint.authoredDesignation` exists so the content index can
 * title an authored entry and the standalone developer scenario can file its
 * own bill. Production must never copy it onto a measure: a bill in a player's
 * world is numbered by that world.
 *
 * The rename from `designation` made every such read a compile error once, and
 * that caught five of them across the two composed branches. This is what keeps
 * it caught after the compiler has stopped caring.
 */

const ROOT = resolve(__dirname, "..", "..");

/** Every non-test source file under src/, repo-relative. */
function globSourceFiles(): readonly string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(resolve(ROOT, dir), {
      withFileTypes: true,
    })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name))
        out.push(rel);
    }
  };
  walk("src");
  return out;
}

/** The one module allowed to read it, and why. */
const CONTENT_INDEX = "src/content/adapters/legislative-blueprints.ts";

describe("the authored designation", () => {
  it("is read by the content index and by nothing else on the ordinary-play graph", () => {
    const readers = [...runtimeReachable("src/player/PlayerGame.tsx")]
      .map((file) => file.replace(`${ROOT}/`, ""))
      .filter((file) => /\.tsx?$/.test(file) && !file.endsWith(".test.ts"))
      .filter((file) =>
        readFileSync(resolve(ROOT, file), "utf8").includes(
          "authoredDesignation",
        ),
      )
      .sort();

    // Only the declaration site. The content index is a development surface
    // and is not even on the ordinary-play graph, so nothing a player can
    // reach mentions the bank's name for a bill, let alone files it.
    expect(readers).toEqual(["src/simulation/legislation-scenarios.ts"]);
  });

  it("is read, outside that declaration, only by the content index", () => {
    // Repo-wide rather than play-graph: this is the list that would grow if
    // somebody reached for the bank's literal in a new production module.
    const readers = globSourceFiles().filter((file) =>
      readFileSync(resolve(ROOT, file), "utf8").includes("authoredDesignation"),
    );
    expect(readers.sort()).toEqual([
      CONTENT_INDEX,
      "src/simulation/legislation-scenarios.ts",
    ]);
  });

  it("is null for an institution, which is not one bill", () => {
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      expect(
        legislativeBlueprint(`institution:${pack.packId}`).authoredDesignation,
        pack.packId,
      ).toBeNull();
    }
  });
});
