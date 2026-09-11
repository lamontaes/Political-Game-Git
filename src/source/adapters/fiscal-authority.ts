import type {
  PortableFiscalAuthorityRecord,
  PortableFiscalSource,
} from "../../fiscal-authority/query";
import type { FiscalAuthorityRecord } from "../domains/state-local-fiscal-authority";

function sourceFor(record: FiscalAuthorityRecord): PortableFiscalSource {
  const locator = record.evidence.locator;
  return {
    artifactId: record.evidence.artifactId,
    citation: record.citedAuthority.legalLocator,
    url: record.citedAuthority.authorityUrl,
    enactedDate: record.citedAuthority.enactedDate,
    effectiveDate: record.citedAuthority.effectiveDate,
    effectiveDateDerivation: record.citedAuthority.derivationChain,
    effectiveDateEvidenceArtifactIds:
      record.citedAuthority.derivationArtifactIds,
    lastAmendedDate: record.citedAuthority.lastAmendedDate,
    observedDate: record.citedAuthority.observedDate,
    versionApplicability: record.citedAuthority.versionApplicability,
    evidenceLocator:
      locator.kind === "legal-section"
        ? locator.pageOrSection
        : JSON.stringify(locator),
  };
}

function uncertaintyFor(record: FiscalAuthorityRecord): string | null {
  const sourced =
    record.kind === "TAX_INSTRUMENT" ? record.authorization : record.rule;
  if (
    sourced.state === "KNOWN" ||
    sourced.state === "HISTORICAL" ||
    sourced.state === "NOT_YET_OPERATIVE"
  )
    return null;
  if (sourced.state === "UNKNOWN") return sourced.reason;
  return `Source state ${sourced.state} is not current authority.`;
}

function valueFor(
  record: FiscalAuthorityRecord,
): string | number | boolean | null {
  const sourced =
    record.kind === "TAX_INSTRUMENT" ? record.authorization : record.rule;
  return "value" in sourced ? sourced.value : null;
}

function sourceAsOf(record: FiscalAuthorityRecord): string {
  const sourced =
    record.kind === "TAX_INSTRUMENT" ? record.authorization : record.rule;
  return sourced.state === "KNOWN"
    ? record.citedAuthority.observedDate
    : record.citedAuthority.effectiveDate;
}

function periodFor(record: FiscalAuthorityRecord): {
  readonly effectiveFrom: string;
  readonly effectiveThrough: string | null;
} {
  const sourced =
    record.kind === "TAX_INSTRUMENT" ? record.authorization : record.rule;
  if (sourced.state === "HISTORICAL") {
    return {
      effectiveFrom: sourced.period.start,
      effectiveThrough: sourced.period.end,
    };
  }
  if (sourced.state === "NOT_YET_OPERATIVE") {
    return { effectiveFrom: sourced.operativeFrom, effectiveThrough: null };
  }
  return {
    effectiveFrom: record.citedAuthority.effectiveDate,
    effectiveThrough: null,
  };
}

export function adaptFiscalAuthorityRecords(
  records: readonly FiscalAuthorityRecord[],
): readonly PortableFiscalAuthorityRecord[] {
  return records.map((record) => {
    const period = periodFor(record);
    const base = {
      recordId: record.recordId,
      stateUsps: record.stateUsps,
      level: record.level,
      ...period,
      sourceAsOf: sourceAsOf(record),
      source: sourceFor(record),
      constraints: record.constraints ?? [],
      uncertainty: uncertaintyFor(record),
    } as const;
    return record.kind === "TAX_INSTRUMENT"
      ? {
          ...base,
          kind: "TAX_INSTRUMENT" as const,
          instrument: record.instrument,
          authorization: valueFor(record) as string | null,
        }
      : {
          ...base,
          kind: "FISCAL_RULE" as const,
          field: record.field,
          value: valueFor(record),
        };
  });
}
