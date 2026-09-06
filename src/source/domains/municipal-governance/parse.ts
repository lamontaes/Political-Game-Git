/**
 * The authoring layer: a research pack as written, before it becomes records.
 *
 * The research is nested (identity, structure, powers, procedure,
 * consolidation), so unlike the flat qualifications matrix a municipal pack is
 * structured JSON. Every leaf fact is a `Cell` — a small `{status, value,
 * sourceKey, effectiveDate, ...}` object — so the authored form already speaks
 * the value algebra's vocabulary: a fact the research left open is written
 * `UNKNOWN`, not omitted or zeroed.
 *
 * The parser only checks the shape. Turning cells into `Sourced<T>` and
 * building records is `normalize`. Nothing here promotes a status or fills a
 * blank; a malformed pack becomes a named defect, never a quietly dropped one.
 */

import type { ParseDefect } from "../../core/index";
import type { ActorRole, MeetingPlaceKind, PowerKind } from "./types";

/** A research status, in this domain's authoring vocabulary. */
export type CellStatus =
  | "KNOWN"
  | "UNKNOWN"
  | "NOT_APPLICABLE"
  | "NO_REQUIREMENT_FOUND"
  | "HISTORICAL"
  | "NOT_YET_OPERATIVE";

/** One authored fact, in whatever state the research left it. */
export interface Cell {
  readonly status: CellStatus;
  readonly value?: unknown;
  readonly sourceKey?: string;
  readonly legalLocator?: string;
  readonly effectiveDate?: string;
  readonly start?: string;
  readonly end?: string;
  readonly operativeFrom?: string;
  readonly reason?: string;
  readonly investigatedSourceKeys?: readonly string[];
}

export interface CitedSourceInput {
  readonly sourceKey: string;
  readonly authorityType: string;
  readonly title: string;
  readonly issuingAuthority: string;
  readonly url: string;
  readonly effectiveDate?: string | null;
  readonly retrievedDate: string;
  readonly retrievable: boolean;
  readonly claimSupported: string;
}

export interface TermInput {
  readonly seatClass: string;
  readonly termYears: Cell;
  readonly termLimit: Cell;
}

export interface PowerInput {
  readonly power: PowerKind;
  readonly heldByRole: ActorRole;
  readonly capability: Cell;
  readonly details?: Cell;
}

export interface PresidingRuleInput {
  readonly rule: Cell;
}

export interface MeetingPlaceInput {
  readonly kind: MeetingPlaceKind;
  readonly location: Cell;
}

export interface PredecessorInput {
  readonly name: string;
  readonly unitKind: string;
  readonly attested: Cell;
}

export interface NestedGovernmentInput {
  readonly name: string;
  readonly governmentClass: string;
  readonly survivesConsolidation: Cell;
}

export interface RetainedOfficeInput {
  readonly office: string;
  readonly retainedBy: Cell;
}

export interface ServiceDistrictInput {
  readonly name: string;
  readonly note: Cell;
}

export interface SpecialDistrictInput {
  readonly name: string;
  readonly districtKind: string;
  readonly separateFromGeneralGovernment: Cell;
}

export interface MunicipalPackInput {
  readonly sourceGovernmentKey: string;
  readonly state: string;
  readonly jurisdictionDisplayName: string;
  readonly censusGovernmentUnitReference: Cell;
  readonly legalBasis: {
    readonly form: Cell;
    readonly basisType: Cell;
    readonly controllingAuthority: Cell;
    readonly effectiveDate: Cell;
  };
  readonly electedStructure: {
    readonly bodyName: Cell;
    readonly executiveSelection: Cell;
    readonly bodySize: Cell;
    readonly composition: Cell;
    readonly presidingOffice: Cell;
    readonly presidingRules: readonly PresidingRuleInput[];
    readonly partisanshipHistory: readonly Cell[];
    readonly electionCalendar: Cell;
    readonly terms: readonly TermInput[];
    readonly vacancyMechanism: Cell;
  };
  readonly administrativeStructure: {
    readonly executiveLegislativeSeparation: Cell;
    readonly mayor: Cell;
    readonly professionalManager: Cell;
    readonly departmentHeadAuthority: Cell;
    readonly reportingRelationships: Cell;
  };
  readonly enumeratedPowers: readonly PowerInput[];
  readonly legislativeProcedure: {
    readonly measureTypes: Cell;
    readonly introductionSponsorship: Cell;
    readonly readings: Cell;
    readonly committeeReferral: Cell;
    readonly publicHearing: Cell;
    readonly quorum: Cell;
    readonly passageThreshold: Cell;
    readonly amendment: Cell;
    readonly mayoralAction: Cell;
    readonly override: Cell;
    readonly effectivePublication: Cell;
  };
  readonly budgetProcedure: {
    readonly fiscalYear: Cell;
    readonly prepares: Cell;
    readonly proposes: Cell;
    readonly amends: Cell;
    readonly adopts: Cell;
    readonly submissionDeadline: Cell;
    readonly adoptionDeadline: Cell;
    readonly balancedBudgetConstraint: Cell;
  };
  readonly consolidation: {
    readonly consolidationType: Cell;
    readonly enablingAuthority: Cell;
    readonly consolidationEffectiveDate: Cell;
    readonly predecessorUnits: readonly PredecessorInput[];
    readonly retainedNestedGovernments: readonly NestedGovernmentInput[];
    readonly retainedCountyEquivalentOffices: readonly RetainedOfficeInput[];
    readonly serviceDistricts: readonly ServiceDistrictInput[];
    readonly separateSchoolOrSpecialDistricts: readonly SpecialDistrictInput[];
    readonly nestedGovernmentCount: Cell;
    readonly parallelGeneralGovernment: Cell;
  };
  readonly meetingPlaces: readonly MeetingPlaceInput[];
  readonly unresolved: readonly string[];
  readonly asOf: string;
  readonly citedSources: readonly CitedSourceInput[];
}

