import { readFileSync } from "fs";
import path from "path";

import { describe, expect, it } from "vitest";

import {
  lifePlaceByKey,
  lifePlaceCoverage,
  lifePlaceSearch,
  searchLifePlaces,
} from "../src/simulation";
import { createNewGameWorld } from "../src/presentation/new-game";
import { serializeWorld } from "../src/simulation";

/**
 * The nationwide Start Anywhere adapter (Task I / PR #77).
 *
 * PR #77 landed the accepted national place identity — the 2025 Census
 * Gazetteer — under `data/source/places/`. `src/source` is Node-only and the
 * browser must never import it, so the identity reaches the game through one
 * generated, reviewed export. These tests hold that seam: the search reaches
 * the whole country, a chosen place builds a real world, the provenance is
 * carried honestly, and no browser module reaches across the source line.
 */

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

describe("A life can start anywhere in the country", () => {
  it("searches the national corpus, not a hand-written list", () => {
    const coverage = lifePlaceCoverage();
    expect(coverage.supportsArbitrarySelection).toBe(true);
    expect(coverage.placeCount).toBeGreaterThan(30000);
    expect(coverage.provenance?.source).toContain("gazetteer");

    // A town most hand-written lists would never include is found.
    const hits = searchLifePlaces("Blue Mound", 10);
    const states = new Set(hits.map((place) => place.withinName));
    expect(hits.length).toBeGreaterThan(1);
    // The same name in more than one state comes back distinctly named.
    expect(states.size).toBeGreaterThan(1);
    for (const place of hits) {
      expect(place.displayName).toContain(place.withinName ?? "");
    }
  });

  it("resolves a searched place by its key and builds a real world in it", () => {
    const chosen = searchLifePlaces("Blue Mound", 5).find(
      (place) => place.withinName === "Kansas",
    )!;
    expect(chosen).toBeDefined();
    expect(lifePlaceByKey(chosen.key)?.displayName).toBe(chosen.displayName);

    const setup = {
      startKind: "custom" as const,
      placeKey: chosen.key,
      startAge: 30,
      depth: "summarize-earlier-life" as const,
      startingLife: "ordinary-life" as const,
      household: "lives-alone" as const,
      seed: "nationwide-proof",
      givenName: null,
      familyName: null,
      questionnaire: "skipped" as const,
      priors: [],
    };
    const built = createNewGameWorld(setup);
    expect(built.place.displayName).toBe(chosen.displayName);
    // Deterministic: the same setup builds the byte-identical world.
    expect(serializeWorld(createNewGameWorld(setup).world)).toBe(
      serializeWorld(built.world),
    );
  });

  it("grants a corpus town no legislature, because a town is not a state one", () => {
    // Missingness preserved: the accepted rule packs are state legislatures, so
    // an arbitrary place plays as an ordinary life until a pack is sourced.
    const chosen = searchLifePlaces("Blue Mound", 5)[0]!;
    expect(chosen.capabilities.legislativeScenarioKey).toBeNull();
  });

  it("does not offer the corpus's Lexington beside the authored one", () => {
    // The authored Lexington place declares the same GEOID the corpus lists, so
    // the search shows one Lexington, not two.
    const hits = searchLifePlaces("Lexington", 20);
    const lexingtonsInKentucky = hits.filter(
      (place) =>
        /lexington/i.test(place.displayName) && place.withinName === "Kentucky",
    );
    expect(lexingtonsInKentucky.length).toBe(1);
  });

  it("keeps an empty query empty, so nothing reads as a recommendation", () => {
    expect(searchLifePlaces("", 10)).toEqual([]);
    expect(lifePlaceSearch("   ", 10)).toEqual([]);
  });

  it("reaches the source only through the generated export, never src/source", () => {
    // The one-way seam, as a file check: the browser-safe modules that carry
    // national places must not IMPORT the Node-only substrate. Only import and
    // export-from statements are inspected, so prose that names the boundary
    // does not trip it.
    for (const relative of [
      "src/simulation/national-places.generated.ts",
      "src/simulation/life-places.ts",
    ]) {
      const source = readFileSync(path.join(REPOSITORY_ROOT, relative), "utf8");
      const moduleSpecifiers = [
        ...source.matchAll(/(?:import|export)[^;]*?from\s+["']([^"']+)["']/g),
      ].map((match) => match[1]!);
      for (const specifier of moduleSpecifiers) {
        expect(specifier).not.toMatch(/(^|\/)source(\/|$)/);
      }
    }
  });
});
