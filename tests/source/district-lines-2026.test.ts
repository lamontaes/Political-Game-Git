import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { placeDistrictMembershipCatalog } from "../../src/districts/place-membership";
import {
  loadEnactmentDates,
  loadLines2026,
  placeLandDistricts,
  placeMembership,
  statesByStartDate,
} from "../../scripts/maps/lines-2026-overlay";

const ROOT = resolve(import.meta.dirname, "../..");

describe("the 2026 U.S. House lines overlay", () => {
  it("reads a place wholly in one district as whole", () => {
    expect(placeMembership("48", "05")).toEqual({
      whole: "4805",
      candidates: [],
    });
    expect(placeLandDistricts("48", "05")).toEqual(["4805"]);
  });

  it("keeps a water-only sliver in a second district a split, as the shipped table does", () => {
    const lines = { land: ["05"], all: ["05", "06"], residual: false };
    expect(placeMembership("48", lines)).toEqual({
      whole: null,
      candidates: ["4805", "4806"],
    });
    // The map inspector only counts districts with land.
    expect(placeLandDistricts("48", lines)).toEqual(["4805"]);
  });

  it("never calls a place whole when part of it is in no district", () => {
    const lines = { land: ["05"], all: ["05"], residual: true };
    expect(placeMembership("48", lines)).toEqual({
      whole: null,
      candidates: ["4805"],
    });
  });
});

describe("the compiled 2026 lines and the shipped tables", () => {
  const lines = loadLines2026(ROOT);
  const enactment = loadEnactmentDates(ROOT, lines);
  const catalog = placeDistrictMembershipCatalog().congressional.dated;

  it("regenerate the dated place sets exactly, one set per start date", () => {
    const groups = statesByStartDate(enactment);
    expect(catalog.map((set) => set.effectiveFrom)).toEqual(
      groups.map((group) => group.effectiveFrom),
    );
    for (const group of groups) {
      const set = catalog.find(
        (entry) => entry.effectiveFrom === group.effectiveFrom,
      );
      if (!set) throw new Error(`no dated set for ${group.effectiveFrom}`);
      const whole: Record<string, string> = {};
      const split: Record<string, readonly string[]> = {};
      for (const fips of group.stateFips) {
        for (const [code, place] of Object.entries(
          (lines.states[fips] as (typeof lines.states)[string]).places,
        )) {
          const membership = placeMembership(fips, place);
          if (membership.whole) whole[`${fips}${code}`] = membership.whole;
          else split[`${fips}${code}`] = membership.candidates;
        }
      }
      expect(set.stateFips).toEqual(group.stateFips);
      expect(set.wholePlace).toEqual(whole);
      expect(set.splitPlaceCandidates).toEqual(split);
      expect(set.vintage).toBe(lines.vintage);
    }
  });

  it("start each state on its own sourced enactment date", () => {
    const start = Object.fromEntries(
      Object.values(enactment.states).map((entry) => [
        entry.stateUsps,
        entry.effectiveFrom,
      ]),
    );
    expect(start).toEqual({
      TX: "2025-08-29",
      NC: "2025-10-22",
      OH: "2025-10-31",
      CA: "2025-11-04",
      UT: "2025-11-10",
      FL: "2026-05-04",
      TN: "2026-05-07",
      LA: "2026-05-29",
      AL: "2026-06-02",
    });
    for (const entry of Object.values(enactment.states)) {
      expect(entry.event.length).toBeGreaterThan(0);
      expect(entry.citedSource).toMatch(/^https:\/\//);
    }
  });

  it("carry a lock that names every source file with a hash", () => {
    const lock = JSON.parse(
      readFileSync(
        resolve(ROOT, "data/research/district-lines-2026/artifact-lock.json"),
        "utf8",
      ),
    ) as {
      artifacts: { url: string; sha256: string; bytes: number }[];
    };
    // The block file, its split report, and a place file and a block layer for
    // each of the nine redrawn states.
    expect(lock.artifacts).toHaveLength(
      2 + 2 * Object.keys(lines.states).length,
    );
    for (const artifact of lock.artifacts) {
      expect(artifact.url).toMatch(/^https:\/\/www2\.census\.gov\//);
      expect(artifact.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(artifact.bytes).toBeGreaterThan(0);
    }
  });
});
