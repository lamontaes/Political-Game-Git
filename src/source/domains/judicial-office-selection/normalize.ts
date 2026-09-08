/** 92L transcription into normalized judicial-office source records. */

import {
  SourceValidationError,
  known,
  noRequirementFound,
  notApplicable,
  unknown,
} from "../../core/index";
import type { Evidence, Sourced } from "../../core/index";
import type {
  JudicialPacketIndex,
  JudicialResearchInventory,
  ResearchInitialSelection,
  ResearchOffice,
  ResearchScalar,
} from "./parse";
import { JUDICIAL_OFFICE_FAMILIES, STRUCTURAL_FAMILIES } from "./types";
import type {
  AtomicSelectionMechanism,
  AtomicSelectionPath,
  AtomicSelectionStage,
  JudicialOfficeFamily,
  JudicialOfficeSelectionRecord,
  JudicialRenewalPipeline,
  JudicialSelectionPipeline,
  JudicialStructuralFamily,
  JudicialTenure,
  JudicialVacancyPipeline,
} from "./types";

export const JUDICIAL_RESEARCH_ARTIFACT_ID =
  "92l-national-judicial-selection-tenure-completion";
export const JUDICIAL_RESEARCH_DRIVE_FILE_ID =
  "1zHRVfLrHcQuZnmSwpSKIavwuUEH_vIhs";

const MARKER_UNKNOWN = "UNKNOWN";
const MARKER_NOT_APPLICABLE = "NOT_APPLICABLE";
const MARKER_NO_REQUIREMENT = "NO_REQUIREMENT_FOUND";

function isMarker(value: ResearchScalar, marker: string): boolean {
  return typeof value === "string" && value.trim() === marker;
}

function sourced<T>(
  raw: ResearchScalar,
  evidence: Evidence,
  asOf: string,
  label: string,
  coerce: (value: ResearchScalar) => T,
): Sourced<T> {
  if (isMarker(raw, MARKER_UNKNOWN)) {
    return unknown(`92L leaves ${label} unresolved.`, [evidence]);
  }
  if (isMarker(raw, MARKER_NOT_APPLICABLE)) {
    return notApplicable([evidence], `92L marks ${label} not applicable.`);
  }
  if (isMarker(raw, MARKER_NO_REQUIREMENT)) {
    return noRequirementFound(
      [evidence],
      `92L reports that the authority reviewed for ${label} states no requirement.`,
    );
  }
  return known(coerce(raw), [evidence], "FINAL", asOf);
}

const asString = (value: ResearchScalar): string => String(value);
const asNumber = (value: ResearchScalar): number => {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new SourceValidationError(
      `92L value ${JSON.stringify(value)} is not numeric.`,
    );
  }
  return number;
};
const asBoolean = (value: ResearchScalar): boolean => {
  if (typeof value !== "boolean") {
    throw new SourceValidationError(
      `92L value ${JSON.stringify(value)} is not boolean.`,
    );
  }
  return value;
};

function actorFor(
  mechanism: AtomicSelectionMechanism,
  initial: ResearchInitialSelection,
): ResearchScalar {
  switch (mechanism) {
    case "MERIT_COMMISSION_SHORTLIST":
      return initial.commissionShortlist.commissionName;
    case "EXECUTIVE_NOMINATION":
    case "PARTY_CONVENTION_NOMINATION":
    case "PARTISAN_PRIMARY":
    case "NONPARTISAN_PRIMARY":
    case "LEGISLATIVE_SCREENING":
      return initial.nominationActor;
    case "EXECUTIVE_APPOINTMENT":
    case "JUDICIAL_ASSIGNMENT":
      return initial.appointmentActor;
    case "LEGISLATIVE_CONFIRMATION":
    case "COUNCIL_CONFIRMATION":
      return initial.confirmationActor;
    case "LEGISLATIVE_ELECTION":
      return initial.nominationActor;
    case "PARTISAN_GENERAL_ELECTION":
    case "NONPARTISAN_GENERAL_ELECTION":
    case "MAJORITY_RUNOFF_ELECTION":
    case "RETENTION_ELECTION":
    case "COMMISSION_RETENTION":
    case "LEGISLATIVE_RETENTION":
    case "EXECUTIVE_REAPPOINTMENT":
    case "LEGISLATIVE_REAPPOINTMENT":
    case "LEGISLATIVE_REELECTION":
      return MARKER_UNKNOWN;
  }
}

