import { describe, expect, it } from "vitest";

import coverageDocument from "../../art/regions/regional-scene-places.json";
import { GENERIC_HUMID_PARK_TAGS } from "./asset-compatibility";
import {
  censusDivisionOf,
  resolveRegionalPlate,
  summarizeRegionalSceneCoverage,
  validateRegionalSceneCoverage,
  type RegionalSceneCoverageDocument,
  type RegionalSceneEntry,
} from "./regional-scene-coverage";

const PLATE = {
  path: "art/families/regional-opening/env_regional_test_v1.png",
  sha256: "a".repeat(64),
  width: 2496,
  height: 1664,
  candidateId: "cand-test",
};

function region(
  regionKey: string,
  places: RegionalSceneEntry["places"],
  overrides: Partial<RegionalSceneEntry> = {},
): RegionalSceneEntry {
  return {
    regionKey,
    displayName: regionKey,
    benchRequestId: `playtest65-region-${regionKey}`,
    plate: PLATE,
    places,
    ...overrides,
  };
}

function docOf(
  ...regions: RegionalSceneEntry[]
): RegionalSceneCoverageDocument {
  return { documentVersion: 1, generatedFrom: "test", regions };
}

describe("resolveRegionalPlate", () => {
  it("prefers an explicit county over an explicit state", () => {
    const document = docOf(
      region("state-wide", { includeStates: ["US-TX"] }),
      region("one-county", { includeCounties: ["48097"] }),
    );
    const resolution = resolveRegionalPlate(document, {
      stateKey: "US-TX",
      countyGeoids: ["48097"],
    });
    expect(resolution.outcome).toBe("plate");
    if (resolution.outcome !== "plate") return;
    expect(resolution.regionKey).toBe("one-county");
    expect(resolution.matchedBy).toBe("county");
  });

  it("lets a county exclusion remove a region its state includes", () => {
    const document = docOf(
      region("state-wide", {
        includeStates: ["US-TX"],
        excludeCounties: ["48201"],
      }),
    );
    expect(
      resolveRegionalPlate(document, {
        stateKey: "US-TX",
        countyGeoids: ["48201"],
      }),
    ).toEqual({
      outcome: "none",
      reason: "no-region-covers-this-place",
      regionKeys: [],
    });
  });

  it("serves one plate to two states in different divisions", () => {
    const document = docOf(
      region("cross-timbers", { includeCounties: ["40109", "48097"] }),
    );
    for (const county of ["40109", "48097"]) {
      const resolution = resolveRegionalPlate(document, {
        stateKey: county.startsWith("40") ? "US-OK" : "US-TX",
        countyGeoids: [county],
      });
      expect(resolution.outcome).toBe("plate");
    }
  });

  it("shows nothing rather than guessing when two regions claim a place", () => {
    const document = docOf(
      region("first", { includeCounties: ["48097"] }),
      region("second", { includeCounties: ["48097"] }),
    );
    const resolution = resolveRegionalPlate(document, {
      stateKey: "US-TX",
      countyGeoids: ["48097"],
    });
    expect(resolution).toEqual({
      outcome: "none",
      reason: "ambiguous-coverage",
      regionKeys: ["first", "second"],
    });
  });

  it("names the region when a match has no delivered plate", () => {
    const document = docOf(
      region("undelivered", { includeStates: ["US-WY"] }, { plate: null }),
    );
    expect(resolveRegionalPlate(document, { stateKey: "US-WY" })).toEqual({
      outcome: "none",
      reason: "matched-region-has-no-plate",
      regionKeys: ["undelivered"],
    });
  });

  it("falls back to a census division only when exactly one region claims it", () => {
    const one = region(
      "humid-park",
      {},
      { compatibility: GENERIC_HUMID_PARK_TAGS },
    );
    expect(
      resolveRegionalPlate(docOf(one), { stateKey: "US-KY" }).outcome,
    ).toBe("plate");
    const two = resolveRegionalPlate(
      docOf(
        one,
        region(
          "other",
          {},
          { compatibility: GENERIC_HUMID_PARK_TAGS, regionKey: "other" },
        ),
      ),
      { stateKey: "US-KY" },
    );
    expect(two.outcome).toBe("none");
    if (two.outcome !== "none") return;
    expect(two.reason).toBe("ambiguous-coverage");
  });

  it("says so when the save names no place at all", () => {
    expect(
      resolveRegionalPlate(docOf(region("any", { includeStates: ["US-TX"] })), {
        stateKey: null,
      }),
    ).toEqual({ outcome: "none", reason: "no-place-known", regionKeys: [] });
  });

  it("never treats an empty selector set as covering everywhere", () => {
    const document = docOf(region("claims-nothing", {}));
    expect(
      resolveRegionalPlate(document, {
        stateKey: "US-TX",
        countyGeoids: ["48097"],
      }).outcome,
    ).toBe("none");
  });
});

describe("censusDivisionOf", () => {
  it("puts west Texas and east Oklahoma in the same division", () => {
    expect(censusDivisionOf("US-TX")).toBe("west-south-central");
    expect(censusDivisionOf("US-OK")).toBe("west-south-central");
  });

  it("has no division for a territory rather than a borrowed one", () => {
    expect(censusDivisionOf("US-GU")).toBeNull();
    expect(censusDivisionOf(null)).toBeNull();
  });
});

describe("validateRegionalSceneCoverage", () => {
  it("rejects a county GEOID that lost its leading zero", () => {
    const result = validateRegionalSceneCoverage(
      docOf(region("bad-geoid", { includeCounties: ["1001"] })),
    );
    expect(result.valid).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "malformed-county-geoid",
    );
  });

  it("rejects a place that is both included and excluded", () => {
    const result = validateRegionalSceneCoverage(
      docOf(
        region("both", {
          includeCounties: ["48097"],
          excludeCounties: ["48097"],
        }),
      ),
    );
    expect(result.valid).toBe(false);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "place-included-and-excluded",
    );
  });

  it("warns, but does not fail, on a region nothing points at yet", () => {
    const result = validateRegionalSceneCoverage(
      docOf(region("unresearched-region", {}, { plate: null })),
    );
    expect(result.valid).toBe(true);
    expect(result.findings.map((finding) => finding.code)).toContain(
      "region-claims-nothing",
    );
  });
});

describe("the shipped coverage document", () => {
  const document = coverageDocument as RegionalSceneCoverageDocument;

  it("validates", () => {
    const result = validateRegionalSceneCoverage(document);
    expect(
      result.findings.filter((finding) => finding.severity === "error"),
    ).toEqual([]);
  });

  it("carries one entry per bench regional request", () => {
    expect(summarizeRegionalSceneCoverage(document).regions).toBe(23);
  });

  it("declares a sha256 and real dimensions for every delivered plate", () => {
    for (const entry of document.regions) {
      if (!entry.plate) continue;
      expect(entry.plate.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.plate.width).toBeGreaterThan(0);
      expect(entry.plate.height).toBeGreaterThan(0);
      expect(entry.plate.path).toMatch(
        /^art\/families\/regional-opening\/[a-z0-9_]+\.png$/,
      );
    }
  });
});
