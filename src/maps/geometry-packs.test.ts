/**
 * Structural proof over the committed geometry packs. Runs without the raw
 * Census archives: every drawn polygon parses, identities match the accepted
 * catalog exactly, topology is a clean partition, Alaska/Hawaii/D.C. are
 * deliberately present, and nothing outside the canvas is silently dropped.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { districtIdentityCatalog } from "../districts/catalog";
import type { DistrictChamber } from "../districts/types";
import manifest from "../../data/source/map-geometry/manifest.json" with { type: "json" };
import type { MapGeometryPack, MapLayerId } from "./geometry-types";
import {
  featureContains,
  featurePath,
  featureRings,
  validateGeometryPack,
} from "./geometry-runtime";
import { MAP_CANVAS, NOT_DRAWN_STATE_FIPS, projectLonLat } from "./projection";

const GEOMETRY_DIR = join(import.meta.dirname, "geometry");
const national = validateGeometryPack(
  JSON.parse(
    readFileSync(join(GEOMETRY_DIR, "national.generated.json"), "utf8"),
  ),
  "national",
);
const stateFiles = readdirSync(join(GEOMETRY_DIR, "states")).filter(
  (name: string) => name.endsWith(".generated.json"),
);
const statePacks = new Map<string, MapGeometryPack>(
  stateFiles.map((name: string) => {
    const fips = name.slice(0, 2);
    return [
      fips,
      validateGeometryPack(
        JSON.parse(readFileSync(join(GEOMETRY_DIR, "states", name), "utf8")),
        `state-${fips}`,
      ),
    ];
  }),
);

const catalog = districtIdentityCatalog().filter(
  (identity) =>
    !identity.isUnassignedResidual &&
    !(identity.stateFips in NOT_DRAWN_STATE_FIPS),
);
const expectedGeoids = (chamber: DistrictChamber, stateFips?: string) =>
  catalog
    .filter(
      (identity) =>
        identity.chamber === chamber &&
        (!stateFips || identity.stateFips === stateFips),
    )
    .map((identity) => identity.geoid)
    .sort();

const PATH_SYNTAX =
  /^(M-?\d+(\.\d+)? -?\d+(\.\d+)?(L-?\d+(\.\d+)? -?\d+(\.\d+)?){2,}Z)+$/;

function checkPolygons(pack: MapGeometryPack) {
  for (const [layer, features] of Object.entries(pack.layers) as [
    MapLayerId,
    MapGeometryPack["layers"][MapLayerId],
  ][]) {
    for (const feature of features ?? []) {
      const path = featurePath(pack, layer, feature);
      expect(path, `${pack.packId} ${layer} ${feature.geoid}`).toMatch(
        PATH_SYNTAX,
      );
      for (const ring of featureRings(pack, feature)) {
        expect(
          ring.length,
          `${layer} ${feature.geoid} ring`,
        ).toBeGreaterThanOrEqual(3);
        // Arcs chain end to start, so each ring closes on its first point.
        const [first, last] = [ring[0]!, ring[ring.length - 1]!];
        expect(Math.hypot(first[0] - last[0], first[1] - last[1])).toBeLessThan(
          pack.quantum * 2,
        );
      }
      const [x0, y0, x1, y1] = feature.bbox;
      expect(
        x0 <= feature.label[0] &&
          feature.label[0] <= x1 &&
          y0 <= feature.label[1] &&
          feature.label[1] <= y1,
      ).toBe(true);
    }
  }
}

describe("national geometry pack", () => {
  it("draws the 50 states and D.C., including Alaska and Hawaii", () => {
    const states = national.layers.state ?? [];
    expect(states).toHaveLength(51);
    const usps = new Set(states.map((feature) => feature.stateUsps));
    for (const code of ["AK", "HI", "DC", "WA", "KY", "OH"])
      expect(usps.has(code)).toBe(true);
    expect(usps.has("PR")).toBe(false);
  });

  it("draws exactly the accepted 119th Congress districts, with D.C.'s delegate district", () => {
    const geoids = (national.layers.congressional ?? [])
      .map((feature) => feature.geoid)
      .sort();
    expect(geoids).toEqual(expectedGeoids("congressional"));
    expect(geoids).toHaveLength(436);
    expect(geoids).toContain("1198");
    expect(geoids).toContain("0200");
  });

  it("parses every polygon and keeps them on the canvas", () => {
    checkPolygons(national);
    const [x0, y0, x1, y1] = national.bbox;
    expect(x0).toBeGreaterThan(-20);
    expect(y0).toBeGreaterThan(-20);
    expect(x1).toBeLessThan(MAP_CANVAS.width + 20);
    expect(y1).toBeLessThan(MAP_CANVAS.height + 20);
  });

  it("draws Alaska and Hawaii as lower-left insets clear of the conterminous states", () => {
    const states = national.layers.state!;
    const lower48 = states.filter(
      (feature) => !["AK", "HI"].includes(feature.stateUsps),
    );
    const southmostLower48 = Math.max(
      ...lower48.map((feature) => feature.bbox[3]),
    );
    for (const usps of ["AK", "HI"]) {
      const [x0, , x1, y1] = states.find(
        (feature) => feature.stateUsps === usps,
      )!.bbox;
      expect(x0).toBeGreaterThan(0);
      expect(x1).toBeLessThan(MAP_CANVAS.width / 2);
      expect(y1).toBeLessThan(MAP_CANVAS.height);
      expect(y1).toBeGreaterThan(southmostLower48 - 120);
    }
  });

  it("places known cities inside their states (projection sanity)", () => {
    const cases: [string, number, number][] = [
      ["WA", -122.33, 47.61],
      ["KY", -84.5, 38.04],
      ["OH", -83.0, 39.96],
      ["DC", -77.03, 38.9],
    ];
    for (const [usps, lon, lat] of cases) {
      const state = national.layers.state!.find(
        (feature) => feature.stateUsps === usps,
      )!;
      const [x, y] = projectLonLat("conterminous", lon, lat);
      expect(featureContains(national, state, x, y), usps).toBe(true);
    }
    const alaska = national.layers.state!.find(
      (feature) => feature.stateUsps === "AK",
    )!;
    const [ax, ay] = projectLonLat("alaska", -149.9, 61.2);
    expect(featureContains(national, alaska, ax, ay)).toBe(true);
  });

  it("uses a topology-clean shared border network", () => {
    for (const layer of Object.values(manifest.packs[0]!.layers) as {
      overusedArcCount: number;
      sharedArcCount: number;
    }[]) {
      expect(layer.overusedArcCount).toBe(0);
      expect(layer.sharedArcCount).toBeGreaterThan(0);
    }
  });
});

describe("state geometry packs", () => {
  it("exists for every drawn state and D.C.", () => {
    expect(statePacks.size).toBe(51);
    expect(manifest.packs).toHaveLength(52);
  });

  it.each(["53", "21", "39", "11", "02", "15", "44", "32"])(
    "state %s matches identity and parses",
    (fips) => {
      const pack = statePacks.get(fips)!;
      expect(pack).toBeDefined();
      for (const [layer, chamber] of [
        ["congressional", "congressional"],
        ["state-upper", "state-upper"],
        ["state-lower", "state-lower"],
      ] as const) {
        const drawn = (pack.layers[layer] ?? [])
          .map((feature) => feature.geoid)
          .sort();
        expect(drawn, `${fips} ${layer}`).toEqual(
          expectedGeoids(chamber, fips),
        );
      }
      expect(pack.layers.state).toHaveLength(1);
      expect((pack.layers.county ?? []).length).toBeGreaterThan(0);
      expect((pack.layers.place ?? []).length).toBeGreaterThan(0);
      checkPolygons(pack);
    },
  );

  it("keeps Nebraska unicameral and D.C. without a lower chamber", () => {
    expect(statePacks.get("31")?.layers["state-lower"]).toBeUndefined();
    expect(statePacks.get("11")?.layers["state-lower"]).toBeUndefined();
    expect((statePacks.get("11")?.layers["state-upper"] ?? []).length).toBe(8);
  });

  it("records state legislative session years and place types from Census", () => {
    const wa = statePacks.get("53")!;
    expect(
      wa.layers["state-lower"]!.every((feature) =>
        /^\d{4}$/.test(feature.sessionYear ?? ""),
      ),
    ).toBe(true);
    const seattle = wa.layers.place!.find(
      (feature) => feature.geoid === "5363000",
    );
    expect(seattle?.name).toBe("Seattle city");
    expect(seattle?.lsad).toBeTruthy();
  });

  it("lists every excluded record with a reason instead of dropping it", () => {
    for (const entry of manifest.excluded) {
      expect(entry.reason).toMatch(/not treated as absent|own catalogs/);
    }
    expect(
      manifest.excluded.some(
        (entry) => "geoid" in entry && entry.geoid === "7298",
      ),
    ).toBe(true);
  });
});
