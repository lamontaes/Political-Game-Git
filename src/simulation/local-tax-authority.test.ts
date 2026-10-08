import { makeIsoDate } from "./dates";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import matrix from "../../data/research/money/local-tax-authority-matrix.json" with { type: "json" };
import { allGovernmentUnits } from "./government-units";
import { stableHash } from "./ids";
import { lifePlaceStateIdentities } from "./life-places";
import {
  localTaxAuthority,
  localTaxGovernment,
  localTaxPowerEvidenceFor,
  type LocalTaxInstrument,
} from "./local-tax-authority";

const INSTRUMENTS: readonly LocalTaxInstrument[] = [
  "property",
  "sales",
  "payroll",
  "corporate-income",
];

/** Two governments of different types in states drawn from all 56 places. */
function drawTwoGovernments(seed: string) {
  const states = lifePlaceStateIdentities();
  const units = allGovernmentUnits().filter((unit) => unit.functionalActive);
  const found = new Map<"county" | "municipality", (typeof units)[number]>();
  for (let index = 0; found.size < 2 && index < 400; index += 1) {
    const state =
      states[
        parseInt(stableHash(`${seed}-${index}`).slice(0, 8), 16) % states.length
      ]!;
    for (const type of ["county", "municipality"] as const) {
      if (found.has(type)) continue;
      const matches = units.filter(
        (unit) => unit.stateUsps === state.usps && unit.unitType === type,
      );
      if (matches.length)
        found.set(
          type,
          matches[
            parseInt(stableHash(`${seed}-${index}-${type}`).slice(0, 8), 16) %
              matches.length
          ]!,
        );
    }
  }
  return [found.get("county")!, found.get("municipality")!] as const;
}

describe("one local tax authority lookup for every place", () => {
  it("is not out of date with the matrix and the production corpus", () => {
    expect(() =>
      execFileSync(
        "node",
        ["scripts/local-tax-authority/generate.mjs", "--check"],
        { stdio: "pipe" },
      ),
    ).not.toThrow();
  });

  it("answers every one of the 56 places and four taxes, always estimated or sourced, never blank", () => {
    for (const state of lifePlaceStateIdentities())
      for (const level of ["COUNTY", "MUNICIPALITY"] as const)
        for (const instrument of INSTRUMENTS) {
          const answer = localTaxAuthority({
            stateUsps: state.usps,
            level,
            instrument,
          });
          expect(answer.cell).not.toBe("");
          expect(answer.generalRule.dillonsRule).not.toBe("");
          expect(answer.permits).toBe(
            ["allowed", "piggyback", "specific"].includes(answer.status) ||
              (answer.status === "unknown-estimated" &&
                matrixPermitsNational(instrument)),
          );
          expect(answer.estimated).toBe(answer.basis !== "production-record");
        }
  });

  it("lets payroll and corporate terms land only in the 13 states the matrix lists, plus Alaska stays prohibited", () => {
    const permitting = lifePlaceStateIdentities()
      .map((state) => state.usps)
      .filter(
        (usps) =>
          localTaxAuthority({
            stateUsps: usps,
            level: "MUNICIPALITY",
            instrument: "payroll",
          }).permits,
      );
    expect(permitting).toHaveLength(13);
    expect(permitting.every((usps) => usps in matrix.states)).toBe(true);
    expect(
      localTaxAuthority({
        stateUsps: "AK",
        level: "MUNICIPALITY",
        instrument: "payroll",
      }),
    ).toMatchObject({ status: "prohibited", permits: false, estimated: true });
  });

  it("uses the production records over the matrix where it has them, and the national value where the matrix has no row", () => {
    expect(
      localTaxAuthority({
        stateUsps: "AK",
        level: "COUNTY",
        instrument: "property",
      }),
    ).toMatchObject({
      basis: "production-record",
      estimated: false,
      permits: true,
    });
    const territory = lifePlaceStateIdentities().find(
      (state) => !(state.usps in matrix.states),
    )!;
    expect(
      localTaxAuthority({
        stateUsps: territory.usps,
        level: "MUNICIPALITY",
        instrument: "payroll",
      }),
    ).toMatchObject({
      status: "unknown-estimated",
      basis: "national-most-common",
      estimated: true,
    });
  });

  it("reads a county and a municipality drawn from random places and prints the status", () => {
    const [county, municipality] = drawTwoGovernments("m2-tax-seam-lookup");
    expect(county).toBeDefined();
    expect(municipality).toBeDefined();
    const lines: string[] = [];
    for (const unit of [county, municipality]) {
      const government = localTaxGovernment(unit.id)!;
      expect(government.stateUsps).toBe(unit.stateUsps);
      expect(government.level).toBe(
        unit.unitType === "county" ? "COUNTY" : "MUNICIPALITY",
      );
      for (const instrument of INSTRUMENTS) {
        const evidence = localTaxPowerEvidenceFor({
          asOf: makeIsoDate("2026-10-01"),
          ...government,
          governmentKey: unit.id,
          instrument,
        });
        const answer = localTaxAuthority({ ...government, instrument });
        expect(evidence.authorityStatus).toBe(answer.status);
        expect(evidence.estimated).toBe(answer.estimated);
        expect(evidence.governmentKey).toBe(unit.id);
        lines.push(
          `${unit.stateUsps} ${unit.unitType} ${unit.id} ${instrument}: ${answer.status} (${answer.basis}, ${answer.cell})`,
        );
      }
    }
    process.stderr.write(`LOCAL TAX AUTHORITY ${lines.join("\n  ")}\n`);
  });
});

function matrixPermitsNational(instrument: LocalTaxInstrument): boolean {
  const status =
    instrument === "property"
      ? matrix.national.property
      : instrument === "sales"
        ? matrix.national.sales
        : matrix.national.incomePayroll;
  return ["allowed", "piggyback", "specific"].includes(status);
}
