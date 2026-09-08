/**
 * Federal courts corpus validation.
 *
 * The oracles are counts and structures the statutes fix: thirteen circuits
 * under § 41, ninety-four judicial districts once Title 48's three territorial
 * courts are added to Title 28's ninety-one, one bankruptcy court per district
 * under § 151, and a Federal Circuit whose composition is every district rather
 * than a set of states.
 */

import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import type { FederalCourtRecord } from "./types";

export const EXPECTED_CIRCUIT_COUNT = 13;
export const EXPECTED_DISTRICT_COURT_COUNT = 94;
export const EXPECTED_TITLE_28_DISTRICT_COUNT = 91;
export const EXPECTED_TERRITORIAL_DISTRICT_COUNT = 3;

/**
 * The divisions 28 U.S.C. ch. 5 actually establishes.
 *
 * The Administrative Office operates a larger set of divisional offices; this
 * is the statutory count, and the two are different facts with different
 * authorities. A corpus that reported the operational number while citing the
 * statute would be claiming the statute says something it does not.
 */
export const EXPECTED_STATUTORY_DIVISION_COUNT = 117;

const PROHIBITED_FIELD_TERMS = [
  "judge",
  "ideolog",
  "caseload",
  "outcome",
  "probability",
  "severity",
  "eligib",
  "party",
  "docket",
  "ruling",
];

export function validateFederalCourtCorpus(
  compiled: CompiledCorpus<FederalCourtRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;
  const production = compiled.corpus.inputClass === "production";

  const circuits = records.filter((r) => r.courtKind === "court-of-appeals");
  const districts = records.filter((r) => r.courtKind === "district-court");
  const bankruptcy = records.filter((r) => r.courtKind === "bankruptcy-court");

  if (production) {
    if (circuits.length !== EXPECTED_CIRCUIT_COUNT) {
      findings.push({
        severity: "error",
        code: "courts/circuit-count",
        message: `28 U.S.C. § 41 constitutes ${EXPECTED_CIRCUIT_COUNT} judicial circuits; this corpus holds ${circuits.length}.`,
      });
    }
    if (districts.length !== EXPECTED_DISTRICT_COURT_COUNT) {
      findings.push({
        severity: "error",
        code: "courts/district-count",
        message: `There are ${EXPECTED_DISTRICT_COURT_COUNT} federal judicial districts — ${EXPECTED_TITLE_28_DISTRICT_COUNT} under 28 U.S.C. ch. 5 and ${EXPECTED_TERRITORIAL_DISTRICT_COUNT} territorial courts under Title 48; this corpus holds ${districts.length}.`,
      });
    }
    if (bankruptcy.length !== districts.length) {
      findings.push({
        severity: "error",
        code: "courts/bankruptcy-pairing",
        message: `28 U.S.C. § 151 designates one bankruptcy court in each judicial district; this corpus holds ${bankruptcy.length} for ${districts.length} districts.`,
      });
    }
    const title48 = districts.filter((r) => r.statutoryTitle === 48);
    if (title48.length !== EXPECTED_TERRITORIAL_DISTRICT_COUNT) {
      findings.push({
        severity: "error",
        code: "courts/territorial-count",
        message: `Title 48 establishes ${EXPECTED_TERRITORIAL_DISTRICT_COUNT} territorial district courts; this corpus holds ${title48.length}.`,
      });
    }
    const divisionCount = districts.reduce(
      (total, record) => total + (record.divisions?.length ?? 0),
      0,
    );
    if (divisionCount !== EXPECTED_STATUTORY_DIVISION_COUNT) {
      findings.push({
        severity: "error",
        code: "courts/division-count",
        message: `28 U.S.C. ch. 5 establishes ${EXPECTED_STATUTORY_DIVISION_COUNT} divisions; this corpus holds ${divisionCount}.`,
      });
    }

    // County names contain full stops. A membership list truncated at the first
    // one loses the rest of the division, silently and plausibly.
    const arkansasEastern = districts.find(
      (r) => r.courtId === "d-arkansas-eastern",
    );
    const delta = arkansasEastern?.divisions?.find((d) =>
      d.comprisesCounties.includes("St. Francis"),
    );
    if (!delta) {
      findings.push({
        severity: "error",
        code: "courts/abbreviated-county-name",
        message:
          "28 U.S.C. § 83 assigns St. Francis County to a division of the Eastern District of Arkansas; a membership list that stops at the first full stop loses it.",
      });
    }

    const federal = circuits.find((r) => r.courtId === "ca-fed");
    if (!federal) {
      findings.push({
        severity: "error",
        code: "courts/federal-circuit",
        message: "The Federal Circuit is absent from the corpus.",
      });
    } else if (
      !(federal.composition ?? []).some((entry) =>
        /Federal judicial districts/i.test(entry),
      )
    ) {
      findings.push({
        severity: "error",
        code: "courts/federal-circuit-composition",
        message: `§ 41 gives the Federal Circuit's composition as all Federal judicial districts; this corpus says ${JSON.stringify(federal.composition)}.`,
      });
    }
    const fifth = circuits.find((r) => r.courtId === "ca5");
    if (
      fifth &&
      !(fifth.composition ?? []).includes("District of the Canal Zone")
    ) {
      findings.push({
        severity: "warning",
        code: "courts/composition-modernised",
        message:
          "§ 41 still names the District of the Canal Zone in the Fifth Circuit's composition. Its absence here means the corpus is presenting a tidied list rather than the statute.",
      });
    }
  }

  const ids = new Set<string>();
  const districtIds = new Set(districts.map((r) => r.courtId));
  for (const record of records) {
    if (ids.has(record.courtId)) {
      findings.push({
        severity: "error",
        code: "courts/duplicate-id",
        message: `Court id ${record.courtId} appears more than once.`,
        recordId: record.courtId,
      });
    }
    ids.add(record.courtId);

    if (record.courtKind === "bankruptcy-court") {
      if (
        !record.parentDistrictCourtId ||
        !districtIds.has(record.parentDistrictCourtId)
      ) {
        findings.push({
          severity: "error",
          code: "courts/orphan-bankruptcy-court",
          message: `Bankruptcy court ${record.courtId} names parent district ${String(record.parentDistrictCourtId)}, which is not in the corpus.`,
          recordId: record.courtId,
        });
      }
    }
    if (
      record.courtKind === "district-court" &&
      production &&
      record.circuitId === null
    ) {
      findings.push({
        severity: "error",
        code: "courts/unassigned-circuit",
        message: `District ${record.courtId} (${String(record.jurisdictionName)}) is in no circuit; § 41's composition table should name its jurisdiction.`,
        recordId: record.courtId,
      });
    }
    for (const key of Object.keys(record)) {
      if (
        PROHIBITED_FIELD_TERMS.some((term) => key.toLowerCase().includes(term))
      ) {
        findings.push({
          severity: "error",
          code: "courts/identity-is-not-adjudication",
          message: `Field "${key}" asserts something the statutes establishing a court do not.`,
          recordId: record.courtId,
        });
      }
    }
  }

  return { domain: "federal-courts", checked: records.length, findings };
}