function stages(
  mechanisms: readonly AtomicSelectionMechanism[],
  initial: ResearchInitialSelection,
  evidence: Evidence,
  asOf: string,
): readonly AtomicSelectionStage[] {
  return mechanisms.map((mechanism, index) => ({
    order: index + 1,
    mechanism,
    actor: sourced(
      actorFor(mechanism, initial),
      evidence,
      asOf,
      `${mechanism} actor`,
      asString,
    ),
  }));
}

function defaultApplicability(evidence: Evidence): Sourced<string> {
  return notApplicable(
    [evidence],
    "The packet reports one selection path, so no branch condition applies.",
  );
}

function branchApplicability(
  office: ResearchOffice,
  pathId: string,
  evidence: Evidence,
  asOf: string,
): Sourced<string> {
  return known(
    `${office.geography.notes}; 92L path: ${pathId}`,
    [evidence],
    "FINAL",
    asOf,
  );
}

function path(
  pathId: string,
  mechanisms: readonly AtomicSelectionMechanism[],
  office: ResearchOffice,
  evidence: Evidence,
  asOf: string,
  branched = false,
): AtomicSelectionPath {
  return {
    pathId,
    applicability: branched
      ? branchApplicability(office, pathId, evidence, asOf)
      : defaultApplicability(evidence),
    stages: stages(mechanisms, office.initialSelection, evidence, asOf),
  };
}

function confirmationMechanism(actor: string): AtomicSelectionMechanism {
  return /council|commission/i.test(actor)
    ? "COUNCIL_CONFIRMATION"
    : "LEGISLATIVE_CONFIRMATION";
}

function withReportedShortlist(
  office: ResearchOffice,
  mechanisms: readonly AtomicSelectionMechanism[],
): readonly AtomicSelectionMechanism[] {
  return office.initialSelection.commissionShortlist.required &&
    !mechanisms.includes("MERIT_COMMISSION_SHORTLIST")
    ? ["MERIT_COMMISSION_SHORTLIST", ...mechanisms]
    : mechanisms;
}

