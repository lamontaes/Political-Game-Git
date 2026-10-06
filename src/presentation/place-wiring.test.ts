import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import { placeDemand } from "../../scripts/appearance/art-demand";
import { placeForLocationKey } from "./place-backdrops";
import type { EntityId, World } from "../simulation/types";

describe("place demand and wiring", () => {
  it("lists exact missing targets without treating dynamic keys as paintings", () => {
    const mapper = {
      path: "fixture.ts",
      text: 'const LOCATION_PLACE = {known: "painted", absent: "missing", household: "home"}; const LOCATION_PREFIX_PLACE = {};',
    };
    const producer = {
      path: "producer.ts",
      text: 'const SCHOOL_LOCATION_KEY = "known"; const school = {locationKey: SCHOOL_LOCATION_KEY}; const other = {locationKey: `dynamic:${personId}`};',
    };
    const demand = placeDemand(["painted"], mapper, [producer]);
    expect(demand.missing.map((entry) => entry.place)).toEqual(["missing"]);
    expect(demand.unresolved.map((entry) => entry.locationKey)).toEqual([
      "household",
    ]);
    expect(demand.dynamic).toHaveLength(1);
    expect(
      demand.inventory.find((entry) => entry.locationKey === "known")?.sources,
    ).toContainEqual({ source: "producer.ts", line: 1 });
    expect(() => placeDemand([], { path: "empty.ts", text: "" }, [])).toThrow(
      "reconcile its data contract",
    );
  });

  it("preserves the hashes and explicitly unresolved rows in the generated inventory", () => {
    const report = JSON.parse(
      readFileSync("art/coverage/missing-places.json", "utf8"),
    ) as {
      sources: { path: string; sha256: string }[];
      inventory: { place: string }[];
      missing: { place: string }[];
      unresolved: unknown[];
      dynamic: unknown[];
    };
    const painted = new Set(manifest.backdrops.map((row) => row.place));
    expect(report.missing).toEqual(
      report.inventory.filter((entry) => !painted.has(entry.place)),
    );
    for (const source of report.sources)
      expect(source.sha256).toBe(
        createHash("sha256").update(readFileSync(source.path)).digest("hex"),
      );
    expect(report.unresolved.length + report.dynamic.length).toBeGreaterThan(0);
    process.stdout.write(
      `Venue inventory: ${report.inventory.length} known targets; ${report.missing.length} missing; ${report.unresolved.length} unresolved keys; ${report.dynamic.length} dynamic expressions.\n`,
    );
  });

  it("does not infer imported, mutable, or shadowed identifier values", () => {
    const mapper = {
      path: "fixture.ts",
      text: 'const LOCATION_PLACE = { known: "painted" }; const LOCATION_PREFIX_PLACE = {prefix: "painted"};',
    };
    const demand = placeDemand(["painted"], mapper, [
      { path: "one.ts", text: 'const SHARED_KEY = "known";' },
      { path: "two.ts", text: "const row = {locationKey: SHARED_KEY};" },
      {
        path: "three.ts",
        text: 'let MUTABLE_KEY = "known"; const row = {locationKey: MUTABLE_KEY};',
      },
      {
        path: "four.ts",
        text: 'const SHARED_KEY = "known"; function build(SHARED_KEY: string) {return {locationKey: SHARED_KEY}}',
      },
      {
        path: "five.ts",
        text: 'const row = {locationKey: "prefix:conditional"};',
      },
    ]);
    expect(demand.dynamic).toHaveLength(3);
    expect(demand.unresolved.map((entry) => entry.locationKey)).toEqual([
      "prefix:conditional",
    ]);
    expect(demand.missing).toEqual([]);
  });

  it("resolves every painted place from its explicit place location key", () => {
    const places = [...new Set(manifest.backdrops.map((row) => row.place))];
    const unwired = places.filter(
      (place) =>
        placeForLocationKey(
          {} as World,
          "fixture-person" as EntityId,
          `place:${place}`,
        ) !== place,
    );
    process.stdout.write(
      `Exact painted place keys: ${places.length - unwired.length}/${places.length} resolve.\n`,
    );
    expect(
      unwired,
      "Explicit painted location keys still need the shared reader writer",
    ).toEqual([]);
  });
});
