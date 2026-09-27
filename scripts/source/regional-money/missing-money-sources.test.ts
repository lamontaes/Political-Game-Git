import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { figure, verifyLocks } from "./missing-money-sources";

function corpus(domain: string) {
  return JSON.parse(
    gunzipSync(
      readFileSync(`data/source/${domain}/money-corpus.json.gz`),
    ).toString("utf8"),
  );
}

describe("money source calibration", () => {
  it("keeps suppression, unavailable values and real zero distinct", () => {
    for (const raw of ["", "D", "N", "S", "A", "*", ".", "-"])
      expect(figure(raw)).toEqual({ value: null, raw });
    expect(figure("0")).toEqual({ value: 0, raw: "0" });
    expect(figure("1,234.50").value).toBe(1234.5);
    expect(() => figure("1,23")).toThrow("Unrecognized numeric cell");
    expect(() => figure("estimate pending")).toThrow(
      "Unrecognized numeric cell",
    );
  });

  it("binds the actual downloaded bytes to retrieval receipts", () => {
    expect(() => verifyLocks()).not.toThrow();
  });

  it("has electricity observations for every state and DC, without invented territory rows", () => {
    const data = corpus("eia-energy-prices");
    expect(data.coverage.statesAndDc).toHaveLength(51);
    expect(
      data.coverage.statesAndDc.every(
        (entry: { observed: boolean }) => entry.observed,
      ),
    ).toBe(true);
    expect(
      data.rows.find(
        (row: { geography: string; sector: string }) =>
          row.geography === "Maine" && row.sector === "Transportation",
      ),
    ).toMatchObject({ value: null, raw: ".", year: 2024 });
    expect(
      data.rows.some(
        (row: { geography: string }) => row.geography === "Puerto Rico",
      ),
    ).toBe(false);
  });

  it("keeps CPI annual averages distinct from monthly observations", () => {
    const data = corpus("bls-cpi");
    expect(
      data.rows.some((row: { period: string }) => row.period === "M13"),
    ).toBe(true);
    expect(
      data.rows.some((row: { period: string }) => row.period === "S03"),
    ).toBe(true);
    expect(
      data.rows.some(
        (row: { seriesId: string }) => row.seriesId === "CUUR0000SAF11",
      ),
    ).toBe(true);
    expect(
      data.rows.every((row: { units: string }) =>
        row.units.startsWith("index; "),
      ),
    ).toBe(true);
  });

  it("does not turn conditional national household medians into state or joint estimates", () => {
    const data = corpus("scf-household-finance");
    expect(data.rows).toHaveLength(13);
    expect(data.coverage.stateSpecific).toBe(false);
    expect(
      data.rows.find(
        (row: { category: string }) => row.category === "Less than 20",
      ),
    ).toMatchObject({
      value: 0.9,
      year: 2022,
      units: "thousands of 2022 U.S. dollars",
    });
  });

  it("preserves trade suppression and statistical warning symbols", () => {
    const data = corpus("census-trade");
    expect(
      data.rows.find(
        (row: { productCode: string; year: number; measure: string }) =>
          row.productCode === "2005525000" &&
          row.year === 2022 &&
          row.measure === "shipments",
      ),
    ).toMatchObject({ value: null, raw: "A" });
    expect(
      data.rows
        .filter((row: { raw: string }) => row.raw === "D")
        .every((row: { value: number | null }) => row.value === null),
    ).toBe(true);
  });

  it("retains incomplete finance identities rather than inventing a fiscal date", () => {
    const data = corpus("government-finances");
    expect(data.coverage.identitiesWithMissingFiscalMonthDay).toBe(1100);
    expect(data.coverage.publisherStateCodes).toHaveLength(51);
    expect(data.rows.length).toBeGreaterThan(500000);
    expect(
      data.rows.every(
        (row: { fiscalYearEndingMonthDay: string | null }) =>
          row.fiscalYearEndingMonthDay === null ||
          /^\d{4}$/.test(row.fiscalYearEndingMonthDay),
      ),
    ).toBe(true);
  });
});