/** The whole fixture payload: a set of packs. */
export interface MunicipalGovernanceArtifacts {
  readonly packs: readonly MunicipalPackInput[];
}

export interface MunicipalParseResult {
  readonly packs: readonly MunicipalPackInput[];
  readonly defects: readonly ParseDefect[];
}

const CELL_STATUSES: readonly CellStatus[] = [
  "KNOWN",
  "UNKNOWN",
  "NOT_APPLICABLE",
  "NO_REQUIREMENT_FOUND",
  "HISTORICAL",
  "NOT_YET_OPERATIVE",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCell(value: unknown): value is Cell {
  return (
    isObject(value) &&
    typeof value.status === "string" &&
    CELL_STATUSES.includes(value.status as CellStatus)
  );
}

/**
 * Validate the shape of the authored packs.
 *
 * This is a structural gate, not a semantic one: it proves the fixture is the
 * shape `normalize` expects, so a missing section or a malformed cell is a named
 * defect at index `i` rather than a `cannot read property of undefined` later.
 */
export function parseMunicipalArtifacts(
  artifacts: MunicipalGovernanceArtifacts,
): MunicipalParseResult {
  const defects: ParseDefect[] = [];
  const packs: MunicipalPackInput[] = [];

  if (!isObject(artifacts) || !Array.isArray(artifacts.packs)) {
    return {
      packs: [],
      defects: [
        {
          kind: "unparsable-record",
          line: 0,
          message: "The municipal artifacts carry no `packs` array.",
        },
      ],
    };
  }

  artifacts.packs.forEach((pack, index) => {
    const line = index + 1;
    const fail = (message: string): void => {
      defects.push({ kind: "unparsable-record", line, message });
    };

    if (!isObject(pack)) {
      fail(`Pack ${line} is not an object.`);
      return;
    }
    if (
      typeof pack.sourceGovernmentKey !== "string" ||
      !pack.sourceGovernmentKey
    ) {
      fail(`Pack ${line} has no sourceGovernmentKey.`);
      return;
    }
    if (!/^[A-Z]{2}$/.test(String(pack.state))) {
      fail(
        `Pack ${line} (${pack.sourceGovernmentKey}) has no two-letter state.`,
      );
      return;
    }
    if (!Array.isArray(pack.citedSources) || pack.citedSources.length === 0) {
      fail(`Pack ${line} (${pack.sourceGovernmentKey}) cites no sources.`);
      return;
    }
    for (const section of [
      "legalBasis",
      "electedStructure",
      "administrativeStructure",
      "legislativeProcedure",
      "budgetProcedure",
      "consolidation",
    ] as const) {
      if (!isObject((pack as Record<string, unknown>)[section])) {
        fail(
          `Pack ${pack.sourceGovernmentKey} is missing section "${section}".`,
        );
        return;
      }
    }
    if (!isCell((pack as unknown as MunicipalPackInput).legalBasis.form)) {
      fail(`Pack ${pack.sourceGovernmentKey} legalBasis.form is not a cell.`);
      return;
    }
    if (
      !Array.isArray((pack as unknown as MunicipalPackInput).enumeratedPowers)
    ) {
      fail(
        `Pack ${pack.sourceGovernmentKey} enumeratedPowers is not an array.`,
      );
      return;
    }
    if (!Array.isArray((pack as unknown as MunicipalPackInput).meetingPlaces)) {
      fail(`Pack ${pack.sourceGovernmentKey} meetingPlaces is not an array.`);
      return;
    }
    const elected = (pack as unknown as MunicipalPackInput).electedStructure;
    if (
      !Array.isArray(elected.presidingRules) ||
      !Array.isArray(elected.partisanshipHistory)
    ) {
      fail(
        `Pack ${pack.sourceGovernmentKey} has no presidingRules or partisanshipHistory array.`,
      );
      return;
    }

    packs.push(pack as unknown as MunicipalPackInput);
  });

  return { packs, defects };
}
