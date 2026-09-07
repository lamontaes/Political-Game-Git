/**
 * Packs into records.
 *
 * Each authored `Cell` becomes a `Sourced<T>` through `readCell`, which is the
 * single place the authoring vocabulary meets the value algebra. Nothing is
 * promoted: a KNOWN cell with no effective date cannot be placed in time and so
 * becomes UNKNOWN, exactly as the qualifications domain treats an undated rule;
 * an UNKNOWN cell stays UNKNOWN and carries no value key.
 *
 * The evidence a KNOWN cell carries points at one of the pack's cited sources by
 * key, so a fact can never claim an authority the pack did not list.
 */

import {
  SourceValidationError,
  historical,
  known,
  noRequirementFound,
  notApplicable,
  notYetOperative,
  unknown,
} from "../../core/index";
import type { Evidence, ParseDefect, Sourced } from "../../core/index";
import type { Cell, CitedSourceInput, MunicipalPackInput } from "./parse";
import type {
  AdministrativeStructure,
  BudgetDeadlineRule,
  BudgetProcedure,
  CitedSource,
  Consolidation,
  ElectionCalendarRule,
  ElectionPartisanship,
  ElectedStructure,
  EnumeratedPower,
  FiscalYearRule,
  LegalBasis,
  LegislativeProcedure,
  ManagerValue,
  MayorValue,
  MeetingPlace,
  MunicipalGovernanceRecord,
  PowerRule,
  PresidingRule,
  RecordProvenance,
  SourceIdentity,
  TermInfo,
} from "./types";

