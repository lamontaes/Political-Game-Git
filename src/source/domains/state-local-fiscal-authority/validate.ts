/**
 * Fiscal corpus validation.
 *
 * These checks are written against the specific ways a fiscal authority corpus
 * goes wrong, which are not the ways a qualifications corpus goes wrong. A
 * qualifications corpus fails by fabricating a uniform country. A fiscal corpus
 * fails in three other directions, and each one has a check here.
 *
 * **Silence recorded as law.** Local governments have no inherent taxing power,
 * so "no local income tax" is the expected reading of almost any absence — and
 * that is exactly what makes it dangerous. A corpus may say an instrument is
 * barred only where it names the provision that bars it, or names the enabling
 * scope it searched and found empty. An unlocated prohibition is an assumption
 * with a citation column.
 *
 * **Observation promoted to authority.** 92N's own header states the boundary:
 * observed zero revenue is not legal prohibition, and legal authority does not
 * guarantee collection. A statistical product is therefore never a legal
 * authority here, and a record citing one is an error rather than a warning,
 * because the two are indistinguishable downstream once mixed.
 *
 * **A verdict wearing a number.** No fiscal freedom index, no capacity rating,
 * no solvency score. The record types make a score field unrepresentable; this
 * is the second line, for a verdict smuggled in as the *name* of a fund or a
 * body, and it reuses the core guard so the vocabulary is one vocabulary.
 */

