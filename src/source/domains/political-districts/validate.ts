/**
 * District corpus validation.
 *
 * The structural oracles here are constitutional and statutory facts about the
 * districts the Census publishes — Nebraska's single chamber, the six at-large
 * states, the two delegate geographies — checked against the corpus rather than
 * derived from it.
 */

import type { CompiledCorpus, ValidationFinding, ValidationReport } from "../../core/index";
import {
  AT_LARGE_STATE_USPS,
  NEBRASKA_STATE_FIPS,
  NEBRASKA_UPPER_DISTRICT_COUNT,
  NON_VOTING_DELEGATE_DISTRICT_CODE,
  OFFICIAL_DISTRICT_VECTORS,
} from "./identity";
import type { PoliticalDistrictRecord } from "./types";

export const EXPECTED_CONGRESSIONAL_COUNT = 440;
export const EXPECTED_STATE_LOWER_COUNT = 4879;
export const EXPECTED_STATE_UPPER_COUNT = 1964;

const PROHIBITED_FIELD_TERMS = [
  "party",
  "incumbent",
  "election",
  "vote",
  "margin",
  "competitive",
  "partisan",
  "lean",
  "power",
  "authority",
  "eligib",
  "population",
];

export function validatePoliticalDistrictCorpus(
  compiled: CompiledCorpus<PoliticalDistrictRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;
  const production = compiled.corpus.inputClass === "production";

  const byChamber = {
    congressional: records.filter((r) => r.chamber === "congressional"),
    "state-lower": records.filter((r) => r.chamber === "state-lower"),
    "state-upper": records.filter((r) => r.chamber === "state-upper"),
  };

  if (production) {
    const expected: [keyof typeof byChamber, number][] = [
      ["congressional", EXPECTED_CONGRESSIONAL_COUNT],
      ["state-lower", EXPECTED_STATE_LOWER_COUNT],
      ["state-upper", EXPECTED_STATE_UPPER_COUNT],
    ];
    for (const [chamber, count] of expected) {
      if (byChamber[chamber].length !== count) {
        findings.push({
          severity: "error",
          code: "districts/universe-count",
          message: `The 2025 Gazetteer publishes ${count} ${chamber} records; this corpus holds ${byChamber[chamber].length}.`,
        });
      }
    }

    const nebraskaLower = byChamber["state-lower"].filter(
      (r) => r.stateFips === NEBRASKA_STATE_FIPS,
    );
    if (nebraskaLower.length !== 0) {
      findings.push({
        severity: "error",
        code: "districts/nebraska-unicameral",
        message: `Nebraska's legislature is unicameral, so the lower-chamber file publishes no Nebraska districts; this corpus holds ${nebraskaLower.length}.`,
      });
    }
    const nebraskaUpper = byChamber["state-upper"].filter(
      (r) => r.stateFips === NEBRASKA_STATE_FIPS,
    );
    if (nebraskaUpper.length !== NEBRASKA_UPPER_DISTRICT_COUNT) {
      findings.push({
        severity: "error",
        code: "districts/nebraska-unicameral",
        message: `Nebraska's unicameral legislature has ${NEBRASKA_UPPER_DISTRICT_COUNT} districts; this corpus holds ${nebraskaUpper.length}.`,
      });
    }

    for (const usps of AT_LARGE_STATE_USPS) {
      const districts = byChamber.congressional.filter((r) => r.stateUsps === usps);
      const atLarge = districts.filter((r) => r.districtCode === "00");
      if (atLarge.length !== 1) {
        findings.push({
          severity: "error",
          code: "districts/at-large",
          message: `${usps} elects one at-large representative, published as district code 00; this corpus holds ${atLarge.length} such records.`,
        });
      }
    }

    for (const usps of ["DC", "PR"]) {
      const delegate = byChamber.congressional.filter(
        (r) => r.stateUsps === usps && r.districtCode === NON_VOTING_DELEGATE_DISTRICT_CODE,
      );
      if (delegate.length !== 1) {
        findings.push({
          severity: "error",
          code: "districts/delegate-geography",
          message: `${usps} is published in the congressional file under code ${NON_VOTING_DELEGATE_DISTRICT_CODE}; this corpus holds ${delegate.length} such records.`,
        });
      }
    }

    const residual = records.filter((r) => r.isUnassignedResidual);
    if (residual.length === 0) {
      findings.push({
        severity: "error",
        code: "districts/residual-dropped",
        message:
          "The Gazetteer publishes ZZ/ZZZ rows for territory assigned to no district; dropping them would make the partition look complete when it is not.",
      });
    }
  }

  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.recordId)) {
      findings.push({
        severity: "error",
        code: "districts/duplicate-record",
        message: `Record ${record.recordId} appears more than once.`,
        recordId: record.recordId,
      });
    }
    seen.add(record.recordId);

    if (record.chamber === "congressional" && record.sourceName !== null) {
      findings.push({
        severity: "error",
        code: "districts/invented-name",
        message: `Congressional record ${record.recordId} carries a name, but the Gazetteer congressional product publishes no NAME column. A name nobody published is a fabrication.`,
        recordId: record.recordId,
      });
    }
    if (record.chamber !== "congressional" && record.sourceName === null) {
      findings.push({
        severity: "error",
        code: "districts/missing-published-name",
        message: `State legislative record ${record.recordId} has no name, but the product publishes one for every district.`,
        recordId: record.recordId,
      });
    }
    for (const key of Object.keys(record)) {
      if (PROHIBITED_FIELD_TERMS.some((term) => key.toLowerCase().includes(term))) {
        findings.push({
          severity: "error",
          code: "districts/geography-is-not-politics",
          message: `Field "${key}" asserts something district geography does not establish.`,
          recordId: record.recordId,
        });
      }
    }
  }

  if (production) {
    const byId = new Map(records.map((record) => [record.recordId, record]));
    for (const vector of OFFICIAL_DISTRICT_VECTORS) {
      const id = `${vector.chamber}:${vector.geoid}`;
      const record = byId.get(id);
      if (!record) {
        findings.push({
          severity: "error",
          code: "districts/oracle-missing",
          message: `Official vector ${id} is absent. ${vector.note}`,
          recordId: id,
        });
        continue;
      }
      if (record.districtCode !== vector.districtCode) {
        findings.push({
          severity: "error",
          code: "districts/oracle-code",
          message: `Official vector ${id} carries district code ${vector.districtCode}; this corpus says ${record.districtCode}.`,
          recordId: id,
        });
      }
      if (record.stateUsps !== vector.stateUsps) {
        findings.push({
          severity: "error",
          code: "districts/oracle-state",
          message: `Official vector ${id} is in ${vector.stateUsps}; this corpus says ${record.stateUsps}.`,
          recordId: id,
        });
      }
      if (record.sourceName !== vector.sourceName) {
        findings.push({
          severity: "error",
          code: "districts/oracle-name",
          message: `Official vector ${id} publishes name ${JSON.stringify(vector.sourceName)}; this corpus says ${JSON.stringify(record.sourceName)}.`,
          recordId: id,
        });
      }
    }
  }

  return { domain: "political-districts", checked: records.length, findings };
}
