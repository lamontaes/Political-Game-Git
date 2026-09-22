import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  sourceDomain,
  readCpsCell,
} from "../../src/source/domains/census-voting-registration";
import { validateCpsVoting } from "../../src/source/domains/census-voting-registration/validate";
import { corpusCanonicalDigest } from "../../src/source/core";
import type { ArtifactLock, Evidence } from "../../src/source/core";
import {
  projectStateVotingContext,
  queryStateVotingContext,
} from "../../src/presentation/state-voting-context";
const lock = JSON.parse(
  readFileSync(
    resolve("data/source/census-voting-registration/artifact-lock.json"),
    "utf8",
  ),
) as ArtifactLock;
const compiled = sourceDomain.compileProduction(lock);
const evidence: Evidence = {
  artifactId: "fixture-cell",
  locator: {
    kind: "table-cell",
    artifactId: "fixture-cell",
    table: "4a",
    lineCode: "B7",
    period: "2024-11",
  },
};

describe("Census 2024 state voting source and reader", () => {
  it("compiles locked publisher tables with bounded coverage and independent Kentucky values", () => {
    expect(validateCpsVoting(compiled).findings).toEqual([]);
    expect(compiled.records).toHaveLength(936);
    const ky = projectStateVotingContext("KY", "2026-01-01", compiled.records);
    expect(ky.totals!.metrics.adultPopulation.value).toMatchObject({
      state: "HISTORICAL",
      value: 3405000,
    });
    expect(ky.totals!.metrics.reportedRegistered.value).toMatchObject({
      state: "HISTORICAL",
      value: 2558000,
    });
    expect(ky.totals!.metrics.votedCitizenPercent.value).toMatchObject({
      state: "HISTORICAL",
      value: 67.7,
    });
    expect(ky.totals!.metrics.votedCitizenMoe).toMatchObject({
      unit: "percentage-points",
      confidenceLevel: 90,
      denominator: "citizen-adults",
      value: { value: 3.6 },
    });
    expect(ky.breakdowns.sex).toHaveLength(2);
    expect(ky.breakdowns.raceAndHispanicOrigin).toHaveLength(8);
    expect(ky.breakdowns.age).toHaveLength(5);
    expect(ky.totals!.metrics.adultPopulation.evidence.locator).toMatchObject({
      table: "vote04a_2024",
    });
  });
  it("keeps count scaling, rounded zero, unknown markers and rate denominators distinct", () => {
    expect(readCpsCell("123", "reportedVoted", evidence)).toMatchObject({
      value: { value: 123000 },
      unit: "people",
      publishedResolution: 1000,
    });
    expect(readCpsCell("0", "reportedVoted", evidence)).toMatchObject({
      literal: "0",
      value: { value: 0 },
      publishedResolution: 1000,
    });
    for (const token of ["", "(B)", "-", "Z", "(X)", "NaN"]) {
      const cell = readCpsCell(token, "reportedVoted", evidence);
      expect(cell.value.state).toBe("UNKNOWN");
      expect(cell.value).not.toHaveProperty("value");
    }
    expect(readCpsCell("63.2", "votedTotalPercent", evidence)).toMatchObject({
      unit: "percent",
      denominator: "total-adults",
      value: { value: 63.2 },
    });
    expect(() => readCpsCell("101", "votedTotalPercent", evidence)).toThrow();
    expect(() => readCpsCell("1.5", "reportedVoted", evidence)).toThrow();
  });
  it("rejects a changed denominator even when a corpus digest is recomputed", () => {
    const original = compiled.records[0]!;
    const bad = {
      ...original,
      metrics: {
        ...original.metrics,
        votedCitizenPercent: {
          ...original.metrics.votedCitizenPercent,
          denominator: "total-adults" as const,
        },
      },
    };
    const records = [bad, ...compiled.records.slice(1)];
    expect(
      validateCpsVoting({
        records,
        corpus: {
          ...compiled.corpus,
          canonicalSha256: corpusCanonicalDigest(records),
        },
      }).findings.some((f) => f.code === "cps/denominator"),
    ).toBe(true);
  });
  it("does not expose unreleased, neighboring, national or unknown-state values and leaves inputs untouched", () => {
    const before = JSON.stringify(compiled.records);
    expect(
      projectStateVotingContext("KY", "2025-04-29", compiled.records).totals,
    ).toBeNull();
    expect(
      projectStateVotingContext("KY", "invalid-date", compiled.records).totals,
    ).toBeNull();
    expect(
      projectStateVotingContext("XX", "2026-01-01", compiled.records).totals,
    ).toBeNull();
    expect(
      projectStateVotingContext("DC", "2026-01-01", compiled.records).totals!
        .geographyName,
    ).toBe("DISTRICT OF COLUMBIA");
    const foreign = compiled.records.filter(
      (r) => r.geographyName !== "KENTUCKY",
    );
    expect(
      projectStateVotingContext("KY", "2026-01-01", foreign).totals,
    ).toBeNull();
    expect(JSON.stringify(compiled.records)).toBe(before);
  });
  it("refuses a mismatched browser state shard and never converts absence to zero", async () => {
    const view = await queryStateVotingContext(
      { stateUsps: "KY", asOf: "2026-01-01" },
      {
        fetchJson: async (url) =>
          url.endsWith("manifest.json")
            ? {
                schemaVersion: "1",
                inputClass: "production",
                corpusSha256: compiled.corpus.canonicalSha256,
                releaseDate: "2025-04-30",
                sources: lock.artifacts.map((a) => ({
                  artifactId: a.artifactId,
                  sha256: a.bytes.sha256,
                  url: a.retrieval.url,
                  retrievedAt: a.retrieval.retrievedAt,
                  releaseDate: a.publisher.releaseDate,
                })),
                states: { KY: "KY.json" },
              }
            : {
                schemaVersion: "1",
                stateUsps: "CA",
                stateName: "California",
                records: compiled.records,
              },
      },
    );
    expect(view.totals).toBeNull();
    expect(view.unavailableReason).not.toBeNull();
  });
});
