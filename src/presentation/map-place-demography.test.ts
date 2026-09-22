import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  queryMapPlaceDemography,
  type MapDemographySelection,
} from "./map-place-demography";
import type {
  BrowserEconomicManifest,
  BrowserEconomicShard,
  BrowserBeaRecord,
} from "./economic-context-browser-types";

const county: MapDemographySelection = {
  layer: "county",
  geoid: "26163",
  stateUsps: "MI",
  asOf: "2026-01-05",
};
const manifest = JSON.parse(
  readFileSync(
    resolve("public/data/economic-context/v1/manifest.json"),
    "utf8",
  ),
) as BrowserEconomicManifest;
function local(url: string): Promise<unknown> {
  return Promise.resolve(
    JSON.parse(readFileSync(resolve("public", url.replace(/^\//, "")), "utf8")),
  );
}
function mutatedRows(change: (rows: BrowserBeaRecord[]) => BrowserBeaRecord[]) {
  return async (url: string): Promise<unknown> => {
    const value = await local(url);
    if (url.endsWith("manifest.json")) return value;
    const shard = value as BrowserEconomicShard<BrowserBeaRecord>;
    return { ...shard, records: change([...shard.records]) };
  };
}

describe("map empirical demographics", () => {
  it("reads an exact Michigan county from real browser shards with provenance", async () => {
    const result = await queryMapPlaceDemography(county, { fetchJson: local });
    expect(result.population).toMatchObject({
      period: "2024",
      geography: { geoid: "26163", level: "county" },
      series: "BEA CAINC1 line 2",
    });
    expect(result.population!.value).toBeGreaterThan(1_000_000);
    expect(result.population!.source.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.detailFields[0]).toMatchObject({
      label: "Per-capita personal income",
      geography: { geoid: "26163" },
    });
    expect(result.density).toBeNull();
    expect(result.boundary).toContain("not the people generated");
    expect(result.selection).toEqual(county);
  });
  it("keeps states separate from counties and maps BEA's state code", async () => {
    const result = await queryMapPlaceDemography(
      { ...county, layer: "state", geoid: "26" },
      { fetchJson: local },
    );
    expect(result.population?.geography).toMatchObject({
      geoid: "26000",
      level: "state",
    });
    expect(result.population!.value).toBeGreaterThan(10_000_000);
  });
  it("does not borrow a county or state for a city or district", async () => {
    for (const selection of [
      { ...county, layer: "place" as const, geoid: "2611400" },
      { ...county, layer: "place" as const, geoid: "4159000", stateUsps: "OR" },
      { ...county, layer: "congressional" as const, geoid: "2606" },
      { ...county, layer: "state-upper" as const, geoid: "26001" },
      { ...county, layer: "state-lower" as const, geoid: "26001" },
      { ...county, stateUsps: "VA" },
    ]) {
      const fetchJson = vi.fn(local);
      const result = await queryMapPlaceDemography(selection, { fetchJson });
      expect(result.population).toBeNull();
      expect(result.detailFields).toEqual([]);
      expect(fetchJson).not.toHaveBeenCalled();
      expect(result.selection.layer).toBe(selection.layer);
    }
  });
  it("accepts only an already reviewed county-equivalent city join", async () => {
    const result = await queryMapPlaceDemography(
      { ...county, layer: "place", geoid: "5167000", stateUsps: "VA" },
      { fetchJson: local },
    );
    expect(result.population?.geography.geoid).toBe("51760");
    expect(result.selection.geoid).toBe("5167000");
  });
  it("guards reference years without mislabeling retrieval time as publication time", async () => {
    const result = await queryMapPlaceDemography(
      { ...county, asOf: "2024-06-01" },
      { fetchJson: local },
    );
    expect(result.population?.period).toBe("2023");
    expect(result.population?.publisherReleaseDate).toBeNull();
  });
  it("withholds an actual later publisher release date", async () => {
    const result = await queryMapPlaceDemography(county, {
      fetchJson: async (url) => {
        if (!url.endsWith("manifest.json")) return local(url);
        const copy = structuredClone(manifest);
        return {
          ...copy,
          locks: {
            ...copy.locks,
            bea: {
              ...copy.locks.bea,
              artifacts: copy.locks.bea.artifacts.map((item) => ({
                ...item,
                publisher: { ...item.publisher, releaseDate: "2027-01-01" },
              })),
            },
          },
        };
      },
    });
    expect(result.population).toBeNull();
  });
  it.each(["UNKNOWN", "SUPPRESSED"])(
    "keeps latest %s population absent instead of falling back or zeroing",
    async (state) => {
      const result = await queryMapPlaceDemography(county, {
        fetchJson: mutatedRows((rows) =>
          rows.map((row) =>
            row.geoFips === county.geoid &&
            row.lineCode === "2" &&
            row.year === "2024"
              ? ({
                  ...row,
                  value: { state, reason: "Withheld" },
                } as BrowserBeaRecord)
              : row,
          ),
        ),
      });
      expect(result.population).toBeNull();
      expect(result.density).toBeNull();
    },
  );
  it("preserves a genuinely known zero without manufacturing it from missing data", async () => {
    const result = await queryMapPlaceDemography(county, {
      fetchJson: mutatedRows((rows) =>
        rows.map((row) =>
          row.geoFips === county.geoid &&
          row.lineCode === "2" &&
          row.year === "2024"
            ? {
                ...row,
                value: {
                  state: "KNOWN",
                  value: 0,
                  release: "FINAL",
                  asOf: "2024-12-31",
                },
              }
            : row,
        ),
      ),
    });
    expect(result.population?.value).toBe(0);
  });

  it("derives density only from a sourced same-year same-geography land area", async () => {
    const landArea = {
      ...county,
      squareMeters: 1_000_000,
      referencePeriod: "2024",
      source: {
        artifactId: "test-land-area",
        sha256: "a".repeat(64),
        url: "https://example.test/area",
      },
    };
    const result = await queryMapPlaceDemography(
      { ...county, landArea },
      { fetchJson: local },
    );
    expect(result.density?.value).toBe(result.population?.value);
    for (const changed of [
      { geoid: "26165" },
      { layer: "place" as const },
      { referencePeriod: "2025" },
      { squareMeters: 0 },
    ]) {
      const missing = await queryMapPlaceDemography(
        { ...county, landArea: { ...landArea, ...changed } },
        { fetchJson: local },
      );
      expect(missing.density).toBeNull();
    }
  });
  it("returns missing data for failed requests, invalid dates and fixture manifests", async () => {
    for (const fetchJson of [
      async () => {
        throw new Error("offline");
      },
      async () => ({
        ...manifest,
        corpora: {
          ...manifest.corpora,
          bea: { ...manifest.corpora.bea, inputClass: "fixture" },
        },
      }),
    ]) {
      expect(
        (await queryMapPlaceDemography(county, { fetchJson })).population,
      ).toBeNull();
    }
    const fetchJson = vi.fn(local);
    expect(
      (
        await queryMapPlaceDemography(
          { ...county, asOf: "invalid" },
          { fetchJson },
        )
      ).population,
    ).toBeNull();
    expect(fetchJson).not.toHaveBeenCalled();
  });
});
