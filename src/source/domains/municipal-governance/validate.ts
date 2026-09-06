/**
 * Municipal governance corpus validation.
 *
 * These checks are written against the failures this domain can actually have,
 * which are the ones the research warns about: a "strong/weak mayor" scalar
 * standing in for enumerated powers; a mayor and a professional manager
 * collapsed into one actor; consolidation flattened to a boolean; a Census place
 * treated as proof of municipal power; and a fact asserted with no checkable
 * source or effective date.
 */

import type {
  CompiledCorpus,
  Sourced,
  ValidationFinding,
  ValidationReport,
} from "../../core/index";
import { citedArtifactIds } from "../../core/index";
import {
  FORBIDDEN_STRENGTH_KEYS,
  NON_GOVERNMENTAL_IDENTITY_AUTHORITY_TYPES,
} from "./types";
import type {
  CitedSource,
  MunicipalGovernanceRecord,
  PowerRule,
} from "./types";

const SOURCE_STATES = new Set([
  "KNOWN",
  "HISTORICAL",
  "NOT_YET_OPERATIVE",
  "CONFLICTING",
  "NOT_APPLICABLE",
  "NO_REQUIREMENT_FOUND",
  "SUPPRESSED",
  "UNKNOWN",
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function isSourced(value: unknown): value is Sourced<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { state?: unknown }).state === "string" &&
    SOURCE_STATES.has((value as { state: string }).state)
  );
}

/** Visit every sourced leaf in a record, with the path it sits at. */
function forEachSourced(
  node: unknown,
  path: string,
  visit: (value: Sourced<unknown>, path: string) => void,
): void {
  if (isSourced(node)) {
    visit(node, path);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((entry, index) =>
      forEachSourced(entry, `${path}[${index}]`, visit),
    );
    return;
  }
  if (typeof node === "object" && node !== null) {
    for (const [key, entry] of Object.entries(node)) {
      forEachSourced(entry, path ? `${path}.${key}` : key, visit);
    }
  }
}

/** Every object key anywhere in the record, for the forbidden-scalar sweep. */
function forEachKey(node: unknown, visit: (key: string) => void): void {
  if (Array.isArray(node)) {
    node.forEach((entry) => forEachKey(entry, visit));
    return;
  }
  if (typeof node === "object" && node !== null) {
    for (const [key, entry] of Object.entries(node)) {
      visit(key);
      forEachKey(entry, visit);
    }
  }
}