function singleInitialMechanisms(
  office: ResearchOffice,
): readonly AtomicSelectionMechanism[] {
  const method = office.initialSelection.mechanismType;
  const confirmation = confirmationMechanism(
    office.initialSelection.confirmationActor,
  );
  let result: readonly AtomicSelectionMechanism[];

  switch (method) {
    case "executive_appointment_confirmation":
      result = ["EXECUTIVE_NOMINATION", confirmation];
      break;
    case "legislative_confirmation_of_executive_nominee":
      result = ["EXECUTIVE_NOMINATION", "LEGISLATIVE_CONFIRMATION"];
      break;
    case "merit_commission_appointment":
      result = ["MERIT_COMMISSION_SHORTLIST", "EXECUTIVE_APPOINTMENT"];
      break;
    case "merit_commission_appointment_with_senate_confirmation":
    case "merit_commission_appointment_with_legislative_confirmation":
    case "merit_selection_with_legislative_confirmation":
      result = [
        "MERIT_COMMISSION_SHORTLIST",
        "EXECUTIVE_APPOINTMENT",
        "LEGISLATIVE_CONFIRMATION",
      ];
      break;
    case "assisted_appointment_with_retention":
      result = ["MERIT_COMMISSION_SHORTLIST", "EXECUTIVE_APPOINTMENT"];
      if (
        !isMarker(
          office.initialSelection.confirmationActor,
          MARKER_NO_REQUIREMENT,
        )
      ) {
        result = [...result, confirmation];
      }
      break;
    case "assisted_appointment_with_contested_election":
      result = [
        "MERIT_COMMISSION_SHORTLIST",
        "EXECUTIVE_APPOINTMENT",
        "PARTISAN_GENERAL_ELECTION",
      ];
      break;
    case "hybrid_merit_appointment_partisan_election_retention":
      result = [
        "MERIT_COMMISSION_SHORTLIST",
        "EXECUTIVE_APPOINTMENT",
        "PARTISAN_GENERAL_ELECTION",
      ];
      break;
    case "hybrid_party_convention_nomination_nonpartisan_general_ballot":
      result = ["PARTY_CONVENTION_NOMINATION", "NONPARTISAN_GENERAL_ELECTION"];
      break;
    case "gubernatorial_designation_from_elected_trial_bench":
    case "judicial_assignment":
    case "judicial_assignment_from_trial_bench":
      result = ["JUDICIAL_ASSIGNMENT"];
      break;
    case "legislative_election":
      result = ["LEGISLATIVE_SCREENING", "LEGISLATIVE_ELECTION"];
      break;
    case "majority_runoff_election":
      result = ["MAJORITY_RUNOFF_ELECTION"];
      break;
    case "nonpartisan_election":
    case "nonpartisan_election_with_gubernatorial_vacancy_dominance":
      result = ["NONPARTISAN_GENERAL_ELECTION"];
      break;
    case "partisan_election":
      result = ["PARTISAN_GENERAL_ELECTION"];
      break;
    case "partisan_judicial_district_convention_and_general_election":
      result = ["PARTY_CONVENTION_NOMINATION", "PARTISAN_GENERAL_ELECTION"];
      break;
    case "partisan_primary_and_general_election":
    case "partisan_primary_and_general_election_with_cross_filing":
      result = ["PARTISAN_PRIMARY", "PARTISAN_GENERAL_ELECTION"];
      break;
    case "partisan_primary_nonpartisan_general_ballot":
      result = ["PARTISAN_PRIMARY", "NONPARTISAN_GENERAL_ELECTION"];
      break;
    default:
      throw new SourceValidationError(
        `92L selection mechanism type "${method}" has no atomic normalization.`,
      );
  }
  return withReportedShortlist(office, result);
}

function initialPaths(
  office: ResearchOffice,
  evidence: Evidence,
  asOf: string,
): readonly AtomicSelectionPath[] {
  const method = office.initialSelection.mechanismType;
  switch (method) {
    case "county_option_split_merit_and_election":
      return [
        path(
          "merit-appointment",
          ["MERIT_COMMISSION_SHORTLIST", "EXECUTIVE_APPOINTMENT"],
          office,
          evidence,
          asOf,
          true,
        ),
        path(
          "partisan-election",
          ["PARTISAN_GENERAL_ELECTION"],
          office,
          evidence,
          asOf,
          true,
        ),
        path(
          "nonpartisan-election",
          ["NONPARTISAN_GENERAL_ELECTION"],
          office,
          evidence,
          asOf,
          true,
        ),
      ];
    case "district_option_merit_or_partisan":
    case "hybrid_merit_plan_and_partisan_election":
      return [
        path(
          "merit-appointment",
          ["MERIT_COMMISSION_SHORTLIST", "EXECUTIVE_APPOINTMENT"],
          office,
          evidence,
          asOf,
          true,
        ),
        path(
          "partisan-election",
          ["PARTISAN_GENERAL_ELECTION"],
          office,
          evidence,
          asOf,
          true,
        ),
      ];
    case "hybrid_merit_and_nonpartisan_election":
      return [
        path(
          "merit-appointment",
          ["MERIT_COMMISSION_SHORTLIST", "EXECUTIVE_APPOINTMENT"],
          office,
          evidence,
          asOf,
          true,
        ),
        path(
          "nonpartisan-election",
          ["NONPARTISAN_GENERAL_ELECTION"],
          office,
          evidence,
          asOf,
          true,
        ),
      ];
    case "popular_election_partisan_or_nonpartisan_option":
      return [
        path(
          "partisan-election",
          ["PARTISAN_GENERAL_ELECTION"],
          office,
          evidence,
          asOf,
          true,
        ),
        path(
          "nonpartisan-election",
          ["NONPARTISAN_GENERAL_ELECTION"],
          office,
          evidence,
          asOf,
          true,
        ),
      ];
    default:
      return [
        path(
          "default",
          singleInitialMechanisms(office),
          office,
          evidence,
          asOf,
        ),
      ];
  }
}

