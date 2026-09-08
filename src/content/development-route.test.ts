import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The content browser is a development surface, and that has to be checkable
 * rather than merely intended.
 *
 * Two things make it one. It is reached only by an explicit `?view=content`,
 * alongside the other development routes, so opening the game never lands on
 * it; and nothing a player can reach links to it or imports it, so there is no
 * path into it from inside the game either. Both are asserted here against the
 * source, because a route that is development-only by convention stops being
 * development-only the first time somebody adds a button.
 */

const APP = readFileSync("src/App.tsx", "utf8");

function sourceFilesUnder(directory: string): readonly string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      found.push(...sourceFilesUnder(path));
      continue;
    }
    if (/\.tsx?$/.test(entry) && !entry.endsWith(".test.ts")) found.push(path);
  }
  return found;
}

describe("the content browser is development-only", () => {
  it("is reached only through an explicit development view parameter", () => {
    expect(APP).toContain(
      'if (view === "content") return <ContentBrowserView />;',
    );
    // Opening the game with no parameter is still the game.
    expect(APP).toContain("return <PlayerGame />;");
  });

  it("is not what an unrecognized or missing view falls back to", () => {
    const fallback = APP.slice(APP.lastIndexOf("return <"));
    expect(fallback).toContain("PlayerGame");
    expect(fallback).not.toContain("ContentBrowserView");
  });

  it("is not imported by anything a player can reach", () => {
    const playerFacing = [
      ...sourceFilesUnder("src/player"),
      ...sourceFilesUnder("src/presentation"),
      ...sourceFilesUnder("src/simulation"),
    ];
    for (const file of playerFacing) {
      const source = readFileSync(file, "utf8");
      expect(
        source,
        `${file} must not import the content browser`,
      ).not.toContain("ContentBrowserView");
      expect(
        /from "(\.\.\/)+content(\/|")/.test(source),
        `${file} must not import the content index`,
      ).toBe(false);
    }
  });

  it("is not linked from any player-facing surface", () => {
    for (const file of sourceFilesUnder("src/player")) {
      expect(readFileSync(file, "utf8")).not.toContain("view=content");
    }
  });

  it("reads the banks without the banks knowing about it", () => {
    // The dependency runs one way on purpose. A bank that imported the index
    // would make the review layer part of the thing being reviewed.
    for (const file of sourceFilesUnder("src/simulation")) {
      expect(readFileSync(file, "utf8")).not.toContain('from "../content');
    }
  });
});
