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
 * **Observation promoted to authority.** Admission requires a recognized legal
 * artifact kind, stable identity, and first-party legal lineage. It never
 * depends on a list of publisher names or filenames that an observational
 * source can evade by being renamed.
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
import type {
  FiscalAuthorityRecord,
  FiscalLegalArtifactKind,
  FiscalLevel,
  TaxAuthorizationStatus,
} from "./types";
import { classifyBalancedBudget, statesCovered } from "./classify";
import {
  FISCAL_AUTHORITY_LINEAGE,
  FISCAL_LEGAL_ARTIFACT_KINDS,
  FISCAL_RULE_DEPENDENCIES,
} from "./schema";

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

export function validateFiscalAuthorityCorpus(
  compiled: CompiledCorpus<FiscalAuthorityRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;

  for (const record of records) {
    const authority = record.citedAuthority;
    if (
      !FISCAL_LEGAL_ARTIFACT_KINDS.includes(
        authority.artifactKind as FiscalLegalArtifactKind,
      ) ||
      authority.lineage !== FISCAL_AUTHORITY_LINEAGE ||
      !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(authority.artifactId)
    ) {
      findings.push({
        severity: "error",
        code: "fiscal/no-positive-legal-authority",
        message: `${record.recordId} is not bound to a recognized first-party legal artifact kind, lineage, and stable artifact identity. Publisher wording and citation-looking prose are not legal evidence identity.`,
        recordId: record.recordId,
      });
    }

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
        if (value === "NO_ENABLING_AUTHORITY") {
          const scope = record.searchedScope;
          const validScope =
            scope !== null &&
            scope.jurisdictionStateUsps === record.stateUsps &&
            scope.level === record.level &&
            scope.instrument === record.instrument &&
            scope.authorityKinds.length > 0 &&
            scope.authorityKinds.includes(authority.artifactKind) &&
            scope.evidenceArtifactIds.length > 0 &&
            scope.evidenceArtifactIds.includes(authority.artifactId);
          if (validScope) continue;
          findings.push({
            severity: "error",
            code: "fiscal/silence-without-scope",
            message: `${record.recordId} asserts NO_ENABLING_AUTHORITY without a structured searched scope bound to this jurisdiction, level, instrument, legal-artifact family, and evidence identity. Free prose does not prove a search.`,
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

    const instruments = FISCAL_RULE_DEPENDENCIES[record.field];
    if (instruments && record.rule.state === "KNOWN") {
      const authorities = records
        .filter(isTaxInstrumentAuthority)
        .filter(
          (candidate) =>
            candidate.stateUsps === record.stateUsps &&
            candidate.level === record.level &&
            instruments.includes(candidate.instrument),
        );
      const permitted = authorities.some(
        (candidate) =>
          candidate.authorization.state === "KNOWN" &&
          !BARRING.includes(
            candidate.authorization.value as TaxAuthorizationStatus,
          ),
      );
      const barred = authorities.filter(
        (candidate) =>
          candidate.authorization.state === "KNOWN" &&
          BARRING.includes(
            candidate.authorization.value as TaxAuthorizationStatus,
          ),
      );
      if (!permitted && barred.length > 0) {
        findings.push({
          severity: "error",
          code: "fiscal/limit-on-barred-instrument",
          message: `${record.recordId} states a dependent rule for an instrument this corpus says is barred at the same level (${barred.map((entry) => entry.recordId).join(", ")}). Earmarks, referendums, rates, types, and caps cannot remain KNOWN when the authority they presuppose is barred.`,
          recordId: record.recordId,
        });
      } else if (!permitted) {
        findings.push({
          severity: "error",
          code: "fiscal/dependent-rule-without-known-authority",
          message: `${record.recordId} is KNOWN but none of its underlying tax-authority alternatives (${instruments.join(", ")}) is KNOWN and permissive at the same jurisdiction level.`,
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
  const localSalesByLevel = new Map<FiscalLevel, Map<string, string>>();
  for (const record of records) {
    if (!isTaxInstrumentAuthority(record)) continue;
    if (record.level === "STATE") continue;
    if (record.instrument !== "GENERAL_SALES_TAX") continue;
    if (record.authorization.state !== "KNOWN") continue;
    const byState = localSalesByLevel.get(record.level) ?? new Map();
    byState.set(record.stateUsps, record.authorization.value);
    localSalesByLevel.set(record.level, byState);
  }
  for (const [level, byState] of localSalesByLevel) {
    const distinctLocalSales = new Set(byState.values());
    if (byState.size >= 5 && distinctLocalSales.size === 1) {
      findings.push({
        severity: "error",
        code: "fiscal/universal-tax-model",
        message: `All ${byState.size} states in this corpus report the same ${level} general sales tax authority (${[...distinctLocalSales][0]}). Variation at another local level cannot mask a universal rule at this one.`,
      });
    }
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