function initialPipeline(
  office: ResearchOffice,
  evidence: Evidence,
  asOf: string,
): JudicialSelectionPipeline {
  return {
    reportedMechanismType: office.initialSelection.mechanismType,
    paths: initialPaths(office, evidence, asOf),
    reportedWorkflowStages: [...office.initialSelection.workflowStages],
    ballotCharacteristics: {
      partisanElection: office.initialSelection.partisanElection,
      nonpartisanElection: office.initialSelection.nonpartisanElection,
      legislativeElection: office.initialSelection.legislativeElection,
      retentionElection: office.initialSelection.retentionElection,
    },
  };
}

function vacancyPipeline(
  office: ResearchOffice,
  evidence: Evidence,
  asOf: string,
): JudicialVacancyPipeline {
  const vacancy = office.interimVacancy;
  const vacancyInitial: ResearchInitialSelection = {
    ...office.initialSelection,
    nominationActor: vacancy.nominatingActor,
    appointmentActor: vacancy.appointmentActor,
    confirmationActor: vacancy.confirmationActor,
    commissionShortlist: {
      ...office.initialSelection.commissionShortlist,
      required: vacancy.commissionShortlistRequired,
      commissionName: vacancy.commissionName,
    },
  };
  const mechanisms: AtomicSelectionMechanism[] = [];
  if (vacancy.commissionShortlistRequired) {
    mechanisms.push("MERIT_COMMISSION_SHORTLIST");
  }
  const hasConfirmation =
    !isMarker(vacancy.confirmationActor, MARKER_NO_REQUIREMENT) &&
    !isMarker(vacancy.confirmationActor, MARKER_NOT_APPLICABLE) &&
    !isMarker(vacancy.confirmationActor, MARKER_UNKNOWN);
  if (/nomination/i.test(vacancy.description) && hasConfirmation) {
    mechanisms.push("EXECUTIVE_NOMINATION");
  } else if (
    !isMarker(vacancy.appointmentActor, MARKER_NO_REQUIREMENT) &&
    !isMarker(vacancy.appointmentActor, MARKER_NOT_APPLICABLE) &&
    !isMarker(vacancy.appointmentActor, MARKER_UNKNOWN)
  ) {
    mechanisms.push("EXECUTIVE_APPOINTMENT");
  }
  if (hasConfirmation) {
    mechanisms.push(confirmationMechanism(vacancy.confirmationActor));
  }
  if (!isMarker(vacancy.nextElectionTiming, MARKER_NOT_APPLICABLE)) {
    if (office.initialSelection.retentionElection) {
      mechanisms.push("RETENTION_ELECTION");
    } else if (office.initialSelection.partisanElection) {
      mechanisms.push("PARTISAN_GENERAL_ELECTION");
    } else if (office.initialSelection.nonpartisanElection) {
      mechanisms.push("NONPARTISAN_GENERAL_ELECTION");
    }
  }

  return {
    reportedDescription: vacancy.description,
    stages: mechanisms.map((mechanism, index) => ({
      order: index + 1,
      mechanism,
      actor: sourced(
        actorFor(mechanism, vacancyInitial),
        evidence,
        asOf,
        `vacancy ${mechanism} actor`,
        asString,
      ),
    })),
    selfSuccessionPermitted: known(
      vacancy.selfSuccessionPermitted,
      [evidence],
      "FINAL",
      asOf,
    ),
    interimTenureDuration: sourced(
      vacancy.interimTenureDuration,
      evidence,
      asOf,
      "interim tenure duration",
      asString,
    ),
    nextElectionTiming: sourced(
      vacancy.nextElectionTiming,
      evidence,
      asOf,
      "next election timing",
      asString,
    ),
    reportedWorkflowStages: [...vacancy.workflowStages],
  };
}

