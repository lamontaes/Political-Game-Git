import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createEconomicContextBrowserProvider,
  type BrowserEconomicGeographyBinding,
} from "./economic-context-browser";

const ROOT = resolve(import.meta.dirname, "../..");

const LEXINGTON: BrowserEconomicGeographyBinding = {
  bindingKey: "economic-context.lexington-ky.v2",
  placeKey: "lexington-fayette",
  placeLabel: "Lexington, Kentucky",
  beaAreas: [
    {
      geographyLevel: "county",
      geoFips: "21067",
      relationship: "same-jurisdiction",
    },
    {
      geographyLevel: "msa",
      geoFips: "30460",
      relationship: "containing-metro",
    },
    {
      geographyLevel: "state",
      geoFips: "21000",
      relationship: "containing-state",
    },
  ],
  lausAreaCodes: [
    { areaCode: "ST2100000000000", relationship: "containing-state" },
  ],
  hudFipsCodes: [
    { hudFipsCode: "2106799999", relationship: "same-jurisdiction" },
  ],
};

function localProvider(reads: string[] = []) {
  return createEconomicContextBrowserProvider({
    baseUrl: "/data/economic-context/v1",
    fetchJson: async (url) => {
      reads.push(url);
      return JSON.parse(
        readFileSync(resolve(ROOT, "public", url.replace(/^\//, "")), "utf8"),
      ) as unknown;
    },
  });
}

describe("browser economic context provider", () => {
  it("loads only exact lazy shards and exposes all matched supported measures", async () => {
    const reads: string[] = [];
    const result = await localProvider(reads).query(LEXINGTON, "2026-09-09");

    expect(reads).toHaveLength(6);
    expect(reads).toContain("/data/economic-context/v1/manifest.json");
    expect(reads).toContain("/data/economic-context/v1/bea/county-21.json");
    expect(reads).toContain("/data/economic-context/v1/bea/msa-30.json");
    expect(reads).toContain("/data/economic-context/v1/bea/state-21.json");
    expect(reads).toContain("/data/economic-context/v1/laus/st21.json");
    expect(reads).toContain("/data/economic-context/v1/hud/21.json");
    expect(result.observations.length).toBeGreaterThan(250);
    expect(
      result.observations.some(
        (item) => item.sourceSeriesKey === "bea.cainc1.3",
      ),
    ).toBe(true);
    expect(
      result.observations.some(
        (item) => item.sourceSeriesKey === "hud.income-limit.low:8",
      ),
    ).toBe(true);
    expect(result.coverage).toMatchObject({
      bea: { recordCount: 35_496, geographyCount: 3_597 },
      laus: { recordCount: 13_082, geographyCount: 79 },
      hud: { recordCount: 9_528, geographyCount: 4_934 },
    });
  });

  // Each locked edition is available from the day its publisher released it:
  // county personal income 2024 on 2026-02-05, regional price parities on
  // 2026-02-19, the original FY2025 Fair Market Rents on 2024-08-14. The
  // income limits and unemployment series have no established release date,
  // so they stay on the conservative retrieval-date fallback.
  it("dates each edition by its publisher's release, not by our download", async () => {
    const provider = localProvider();
    const products = (result: {
      observations: readonly { sourceProduct: string }[];
    }) =>
      new Set(
        result.observations.map((item) => item.sourceProduct.split(":")[0]),
      );

    const opening = await provider.query(LEXINGTON, "2026-01-05");
    const rents = opening.observations.filter(
      (item) => item.source.artifactId === "hud-fy2025-fair-market-rents-xlsx",
    );
    expect(rents.length).toBeGreaterThan(0);
    expect(rents[0]!.vintage).toMatchObject({
      observationAsOf: "2025-09-30",
      productVintage: "FY2025",
      publisherReleaseDate: "2024-08-14",
      sourceRetrievedAt: "2026-09-03T04:25:50.389Z",
      knownAvailableOn: "2024-08-14",
      knownAvailableOnBasis: "publisher-release-date",
      validityPeriod: null,
    });
    // Nothing else is out yet: a February release describing 2024 is not
    // readable in January, however old the year it describes.
    expect(
      opening.observations.every(
        (item) =>
          item.source.artifactId === "hud-fy2025-fair-market-rents-xlsx",
      ),
    ).toBe(true);
    expect(opening.withheldFutureObservationCount).toBeGreaterThan(200);

    const dayBefore = await provider.query(LEXINGTON, "2026-02-04");
    const countyIncome = await provider.query(LEXINGTON, "2026-02-05");
    const withIncome = (result: typeof countyIncome) =>
      result.observations.filter(
        (item) => item.source.artifactId === "bea-regional-cainc1-zip",
      );
    expect(withIncome(dayBefore)).toEqual([]);
    expect(withIncome(countyIncome).length).toBeGreaterThan(0);
    expect(
      withIncome(countyIncome).every(
        (item) =>
          item.vintage.knownAvailableOn === "2026-02-05" &&
          item.vintage.knownAvailableOnBasis === "publisher-release-date",
      ),
    ).toBe(true);
    const parities = (result: typeof countyIncome) =>
      result.observations.filter(
        (item) =>
          item.source.artifactId === "bea-regional-sarpp-zip" ||
          item.source.artifactId === "bea-regional-marpp-zip",
      );
    expect(parities(countyIncome)).toEqual([]);
    expect(
      parities(await provider.query(LEXINGTON, "2026-02-19")).length,
    ).toBeGreaterThan(0);

    // Undated editions: withheld until the retrieval date, and labeled so.
    const lastUndated = await provider.query(LEXINGTON, "2026-09-02");
    expect(
      lastUndated.observations.some(
        (item) =>
          item.vintage.knownAvailableOnBasis === "retrieval-date-fallback",
      ),
    ).toBe(false);
    const retrieved = await provider.query(LEXINGTON, "2026-09-03");
    const undated = retrieved.observations.filter(
      (item) =>
        item.vintage.knownAvailableOnBasis === "retrieval-date-fallback",
    );
    expect(undated.length).toBeGreaterThan(0);
    expect(
      undated.every(
        (item) =>
          item.vintage.publisherReleaseDate === null &&
          item.vintage.knownAvailableOn === "2026-09-03",
      ),
    ).toBe(true);
    expect(products(retrieved).size).toBeGreaterThan(products(opening).size);
  });

  it("preserves missing LAUS rows and the absent historical-parent boundary", async () => {
    const result = await localProvider().query(LEXINGTON, "2026-09-09");
    const missing = result.observations.find(
      (item) =>
        item.sourceProduct === "bls-laus" &&
        item.referencePeriod === "2025-M10" &&
        item.sourceSeriesKey.endsWith("003"),
    );
    expect(missing?.value).toMatchObject({
      state: "missing",
      reason: expect.stringMatching(/appropriations/i),
    });
    expect(result.coverage.laus).toMatchObject({
      firstCommittedYear: 2024,
      pinnedAbsentParentSha256:
        "80b0d29bde6e36e55adb737a0c953cd39fdaa9f5736b2f9200e89cd897a0fd06",
      unavailableEarlierRangeReason: expect.stringMatching(
        /cached-not-committed.*absent/i,
      ),
    });
  });

  it("never joins by name and reports exact-code misses", async () => {
    const result = await localProvider().query(
      {
        ...LEXINGTON,
        placeLabel: "A misleading Lexington label",
        beaAreas: [
          {
            geographyLevel: "county",
            geoFips: "99999",
            relationship: "same-jurisdiction",
          },
        ],
        lausAreaCodes: [],
        hudFipsCodes: [],
      },
      "2026-09-09",
    );
    expect(result.observations).toEqual([]);
    expect(result.availability).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          product: "bea-regional",
          status: "unavailable",
          reason: expect.stringMatching(/exact provider geography/i),
        }),
      ]),
    );
  });

  it("returns fresh projections without mutating cached source data", async () => {
    const provider = localProvider();
    const first = await provider.query(LEXINGTON, "2026-09-09");
    const snapshot = structuredClone(first);
    (first.observations as { label: string }[])[0]!.label = "mutated caller";
    const second = await provider.query(LEXINGTON, "2026-09-09");
    expect(second).toEqual(snapshot);
  });
});
