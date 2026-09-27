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

  it("preserves EIA annual state gasoline prices in their published energy units", () => {
    const data = corpus("eia-energy-prices");
    const gasoline = data.rows.filter(
      (row: { kind?: string }) => row.kind === "annual-motor-gasoline-price",
    );
    expect(gasoline).toHaveLength(52 * 55);
    expect(data.coverage.gasolineAnnualGeographies).toHaveLength(52);
    expect(data.coverage.gasolineAnnualYears).toEqual([1970, 2024]);
    expect(
      gasoline.find(
        (row: { geographyCode: string; year: number }) =>
          row.geographyCode === "AL" && row.year === 2024,
      ),
    ).toMatchObject({
      value: 24.03,
      raw: "24.03",
      units: "USD per million Btu",
      dataStatus: "2024F",
      evidence: { artifactId: "gasoline-seds-annual-prices", msn: "MGTCD" },
    });
    expect(
      gasoline.some(
        (row: { geographyCode: string }) => row.geographyCode === "PR",
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

  it("keeps IRS annual liability and automated payroll withholding in separate sourced schedules", () => {
    const data = corpus("irs-payroll-brackets");
    const annual = data.rows.filter(
      (row: { kind: string }) => row.kind === "annual-tax-liability-bracket",
    );
    const withholding = data.rows.filter(
      (row: { kind: string }) =>
        row.kind === "automated-payroll-withholding-bracket",
    );
    expect(annual).toHaveLength(28);
    expect(withholding).toHaveLength(48);
    expect(
      new Set(annual.map((row: { filingStatus: string }) => row.filingStatus))
        .size,
    ).toBe(4);
    expect(
      new Set(
        withholding.map(
          (row: { filingStatus: string; step2Checkbox: boolean }) =>
            `${row.filingStatus}/${row.step2Checkbox}`,
        ),
      ).size,
    ).toBe(6);

    for (const filingStatus of new Set(
      annual.map((row: { filingStatus: string }) => row.filingStatus),
    )) {
      const schedule = annual.filter(
        (row: { filingStatus: string }) => row.filingStatus === filingStatus,
      );
      expect(schedule).toHaveLength(7);
      expect(schedule.at(-1)?.upperUnbounded).toBe(true);
      for (let index = 1; index < schedule.length; index++)
        expect(schedule[index].lowerExclusive).toBe(
          schedule[index - 1].upperInclusive,
        );
    }
    for (const key of new Set(
      withholding.map(
        (row: { filingStatus: string; step2Checkbox: boolean }) =>
          `${row.filingStatus}/${row.step2Checkbox}`,
      ),
    )) {
      const schedule = withholding.filter(
        (row: { filingStatus: string; step2Checkbox: boolean }) =>
          `${row.filingStatus}/${row.step2Checkbox}` === key,
      );
      expect(schedule).toHaveLength(8);
      expect(schedule.at(-1)?.upperUnbounded).toBe(true);
      for (let index = 1; index < schedule.length; index++)
        expect(schedule[index].lowerInclusive).toBe(
          schedule[index - 1].upperExclusive,
        );
    }

    const jointAnnual = annual.filter((row: { filingStatus: string }) =>
      row.filingStatus.includes("Married Individuals Filing Joint Returns"),
    );
    const jointWithholding = withholding.filter(
      (row: { filingStatus: string; step2Checkbox: boolean }) =>
        row.filingStatus === "Married Filing Jointly" && !row.step2Checkbox,
    );
    expect(jointAnnual[0]).toMatchObject({
      year: 2026,
      lowerExclusive: 0,
      upperInclusive: 24800,
      ratePercent: 10,
      units: "USD taxable annual income and tax; rate in percent",
      evidence: { artifactId: "irs-annual-brackets-2026", tableLine: 2293 },
    });
    expect(jointWithholding[0]).toMatchObject({
      year: 2026,
      lowerInclusive: 0,
      upperExclusive: 19300,
      ratePercent: 0,
      units:
        "USD adjusted annual wages and tentative annual withholding; rate in percent",
      evidence: { artifactId: "irs-15t-2026", tableLine: 2777 },
    });
    expect(jointAnnual.at(-1)).toMatchObject({
      lowerExclusive: 768700,
      upperInclusive: null,
      baseTax: 206583.5,
      ratePercent: 37,
    });
    expect(jointWithholding.at(-1)).toMatchObject({
      lowerInclusive: 788000,
      upperExclusive: null,
      baseTax: 206583.5,
      ratePercent: 37,
    });
  });

  it("records state guidance coverage without treating old or future tables as current rates", () => {
    const plan = JSON.parse(
      readFileSync(
        "data/source/state-revenue-tax-rates/source-plan.json",
        "utf8",
      ),
    );
    const lock = JSON.parse(
      readFileSync(
        "data/source/state-revenue-tax-rates/money-artifact-lock.json",
        "utf8",
      ),
    );
    const requested = plan.map((entry: { id: string }) => entry.id);
    const acquired = lock.artifacts.map(
      (entry: { artifactId: string }) => entry.artifactId,
    );
    expect(requested).toHaveLength(51);
    expect(new Set(requested).size).toBe(51);
    expect(acquired).toHaveLength(48);
    expect(new Set(acquired).size).toBe(48);
    expect(acquired.every((id: string) => requested.includes(id))).toBe(true);
    expect(
      requested.filter((id: string) => !acquired.includes(id)).sort(),
    ).toEqual(["withholding-mi", "withholding-nh", "withholding-tn"]);
    expect(
      lock.artifacts.every(
        (entry: { rights: { status: string } }) =>
          entry.rights.status === "UNKNOWN",
      ),
    ).toBe(true);
    expect(
      lock.artifacts.find(
        (entry: { artifactId: string }) =>
          entry.artifactId === "withholding-ma",
      ),
    ).toMatchObject({
      bytes: {
        length: 279731,
        sha256:
          "d3f12716311bb9977c9597de25c89a79523d50a5bdc293ab7e68368a453f79a8",
      },
      publisher: { statedVintage: "2026" },
    });
    expect(
      lock.artifacts.find(
        (entry: { artifactId: string }) =>
          entry.artifactId === "withholding-dc",
      )?.publisher.statedVintage,
    ).toContain("2015");
    expect(
      lock.artifacts.find(
        (entry: { artifactId: string }) =>
          entry.artifactId === "withholding-oh",
      )?.publisher.statedVintage,
    ).toContain("2025");
  });
});
