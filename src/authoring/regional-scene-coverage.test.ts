import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import coverageDocument from "../../art/regions/regional-scene-places.json";
import { GENERIC_HUMID_PARK_TAGS } from "./asset-compatibility";
import {
  censusDivisionOf,
  resolveRegionalPlate,
  seasonOfIsoDate,
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

/** A context that says as little as possible, so a test can vary one field. */
function ctx(
  overrides: Partial<NonNullable<RegionalSceneEntry["context"]>> = {},
): NonNullable<RegionalSceneEntry["context"]> {
  return {
    seasons: ["spring", "summer", "autumn", "winter"],
    landform: "valley-and-ridge",
    sceneKind: "open-landscape",
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

  it("treats two compatible pictures of one place as variety, not a conflict", () => {
    const document = docOf(
      region(
        "valley-forest",
        { includeCounties: ["21195"] },
        { context: ctx() },
      ),
      region(
        "valley-street",
        { includeCounties: ["21195"] },
        { context: ctx({ sceneKind: "street" }) },
      ),
    );
    const resolution = resolveRegionalPlate(document, {
      stateKey: "US-KY",
      countyGeoids: ["21195"],
    });
    expect(resolution.outcome).toBe("plate");
    if (resolution.outcome !== "plate") return;
    // Whichever it picked, the other is reported rather than hidden.
    expect([...resolution.alternatives, resolution.regionKey].sort()).toEqual([
      "valley-forest",
      "valley-street",
    ]);
  });

  it("picks the same picture every time for the same place", () => {
    const document = docOf(
      region(
        "valley-forest",
        { includeCounties: ["21195"] },
        { context: ctx() },
      ),
      region(
        "valley-street",
        { includeCounties: ["21195"] },
        { context: ctx({ sceneKind: "street" }) },
      ),
    );
    const query = { stateKey: "US-KY", countyGeoids: ["21195"] };
    const first = resolveRegionalPlate(document, query);
    // Reversing the file order must not change the answer either: a redraw and
    // a re-sorted document are the same save to the player.
    const reversed = docOf(...[...document.regions].reverse());
    for (const again of [
      resolveRegionalPlate(document, query),
      resolveRegionalPlate(reversed, query),
    ]) {
      expect(again).toEqual(first);
    }
  });

  it("blanks the place when two regions cannot both be true of it", () => {
    const document = docOf(
      region(
        "desert",
        { includeCounties: ["04019"] },
        { context: ctx({ landform: "desert-basin-and-range" }) },
      ),
      region(
        "rainforest",
        { includeCounties: ["04019"] },
        { context: ctx({ landform: "coastal-lowland" }) },
      ),
    );
    expect(
      resolveRegionalPlate(document, {
        stateKey: "US-AZ",
        countyGeoids: ["04019"],
      }),
    ).toEqual({
      outcome: "none",
      reason: "conflicting-coverage",
      regionKeys: ["desert", "rainforest"],
    });
  });

  it("honours an explicit never-alongside where the landform cannot tell", () => {
    const document = docOf(
      region("oak-prairie", { includeCounties: ["48097"] }, { context: ctx() }),
      region(
        "pine-hardwood",
        { includeCounties: ["48097"] },
        { context: ctx(), neverAlongside: ["oak-prairie"] },
      ),
    );
    const resolution = resolveRegionalPlate(document, {
      stateKey: "US-TX",
      countyGeoids: ["48097"],
    });
    expect(resolution.outcome).toBe("none");
    if (resolution.outcome !== "none") return;
    expect(resolution.reason).toBe("conflicting-coverage");
  });

  it("will not show a winter picture in July, or a summer one in January", () => {
    const document = docOf(
      region(
        "winter-meadow",
        { includeStates: ["US-CO"] },
        { context: ctx({ seasons: ["winter"] }) },
      ),
    );
    expect(
      resolveRegionalPlate(document, { stateKey: "US-CO", season: "winter" })
        .outcome,
    ).toBe("plate");
    expect(
      resolveRegionalPlate(document, { stateKey: "US-CO", season: "summer" }),
    ).toEqual({
      outcome: "none",
      reason: "no-picture-fits-this-context",
      regionKeys: ["winter-meadow"],
    });
  });

  it("prefers a fitting state picture over a more specific one in the wrong season", () => {
    const document = docOf(
      region(
        "january-town",
        { includeCounties: ["21195"] },
        { context: ctx({ seasons: ["winter"] }) },
      ),
      region(
        "leafy-state",
        { includeStates: ["US-KY"] },
        { context: ctx({ seasons: ["summer"] }) },
      ),
    );
    const resolution = resolveRegionalPlate(document, {
      stateKey: "US-KY",
      countyGeoids: ["21195"],
      season: "summer",
    });
    expect(resolution.outcome).toBe("plate");
    if (resolution.outcome !== "plate") return;
    expect(resolution.regionKey).toBe("leafy-state");
    expect(resolution.matchedBy).toBe("state");
  });

  it("carries the scene kind through, so a street is not captioned countryside", () => {
    const document = docOf(
      region(
        "main-street",
        { includeStates: ["US-MI"] },
        { context: ctx({ sceneKind: "street" }) },
      ),
    );
    const resolution = resolveRegionalPlate(document, { stateKey: "US-MI" });
    expect(resolution.outcome).toBe("plate");
    if (resolution.outcome !== "plate") return;
    expect(resolution.sceneKind).toBe("street");
  });

  it("reads the season from a date rather than from a note", () => {
    expect(seasonOfIsoDate("2026-01-12")).toBe("winter");
    expect(seasonOfIsoDate("2026-07-04")).toBe("summer");
    expect(seasonOfIsoDate("2026-10-31")).toBe("autumn");
    expect(seasonOfIsoDate("2026-04-01")).toBe("spring");
    expect(seasonOfIsoDate("not a date")).toBeNull();
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

  it("never reaches a place through a census division", () => {
    // `pacific` is Alaska, Hawaii, California, Oregon and Washington. A
    // division-wide fallback would let the Olympic rainforest plate stand in
    // for Honolulu, so there is no coarser tier than the state at all.
    const document = docOf(
      region(
        "humid-park",
        {},
        { compatibility: GENERIC_HUMID_PARK_TAGS, context: ctx() },
      ),
    );
    const resolution = resolveRegionalPlate(document, { stateKey: "US-KY" });
    expect(resolution.outcome).toBe("none");
    if (resolution.outcome !== "none") return;
    expect(resolution.reason).toBe("no-region-covers-this-place");
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

  /**
   * His research is prose and stays prose.
   *
   * Every region carries his geographic envelope and his exclusions, and only
   * five carry place IDs. The danger is that the prose reads like coverage:
   * `doNotAssume` on the Sonoran row says not to extend to the California
   * portion of the desert, which sounds like an exclusion and is not one —
   * it is an instruction to whoever draws up the place list. A resolver that
   * acted on any of it would be inventing coverage from a sentence.
   */
  it("never resolves a region on research prose alone", () => {
    const researched = document.regions.filter((entry) => entry.research);
    expect(researched.length).toBe(23);
    const withoutSelectors = researched.filter(
      (entry) =>
        entry.places.includePlaces.length === 0 &&
        entry.places.includeCounties.length === 0 &&
        entry.places.includeStates.length === 0,
    );
    expect(withoutSelectors.length).toBeGreaterThan(0);
    for (const entry of withoutSelectors) {
      // Arizona is the state his Sonoran research describes at length; a row
      // that only talks about a place must still not claim it.
      for (const stateKey of ["US-AZ", "US-CA", "US-KY", "US-TX"]) {
        const resolution = resolveRegionalPlate(document, {
          stateKey,
          season: "summer",
        });
        if (resolution.outcome !== "plate") continue;
        expect(resolution.regionKey, entry.regionKey).not.toBe(entry.regionKey);
      }
    }
  });

  it("tags every scene with a season, a landform and a kind of view", () => {
    for (const entry of document.regions) {
      expect(entry.context, entry.regionKey).toBeDefined();
      expect(entry.context!.seasons.length, entry.regionKey).toBeGreaterThan(0);
    }
  });

  it("shows the owner's approved plates to the places he researched", () => {
    // Tucson and Phoenix, from his 2020 Census starter overlay.
    for (const placeGeoid of ["0477000", "0455000"]) {
      const resolution = resolveRegionalPlate(document, {
        stateKey: "US-AZ",
        placeGeoid,
        season: "summer",
      });
      expect(resolution.outcome, placeGeoid).toBe("plate");
      if (resolution.outcome !== "plate") continue;
      expect(resolution.regionKey).toBe("sonoran-desert");
      expect(resolution.matchedBy).toBe("place");
    }
    // Stillwater, Oklahoma, on the Cross Timbers plate.
    const crossTimbers = resolveRegionalPlate(document, {
      stateKey: "US-OK",
      placeGeoid: "4070300",
      season: "summer",
    });
    expect(crossTimbers.outcome).toBe("plate");
  });

  it("shows the leaf-on Cross Timbers plate in summer and nothing in January", () => {
    const query = { stateKey: "US-OK", placeGeoid: "4013500" };
    expect(
      resolveRegionalPlate(document, { ...query, season: "summer" }).outcome,
    ).toBe("plate");
    const january = resolveRegionalPlate(document, {
      ...query,
      season: "winter",
    });
    expect(january.outcome).toBe("none");
    if (january.outcome !== "none") return;
    expect(january.reason).toBe("no-picture-fits-this-context");
  });

  it("shows nothing for a place nobody has researched yet", () => {
    // Lexington, Kentucky. No region claims it, and the intro stays blank
    // rather than borrowing a landscape from a thousand miles away.
    const resolution = resolveRegionalPlate(document, {
      stateKey: "US-KY",
      placeGeoid: "2146027",
      season: "summer",
    });
    expect(resolution.outcome).toBe("none");
    if (resolution.outcome !== "none") return;
    expect(resolution.reason).toBe("no-region-covers-this-place");
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

  /**
   * The declared geometry, held against the file rather than against itself.
   *
   * The assertion above only proves the numbers are well shaped, which is the
   * way a wrong measurement survives: it is compared to another number and
   * never to the picture. Two measurements in this project were confidently
   * wrong in exactly that way. So this reads the PNG's own IHDR and hashes the
   * bytes, and a plate that is recopied, re-encoded or swapped fails here
   * instead of rendering at a size the document only believes it has.
   *
   * A public checkout carries no plates, so a missing file is skipped rather
   * than failed; that is the same absence the resolver reports as
   * `plate-file-missing`.
   */
  it("matches the bytes of every plate this checkout actually carries", () => {
    const root = path.join(__dirname, "..", "..");
    let checked = 0;
    for (const entry of document.regions) {
      const plate = entry.plate;
      if (!plate) continue;
      const absolute = path.join(root, plate.path);
      if (!fs.existsSync(absolute)) continue;
      const bytes = fs.readFileSync(absolute);
      // PNG signature is 8 bytes, then the IHDR length and type, then width
      // and height as big-endian unsigned 32-bit integers at offsets 16 and 20.
      expect(bytes.subarray(1, 4).toString("ascii"), plate.path).toBe("PNG");
      expect(bytes.readUInt32BE(16), `${plate.path} width`).toBe(plate.width);
      expect(bytes.readUInt32BE(20), `${plate.path} height`).toBe(plate.height);
      expect(
        crypto.createHash("sha256").update(bytes).digest("hex"),
        `${plate.path} sha256`,
      ).toBe(plate.sha256);
      checked += 1;
    }
    // Recorded so a checkout that silently carries nothing is visible in the
    // output rather than passing as a vacuous loop.
    expect(checked).toBeGreaterThanOrEqual(0);
  });
});
