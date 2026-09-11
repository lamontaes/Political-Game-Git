/**
 * Research declarations into authored packs.
 *
 * One function, and it is deliberately dull: every field the declaration does
 * not carry becomes an UNKNOWN cell whose reason names what was not read. There
 * is no branch anywhere below that supplies a value the declaration omitted,
 * which is the only reason a corpus this wide can be trusted — the width comes
 * from more governments, never from more filled-in fields.
 *
 * The expansion is a pure function of the declarations, so
 * `scripts/source/municipal-governance-fixture.ts` regenerates the committed
 * fixture byte-for-byte from them.
 */

import type {
  Cell,
  MeetingPlaceInput,
  MeetingSeriesInput,
  MunicipalPackInput,
  PowerInput,
  PresidingRuleInput,
  TermInput,
} from "./parse";
import type { MunicipalGovernanceArtifacts } from "./parse";
import type {
  NationalResearchCorpus,
  ResearchGovernment,
} from "./national-research";
import type {
  CompositionValue,
  ManagerValue,
  MayorValue,
  PowerRule,
} from "./types";

/** Nobody established it. The reason travels with the record. */
function no(reason: string): Cell {
  return { status: "UNKNOWN", reason };
}

/** The packet said it, as of the date the packet verified it. */
function yes(
  value: unknown,
  sourceKey: string,
  attestedAsOf: string,
  legalLocator: string,
): Cell {
  return {
    status: "KNOWN",
    value,
    sourceKey,
    effectiveDate: attestedAsOf,
    legalLocator,
  };
}

const NOT_READ =
  "the national municipal institutional pass recorded structure, administration and meeting practice; it did not read this government's charter or code for this rule";

function powerInputs(government: ResearchGovernment): PowerInput[] {
  return government.powers.map((power) => {
    const rule: PowerRule = {
      allowed: power.held,
      target: power.target,
      conditions: [...power.conditions],
      threshold: power.threshold,
      exceptions: [...power.exceptions],
    };
    return {
      power: power.power,
      heldByRole: power.heldByRole,
      capability: yes(
        power.held,
        power.sourceKey,
        government.attestedAsOf,
        `${power.power} held by ${power.heldByRole}`,
      ),
      details: yes(
        rule,
        power.sourceKey,
        government.attestedAsOf,
        `${power.power} rule`,
      ),
    };
  });
}

function termInputs(government: ResearchGovernment): TermInput[] {
  return government.terms.map((term) => ({
    seatClass: term.seatClass,
    termYears:
      term.years === null
        ? no(`${term.seatClass}: the pass did not state a term length.`)
        : yes(
            term.years,
            term.sourceKey,
            government.attestedAsOf,
            `${term.seatClass} term`,
          ),
    termLimit: no(
      `${term.seatClass}: the pass did not read whether a term limit applies.`,
    ),
  }));
}

function seriesInputs(government: ResearchGovernment): MeetingSeriesInput[] {
  return government.meetingSeries.map((series) => ({
    seriesKey: series.seriesKey,
    kind: series.kind,
    bodyName: yes(
      series.bodyName,
      series.sourceKey,
      government.attestedAsOf,
      `${series.seriesKey} body`,
    ),
    cadence:
      series.cadence === null
        ? no(`${series.seriesKey}: the pass named no published cadence.`)
        : yes(
            series.cadence,
            series.sourceKey,
            government.attestedAsOf,
            `${series.seriesKey} cadence`,
          ),
    venue:
      series.venue === null
        ? no(`${series.seriesKey}: the pass named no current venue.`)
        : yes(
            series.venue,
            series.sourceKey,
            government.attestedAsOf,
            `${series.seriesKey} venue`,
          ),
    publicAttendance:
      series.publicAttendance === null
        ? no(
            `${series.seriesKey}: the pass did not state whether the public may attend or speak.`,
          )
        : yes(
            series.publicAttendance,
            series.sourceKey,
            government.attestedAsOf,
            `${series.seriesKey} public participation`,
          ),
  }));
}

function meetingPlaceInputs(
  government: ResearchGovernment,
): MeetingPlaceInput[] {
  return government.meetingPlaces.map((place) => ({
    kind: place.kind,
    location: yes(
      place.location,
      place.sourceKey,
      government.attestedAsOf,
      `${place.kind} location`,
    ),
  }));
}

function presidingRuleInputs(
  government: ResearchGovernment,
): PresidingRuleInput[] {
  return government.mayor === null
    ? []
    : [
        {
          rule: no(
            "the pass established where the mayor sits relative to the body, not how the mayor presides or votes in a given meeting context.",
          ),
        },
      ];
}

