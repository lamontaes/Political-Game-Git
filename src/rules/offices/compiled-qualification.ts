import type { CandidateQualificationRuleSet } from "../../simulation/candidate-qualification";
import type {
  QualificationOfficeFamily,
  QualificationFieldName,
  SourcedQualification,
} from "../../simulation/office-qualification-rules";
import type { StandInQualification } from "../../simulation/office-qualification-profile";
import type { RuleSourceRef } from "../../simulation/legislature-rules";
export interface CompiledQualificationFacts {
  readonly rules: CandidateQualificationRuleSet | null;
  readonly officeFamily: QualificationOfficeFamily | null;
  readonly stateLawRead: boolean;
  readonly compiledRows: readonly SourcedQualification[];
  readonly drawn: Readonly<
    Partial<Record<QualificationFieldName, StandInQualification | null>>
  >;
  readonly drawnSources: Readonly<
    Partial<Record<QualificationFieldName, RuleSourceRef>>
  >;
  readonly settled: Readonly<
    Partial<
      Record<
        QualificationFieldName,
        { readonly value: number; readonly source: RuleSourceRef } | null
      >
    >
  >;
}
type RuleFact<T> =
  | {
      readonly kind: "known";
      readonly value: T;
      readonly source: RuleSourceRef;
    }
  | { readonly kind: "unknown" }
  | { readonly kind: "not-applicable" };
function knownRule<T>(value: T, source: RuleSourceRef): RuleFact<T> {
  return { kind: "known", value, source };
}
function unknownRule(): RuleFact<never> {
  return { kind: "unknown" };
}
function notApplicableRule(): RuleFact<never> {
  return { kind: "not-applicable" };
}
/** The public pack's settled-age fallback around the compiled selector. */
export function officeQualification(facts: CompiledQualificationFacts) {
  const qualification = compiledQualificationForOffice(facts);
  const settled = facts.settled.MINIMUM_AGE;
  return qualification.minimumAge.kind === "unknown" && settled
    ? { ...qualification, minimumAge: knownRule(settled.value, settled.source) }
    : qualification;
}
export function qualificationSourceRef(
  row: SourcedQualification,
): RuleSourceRef {
  return {
    authority:
      row.authorityType.toLowerCase().includes("constitution") ||
      row.citation.toLowerCase().includes("const.")
        ? "constitution"
        : "statute",
    citation: row.citation,
    sourceTitle: row.authorityType || "Retrieved state authority",
    sourceUrl: row.authorityUrl || null,
    retrievedAt: row.sourceRetrievedAt,
    verification: "verified",
    note: null,
  };
}
export function compiledQualificationForOffice(
  facts: CompiledQualificationFacts,
) {
  const rules = facts.rules;
  if (rules) {
    const source = {
      authority:
        rules.minimumAge.state === "KNOWN"
          ? (rules.minimumAge.source.authority ?? ("constitution" as const))
          : ("constitution" as const),
      citation:
        rules.minimumAge.state === "KNOWN"
          ? rules.minimumAge.source.legalLocator
          : "Qualification source unresolved",
      sourceTitle:
        rules.minimumAge.state === "KNOWN"
          ? rules.minimumAge.source.sourceTitle
          : "Qualification source unresolved",
      sourceUrl:
        rules.minimumAge.state === "KNOWN"
          ? rules.minimumAge.source.sourceUrl
          : null,
      retrievedAt:
        rules.minimumAge.state === "KNOWN"
          ? rules.minimumAge.source.retrievedAt
          : null,
      verification:
        rules.minimumAge.state === "KNOWN"
          ? (rules.minimumAge.source.verification ?? ("verified" as const))
          : ("verified" as const),
      note:
        rules.minimumAge.state === "KNOWN"
          ? rules.minimumAge.source.researchLineage
          : null,
    };
    const officeFamilyForTerm = facts.officeFamily;
    const drawnTerm =
      officeFamilyForTerm === null || facts.stateLawRead
        ? null
        : (facts.drawn["TERM_LENGTH"] ?? null);
    return {
      minimumAge:
        rules.minimumAge.state === "KNOWN"
          ? knownRule(rules.minimumAge.value, source)
          : unknownRule(),
      residency:
        rules.stateResidenceYears.state === "KNOWN" &&
        rules.districtResidenceYears.state === "KNOWN"
          ? knownRule(
              [
                rules.stateResidenceYears.value,
                rules.districtResidenceYears.value,
              ],
              source,
            )
          : unknownRule(),
      termYears:
        rules.termYears.state === "KNOWN"
          ? knownRule(rules.termYears.value, source)
          : drawnTerm !== null
            ? knownRule(drawnTerm.value, facts.drawnSources[drawnTerm.field]!)
            : unknownRule(),
      filing: unknownRule(),
    };
  }
  const officeFamily = facts.officeFamily;
  if (officeFamily !== null) {
    const numericRule = (
      row: SourcedQualification | null,
    ): RuleFact<number> => {
      if (row === null) return unknownRule();
      if (row.sourceState === "NO_REQUIREMENT_FOUND") {
        return notApplicableRule();
      }
      if (row.sourceState === "NOT_APPLICABLE") {
        return notApplicableRule();
      }
      if (row.sourceState !== "KNOWN" || typeof row.value !== "number") {
        return unknownRule();
      }
      return knownRule(row.value, qualificationSourceRef(row));
    };
    const textRule = (row: SourcedQualification | null): RuleFact<string> => {
      if (row === null) return unknownRule();
      if (row.sourceState === "NO_REQUIREMENT_FOUND") {
        return notApplicableRule();
      }
      if (row.sourceState === "NOT_APPLICABLE") {
        return notApplicableRule();
      }
      if (row.sourceState !== "KNOWN" || row.value === null) {
        return unknownRule();
      }
      return knownRule(String(row.value), qualificationSourceRef(row));
    };
    if (facts.compiledRows.length > 0) {
      return {
        minimumAge: numericRule(
          facts.compiledRows.find((row) => row.field === "MINIMUM_AGE") ?? null,
        ),
        residency: textRule(
          facts.compiledRows.find((row) => row.field === "STATE_RESIDENCE") ??
            facts.compiledRows.find(
              (row) => row.field === "DISTRICT_RESIDENCE",
            ) ??
            null,
        ),
        termYears: numericRule(
          facts.compiledRows.find((row) => row.field === "TERM_LENGTH") ?? null,
        ),
        filing: unknownRule(),
      };
    }
  }
  if (officeFamily !== null && !facts.stateLawRead) {
    const standIn = (field: QualificationFieldName): RuleFact<number> => {
      const settled = facts.settled[field] ?? null;
      if (settled !== null) return knownRule(settled.value, settled.source);
      const drawn = facts.drawn[field] ?? null;
      if (drawn === null) return unknownRule();
      return knownRule(drawn.value, facts.drawnSources[drawn.field]!);
    };
    const age = standIn("MINIMUM_AGE");
    const stateResidence = facts.drawn["STATE_RESIDENCE"] ?? null;
    if (age.kind === "known" || stateResidence !== null) {
      return {
        minimumAge: age,
        residency:
          stateResidence === null
            ? unknownRule()
            : knownRule(
                [stateResidence.value],
                facts.drawnSources[stateResidence.field]!,
              ),
        termYears: standIn("TERM_LENGTH"),
        filing: unknownRule(),
      };
    }
  }
  return {
    minimumAge: unknownRule(),
    residency: unknownRule(),
    termYears: unknownRule(),
    filing: unknownRule(),
  };
}