function renewalMechanisms(office: ResearchOffice): readonly {
  readonly pathId: string;
  readonly mechanisms: readonly AtomicSelectionMechanism[];
}[] {
  const renewal = office.tenure.renewalMechanism;
  switch (renewal) {
    case "no_popular_election":
      return [];
    case "retention":
      return [{ pathId: "default", mechanisms: ["RETENTION_ELECTION"] }];
    case "commission_retention":
      return [{ pathId: "default", mechanisms: ["COMMISSION_RETENTION"] }];
    case "legislative_retention":
      return [{ pathId: "default", mechanisms: ["LEGISLATIVE_RETENTION"] }];
    case "partisan_reelection":
      return [{ pathId: "default", mechanisms: ["PARTISAN_GENERAL_ELECTION"] }];
    case "nonpartisan_reelection":
      return [
        { pathId: "default", mechanisms: ["NONPARTISAN_GENERAL_ELECTION"] },
      ];
    case "popular_reelection":
      return [{ pathId: "default", mechanisms: ["MAJORITY_RUNOFF_ELECTION"] }];
    case "contested_election":
      return [
        {
          pathId: "default",
          mechanisms: [
            office.initialSelection.partisanElection
              ? "PARTISAN_GENERAL_ELECTION"
              : "NONPARTISAN_GENERAL_ELECTION",
          ],
        },
      ];
    case "legislative_reelection":
      return [{ pathId: "default", mechanisms: ["LEGISLATIVE_REELECTION"] }];
    case "legislative_reappointment":
      return [{ pathId: "default", mechanisms: ["LEGISLATIVE_REAPPOINTMENT"] }];
    case "gubernatorial_reappointment":
    case "reappointment_with_tenure":
      return [
        {
          pathId: "default",
          mechanisms: [
            "EXECUTIVE_REAPPOINTMENT",
            confirmationMechanism(
              String(office.tenure.renewalConfirmationActor),
            ),
          ],
        },
      ];
    case "gubernatorial_reappointment_via_commission":
      return [
        {
          pathId: "default",
          mechanisms: [
            "MERIT_COMMISSION_SHORTLIST",
            "EXECUTIVE_REAPPOINTMENT",
            confirmationMechanism(
              String(office.tenure.renewalConfirmationActor),
            ),
          ],
        },
      ];
    case "gubernatorial_redesignation":
    case "assigned_panels":
      return [{ pathId: "default", mechanisms: ["JUDICIAL_ASSIGNMENT"] }];
    case "nonpartisan_reelection_or_retention_if_unopposed":
      return [
        {
          pathId: "contested",
          mechanisms: ["NONPARTISAN_GENERAL_ELECTION"],
        },
        { pathId: "unopposed", mechanisms: ["RETENTION_ELECTION"] },
      ];
    case "retention_in_merit_counties_nonpartisan_reelection_in_rural":
      return [
        { pathId: "merit-counties", mechanisms: ["RETENTION_ELECTION"] },
        {
          pathId: "elective-counties",
          mechanisms: ["NONPARTISAN_GENERAL_ELECTION"],
        },
      ];
    case "retention_in_plan_circuits_partisan_in_rural":
      return [
        { pathId: "plan-circuits", mechanisms: ["RETENTION_ELECTION"] },
        {
          pathId: "elective-circuits",
          mechanisms: ["PARTISAN_GENERAL_ELECTION"],
        },
      ];
    case "varies_by_county":
    case "varies_by_district":
      return [];
    default:
      throw new SourceValidationError(
        `92L renewal mechanism "${renewal}" has no atomic normalization.`,
      );
  }
}

function renewalPipeline(
  office: ResearchOffice,
  evidence: Evidence,
  asOf: string,
): JudicialRenewalPipeline {
  const blueprints = renewalMechanisms(office);
  const branched = blueprints.length > 1;
  return {
    reportedMechanism: office.tenure.renewalMechanism,
    paths: blueprints.map((blueprint) =>
      path(
        blueprint.pathId,
        blueprint.mechanisms,
        office,
        evidence,
        asOf,
        branched,
      ),
    ),
    threshold: sourced(
      office.tenure.retentionThreshold,
      evidence,
      asOf,
      "retention threshold",
      asString,
    ),
    confirmationActor: sourced(
      office.tenure.renewalConfirmationActor,
      evidence,
      asOf,
      "renewal confirmation actor",
      asString,
    ),
  };
}