export function validateMunicipalGovernanceCorpus(
  compiled: CompiledCorpus<MunicipalGovernanceRecord>,
): ValidationReport {
  const findings: ValidationFinding[] = [];
  const records = compiled.records;
  let unresolvedLeaves = 0;
  const recordIds = new Set<string>();

  for (const record of records) {
    const id = record.recordId;

    if (recordIds.has(id)) {
      findings.push({
        severity: "error",
        code: "municipal/duplicate-record",
        message: `The corpus contains duplicate municipal record id "${id}".`,
        recordId: id,
      });
    }
    recordIds.add(id);

    // 1. No power collapsed into a dial, and no consolidation boolean.
    forEachKey(record, (key) => {
      if (FORBIDDEN_STRENGTH_KEYS.includes(key)) {
        findings.push({
          severity: "error",
          code: "municipal/forbidden-scalar",
          message: `${id} carries the key "${key}". A municipal power is a sourced row in enumeratedPowers and consolidation is a set of relationships; neither is a scalar or a boolean.`,
          recordId: id,
        });
      }
    });

    // 2. Cited sources are checkable.
    const sourceByKey = new Map<string, CitedSource>();
    for (const source of record.provenance.citedSources) {
      if (sourceByKey.has(source.sourceKey)) {
        findings.push({
          severity: "error",
          code: "municipal/duplicate-source-key",
          message: `${id} declares cited source key "${source.sourceKey}" more than once.`,
          recordId: id,
        });
      }
      sourceByKey.set(source.sourceKey, source);
      if (!/^https?:\/\//.test(source.url)) {
        findings.push({
          severity: "error",
          code: "municipal/no-authority-url",
          message: `${id} cites source "${source.sourceKey}" with no first-party URL.`,
          recordId: id,
        });
      }
      if (!ISO_DATE.test(source.retrievedDate)) {
        findings.push({
          severity: "error",
          code: "municipal/no-retrieval-date",
          message: `${id} cites source "${source.sourceKey}" with retrieval date "${source.retrievedDate}", which is not an ISO date.`,
          recordId: id,
        });
      }
      if (!source.title.trim() || !source.issuingAuthority.trim()) {
        findings.push({
          severity: "error",
          code: "municipal/unnamed-authority",
          message: `${id} cites source "${source.sourceKey}" without a title and issuing authority.`,
          recordId: id,
        });
      }
    }

    // Every evidence edge must resolve inside the pack, including UNKNOWN
    // investigation trails. A dangling citation is not useful provenance.
    forEachSourced(record, "", (value, path) => {
      for (const artifactId of citedArtifactIds(value)) {
        if (!sourceByKey.has(artifactId)) {
          findings.push({
            severity: "error",
            code: "municipal/undeclared-evidence",
            message: `${id} cites undeclared artifact "${artifactId}" at ${path}.`,
            recordId: id,
          });
        }
      }
    });

    // The authority types that identify a place rather than a government.
    const identityOnlyKeys = new Set(
      record.provenance.citedSources
        .filter((source) =>
          NON_GOVERNMENTAL_IDENTITY_AUTHORITY_TYPES.includes(
            source.authorityType,
          ),
        )
        .map((source) => source.sourceKey),
    );

    // 3. A KNOWN power or legal basis may not rest on a place-identity source.
    const powerAndBasisNodes: [string, unknown][] = [
      ["legalBasis", record.legalBasis],
      ["enumeratedPowers", record.enumeratedPowers],
    ];
    for (const [label, node] of powerAndBasisNodes) {
      forEachSourced(node, label, (value, path) => {
        if (value.state !== "KNOWN") return;
        for (const artifactId of citedArtifactIds(value)) {
          if (identityOnlyKeys.has(artifactId)) {
            findings.push({
              severity: "error",
              code: "municipal/place-as-power",
              message: `${id} rests the KNOWN fact at ${path} on "${artifactId}", a place/statistical-unit source. A Census place is not proof of municipal power.`,
              recordId: id,
            });
          }
        }
      });
    }

    // 4. Mayor and manager are distinct actors where both exist.
    const mayor = record.administrativeStructure.mayor;
    const manager = record.administrativeStructure.professionalManager;
    if (mayor.state === "KNOWN" && manager.state === "KNOWN") {
      const mayorTitle = (mayor.value as { title?: string }).title ?? "";
      const managerTitle = (manager.value as { title?: string }).title ?? "";
      if (mayorTitle && mayorTitle === managerTitle) {
        findings.push({
          severity: "error",
          code: "municipal/mayor-manager-fused",
          message: `${id} gives the mayor and the professional manager the same title "${mayorTitle}". They are separate actors.`,
          recordId: id,
        });
      }
    }

    // 5. Body size and seat composition must agree when both are known.
    const bodySize = record.electedStructure.bodySize;
    const composition = record.electedStructure.composition;
    if (bodySize.state === "KNOWN" && composition.state === "KNOWN") {
      const apportioned = [
        composition.value.districtSeats,
        composition.value.atLargeSeats,
        composition.value.wardSeats,
      ].reduce<number>((sum, seats) => sum + (seats ?? 0), 0);
      if (apportioned !== bodySize.value) {
        findings.push({
          severity: "error",
          code: "municipal/body-size-mismatch",
          message: `${id} declares body size ${bodySize.value}, but its explicit seat classes total ${apportioned}.`,
          recordId: id,
        });
      }
    }

    // 6. Power rows remain individually addressable and carry coherent vote
    // arithmetic. Repeating a power/actor is valid when the targets differ.
    const powerKeys = new Set<string>();
    for (const power of record.enumeratedPowers) {
      const details = power.details;
      if (details.state !== "KNOWN") continue;
      const rule = details.value as PowerRule;
      const key = `${power.power}|${power.heldByRole}|${rule.target}`;
      if (powerKeys.has(key)) {
        findings.push({
          severity: "error",
          code: "municipal/duplicate-power-row",
          message: `${id} repeats power row ${key}.`,
          recordId: id,
        });
      }
      powerKeys.add(key);

      if (
        power.capability.state === "KNOWN" &&
        power.capability.value !== rule.allowed
      ) {
        findings.push({
          severity: "error",
          code: "municipal/power-rule-conflict",
          message: `${id} says ${power.power}/${power.heldByRole} capability is ${power.capability.value} but its rule says allowed=${rule.allowed}.`,
          recordId: id,
        });
      }

      const threshold = rule.threshold;
      if (!threshold) continue;
      const fractionInvalid =
        !Number.isInteger(threshold.numerator) ||
        !Number.isInteger(threshold.denominator) ||
        threshold.numerator <= 0 ||
        threshold.denominator <= 0 ||
        threshold.numerator > threshold.denominator;
      const fixedInvalid =
        threshold.fixedVotesRequired !== null &&
        (!Number.isInteger(threshold.fixedVotesRequired) ||
          threshold.fixedVotesRequired <= 0);
      const exceedsBody =
        bodySize.state === "KNOWN" &&
        threshold.denominatorBasis === "TOTAL_MEMBERSHIP" &&
        threshold.fixedVotesRequired !== null &&
        threshold.fixedVotesRequired > bodySize.value;
      if (fractionInvalid || fixedInvalid || exceedsBody) {
        findings.push({
          severity: "error",
          code: "municipal/invalid-vote-threshold",
          message: `${id} carries invalid vote arithmetic for ${power.power}/${power.heldByRole}.`,
          recordId: id,
        });
      }
    }

    // A dated transition may keep historical rows, but it must not yield two
    // simultaneous current partisanship answers.
    const currentPartisanship =
      record.electedStructure.partisanshipHistory.filter(
        (entry) => entry.state === "KNOWN",
      );
    if (currentPartisanship.length !== 1) {
      findings.push({
        severity: "error",
        code: "municipal/current-partisanship-cardinality",
        message: `${id} has ${currentPartisanship.length} current partisanship rows; exactly one is required.`,
        recordId: id,
      });
    }

    // 7. Consolidation is expressed as relationships, not just a type.
    const consolidationType = record.consolidation.consolidationType;
    if (
      consolidationType.state === "KNOWN" &&
      consolidationType.value !== "NONE"
    ) {
      const mentionsPredecessors = record.provenance.unresolved.some((note) =>
        /predecessor/i.test(note),
      );
      if (
        record.consolidation.predecessorUnits.length === 0 &&
        !mentionsPredecessors
      ) {
        findings.push({
          severity: "warning",
          code: "municipal/consolidation-without-relationships",
          message: `${id} is a consolidated government but lists no predecessor units and reports no unresolved note about them.`,
          recordId: id,
        });
      }
    }

    const nestedCount = record.consolidation.nestedGovernmentCount;
    if (
      nestedCount.state === "KNOWN" &&
      (!Number.isInteger(nestedCount.value) || nestedCount.value < 0)
    ) {
      findings.push({
        severity: "error",
        code: "municipal/invalid-nested-government-count",
        message: `${id} carries invalid nested-government count ${nestedCount.value}.`,
        recordId: id,
      });
    }

    // 8. Effective dates survive on the load-bearing institutional facts.
    for (const [path, value] of [
      ["legalBasis.effectiveDate", record.legalBasis.effectiveDate],
      [
        "consolidation.consolidationEffectiveDate",
        record.consolidation.consolidationEffectiveDate,
      ],
    ] as [string, Sourced<unknown>][]) {
      if (value.state === "KNOWN" && !ISO_DATE.test(String(value.value))) {
        findings.push({
          severity: "error",
          code: "municipal/malformed-effective-date",
          message: `${id} carries a KNOWN ${path} of "${String(value.value)}", which is not an ISO date.`,
          recordId: id,
        });
      }
    }

    // Budget timing is structured enough to reject impossible authored shapes.
    for (const [path, value] of [
      ["budgetProcedure.fiscalYear", record.budgetProcedure.fiscalYear],
      [
        "budgetProcedure.submissionDeadline",
        record.budgetProcedure.submissionDeadline,
      ],
      [
        "budgetProcedure.adoptionDeadline",
        record.budgetProcedure.adoptionDeadline,
      ],
    ] as const) {
      if (value.state !== "KNOWN") continue;
      const monthDays =
        path === "budgetProcedure.fiscalYear"
          ? [
              (value.value as { beginsMonthDay: string }).beginsMonthDay,
              (value.value as { endsMonthDay: string }).endsMonthDay,
            ]
          : [(value.value as { monthDay: string }).monthDay];
      if (monthDays.some((monthDay) => !MONTH_DAY.test(monthDay))) {
        findings.push({
          severity: "error",
          code: "municipal/malformed-budget-date",
          message: `${id} carries a malformed month-day at ${path}.`,
          recordId: id,
        });
      }
      if (path !== "budgetProcedure.fiscalYear") {
        const days = (
          value.value as { minimumDaysBeforeFiscalYear: number | null }
        ).minimumDaysBeforeFiscalYear;
        if (days !== null && (!Number.isInteger(days) || days < 0)) {
          findings.push({
            severity: "error",
            code: "municipal/invalid-budget-lead-time",
            message: `${id} carries invalid minimum lead time ${days} at ${path}.`,
            recordId: id,
          });
        }
      }
    }

    // Every KNOWN leaf must actually cite something.
    forEachSourced(record, "", (value) => {
      if (value.state !== "KNOWN") unresolvedLeaves += 1;
      if (value.state === "KNOWN" && citedArtifactIds(value).length === 0) {
        findings.push({
          severity: "error",
          code: "municipal/known-without-evidence",
          message: `${id} holds a KNOWN fact that cites no artifact.`,
          recordId: id,
        });
      }
    });
  }

  // 9. Unknowns are expected to remain: a corpus with none has likely promoted
  // something. The research left many local procedural rules genuinely open.
  if (records.length >= 3 && unresolvedLeaves === 0) {
    findings.push({
      severity: "warning",
      code: "municipal/no-uncertainty",
      message:
        "Every fact across the corpus resolved to KNOWN. Local institutional procedure is rarely fully sourced, so this reads as a promoted status somewhere.",
    });
  }

  return {
    domain: "municipal-governance",
    checked: records.length,
    findings,
  };
}