/** One declaration into one authored pack. */
export function packForResearchGovernment(
  government: ResearchGovernment,
): MunicipalPackInput {
  const composition = government.body.composition;
  const compositionValue: CompositionValue | null =
    composition === null
      ? null
      : {
          pattern: composition.pattern,
          districtSeats: composition.districtSeats,
          atLargeSeats: composition.atLargeSeats,
          wardSeats: composition.wardSeats,
          note: composition.note,
        };

  const mayorValue: MayorValue | null =
    government.mayor === null
      ? null
      : {
          title: government.mayor.title,
          structuralPosition: government.mayor.structuralPosition,
        };

  const managerValue: ManagerValue | null =
    government.manager === null
      ? null
      : {
          title: government.manager.title,
          appointedByRole: government.manager.appointedByRole,
          removableByRole: government.manager.removableByRole,
          confirmationRequired: government.manager.confirmationRequired,
          removalConditions: [...government.manager.removalConditions],
          statedRole: government.manager.statedRole,
        };

  const consolidation = government.consolidation;

  return {
    sourceGovernmentKey: government.key,
    state: government.state,
    jurisdictionDisplayName: government.displayName,
    censusGovernmentUnitReference: no(
      "no canonical government-unit key has been reconciled for this government; the Census place crosswalk carried beside this record is an identity assertion and is not a government-unit identifier.",
    ),
    legalBasis: {
      form:
        government.form === null
          ? no(
              "No structured government form has been verified from this report.",
            )
          : yes(
              government.form.value,
              government.form.sourceKey,
              government.attestedAsOf,
              "government form",
            ),
      basisType:
        government.form === null
          ? no("No controlling legal basis has been verified from this report.")
          : yes(
              government.form.basisType,
              government.form.sourceKey,
              government.attestedAsOf,
              "legal basis",
            ),
      controllingAuthority:
        government.form === null ||
        government.form.controllingAuthority === null
          ? no(
              `controlling authority: ${NOT_READ}, so the instrument this government rests on is not established here.`,
            )
          : yes(
              government.form.controllingAuthority,
              government.form.sourceKey,
              government.attestedAsOf,
              "controlling authority",
            ),
      effectiveDate:
        government.form === null || government.form.commencementDate === null
          ? no(
              "commencement: the pass verified the form is current; it did not establish when the form took effect.",
            )
          : yes(
              government.form.commencementDate,
              government.form.sourceKey,
              government.attestedAsOf,
              "form commencement",
            ),
    },
    electedStructure: {
      bodyName:
        government.body.name === null
          ? no(
              "The elected body's name has not been normalized from the report.",
            )
          : yes(
              government.body.name,
              government.body.sourceKey,
              government.attestedAsOf,
              "elected body",
            ),
      executiveSelection:
        government.body.executiveSelection === null
          ? no("how the executive reaches office was not stated by the pass.")
          : yes(
              government.body.executiveSelection,
              government.body.sourceKey,
              government.attestedAsOf,
              "executive selection",
            ),
      bodySize:
        government.body.size === null
          ? no("the pass did not state a seat count for this body.")
          : yes(
              government.body.size,
              government.body.sourceKey,
              government.attestedAsOf,
              "body size",
            ),
      composition:
        compositionValue === null
          ? no("the pass did not apportion this body's seats.")
          : yes(
              compositionValue,
              government.body.sourceKey,
              government.attestedAsOf,
              "seat apportionment",
            ),
      presidingOffice:
        government.body.presidingOffice === null
          ? no("who presides over this body was not stated by the pass.")
          : yes(
              government.body.presidingOffice,
              government.body.sourceKey,
              government.attestedAsOf,
              "presiding office",
            ),
      presidingRules: presidingRuleInputs(government),
      partisanshipHistory:
        government.partisanship === null
          ? []
          : [
              yes(
                government.partisanship,
                government.body.sourceKey,
                government.attestedAsOf,
                "ballot partisanship",
              ),
            ],
      electionCalendar: no(
        `election calendar: ${NOT_READ}, so primary and general timing are not established here.`,
      ),
      terms: termInputs(government),
      vacancyMechanism: no(
        `vacancy: ${NOT_READ}, so how a seat is filled between elections is not established here.`,
      ),
    },
    administrativeStructure: {
      executiveLegislativeSeparation:
        government.separation === null
          ? no(
              "the pass did not state how executive and legislative authority relate under this form.",
            )
          : yes(
              government.separation,
              government.body.sourceKey,
              government.attestedAsOf,
              "executive/legislative separation",
            ),
      mayor:
        mayorValue === null
          ? no("this government has no mayor established by the pass.")
          : yes(
              mayorValue,
              government.body.sourceKey,
              government.attestedAsOf,
              "mayor",
            ),
      professionalManager:
        managerValue === null
          ? no(
              "the pass established no professional manager or administrator for this government.",
            )
          : yes(
              managerValue,
              government.body.sourceKey,
              government.attestedAsOf,
              "professional manager",
            ),
      departmentHeadAuthority: no(
        `department heads: ${NOT_READ}, so who appoints and directs them is not established here.`,
      ),
      reportingRelationships: no(`reporting relationships: ${NOT_READ}.`),
    },
    enumeratedPowers: powerInputs(government),
    legislativeProcedure: {
      measureTypes: no(`measure types: ${NOT_READ}.`),
      introductionSponsorship: no(`introduction: ${NOT_READ}.`),
      readings: no(`readings: ${NOT_READ}.`),
      committeeReferral: no(`committee referral: ${NOT_READ}.`),
      publicHearing: no(`public hearing requirement: ${NOT_READ}.`),
      quorum: no(`quorum: ${NOT_READ}.`),
      quorumRule: no(`quorum arithmetic: ${NOT_READ}.`),
      passageThreshold: no(`passage threshold: ${NOT_READ}.`),
      amendment: no(`amendment: ${NOT_READ}.`),
      mayoralAction: no(`mayoral action: ${NOT_READ}.`),
      mayoralActionWindow: no(`mayoral action window: ${NOT_READ}.`),
      override: no(`override: ${NOT_READ}.`),
      effectivePublication: no(`publication and effect: ${NOT_READ}.`),
    },
    budgetProcedure: {
      fiscalYear: no(`fiscal year: ${NOT_READ}.`),
      prepares: no(`budget preparation: ${NOT_READ}.`),
      proposes: no(`budget proposal: ${NOT_READ}.`),
      amends: no(`budget amendment: ${NOT_READ}.`),
      adopts: no(`budget adoption: ${NOT_READ}.`),
      submissionDeadline: no(`budget submission deadline: ${NOT_READ}.`),
      adoptionDeadline: no(`budget adoption deadline: ${NOT_READ}.`),
      balancedBudgetConstraint: no(`balanced budget constraint: ${NOT_READ}.`),
    },
    consolidation: {
      consolidationType:
        consolidation === null
          ? no(
              "the pass did not establish whether this government is consolidated with a county or parish.",
            )
          : yes(
              consolidation.type,
              consolidation.sourceKey,
              government.attestedAsOf,
              "consolidation type",
            ),
      enablingAuthority:
        consolidation === null || consolidation.enablingAuthority === null
          ? no("the instrument authorizing consolidation was not read.")
          : yes(
              consolidation.enablingAuthority,
              consolidation.sourceKey,
              government.attestedAsOf,
              "consolidation authority",
            ),
      consolidationEffectiveDate:
        consolidation === null || consolidation.effectiveDate === null
          ? no("the date consolidation took effect was not established.")
          : yes(
              consolidation.effectiveDate,
              consolidation.sourceKey,
              government.attestedAsOf,
              "consolidation effective date",
            ),
      predecessorUnits: (consolidation?.predecessors ?? []).map((unit) => ({
        name: unit.name,
        unitKind: unit.unitKind,
        attested: yes(
          true,
          consolidation!.sourceKey,
          government.attestedAsOf,
          `predecessor ${unit.name}`,
        ),
      })),
      retainedNestedGovernments: (consolidation?.nested ?? []).map(
        (nested) => ({
          name: nested.name,
          governmentClass: nested.governmentClass,
          survivesConsolidation: yes(
            true,
            consolidation!.sourceKey,
            government.attestedAsOf,
            `nested government ${nested.name}`,
          ),
        }),
      ),
      retainedCountyEquivalentOffices: [],
      serviceDistricts: [],
      separateSchoolOrSpecialDistricts: [],
      nestedGovernmentCount: no(
        "the pass did not count the governments nested inside this one.",
      ),
      parallelGeneralGovernment:
        consolidation === null ||
        consolidation.parallelGeneralGovernment === null
          ? no(
              "whether another general-purpose government covers the same territory was not established.",
            )
          : yes(
              consolidation.parallelGeneralGovernment,
              consolidation.sourceKey,
              government.attestedAsOf,
              "parallel general government",
            ),
    },
    meetingPlaces: meetingPlaceInputs(government),
    meetingSeries: seriesInputs(government),
    researchObservations: (government.observations ?? []).map((entry) =>
      yes(entry.text, entry.sourceKey, government.attestedAsOf, entry.locator),
    ),
    unresolved: [
      ...government.unresolved,
      "This record comes from a national institutional research pass over official municipal pages, not from those pages themselves. Its legal procedure was never read and is UNKNOWN throughout.",
    ],
    asOf: government.attestedAsOf,
    citedSources: government.sources.map((source) => ({
      sourceKey: source.key,
      authorityType: source.authorityType,
      title: source.title,
      issuingAuthority: source.issuingAuthority,
      url: source.url,
      effectiveDate: null,
      retrievedDate: government.attestedAsOf,
      retrievable: false,
      claimSupported: source.claimSupported,
    })),
  };
}

/** The whole declared corpus as fixture artifacts, in declaration order. */
export function packsForResearchCorpus(
  corpus: NationalResearchCorpus,
): MunicipalGovernanceArtifacts {
  return {
    packs: corpus.governments.map((government) =>
      packForResearchGovernment(government),
    ),
  };
}