function tenure(
  office: ResearchOffice,
  evidence: Evidence,
  asOf: string,
): JudicialTenure {
  const kind = office.tenure.goodBehaviorTenure
    ? "GOOD_BEHAVIOR"
    : office.tenure.renewalMechanism === "assigned_panels"
      ? "ASSIGNMENT"
      : "FIXED_TERM";
  return {
    kind,
    termLengthYears: office.tenure.goodBehaviorTenure
      ? notApplicable(
          [evidence],
          "A good-behavior office has no fixed term length.",
        )
      : sourced(
          office.tenure.termLengthYears,
          evidence,
          asOf,
          "term length",
          asNumber,
        ),
  };
}

function evidenceFor(
  artifactId: string,
  jurisdictionId: string,
  officeFamily: string,
  citation: string,
): Evidence {
  return {
    artifactId,
    providerNativeId: JUDICIAL_RESEARCH_DRIVE_FILE_ID,
    locator: {
      kind: "legal-section",
      artifactId,
      citation,
      pageOrSection: `92L §5/${jurisdictionId}/${officeFamily}`,
    },
  };
}

function inactiveRecord(
  office: ResearchOffice,
  structuralFamily: JudicialStructuralFamily,
  officeFamily: JudicialOfficeFamily,
  evidence: Evidence,
  asOf: string,
): JudicialOfficeSelectionRecord {
  const absent = <T>(label: string): Sourced<T> =>
    notApplicable(
      [evidence],
      `92L states that this jurisdiction has no ${officeFamily}; ${label} therefore does not apply.`,
    );
  return {
    recordId: `${office.jurisdictionId}:${officeFamily}`,
    jurisdictionId: office.jurisdictionId,
    jurisdictionName: office.jurisdictionName,
    structuralFamily,
    officeFamily,
    officeExists: known(false, [evidence], "FINAL", asOf),
    courtName: absent("court name"),
    geography: absent("geography"),
    initialSelection: absent("initial selection"),
    interimVacancy: absent("vacancy filling"),
    tenure: absent("tenure"),
    renewal: absent("renewal"),
    mandatoryRetirement: absent("mandatory retirement"),
    qualifications: {
      minimumAge: absent("minimum age"),
      maximumAge: absent("maximum age"),
      stateCitizenshipYears: absent("citizenship duration"),
      stateResidencyYears: absent("residency duration"),
      legalPracticeYears: absent("legal-practice duration"),
      barAdmissionRequirement: absent("bar requirement"),
      qualifiedElector: absent("elector requirement"),
      additionalRequirements: absent("additional requirements"),
    },
    reportedAuthority: {
      constitutionalAuthority: office.provenance.constitutionalAuthority,
      statutoryAuthority: office.provenance.statutoryAuthority,
      courtRulesOrNotes: office.provenance.courtRulesOrNotes,
      researchRetrievalDate: office.provenance.retrievalDate,
      researchEpistemicStatus: "NOT_APPLICABLE",
    },
    researchProvenance: {
      packetId: "92L_NATIONAL_JUDICIAL_SELECTION_TENURE_COMPLETION",
      driveFileId: JUDICIAL_RESEARCH_DRIVE_FILE_ID,
      evidenceTier: "RESEARCH_SYNTHESIS",
      packetStatus: "RETRIEVED_AND_LOCKED",
      primaryAuthorityStatus: "CITATIONS_REPORTED_NOT_RETRIEVED",
      transcriptionStatus: "PACKET_REFERENCED_COMPANION",
    },
    evidence,
  };
}