export interface MunicipalNormalizeResult {
  readonly records: readonly MunicipalGovernanceRecord[];
  readonly defects: readonly ParseDefect[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The cited-source keys a pack declares, for evidence resolution. */
function sourceKeySet(pack: MunicipalPackInput): ReadonlySet<string> {
  return new Set(pack.citedSources.map((source) => source.sourceKey));
}

function evidenceFor(
  sourceKey: string,
  citation: string,
  path: string,
): Evidence {
  return {
    artifactId: sourceKey,
    locator: {
      kind: "legal-section",
      artifactId: sourceKey,
      citation: citation || sourceKey,
      pageOrSection: path,
    },
  };
}

/**
 * One authored cell into a sourced value.
 *
 * `defects` collects the authoring mistakes that must fail a build rather than
 * be silently normalized away: a fact that claims a source the pack never
 * listed, or a KNOWN/NOT_APPLICABLE cell with no source at all.
 */
export function readCell<T>(
  cell: Cell,
  keys: ReadonlySet<string>,
  path: string,
  corpusAsOf: string,
  defects: ParseDefect[],
): Sourced<T> {
  const cite = (): Evidence => {
    if (!cell.sourceKey || !keys.has(cell.sourceKey)) {
      defects.push({
        kind: "unparsable-record",
        line: 0,
        message: `${path}: status ${cell.status} names source "${
          cell.sourceKey ?? ""
        }", which the pack does not cite.`,
      });
      // A synthetic evidence keeps the algebra's invariant while the defect
      // fails the compile; it never reaches a tracked artifact.
      return evidenceFor(cell.sourceKey ?? "__unsourced__", "", path);
    }
    return evidenceFor(cell.sourceKey, cell.legalLocator ?? "", path);
  };

  switch (cell.status) {
    case "KNOWN": {
      if (!cell.effectiveDate || !ISO_DATE.test(cell.effectiveDate)) {
        return unknown<T>(
          `${path}: authored KNOWN but with no ISO effective date, so the fact cannot be placed in time.`,
          [cite()],
        );
      }
      return known<T>(cell.value as T, [cite()], "FINAL", cell.effectiveDate);
    }
    case "HISTORICAL": {
      if (
        !cell.start ||
        !cell.end ||
        !ISO_DATE.test(cell.start) ||
        !ISO_DATE.test(cell.end)
      ) {
        return unknown<T>(
          `${path}: authored HISTORICAL without a well-formed closed interval.`,
          [cite()],
        );
      }
      return historical<T>(
        cell.value as T,
        [cite()],
        cell.start,
        cell.end,
        corpusAsOf,
      );
    }
    case "NOT_YET_OPERATIVE": {
      if (!cell.operativeFrom || !ISO_DATE.test(cell.operativeFrom)) {
        return unknown<T>(
          `${path}: authored NOT_YET_OPERATIVE without an operative-from date.`,
          [cite()],
        );
      }
      return notYetOperative<T>(
        (cell.value as T) ?? null,
        [cite()],
        cell.operativeFrom,
        corpusAsOf,
      );
    }
    case "NOT_APPLICABLE":
      return notApplicable<T>(
        [cite()],
        cell.reason || `${path}: the field is meaningless for this government.`,
      );
    case "NO_REQUIREMENT_FOUND":
      return noRequirementFound<T>(
        [cite()],
        cell.reason || `${path}: the named authority was read and is silent.`,
      );
    case "UNKNOWN":
    default: {
      const investigated = (cell.investigatedSourceKeys ?? [])
        .filter((key) => keys.has(key))
        .map((key) => evidenceFor(key, "", path));
      return unknown<T>(
        cell.reason || `${path}: nobody has established this here.`,
        investigated,
      );
    }
  }
}

function normalizeSources(inputs: readonly CitedSourceInput[]): CitedSource[] {
  return inputs.map((source) => ({
    sourceKey: source.sourceKey,
    authorityType: source.authorityType,
    title: source.title,
    issuingAuthority: source.issuingAuthority,
    url: source.url,
    effectiveDate: source.effectiveDate ?? null,
    retrievedDate: source.retrievedDate,
    retrievable: source.retrievable,
    claimSupported: source.claimSupported,
  }));
}

function normalizePack(
  pack: MunicipalPackInput,
  corpusAsOf: string,
  defects: ParseDefect[],
): MunicipalGovernanceRecord {
  const keys = sourceKeySet(pack);
  const cell = <T>(c: Cell, path: string): Sourced<T> =>
    readCell<T>(
      c,
      keys,
      `${pack.sourceGovernmentKey}/${path}`,
      corpusAsOf,
      defects,
    );

  const sourceIdentity: SourceIdentity = {
    sourceGovernmentKey: pack.sourceGovernmentKey,
    state: pack.state.toUpperCase(),
    jurisdictionDisplayName: pack.jurisdictionDisplayName,
    censusGovernmentUnitReference: cell(
      pack.censusGovernmentUnitReference,
      "sourceIdentity/censusGovernmentUnitReference",
    ),
  };

  const legalBasis: LegalBasis = {
    form: cell(pack.legalBasis.form, "legalBasis/form"),
    basisType: cell(pack.legalBasis.basisType, "legalBasis/basisType"),
    controllingAuthority: cell(
      pack.legalBasis.controllingAuthority,
      "legalBasis/controllingAuthority",
    ),
    effectiveDate: cell(
      pack.legalBasis.effectiveDate,
      "legalBasis/effectiveDate",
    ),
  };

  const terms: TermInfo[] = pack.electedStructure.terms.map((term, index) => ({
    seatClass: term.seatClass,
    termYears: cell(
      term.termYears,
      `electedStructure/terms[${index}]/termYears`,
    ),
    termLimit: cell(
      term.termLimit,
      `electedStructure/terms[${index}]/termLimit`,
    ),
  }));

  const electedStructure: ElectedStructure = {
    bodyName: cell(pack.electedStructure.bodyName, "electedStructure/bodyName"),
    executiveSelection: cell(
      pack.electedStructure.executiveSelection,
      "electedStructure/executiveSelection",
    ),
    bodySize: cell(pack.electedStructure.bodySize, "electedStructure/bodySize"),
    composition: cell(
      pack.electedStructure.composition,
      "electedStructure/composition",
    ),
    presidingOffice: cell(
      pack.electedStructure.presidingOffice,
      "electedStructure/presidingOffice",
    ),
    presidingRules: pack.electedStructure.presidingRules.map((entry, index) =>
      cell<PresidingRule>(
        entry.rule,
        `electedStructure/presidingRules[${index}]`,
      ),
    ),
    partisanshipHistory: pack.electedStructure.partisanshipHistory.map(
      (entry, index) =>
        cell<ElectionPartisanship>(
          entry,
          `electedStructure/partisanshipHistory[${index}]`,
        ),
    ),
    electionCalendar: cell<ElectionCalendarRule>(
      pack.electedStructure.electionCalendar,
      "electedStructure/electionCalendar",
    ),
    terms,
    vacancyMechanism: cell(
      pack.electedStructure.vacancyMechanism,
      "electedStructure/vacancyMechanism",
    ),
  };

  const administrativeStructure: AdministrativeStructure = {
    executiveLegislativeSeparation: cell(
      pack.administrativeStructure.executiveLegislativeSeparation,
      "administrativeStructure/executiveLegislativeSeparation",
    ),
    mayor: cell<MayorValue>(
      pack.administrativeStructure.mayor,
      "administrativeStructure/mayor",
    ),
    professionalManager: cell<ManagerValue>(
      pack.administrativeStructure.professionalManager,
      "administrativeStructure/professionalManager",
    ),
    departmentHeadAuthority: cell(
      pack.administrativeStructure.departmentHeadAuthority,
      "administrativeStructure/departmentHeadAuthority",
    ),
    reportingRelationships: cell(
      pack.administrativeStructure.reportingRelationships,
      "administrativeStructure/reportingRelationships",
    ),
  };

  const enumeratedPowers: EnumeratedPower[] = pack.enumeratedPowers.map(
    (power, index) => ({
      power: power.power,
      heldByRole: power.heldByRole,
      capability: cell<boolean>(
        power.capability,
        `enumeratedPowers[${index}]/${power.power}/${power.heldByRole}/capability`,
      ),
      details: power.details
        ? cell<PowerRule>(
            power.details,
            `enumeratedPowers[${index}]/${power.power}/${power.heldByRole}/details`,
          )
        : unknown<PowerRule>(
            `${pack.sourceGovernmentKey}/enumeratedPowers[${index}]/${power.power}/${power.heldByRole}/details: the cargo did not structure this rule's target, conditions, exceptions, and threshold.`,
          ),
    }),
  );

  const legislativeProcedure: LegislativeProcedure = {
    measureTypes: cell(
      pack.legislativeProcedure.measureTypes,
      "legislativeProcedure/measureTypes",
    ),
    introductionSponsorship: cell(
      pack.legislativeProcedure.introductionSponsorship,
      "legislativeProcedure/introductionSponsorship",
    ),
    readings: cell(
      pack.legislativeProcedure.readings,
      "legislativeProcedure/readings",
    ),
    committeeReferral: cell(
      pack.legislativeProcedure.committeeReferral,
      "legislativeProcedure/committeeReferral",
    ),
    publicHearing: cell(
      pack.legislativeProcedure.publicHearing,
      "legislativeProcedure/publicHearing",
    ),
    quorum: cell(
      pack.legislativeProcedure.quorum,
      "legislativeProcedure/quorum",
    ),
    passageThreshold: cell(
      pack.legislativeProcedure.passageThreshold,
      "legislativeProcedure/passageThreshold",
    ),
    amendment: cell(
      pack.legislativeProcedure.amendment,
      "legislativeProcedure/amendment",
    ),
    mayoralAction: cell(
      pack.legislativeProcedure.mayoralAction,
      "legislativeProcedure/mayoralAction",
    ),
    override: cell(
      pack.legislativeProcedure.override,
      "legislativeProcedure/override",
    ),
    effectivePublication: cell(
      pack.legislativeProcedure.effectivePublication,
      "legislativeProcedure/effectivePublication",
    ),
  };

  const budgetProcedure: BudgetProcedure = {
    fiscalYear: cell<FiscalYearRule>(
      pack.budgetProcedure.fiscalYear,
      "budgetProcedure/fiscalYear",
    ),
    prepares: cell(pack.budgetProcedure.prepares, "budgetProcedure/prepares"),
    proposes: cell(pack.budgetProcedure.proposes, "budgetProcedure/proposes"),
    amends: cell(pack.budgetProcedure.amends, "budgetProcedure/amends"),
    adopts: cell(pack.budgetProcedure.adopts, "budgetProcedure/adopts"),
    submissionDeadline: cell<BudgetDeadlineRule>(
      pack.budgetProcedure.submissionDeadline,
      "budgetProcedure/submissionDeadline",
    ),
    adoptionDeadline: cell<BudgetDeadlineRule>(
      pack.budgetProcedure.adoptionDeadline,
      "budgetProcedure/adoptionDeadline",
    ),
    balancedBudgetConstraint: cell(
      pack.budgetProcedure.balancedBudgetConstraint,
      "budgetProcedure/balancedBudgetConstraint",
    ),
  };

  const consolidation: Consolidation = {
    consolidationType: cell(
      pack.consolidation.consolidationType,
      "consolidation/consolidationType",
    ),
    enablingAuthority: cell(
      pack.consolidation.enablingAuthority,
      "consolidation/enablingAuthority",
    ),
    consolidationEffectiveDate: cell(
      pack.consolidation.consolidationEffectiveDate,
      "consolidation/consolidationEffectiveDate",
    ),
    predecessorUnits: pack.consolidation.predecessorUnits.map(
      (unit, index) => ({
        name: unit.name,
        unitKind: unit.unitKind,
        attested: cell<boolean>(
          unit.attested,
          `consolidation/predecessorUnits[${index}]/${unit.name}`,
        ),
      }),
    ),
    retainedNestedGovernments: pack.consolidation.retainedNestedGovernments.map(
      (nested, index) => ({
        name: nested.name,
        governmentClass: nested.governmentClass,
        survivesConsolidation: cell<boolean>(
          nested.survivesConsolidation,
          `consolidation/retainedNestedGovernments[${index}]/${nested.name}`,
        ),
      }),
    ),
    retainedCountyEquivalentOffices:
      pack.consolidation.retainedCountyEquivalentOffices.map(
        (office, index) => ({
          office: office.office,
          retainedBy: cell(
            office.retainedBy,
            `consolidation/retainedCountyEquivalentOffices[${index}]/${office.office}`,
          ),
        }),
      ),
    serviceDistricts: pack.consolidation.serviceDistricts.map(
      (district, index) => ({
        name: district.name,
        note: cell(
          district.note,
          `consolidation/serviceDistricts[${index}]/${district.name}`,
        ),
      }),
    ),
    separateSchoolOrSpecialDistricts:
      pack.consolidation.separateSchoolOrSpecialDistricts.map(
        (district, index) => ({
          name: district.name,
          districtKind: district.districtKind,
          separateFromGeneralGovernment: cell<boolean>(
            district.separateFromGeneralGovernment,
            `consolidation/separateSchoolOrSpecialDistricts[${index}]/${district.name}`,
          ),
        }),
      ),
    nestedGovernmentCount: cell(
      pack.consolidation.nestedGovernmentCount,
      "consolidation/nestedGovernmentCount",
    ),
    parallelGeneralGovernment: cell(
      pack.consolidation.parallelGeneralGovernment,
      "consolidation/parallelGeneralGovernment",
    ),
  };

  const meetingPlaces: MeetingPlace[] = pack.meetingPlaces.map(
    (place, index) => ({
      kind: place.kind,
      location: cell(place.location, `meetingPlaces[${index}]/${place.kind}`),
    }),
  );

  const provenance: RecordProvenance = {
    asOf: pack.asOf,
    citedSources: normalizeSources(pack.citedSources),
    unresolved: [...pack.unresolved],
  };

  return {
    recordId: pack.sourceGovernmentKey,
    sourceIdentity,
    legalBasis,
    electedStructure,
    administrativeStructure,
    enumeratedPowers,
    legislativeProcedure,
    budgetProcedure,
    consolidation,
    meetingPlaces,
    provenance,
  };
}

/** Every pack into a record, in a deterministic order. */
export function normalizeMunicipalPacks(
  packs: readonly MunicipalPackInput[],
  corpusAsOf: string,
): MunicipalNormalizeResult {
  const defects: ParseDefect[] = [];
  const records = packs.map((pack) => normalizePack(pack, corpusAsOf, defects));

  records.sort((left, right) =>
    left.recordId < right.recordId
      ? -1
      : left.recordId > right.recordId
        ? 1
        : 0,
  );

  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.recordId)) {
      throw new SourceValidationError(
        `Two municipal packs share the source key "${record.recordId}"; a government's key is its identity.`,
      );
    }
    seen.add(record.recordId);
  }

  return { records, defects };
}
