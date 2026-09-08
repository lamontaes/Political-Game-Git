/** Strict readers for the locked 92L packet and its checked-in transcription. */

import { readFileSync } from "node:fs";
import { SourceParseError } from "../../core/index";

export type ResearchScalar = string | number | boolean;

export interface ResearchInitialSelection {
  readonly mechanismType: string;
  readonly nominationActor: string;
  readonly commissionShortlist: {
    readonly required: boolean;
    readonly commissionName: ResearchScalar;
    readonly shortlistCount: ResearchScalar;
    readonly binding: ResearchScalar;
  };
  readonly appointmentActor: string;
  readonly confirmationActor: string;
  readonly partisanElection: boolean;
  readonly nonpartisanElection: boolean;
  readonly legislativeElection: boolean;
  readonly retentionElection: boolean;
  readonly initialElectionTiming: ResearchScalar;
  readonly workflowStages: readonly string[];
}

export interface ResearchOffice {
  readonly officeFamily: string;
  readonly courtName: string;
  readonly jurisdictionId: string;
  readonly jurisdictionName: string;
  readonly geographicScope: string;
  readonly geography: {
    readonly districtType: string;
    readonly notes: string;
  };
  readonly initialSelection: ResearchInitialSelection;
  readonly interimVacancy: {
    readonly description: string;
    readonly nominatingActor: string;
    readonly commissionShortlistRequired: boolean;
    readonly commissionName: ResearchScalar;
    readonly appointmentActor: string;
    readonly confirmationActor: string;
    readonly selfSuccessionPermitted: boolean;
    readonly interimTenureDuration: ResearchScalar;
    readonly nextElectionTiming: ResearchScalar;
    readonly workflowStages: readonly string[];
  };
  readonly tenure: {
    readonly termLengthYears: ResearchScalar;
    readonly goodBehaviorTenure: boolean;
    readonly renewalMechanism: string;
    readonly retentionThreshold: ResearchScalar;
    readonly renewalConfirmationActor: ResearchScalar;
  };
  readonly mandatoryRetirement: {
    readonly established: boolean;
    readonly age: ResearchScalar;
    readonly triggerPoint: ResearchScalar;
    readonly seniorStatusAvailable: boolean;
  };
  readonly qualifications: {
    readonly minimumAge: ResearchScalar;
    readonly maximumAge: ResearchScalar;
    readonly stateCitizenshipYears: ResearchScalar;
    readonly stateResidencyYears: ResearchScalar;
    readonly legalPracticeYears: ResearchScalar;
    readonly barAdmissionRequirement: ResearchScalar;
    readonly qualifiedElector: ResearchScalar;
    readonly additionalRequirements: ResearchScalar;
  };
  readonly provenance: {
    readonly constitutionalAuthority: string;
    readonly statutoryAuthority: string;
    readonly courtRulesOrNotes: string;
    readonly retrievalDate: string;
    readonly epistemicStatus: string;
  };
}

export interface ResearchJurisdiction {
  readonly jurisdictionId: string;
  readonly jurisdictionName: string;
  readonly structuralFamily: string;
  readonly declaredActiveOfficeFamilies: number;
  readonly officeFamilies: Readonly<Record<string, ResearchOffice>>;
}

export interface JudicialResearchInventory {
  readonly metadata: {
    readonly packet: string;
    readonly asOfDate: string;
    readonly totalJurisdictions: number;
    readonly totalActiveOfficeFamilies: number;
    readonly schemaVersion: string;
    readonly atomicMechanismsEnforced: boolean;
    readonly prohibitedMetricsExcluded: boolean;
  };
  readonly jurisdictions: Readonly<Record<string, ResearchJurisdiction>>;
}

export interface JudicialPacketIndex {
  readonly documentId: string;
  readonly asOfDate: string;
  readonly profiles: ReadonlyMap<string, string>;
}