function activeRecord(
  office: ResearchOffice,
  structuralFamily: JudicialStructuralFamily,
  officeFamily: JudicialOfficeFamily,
  evidence: Evidence,
  asOf: string,
): JudicialOfficeSelectionRecord {
  const epistemic = office.provenance.epistemicStatus;
  if (epistemic !== "KNOWN" && epistemic !== "UNKNOWN") {
    throw new SourceValidationError(
      `${office.jurisdictionId}:${officeFamily} has unsupported epistemic status "${epistemic}".`,
    );
  }
  const wrapKnown = <T>(label: string, value: T): Sourced<T> =>
    epistemic === "KNOWN"
      ? known(value, [evidence], "FINAL", asOf)
      : unknown(`92L leaves ${label} unresolved.`, [evidence]);

  return {
    recordId: `${office.jurisdictionId}:${officeFamily}`,
    jurisdictionId: office.jurisdictionId,
    jurisdictionName: office.jurisdictionName,
    structuralFamily,
    officeFamily,
    officeExists: known(true, [evidence], "FINAL", asOf),
    courtName: wrapKnown("court name", office.courtName),
    geography: wrapKnown("geography", {
      scope: office.geographicScope,
      districtType: office.geography.districtType,
      notes: office.geography.notes,
    }),
    initialSelection: wrapKnown(
      "initial selection",
      initialPipeline(office, evidence, asOf),
    ),
    interimVacancy: wrapKnown(
      "interim vacancy filling",
      vacancyPipeline(office, evidence, asOf),
    ),
    tenure: wrapKnown("tenure", tenure(office, evidence, asOf)),
    renewal: office.tenure.goodBehaviorTenure
      ? notApplicable(
          [evidence],
          "92L reports good-behavior tenure and no renewal mechanism for this office.",
        )
      : wrapKnown("renewal", renewalPipeline(office, evidence, asOf)),
    mandatoryRetirement: wrapKnown("mandatory retirement", {
      established: office.mandatoryRetirement.established,
      age: sourced(
        office.mandatoryRetirement.age,
        evidence,
        asOf,
        "mandatory retirement age",
        asNumber,
      ),
      triggerPoint: sourced(
        office.mandatoryRetirement.triggerPoint,
        evidence,
        asOf,
        "mandatory retirement trigger",
        asString,
      ),
      seniorStatusAvailable: known(
        office.mandatoryRetirement.seniorStatusAvailable,
        [evidence],
        "FINAL",
        asOf,
      ),
    }),
    qualifications: {
      minimumAge: sourced(
        office.qualifications.minimumAge,
        evidence,
        asOf,
        "minimum age",
        asNumber,
      ),
      maximumAge: sourced(
        office.qualifications.maximumAge,
        evidence,
        asOf,
        "maximum age",
        asNumber,
      ),
      stateCitizenshipYears: sourced(
        office.qualifications.stateCitizenshipYears,
        evidence,
        asOf,
        "state citizenship duration",
        asNumber,
      ),
      stateResidencyYears: sourced(
        office.qualifications.stateResidencyYears,
        evidence,
        asOf,
        "state residency duration",
        asNumber,
      ),
      legalPracticeYears: sourced(
        office.qualifications.legalPracticeYears,
        evidence,
        asOf,
        "legal practice duration",
        asNumber,
      ),
      barAdmissionRequirement: sourced(
        office.qualifications.barAdmissionRequirement,
        evidence,
        asOf,
        "bar admission requirement",
        asString,
      ),
      qualifiedElector: sourced(
        office.qualifications.qualifiedElector,
        evidence,
        asOf,
        "qualified-elector requirement",
        asBoolean,
      ),
      additionalRequirements: sourced(
        office.qualifications.additionalRequirements,
        evidence,
        asOf,
        "additional requirements",
        asString,
      ),
    },
    reportedAuthority: {
      constitutionalAuthority: office.provenance.constitutionalAuthority,
      statutoryAuthority: office.provenance.statutoryAuthority,
      courtRulesOrNotes: office.provenance.courtRulesOrNotes,
      researchRetrievalDate: office.provenance.retrievalDate,
      researchEpistemicStatus: epistemic,
    },
    researchProvenance: {
      packetId: "92L_NATIONAL_JUDICIAL_SELECTION_TENURE_COMPLETION",
      driveFileId: JUDICIAL_RESEARCH_DRIVE_FILE_ID,
      evidenceTier: "RESEARCH_SYNTHESIS",
      packetStatus: "RETRIEVED_AND_LOCKED",
      primaryAuthorityStatus: "CITATIONS_REPORTED_NOT_RETRIEVED",
      transcriptionStatus: "PACKET_REFERENCED_COMPANION",
    },
    evidence,
  };
}

