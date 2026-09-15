import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { runtimeReachable } from "../../scripts/dehardwire-census.mjs";

/**
 * DIRECTOR42 ROLE B — the census is a guard, not a report.
 *
 * A one-off inventory goes stale the week after it is written. This runs the
 * real census against the real import graph, so a later edit that puts a
 * world-instance gameplay literal back on the ordinary-play path fails here
 * rather than being found in a playtest.
 *
 * It is deliberately narrow. It asks one question — can an ordinary player
 * reach a fixed bill identity a module spelled out? — and every case it finds
 * is answered in docs/dehardwire/classification.json by a person, not by a
 * pattern. It bans nothing globally: authored content, chamber labels, rule
 * citations and internal provenance all pass, because none of them is one
 * world's fixed gameplay instance.
 */

const ROOT = resolve(__dirname, "..", "..");

describe("the dehardwire census", () => {
  it("finds no unclassified or production-hardcoded world instance on the ordinary-play path", () => {
    // The script exits non-zero on either, and prints what it found.
    expect(() =>
      execFileSync("node", ["scripts/dehardwire-census.mjs", "--check"], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: "pipe",
      }),
    ).not.toThrow();
  });

  it("keeps the published census in step with the source it describes", () => {
    execFileSync("node", ["scripts/dehardwire-census.mjs"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
    });
    const census = JSON.parse(
      readFileSync(resolve(ROOT, "docs/dehardwire/census.json"), "utf8"),
    );
    expect(census.counts.unclassified).toBe(0);
    expect(census.counts.productionHardcode).toBe(0);
    expect(census.cases.length).toBeGreaterThan(0);
  });
});

describe("the developer fixtures and the production creation path", () => {
  /**
   * Runtime reachability, not textual reachability.
   *
   * `import type` is erased before a player runs anything, so a module reached
   * only through a type import cannot hand a player a literal. Counting those
   * would report fixtures as production dependencies that do not exist.
   */
  const creationPath = [
    ...runtimeReachable("src/presentation/new-game.ts"),
  ].map((file) => file.replace(`${ROOT}/`, ""));
  const playPath = [...runtimeReachable("src/player/PlayerGame.tsx")].map(
    (file) => file.replace(`${ROOT}/`, ""),
  );

  const DEVELOPER_ONLY = [
    "src/presentation/legislative-bargaining-fixture.ts",
    "src/player/MeasureFloorView.tsx",
    "src/ui/DeveloperReviewHub.tsx",
  ];

  it("cannot reach a developer fixture when it creates a new world", () => {
    for (const module of DEVELOPER_ONLY) {
      expect(creationPath, `new-game reaches ${module}`).not.toContain(module);
    }
  });

  it("cannot reach a developer fixture from ordinary play", () => {
    for (const module of DEVELOPER_ONLY) {
      expect(playPath, `ordinary play reaches ${module}`).not.toContain(module);
    }
  });

  /**
   * The fixture-named modules ordinary play reaches at runtime, pinned.
   *
   * Each is classified in docs/dehardwire/classification.json: two registered
   * rooms, the jurisdiction context the place catalog reads, the shared world
   * builder (whose Lexington-defaulting entry point ordinary play does not
   * call), and a portability fixture with no play-path consumer.
   *
   * `run-a-fixture` was on this list until the dossier stopped naming places
   * through it. The equality is deliberate in both directions: a new fixture
   * joining the graph fails here, and so does one dropping off unnoticed,
   * because that is a fact about the game worth recording rather than
   * absorbing.
   */
  it("reaches exactly the fixture-named modules that are classified", () => {
    const fixtureNamed = playPath
      .filter((file) =>
        /(?:^|[/-])(?:fixture|fixtures|demo|synthetic)(?:[/-]|\.|$)/i.test(
          file,
        ),
      )
      .sort();
    expect(fixtureNamed).toEqual([
      "src/environment/scenes/committee-room-fixture.ts",
      "src/environment/scenes/office-council-staff-fixture.ts",
      "src/simulation/demo-jurisdiction-context.ts",
      "src/simulation/demo.ts",
      "src/simulation/portability-fixture.ts",
    ]);
  });
});