function objectAt(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SourceParseError(`${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new SourceParseError(`${path} must be a string.`);
  }
  return value;
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new SourceParseError(`${path} must be a boolean.`);
  }
  return value;
}

function numberAt(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SourceParseError(`${path} must be a finite number.`);
  }
  return value;
}

function scalarAt(value: unknown, path: string): ResearchScalar {
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    throw new SourceParseError(`${path} must be a string, number, or boolean.`);
  }
  return value;
}

function stringsAt(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new SourceParseError(`${path} must be an array of strings.`);
  }
  return value as string[];
}

function parseOffice(value: unknown, path: string): ResearchOffice {
  const office = objectAt(value, path);
  const geography = objectAt(
    office.geographic_district_distinctions,
    `${path}.geographic_district_distinctions`,
  );
  const initial = objectAt(
    office.initial_selection,
    `${path}.initial_selection`,
  );
  const shortlist = objectAt(
    initial.commission_shortlist,
    `${path}.initial_selection.commission_shortlist`,
  );
  const vacancy = objectAt(
    office.interim_vacancy_mechanism,
    `${path}.interim_vacancy_mechanism`,
  );
  const tenure = objectAt(
    office.tenure_and_renewal,
    `${path}.tenure_and_renewal`,
  );
  const retirement = objectAt(
    office.mandatory_retirement,
    `${path}.mandatory_retirement`,
  );
  const qualifications = objectAt(
    office.major_qualifications,
    `${path}.major_qualifications`,
  );
  const provenance = objectAt(office.provenance, `${path}.provenance`);

  return {
    officeFamily: stringAt(
      office.court_or_office_family,
      `${path}.court_or_office_family`,
    ),
    courtName: stringAt(office.court_name, `${path}.court_name`),
    jurisdictionId: stringAt(office.jurisdiction_id, `${path}.jurisdiction_id`),
    jurisdictionName: stringAt(
      office.jurisdiction_name,
      `${path}.jurisdiction_name`,
    ),
    geographicScope: stringAt(
      office.geographic_scope,
      `${path}.geographic_scope`,
    ),
    geography: {
      districtType: stringAt(
        geography.district_type,
        `${path}.geographic_district_distinctions.district_type`,
      ),
      notes: stringAt(
        geography.geographic_notes,
        `${path}.geographic_district_distinctions.geographic_notes`,
      ),
    },
    initialSelection: {
      mechanismType: stringAt(
        initial.mechanism_type,
        `${path}.initial_selection.mechanism_type`,
      ),
      nominationActor: stringAt(
        initial.nomination_actor,
        `${path}.initial_selection.nomination_actor`,
      ),
      commissionShortlist: {
        required: booleanAt(
          shortlist.required,
          `${path}.initial_selection.commission_shortlist.required`,
        ),
        commissionName: scalarAt(
          shortlist.commission_name,
          `${path}.initial_selection.commission_shortlist.commission_name`,
        ),
        shortlistCount: scalarAt(
          shortlist.shortlist_count,
          `${path}.initial_selection.commission_shortlist.shortlist_count`,
        ),
        binding: scalarAt(
          shortlist.binding,
          `${path}.initial_selection.commission_shortlist.binding`,
        ),
      },
      appointmentActor: stringAt(
        initial.appointment_actor,
        `${path}.initial_selection.appointment_actor`,
      ),
      confirmationActor: stringAt(
        initial.confirmation_actor,
        `${path}.initial_selection.confirmation_actor`,
      ),
      partisanElection: booleanAt(
        initial.partisan_election,
        `${path}.initial_selection.partisan_election`,
      ),
      nonpartisanElection: booleanAt(
        initial.nonpartisan_election,
        `${path}.initial_selection.nonpartisan_election`,
      ),
      legislativeElection: booleanAt(
        initial.legislative_election,
        `${path}.initial_selection.legislative_election`,
      ),
      retentionElection: booleanAt(
        initial.retention_election,
        `${path}.initial_selection.retention_election`,
      ),
      initialElectionTiming: scalarAt(
        initial.initial_election_timing,
        `${path}.initial_selection.initial_election_timing`,
      ),
      workflowStages: stringsAt(
        initial.selection_pipeline_stages,
        `${path}.initial_selection.selection_pipeline_stages`,
      ),
    },
    interimVacancy: {
      description: stringAt(
        vacancy.mechanism_description,
        `${path}.interim_vacancy_mechanism.mechanism_description`,
      ),
      nominatingActor: stringAt(
        vacancy.nominating_actor,
        `${path}.interim_vacancy_mechanism.nominating_actor`,
      ),
      commissionShortlistRequired: booleanAt(
        vacancy.commission_shortlist_required,
        `${path}.interim_vacancy_mechanism.commission_shortlist_required`,
      ),
      commissionName: scalarAt(
        vacancy.commission_name,
        `${path}.interim_vacancy_mechanism.commission_name`,
      ),
      appointmentActor: stringAt(
        vacancy.appointment_actor,
        `${path}.interim_vacancy_mechanism.appointment_actor`,
      ),
      confirmationActor: stringAt(
        vacancy.confirmation_actor,
        `${path}.interim_vacancy_mechanism.confirmation_actor`,
      ),
      selfSuccessionPermitted: booleanAt(
        vacancy.self_succession_permitted,
        `${path}.interim_vacancy_mechanism.self_succession_permitted`,
      ),
      interimTenureDuration: scalarAt(
        vacancy.interim_tenure_duration,
        `${path}.interim_vacancy_mechanism.interim_tenure_duration`,
      ),
      nextElectionTiming: scalarAt(
        vacancy.next_election_timing,
        `${path}.interim_vacancy_mechanism.next_election_timing`,
      ),
      workflowStages: stringsAt(
        vacancy.vacancy_pipeline_stages,
        `${path}.interim_vacancy_mechanism.vacancy_pipeline_stages`,
      ),
    },
    tenure: {
      termLengthYears: scalarAt(
        tenure.term_length_years,
        `${path}.tenure_and_renewal.term_length_years`,
      ),
      goodBehaviorTenure: booleanAt(
        tenure.good_behavior_tenure,
        `${path}.tenure_and_renewal.good_behavior_tenure`,
      ),
      renewalMechanism: stringAt(
        tenure.reelection_or_reappointment_or_retention_mechanism,
        `${path}.tenure_and_renewal.reelection_or_reappointment_or_retention_mechanism`,
      ),
      retentionThreshold: scalarAt(
        tenure.retention_threshold,
        `${path}.tenure_and_renewal.retention_threshold`,
      ),
      renewalConfirmationActor: scalarAt(
        tenure.renewal_confirmation_actor,
        `${path}.tenure_and_renewal.renewal_confirmation_actor`,
      ),
    },
    mandatoryRetirement: {
      established: booleanAt(
        retirement.established,
        `${path}.mandatory_retirement.established`,
      ),
      age: scalarAt(retirement.age, `${path}.mandatory_retirement.age`),
      triggerPoint: scalarAt(
        retirement.trigger_point,
        `${path}.mandatory_retirement.trigger_point`,
      ),
      seniorStatusAvailable: booleanAt(
        retirement.senior_status_available,
        `${path}.mandatory_retirement.senior_status_available`,
      ),
    },
    qualifications: {
      minimumAge: scalarAt(
        qualifications.minimum_age,
        `${path}.major_qualifications.minimum_age`,
      ),
      maximumAge: scalarAt(
        qualifications.maximum_age,
        `${path}.major_qualifications.maximum_age`,
      ),
      stateCitizenshipYears: scalarAt(
        qualifications.state_citizenship_years,
        `${path}.major_qualifications.state_citizenship_years`,
      ),
      stateResidencyYears: scalarAt(
        qualifications.state_residency_years,
        `${path}.major_qualifications.state_residency_years`,
      ),
      legalPracticeYears: scalarAt(
        qualifications.legal_practice_years,
        `${path}.major_qualifications.legal_practice_years`,
      ),
      barAdmissionRequirement: scalarAt(
        qualifications.bar_admission_requirement,
        `${path}.major_qualifications.bar_admission_requirement`,
      ),
      qualifiedElector: scalarAt(
        qualifications.qualified_elector,
        `${path}.major_qualifications.qualified_elector`,
      ),
      additionalRequirements: scalarAt(
        qualifications.additional_requirements,
        `${path}.major_qualifications.additional_requirements`,
      ),
    },
    provenance: {
      constitutionalAuthority: stringAt(
        provenance.constitutional_authority,
        `${path}.provenance.constitutional_authority`,
      ),
      statutoryAuthority: stringAt(
        provenance.statutory_authority,
        `${path}.provenance.statutory_authority`,
      ),
      courtRulesOrNotes: stringAt(
        provenance.court_rules_or_notes,
        `${path}.provenance.court_rules_or_notes`,
      ),
      retrievalDate: stringAt(
        provenance.retrieval_date,
        `${path}.provenance.retrieval_date`,
      ),
      epistemicStatus: stringAt(
        provenance.epistemic_status,
        `${path}.provenance.epistemic_status`,
      ),
    },
  };
}

export function parseResearchTranscription(
  text: string,
): JudicialResearchInventory {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw new SourceParseError(
      `The 92L research transcription is not JSON: ${(cause as Error).message}`,
    );
  }
  const root = objectAt(parsed, "92L transcription");
  const metadata = objectAt(root.metadata, "92L transcription.metadata");
  const jurisdictionsRaw = objectAt(
    root.jurisdictions,
    "92L transcription.jurisdictions",
  );
  const jurisdictions: Record<string, ResearchJurisdiction> = {};

  for (const [key, value] of Object.entries(jurisdictionsRaw)) {
    const path = `92L transcription.jurisdictions.${key}`;
    const jurisdiction = objectAt(value, path);
    const officesRaw = objectAt(
      jurisdiction.office_families,
      `${path}.office_families`,
    );
    const offices: Record<string, ResearchOffice> = {};
    for (const [officeKey, office] of Object.entries(officesRaw)) {
      offices[officeKey] = parseOffice(
        office,
        `${path}.office_families.${officeKey}`,
      );
    }
    jurisdictions[key] = {
      jurisdictionId: stringAt(
        jurisdiction.jurisdiction_id,
        `${path}.jurisdiction_id`,
      ),
      jurisdictionName: stringAt(
        jurisdiction.jurisdiction_name,
        `${path}.jurisdiction_name`,
      ),
      structuralFamily: stringAt(
        jurisdiction.structural_family,
        `${path}.structural_family`,
      ),
      declaredActiveOfficeFamilies: numberAt(
        jurisdiction.total_office_families,
        `${path}.total_office_families`,
      ),
      officeFamilies: offices,
    };
  }

  return {
    metadata: {
      packet: stringAt(metadata.packet, "92L transcription.metadata.packet"),
      asOfDate: stringAt(
        metadata.as_of_date,
        "92L transcription.metadata.as_of_date",
      ),
      totalJurisdictions: numberAt(
        metadata.total_jurisdictions,
        "92L transcription.metadata.total_jurisdictions",
      ),
      totalActiveOfficeFamilies: numberAt(
        metadata.total_office_families_resolved,
        "92L transcription.metadata.total_office_families_resolved",
      ),
      schemaVersion: stringAt(
        metadata.schema_version,
        "92L transcription.metadata.schema_version",
      ),
      atomicMechanismsEnforced: booleanAt(
        metadata.atomic_mechanisms_enforced,
        "92L transcription.metadata.atomic_mechanisms_enforced",
      ),
      prohibitedMetricsExcluded: booleanAt(
        metadata.prohibited_metrics_excluded,
        "92L transcription.metadata.prohibited_metrics_excluded",
      ),
    },
    jurisdictions,
  };
}

export function readResearchTranscription(): JudicialResearchInventory {
  return parseResearchTranscription(
    readFileSync(
      new URL("./research-transcription.json", import.meta.url),
      "utf-8",
    ),
  );
}

/** Index every jurisdiction profile in the locked Markdown packet. */
export function parseJudicialPacket(markdown: string): JudicialPacketIndex {
  const documentId =
    /- \*\*Document Identifier:\*\* `([^`]+)`/.exec(markdown)?.[1] ?? "";
  const asOfDate =
    /- \*\*As-Of \/ Retrieval Date:\*\* (\d{4}-\d{2}-\d{2})/.exec(
      markdown,
    )?.[1] ?? "";
  if (!documentId || !asOfDate) {
    throw new SourceParseError(
      "The 92L packet does not expose its document identifier and as-of date.",
    );
  }

  const headings = [
    ...markdown.matchAll(/^### 5\.\d+\. .+ \(`(us-[a-z-]+)`\)$/gm),
  ];
  const profiles = new Map<string, string>();
  for (const [index, heading] of headings.entries()) {
    const jurisdictionId = heading[1] as string;
    const start = heading.index as number;
    const next = headings[index + 1];
    const end = next?.index ?? markdown.indexOf("\n## 6.", start);
    if (profiles.has(jurisdictionId)) {
      throw new SourceParseError(
        `The 92L packet defines jurisdiction profile ${jurisdictionId} twice.`,
      );
    }
    profiles.set(
      jurisdictionId,
      markdown.slice(start, end === -1 ? markdown.length : end),
    );
  }
  return { documentId, asOfDate, profiles };
}