export function normalizeJudicialResearch(
  inventory: JudicialResearchInventory,
  packet: JudicialPacketIndex,
  artifactId = JUDICIAL_RESEARCH_ARTIFACT_ID,
): readonly JudicialOfficeSelectionRecord[] {
  if (inventory.metadata.asOfDate !== packet.asOfDate) {
    throw new SourceValidationError(
      `92L packet as-of ${packet.asOfDate} disagrees with transcription ${inventory.metadata.asOfDate}.`,
    );
  }
  if (
    packet.documentId !== "92L_NATIONAL_JUDICIAL_SELECTION_TENURE_COMPLETION"
  ) {
    throw new SourceValidationError(
      `Expected the 92L completion packet; got "${packet.documentId}".`,
    );
  }

  const records: JudicialOfficeSelectionRecord[] = [];
  for (const [jurisdictionKey, jurisdiction] of Object.entries(
    inventory.jurisdictions,
  ).sort(([left], [right]) => left.localeCompare(right))) {
    if (jurisdictionKey !== jurisdiction.jurisdictionId) {
      throw new SourceValidationError(
        `92L jurisdiction key ${jurisdictionKey} disagrees with ${jurisdiction.jurisdictionId}.`,
      );
    }
    const structuralFamily = STRUCTURAL_FAMILIES.find(
      (candidate) => candidate === jurisdiction.structuralFamily,
    );
    if (!structuralFamily) {
      throw new SourceValidationError(
        `${jurisdictionKey} has unknown structural family "${jurisdiction.structuralFamily}".`,
      );
    }
    const profile = packet.profiles.get(jurisdictionKey);
    if (!profile) {
      throw new SourceValidationError(
        `The locked 92L packet has no profile for ${jurisdictionKey}.`,
      );
    }

    for (const [officeKey, office] of Object.entries(
      jurisdiction.officeFamilies,
    ).sort(([left], [right]) => left.localeCompare(right))) {
      const officeFamily = JUDICIAL_OFFICE_FAMILIES.find(
        (candidate) => candidate === officeKey,
      );
      if (!officeFamily || office.officeFamily !== officeKey) {
        throw new SourceValidationError(
          `${jurisdictionKey} has unsupported or inconsistent office family "${officeKey}".`,
        );
      }
      if (
        office.jurisdictionId !== jurisdiction.jurisdictionId ||
        office.jurisdictionName !== jurisdiction.jurisdictionName
      ) {
        throw new SourceValidationError(
          `${jurisdictionKey}:${officeKey} does not bind back to its jurisdiction.`,
        );
      }
      const packetCourtName = office.courtName.replace(
        /\s+\((?:Civil|Criminal) Apex\)$/,
        "",
      );
      if (
        office.courtName !== MARKER_NOT_APPLICABLE &&
        !profile.includes(packetCourtName)
      ) {
        throw new SourceValidationError(
          `${jurisdictionKey}:${officeKey} names "${office.courtName}", which does not appear in that jurisdiction's locked 92L profile.`,
        );
      }
      const citation = [
        office.provenance.constitutionalAuthority,
        office.provenance.statutoryAuthority,
      ]
        .filter((value, index, all) => value && all.indexOf(value) === index)
        .join("; ");
      const evidence = evidenceFor(
        artifactId,
        jurisdictionKey,
        officeFamily,
        citation,
      );
      records.push(
        office.courtName === MARKER_NOT_APPLICABLE
          ? inactiveRecord(
              office,
              structuralFamily,
              officeFamily,
              evidence,
              inventory.metadata.asOfDate,
            )
          : activeRecord(
              office,
              structuralFamily,
              officeFamily,
              evidence,
              inventory.metadata.asOfDate,
            ),
      );
    }
  }

  records.sort((left, right) => left.recordId.localeCompare(right.recordId));
  const ids = new Set<string>();
  for (const record of records) {
    if (ids.has(record.recordId)) {
      throw new SourceValidationError(
        `92L normalizes duplicate record ${record.recordId}.`,
      );
    }
    ids.add(record.recordId);
  }
  return records;
}