import { findFabricatedScore, isUnresolved } from "../../core/index";
import type {
  CompiledCorpus,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import { isFiscalRule, isTaxInstrumentAuthority } from "./types";
import type { FiscalAuthorityRecord, TaxAuthorizationStatus } from "./types";
import { classifyBalancedBudget, statesCovered } from "./classify";

/**
 * Statistical products that are evidence of observation, never of authority.
 *
 * These are the surveys `government-finances` and `public-employment` compile
 * from. A fiscal authority record citing one has crossed the boundary 92N
 * draws in its own header — most often by reasoning from a zero in a revenue
 * line to a prohibition in law.
 */
export const OBSERVED_DATA_AUTHORITIES: readonly string[] = [
  "Annual Survey of State and Local Government Finances",
  "annual survey of state and local government finances",
  "Census Bureau",
  "census.gov",
  "SLGF",
  "ASPEP",
  "Annual Survey of Public Employment",
];

/**
 * Census government-finance line codes.
 *
 * 92N names T09 and T40 in its ingestion notes as the lines a consumer maps
 * *against* this research. A line code appearing as the legal locator of a
 * fiscal rule means the mapping ran the wrong way.
 */
const CENSUS_LINE_CODE = /\b[TUFA]\d{2}\b/;

/** The text fields whose value could carry a verdict rather than a name. */
const NAMING_FIELDS = new Set([
  "RESERVE_FUND_NAME",
  "BINDING_REVENUE_ESTIMATE_BODY",
  "MILLAGE_RATE_SETTING_BODY",
]);

/** Authorization statuses that assert a bar rather than a permission. */
const BARRING: readonly TaxAuthorizationStatus[] = [
  "CONSTITUTIONALLY_PROHIBITED",
  "STATUTORILY_PREEMPTED",
  "NO_ENABLING_AUTHORITY",
];

/** Rule fields that only make sense where an instrument is permitted. */
const RATE_FIELDS_BY_INSTRUMENT: Readonly<Record<string, readonly string[]>> = {
  LOCAL_OPTION_SALES_TAX_MAX_RATE_PERCENT: ["GENERAL_SALES_TAX"],
  LOCAL_OPTION_SALES_TAX_VOTER_REFERENDUM_REQUIRED: ["GENERAL_SALES_TAX"],
  LOCAL_INCOME_TAX_MAX_RATE_PERCENT: [
    "INDIVIDUAL_INCOME_TAX",
    "PAYROLL_OR_OCCUPATIONAL_TAX",
  ],
  LOCAL_INCOME_TAX_TYPE: [
    "INDIVIDUAL_INCOME_TAX",
    "PAYROLL_OR_OCCUPATIONAL_TAX",
  ],
};

export function validateFiscalAuthorityCorpus(
  compiled: CompiledCorpus<FiscalAuthorityRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;

  for (const record of records) {
    const authority = record.citedAuthority;
    const citationText = `${authority.authorityType} ${authority.legalLocator} ${authority.authorityUrl}`;

    if (
      authority.authorityUrl === "" ||
      !/^https?:\/\//.test(authority.authorityUrl)
    ) {
      findings.push({
        severity: "error",
        code: "fiscal/no-authority-url",
        message: `${record.recordId} cites no first-party authority URL.`,
        recordId: record.recordId,
      });
    }
    if (authority.legalLocator.trim() === "") {
      findings.push({
        severity: "error",
        code: "fiscal/no-legal-locator",
        message: `${record.recordId} names an authority but no article, section or chapter within it. A citation without a locator is not checkable.`,
        recordId: record.recordId,
      });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(authority.effectiveDate)) {
      findings.push({
        severity: "error",
        code: "fiscal/no-effective-date",
        message: `${record.recordId} carries effective date "${authority.effectiveDate}". A fiscal rule without a date cannot be applied to a fiscal year.`,
        recordId: record.recordId,
      });
    }

    for (const product of OBSERVED_DATA_AUTHORITIES) {
      if (citationText.includes(product)) {
        findings.push({
          severity: "error",
          code: "fiscal/observation-as-legal-authority",
          message: `${record.recordId} cites "${product}" as its legal authority. That is a statistical product: it reports what governments collected, never what the law permits them to collect. Observed zero revenue is not a prohibition.`,
          recordId: record.recordId,
        });
        break;
      }
    }
    if (CENSUS_LINE_CODE.test(authority.legalLocator)) {
      findings.push({
        severity: "error",
        code: "fiscal/observation-as-legal-authority",
        message: `${record.recordId} gives "${authority.legalLocator}" as a legal locator, which is the shape of a Census government-finance line code. A revenue line is the thing this research is mapped against, not the authority for it.`,
        recordId: record.recordId,
      });
    }

    if (record.normalizationReviewRequired) {
      findings.push({
        severity: "warning",
        code: "fiscal/awaiting-normalization-review",
        message: `${record.recordId} was flagged for normalization review by the research and is carried with that flag rather than cleared.`,
        recordId: record.recordId,
      });
    }

    if (isTaxInstrumentAuthority(record)) {
      const authorization = record.authorization;
      if (authorization.state === "KNOWN") {
        const value = authorization.value;
        if (
          (value === "CONSTITUTIONALLY_PROHIBITED" ||
            value === "STATUTORILY_PREEMPTED") &&
          authority.legalLocator.trim() === ""
        ) {
          findings.push({
            severity: "error",
            code: "fiscal/prohibition-without-provision",
            message: `${record.recordId} asserts ${value} without naming the provision that does the prohibiting. A bar that cannot be read is an assumption.`,
            recordId: record.recordId,
          });
        }
        if (
          value === "NO_ENABLING_AUTHORITY" &&
          authority.paraphrase.trim() === ""
        ) {
          findings.push({
            severity: "error",
            code: "fiscal/silence-without-scope",
            message: `${record.recordId} asserts NO_ENABLING_AUTHORITY but names no scope that was searched. Under Dillon's Rule an absent grant is the expected reading of any silence, which is exactly why the search has to be stated.`,
            recordId: record.recordId,
          });
        }
      }
      if (
        authorization.state === "UNKNOWN" &&
        authorization.reason.includes("CONFLICTING")
      ) {
        findings.push({
          severity: "warning",
          code: "fiscal/conflict-not-representable",
          message: `${record.recordId} was recorded as conflicting and is carried UNKNOWN: a conflict needs claims from two distinct artifacts, and one matrix is one artifact.`,
          recordId: record.recordId,
        });
      }
      continue;
    }

    if (!isFiscalRule(record)) continue;

    if (
      record.rule.state === "UNKNOWN" &&
      record.rule.reason.includes("CONFLICTING")
    ) {
      findings.push({
        severity: "warning",
        code: "fiscal/conflict-not-representable",
        message: `${record.recordId} was recorded as conflicting and is carried UNKNOWN: a conflict needs claims from two distinct artifacts, and one matrix is one artifact.`,
        recordId: record.recordId,
      });
    }

    if (record.rule.state === "KNOWN" && NAMING_FIELDS.has(record.field)) {
      const text = String(record.rule.value);
      const score = findFabricatedScore(text);
      if (score) {
        findings.push({
          severity: "error",
          code: "fiscal/fabricated-fiscal-score",
          message: `${record.recordId} holds "${text}", which ${score.reason} A fund or a body has a name; a fiscal verdict is not one.`,
          recordId: record.recordId,
        });
      }
    }

    const instruments = RATE_FIELDS_BY_INSTRUMENT[record.field];
    if (instruments && record.rule.state === "KNOWN") {
      const barred = records
        .filter(isTaxInstrumentAuthority)
        .filter(
          (candidate) =>
            candidate.stateUsps === record.stateUsps &&
            candidate.level === record.level &&
            instruments.includes(candidate.instrument) &&
            candidate.authorization.state === "KNOWN" &&
            BARRING.includes(
              candidate.authorization.value as TaxAuthorizationStatus,
            ),
        );
      const permitted = records
        .filter(isTaxInstrumentAuthority)
        .some(
          (candidate) =>
            candidate.stateUsps === record.stateUsps &&
            candidate.level === record.level &&
            instruments.includes(candidate.instrument) &&
            candidate.authorization.state === "KNOWN" &&
            !BARRING.includes(
              candidate.authorization.value as TaxAuthorizationStatus,
            ),
        );
      if (barred.length > 0 && !permitted) {
        findings.push({
          severity: "error",
          code: "fiscal/limit-on-barred-instrument",
          message: `${record.recordId} states a limit for an instrument this corpus says is barred at the same level (${barred.map((entry) => entry.recordId).join(", ")}). A ceiling on a tax that may not be levied is two facts that cannot both be true.`,
          recordId: record.recordId,
        });
      }
    }
  }

  /*
   * The anti-universal check.
   *
   * 92N opens on the observation that a single tax model applied to every state
   * is legally invalid: 12 states have no local option sales tax mechanism, 36
   * preempt local income taxes, 5 have no state sales tax, 9 no broad personal
   * income tax. A corpus spanning several states whose local sales tax
   * authority is identical everywhere has reproduced the slider this research
   * exists to refute.
   */
  const localSalesByState = new Map<string, string>();
  for (const record of records) {
    if (!isTaxInstrumentAuthority(record)) continue;
    if (record.level === "STATE") continue;
    if (record.instrument !== "GENERAL_SALES_TAX") continue;
    if (record.authorization.state !== "KNOWN") continue;
    localSalesByState.set(record.stateUsps, record.authorization.value);
  }
  const distinctLocalSales = new Set(localSalesByState.values());
  if (localSalesByState.size >= 5 && distinctLocalSales.size === 1) {
    findings.push({
      severity: "error",
      code: "fiscal/universal-tax-model",
      message: `All ${localSalesByState.size} states in this corpus report the same local general sales tax authority (${[...distinctLocalSales][0]}). Local option sales tax authority is one of the most divergent fields in American fiscal law, and uniformity across states is the signature of a universal tax model rather than a reading of them.`,
    });
  }

  /*
   * Stage classification is derived, never stored, and a corpus that claims a
   * state's balanced-budget framework should be able to produce one. Where it
   * cannot, the gap is reported here rather than left for a consumer to hit.
   */
  for (const stateUsps of statesCovered(records)) {
    const classification = classifyBalancedBudget(records, stateUsps);
    if (classification.state !== "INCOMPLETE") continue;
    if (
      classification.missing.length === 4 &&
      classification.missing.every((gap) => gap.recordState === null)
    ) {
      // The corpus says nothing at all about this state's budget framework,
      // which is a coverage fact rather than a defective one.
      continue;
    }
    findings.push({
      severity: "warning",
      code: "fiscal/partial-balanced-budget-framework",
      message: `${stateUsps} carries a partial balanced-budget framework: ${classification.missing
        .map(
          (gap) =>
            `stage ${gap.stage} (${gap.field}) is ${gap.recordState ?? "absent"}`,
        )
        .join(
          "; ",
        )}. No stage classification is derivable, and the stages that were read must not be presented as the whole framework.`,
    });
  }

  const unresolved = records.filter((record) =>
    isTaxInstrumentAuthority(record)
      ? isUnresolved(record.authorization)
      : isUnresolved(record.rule),
  ).length;
  if (records.length >= 20 && unresolved === 0) {
    findings.push({
      severity: "warning",
      code: "fiscal/no-uncertainty",
      message:
        "Every fiscal fact in the corpus resolved to KNOWN. Fiscal authority research finds genuine silence in every state — an enabling chapter that grants nothing, a limit nobody has litigated — so a corpus with no unresolved value may have promoted statuses somewhere.",
    });
  }

  return {
    domain: "state-local-fiscal-authority",
    checked: records.length,
    findings,
  };
}
