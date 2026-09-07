/**
 * The sixty 92G judicial gameplay kernels as a current-mechanics inventory.
 *
 * Titles come from the supplied seed bank. Status and blockers are this
 * implementation wave's audit against accepted main: the research did not
 * publish a mechanic-status field. Nothing here is a source of legal authority.
 */

import type {
  JudicialDownstreamOmission,
  JudicialKernelBlocker,
  JudicialKernelCategory,
  JudicialKernelDefinition,
  JudicialKernelId,
  JudicialKernelRow,
  JudicialRoleKey,
  JudicialRoleRequirement,
  JudicialRoleRequirementKind,
} from "./judicial-gameplay-kernels";

export const NINETY_TWO_G_RESEARCH_PROVENANCE = {
  workflow: {
    artifact: "92G_JUDICIAL_GAMEPLAY_WORKFLOW_COMPLETION.md",
    driveId: "1Z9YkjtS3nWlF0YL9asCHmhlgIb4HdmkA",
    sizeBytes: 53_020,
    modifiedTime: "2026-09-05T23:24:36.704Z",
  },
  seedBank: {
    artifact: "92G_JUDICIAL_GAMEPLAY_SEED_BANK.md",
    driveId: "1F0aE8h_TS7q2ELJM3Dz9Nry4RXrvLDj5",
    sizeBytes: 127_782,
    modifiedTime: "2026-09-05T23:23:44.469Z",
  },
} as const;

const CASE_DISPOSITION: readonly JudicialKernelBlocker[] = [
  "court-case-record-family",
  "court-motion-proceeding-record-family",
  "judicial-disposition-record-family",
  "effective-jurisdiction-court-rule",
];

const JUDICIAL_SELECTION: readonly JudicialKernelBlocker[] = [
  "judicial-selection-and-tenure-authority",
  "nomination-appointment-confirmation-record-family",
];

const JUDICIAL_CAMPAIGN: readonly JudicialKernelBlocker[] = [
  "judicial-selection-and-tenure-authority",
  "campaign-and-election-gameplay",
];

function row(
  id: JudicialKernelId,
  category: JudicialKernelCategory,
  title: string,
  blockedBy: readonly JudicialKernelBlocker[] = [],
): JudicialKernelRow {
  return {
    id,
    category,
    title,
    status:
      blockedBy.length === 0 ? "COMPILED_CURRENT_MECHANICS" : "MECHANIC_GATED",
    blockedBy,
  };
}

export const JUDICIAL_GAMEPLAY_KERNEL_ROWS: readonly JudicialKernelRow[] = [
  row(
    "SEED-01",
    "routine-judicial-work",
    "High-Volume Morning Arraignment Bail Determination",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-02",
    "routine-judicial-work",
    "Pretrial Motion in Limine on Prior Uncharged Bad Acts (Rule 404(b))",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-03",
    "routine-judicial-work",
    "Discovery Dispute & Motion to Compel Executive Privilege Log (Rule 37)",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-04",
    "routine-judicial-work",
    "Tardy Public Defender & Morning Cattle-Call Docket Congestion",
  ),
  row(
    "SEED-05",
    "routine-judicial-work",
    "Rule 11 Guilty Plea Colloquy with Reluctant Defendant (Alford Posture)",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-06",
    "routine-judicial-work",
    "Batson Challenge During Criminal Jury Selection",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-07",
    "routine-judicial-work",
    "Pro Se Sovereign Citizen Jurisdictional Disruption",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-08",
    "routine-judicial-work",
    "Rule 16 Scheduling Dispute: Lead Counsel Pregnancy vs Expert Costs",
  ),
  row(
    "SEED-09",
    "routine-judicial-work",
    "Summary Judgment Evaluation in Slip-and-Fall Tort (Rule 56)",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-10",
    "routine-judicial-work",
    "Probation Revocation Hearing for Technical Cannabis Violations",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-11",
    "routine-judicial-work",
    "Eviction Hearing: Non-Payment vs Habitability Escrow Defense",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-12",
    "routine-judicial-work",
    "Expert Witness Gatekeeping: Daubert Challenge to Ballistics Striations",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-13",
    "routine-judicial-work",
    "Juvenile Transfer / Certification Hearing to Adult Criminal Court",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-14",
    "routine-judicial-work",
    "Restitution Calculation Dispute in Non-Profit Embezzlement",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-15",
    "routine-judicial-work",
    "Civil Contempt Incarceration vs Inability to Pay Child Support",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-16",
    "routine-judicial-work",
    "Midnight Search Warrant Application (Informant Reliability)",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-17",
    "routine-judicial-work",
    "Emergency Friday Afternoon Ex Parte TRO (Commercial Demolition)",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-18",
    "routine-judicial-work",
    "Ineffective Assistance of Counsel Claim Raised at Sentencing",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-19",
    "routine-judicial-work",
    "Mid-Deliberation Juror Misconduct Note (Internet Research)",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-20",
    "routine-judicial-work",
    "Speedy Trial Clock Tolling Dispute (Psychiatric Evaluation)",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-21",
    "routine-judicial-work",
    "Appellate Sifting: Successive Inmate Pro Se Habeas Petition",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-22",
    "routine-judicial-work",
    "Small Claims Trial: Unlicensed Contractor vs Homeowner",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-23",
    "routine-judicial-work",
    "Default Judgment Application with Suspicious Service of Process",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-24",
    "routine-judicial-work",
    "Rule 11 Sanctions Motion for Frivolous Civil Racketeering Claims",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-25",
    "routine-judicial-work",
    "Discretionary Sentencing in Drug-Induced Homicide (Fentanyl Overdose)",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-26",
    "consequential-decision",
    "Emergency Pre-Election Injunction against Statewide Voter Roll Purge",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-27",
    "consequential-decision",
    "Caperton Motion to Disqualify Based on Independent Campaign Spending",
    [...CASE_DISPOSITION, "recusal-and-case-assignment-procedure"],
  ),
  row(
    "SEED-28",
    "consequential-decision",
    "Suppression of Murder Weapon Under Warrantless Fourth Amendment Search",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-29",
    "consequential-decision",
    "Preliminary Injunction Halting Multi-Billion Dollar Interstate Pipeline",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-30",
    "consequential-decision",
    "Sentencing Corrupt Former State Legislative Speaker",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-31",
    "consequential-decision",
    "Constitutional Injunction on State Reproductive Healthcare Restrictions",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-32",
    "consequential-decision",
    "Comprehensive Protective Gag Order on Celebrity Politician Defendant",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-33",
    "consequential-decision",
    "Prison Overcrowding & Extreme Heat Eighth Amendment Class Action",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-34",
    "consequential-decision",
    "Change of Venue in Small-Town Sensational Double Murder",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-35",
    "consequential-decision",
    "Appellate Panel Split: Modifying Circuit Precedent vs Stare Decisis",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-36",
    "consequential-decision",
    "Municipal Defiance of State Preemption: Firearms Sanctuary Ordinance",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-37",
    "consequential-decision",
    "Emergency Habeas Corpus Review of Executive Administrative Quarantine",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-38",
    "consequential-decision",
    "Emergency Capital Stay Petition: Mental Competency to Be Executed (Ford)",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-39",
    "consequential-decision",
    "Antitrust Injunction: The Rural Hospital Consolidation Merger",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-40",
    "consequential-decision",
    "Legislative Redistricting Gerrymander Under State Free & Equal Elections Clause",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-41",
    "staff-and-relationship",
    "The Leaking Law Clerk and Sensitive Draft Opinion Breach",
  ),
  row(
    "SEED-42",
    "staff-and-relationship",
    "The Impaired Colleague Judge Falling Months Behind on Dockets",
  ),
  row(
    "SEED-43",
    "staff-and-relationship",
    "The Gatekeeping Judicial Assistant Feuding with Local Litigator",
  ),
  row(
    "SEED-44",
    "staff-and-relationship",
    "Former Law Partner Appearing as Lead Counsel within Recusal Window",
    [...CASE_DISPOSITION, "recusal-and-case-assignment-procedure"],
  ),
  row(
    "SEED-45",
    "staff-and-relationship",
    "Chief Judge Pressure on High-Stakes Municipal Budget Lawsuit",
  ),
  row(
    "SEED-46",
    "staff-and-relationship",
    "Prosecutor Withholding Exculpatory Eyewitness Identification (Brady)",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-47",
    "staff-and-relationship",
    "Gross Incompetence of Appointed Defense Counsel Mid-Trial",
    CASE_DISPOSITION,
  ),
  row(
    "SEED-48",
    "staff-and-relationship",
    "Emergency Court Reporter Absence and Record Integrity Crisis",
  ),
  row(
    "SEED-49",
    "staff-and-relationship",
    "Spouse Hosting Political Fundraiser in Shared Marital Home",
  ),
  row(
    "SEED-50",
    "staff-and-relationship",
    "Leaked Bar Association Judicial Evaluation Survey Ratings",
  ),
  row(
    "SEED-51",
    "career-selection-and-retention",
    "Merit Selection Nominating Commission Interview (Missouri Plan)",
    JUDICIAL_SELECTION,
  ),
  row(
    "SEED-52",
    "career-selection-and-retention",
    "Federal Blue-Slip Block by Home-State Opposition Senator",
    JUDICIAL_SELECTION,
  ),
  row(
    "SEED-53",
    "career-selection-and-retention",
    "Partisan Primary Challenge by Wealthy Trial Lawyer (Texas Model)",
    JUDICIAL_CAMPAIGN,
  ),
  row(
    "SEED-54",
    "career-selection-and-retention",
    "Targeted Retention Election Campaign by Single-Issue Advocacy PAC",
    JUDICIAL_CAMPAIGN,
  ),
  row(
    "SEED-55",
    "career-selection-and-retention",
    "Legislative Re-Election Committee Hearing in Virginia General Assembly",
    [...JUDICIAL_SELECTION],
  ),
  row(
    "SEED-56",
    "career-selection-and-retention",
    "Selection for Courthouse Chief Judge by Peer Vote",
    [
      "judicial-selection-and-tenure-authority",
      "court-leadership-office-and-peer-vote",
    ],
  ),
  row(
    "SEED-57",
    "career-selection-and-retention",
    "Gubernatorial Elevation Interview for State Supreme Court Vacancy",
    JUDICIAL_SELECTION,
  ),
  row(
    "SEED-58",
    "career-selection-and-retention",
    "Cross-Endorsement Bargaining in Nonpartisan Judicial Election",
    JUDICIAL_CAMPAIGN,
  ),
  row(
    "SEED-59",
    "career-selection-and-retention",
    "Judicial Conduct Commission Inquiry into Courtroom Demeanor",
  ),
  row(
    "SEED-60",
    "career-selection-and-retention",
    "Retirement Crossroads: Senior Status vs Private Arbitration vs BigLaw",
    [
      "senior-status-pension-and-vacancy-rules",
      "post-judicial-career-consequence-resolution",
    ],
  ),
];

interface DefinitionInput {
  readonly id: JudicialKernelId;
  readonly source: string;
  readonly roles: readonly [
    readonly [JudicialRoleKey, JudicialRoleRequirementKind],
    ...(readonly (readonly [JudicialRoleKey, JudicialRoleRequirementKind])[]),
  ];
  readonly triggerConditions: readonly string[];
  readonly playerDecisionPoints: readonly string[];
  readonly downstreamOmissions: readonly JudicialDownstreamOmission[];
  readonly eventType: `judicial.${string}`;
  readonly evidenceKind: `${string}:${string}`;
  readonly evidenceDescription: string;
  readonly activityTitle: string;
  readonly activitySummary: string;
  readonly activityKind?: "confirmed" | "tentative";
  readonly access?: "office" | "participants";
  readonly counterpartRoleKey: JudicialRoleKey;
  readonly relationshipKind: `${
    | "contact"
    | "work"
    | "experience"
    | "support"
    | "exchange"
    | "conflict"
    | "commitment"
    | "care"
    | "mentorship"
    | "other"}:${string}`;
  readonly relationshipChange:
    "formed" | "strengthened" | "maintained" | "strained" | "ended";
  readonly relationshipSummary: string;
}

function definition(input: DefinitionInput): JudicialKernelDefinition {
  const canonicalRow = JUDICIAL_GAMEPLAY_KERNEL_ROWS.find(
    (candidate) => candidate.id === input.id,
  );
  if (!canonicalRow)
    throw new Error(`Missing judicial kernel row: ${input.id}`);
  const roleRequirements: readonly JudicialRoleRequirement[] = input.roles.map(
    ([roleKey, kind]) => ({ roleKey, kind }),
  );
  const roleKeys = roleRequirements.map((requirement) => requirement.roleKey);
  return {
    row: canonicalRow,
    sourceRefs: [
      `92G_JUDICIAL_GAMEPLAY_SEED_BANK.md#${input.id}`,
      input.source,
    ],
    primitives: [
      "organization",
      "work-relationship",
      "historical-event",
      "evidence-artifact",
      "scheduled-activity",
      "work-item",
      "relationship-interaction",
    ],
    roleRequirements,
    triggerConditions: input.triggerConditions,
    playerDecisionPoints: input.playerDecisionPoints,
    downstreamOmissions: input.downstreamOmissions,
    steps: [
      {
        kind: "historical-event",
        stepKey: "intake",
        eventType: input.eventType,
        visibility: input.access === "participants" ? "private" : "limited",
        roleKeys,
        summary: `${input.id} judicial workflow intake was recorded.`,
        tags: ["judicial.workflow", input.id.toLowerCase()],
      },
      {
        kind: "evidence-artifact",
        stepKey: "record",
        evidenceKind: input.evidenceKind,
        access: input.access === "participants" ? "private" : "restricted",
        relatedEventStepKey: "intake",
        description: input.evidenceDescription,
      },
      {
        kind: "scheduled-activity",
        stepKey: "conference",
        activityKind: input.activityKind ?? "confirmed",
        roleKeys,
        title: input.activityTitle,
        summary: input.activitySummary,
        access: input.access ?? "office",
      },
      {
        kind: "work-item",
        stepKey: "decision",
        title: `${input.id} decision review`,
        summary:
          "Review the supplied record and choose an authorized operational response.",
        assigneeRoleKeys: ["principal"],
        playerRequirement: "decision",
        activityStepKey: "conference",
        access: input.access ?? "office",
      },
      {
        kind: "relationship-interaction",
        stepKey: "relationship",
        counterpartRoleKey: input.counterpartRoleKey,
        eventStepKey: "intake",
        interactionKind: input.relationshipKind,
        change: input.relationshipChange,
        significance: "meaningful",
        summary: input.relationshipSummary,
        tags: ["judicial.relationship", input.id.toLowerCase()],
      },
    ],
  };
}

export const JUDICIAL_GAMEPLAY_KERNEL_DEFINITIONS: readonly JudicialKernelDefinition[] =
  [
    definition({
      id: "SEED-04",
      source:
        "NCSC Model Time Standards for State Courts; Kentucky SCR 1.040; Texas Rules of Judicial Administration Rule 6.",
      roles: [
        ["principal", "court-insider"],
        ["courtroom-deputy", "court-insider"],
        ["public-defender", "external-participant"],
      ],
      triggerConditions: [
        "A scheduled morning call is congested and assigned defense counsel is unavailable.",
      ],
      playerDecisionPoints: [
        "recess",
        "reorder-call",
        "request-substitute-counsel",
        "continue-unattended-matters",
      ],
      downstreamOmissions: [
        "legal-disposition-owned-by-future-court-system",
        "case-transfer-or-docket-result-not-compiled",
      ],
      eventType: "judicial.docket-disruption-reported",
      evidenceKind: "record:docket-call-sheet",
      evidenceDescription:
        "A docket call sheet and deputy report documenting the operational delay.",
      activityTitle: "Morning docket response conference",
      activitySummary:
        "The judge, deputy, and assigned defender address the disrupted court calendar.",
      counterpartRoleKey: "public-defender",
      relationshipKind: "work:docket-coordination",
      relationshipChange: "strained",
      relationshipSummary:
        "The delayed morning call created a consequential coordination episode.",
    }),
    definition({
      id: "SEED-08",
      source:
        "Federal Rule of Civil Procedure 16(b)(4); Florida Rule of General Practice and Judicial Administration 2.570; ABA Resolution 105.",
      roles: [
        ["principal", "court-insider"],
        ["calendar-clerk", "court-insider"],
        ["lead-counsel", "external-participant"],
      ],
      triggerConditions: [
        "A filed continuance request conflicts with an existing trial setting and counsel availability.",
      ],
      playerDecisionPoints: [
        "consider-full-continuance",
        "consider-maintaining-date",
        "consider-bounded-calendar-adjustment",
      ],
      downstreamOmissions: [
        "legal-disposition-owned-by-future-court-system",
        "financial-or-capacity-effect-not-compiled",
      ],
      eventType: "judicial.scheduling-request-received",
      evidenceKind: "record:scheduling-motion",
      evidenceDescription:
        "The continuance request, response, and current scheduling notice.",
      activityTitle: "Scheduling conference",
      activitySummary:
        "The judge and calendar participants review a contested request to move a trial setting.",
      counterpartRoleKey: "lead-counsel",
      relationshipKind: "work:scheduling-conference",
      relationshipChange: "maintained",
      relationshipSummary:
        "Counsel and the court addressed a material calendar conflict.",
    }),
    definition({
      id: "SEED-41",
      source:
        "Guide to Judiciary Policy, Vol. 2A, Ch. 3; ABA Model Code of Judicial Conduct Rule 2.12.",
      roles: [
        ["principal", "court-insider"],
        ["junior-law-clerk", "court-insider"],
        ["chief-judge", "court-insider"],
      ],
      triggerConditions: [
        "A confidential draft was transferred outside approved chambers systems and the access was documented.",
      ],
      playerDecisionPoints: [
        "refer-and-end-work",
        "suspend-pending-investigation",
        "reprimand-retrain-and-reassign",
      ],
      downstreamOmissions: [
        "personnel-discipline-result-not-compiled",
        "judicial-conduct-result-not-compiled",
      ],
      eventType: "judicial.confidentiality-breach-detected",
      evidenceKind: "record:security-audit-log",
      evidenceDescription:
        "A restricted access log documenting the draft transfer from a chambers terminal.",
      activityTitle: "Confidentiality response conference",
      activitySummary:
        "Chambers reviews the documented security breach and the immediate personnel response.",
      access: "participants",
      counterpartRoleKey: "junior-law-clerk",
      relationshipKind: "conflict:confidentiality-breach",
      relationshipChange: "strained",
      relationshipSummary:
        "The confidentiality breach placed the judge-clerk working relationship under material strain.",
    }),
    definition({
      id: "SEED-42",
      source:
        "ABA Model Code of Judicial Conduct Rules 2.14 and 2.15; Kentucky SCR 4.300; Texas Code of Judicial Conduct Canon 3D.",
      roles: [
        ["principal", "court-insider"],
        ["colleague-judge", "court-insider"],
        ["chief-judge", "court-insider"],
      ],
      triggerConditions: [
        "A colleague's delayed work and observed impairment create an immediate chambers responsibility question.",
      ],
      playerDecisionPoints: [
        "report-through-formal-channel",
        "condition-help-on-treatment",
        "seek-formal-leave-and-redistribution",
      ],
      downstreamOmissions: [
        "judicial-conduct-result-not-compiled",
        "case-transfer-or-docket-result-not-compiled",
      ],
      eventType: "judicial.colleague-impairment-observed",
      evidenceKind: "record:overdue-matter-audit",
      evidenceDescription:
        "A restricted audit documenting overdue judicial work associated with the reported concern.",
      activityTitle: "Peer intervention conference",
      activitySummary:
        "Judicial colleagues address an observed impairment and delayed work through a bounded private conference.",
      access: "participants",
      counterpartRoleKey: "colleague-judge",
      relationshipKind: "support:peer-intervention",
      relationshipChange: "strained",
      relationshipSummary:
        "The impairment concern created a difficult peer intervention episode.",
    }),
    definition({
      id: "SEED-43",
      source:
        "ABA Model Code of Judicial Conduct Rule 2.12; Kentucky SCR 1.050; FJC Chambers Management Handbook.",
      roles: [
        ["principal", "court-insider"],
        ["judicial-assistant", "court-insider"],
        ["complaining-lawyer", "external-participant"],
      ],
      triggerConditions: [
        "A scheduling complaint and calendar audit document disparate administrative treatment.",
      ],
      playerDecisionPoints: [
        "reprimand-and-remove-discretion",
        "end-employment",
        "direct-correction-without-public-admission",
      ],
      downstreamOmissions: [
        "personnel-discipline-result-not-compiled",
        "public-reputation-or-media-effect-not-compiled",
      ],
      eventType: "judicial.scheduling-complaint-received",
      evidenceKind: "record:calendar-audit",
      evidenceDescription:
        "A restricted booking audit and written grievance concerning chambers scheduling access.",
      activityTitle: "Chambers scheduling review",
      activitySummary:
        "The judge reviews the scheduling complaint with the responsible chambers participants.",
      counterpartRoleKey: "judicial-assistant",
      relationshipKind: "conflict:administrative-fairness",
      relationshipChange: "strained",
      relationshipSummary:
        "The documented scheduling disparity strained the supervisory relationship.",
    }),
    definition({
      id: "SEED-45",
      source:
        "ABA Model Code of Judicial Conduct Rules 2.4 and 2.9; Kentucky SCR 1.040.",
      roles: [
        ["principal", "court-insider"],
        ["chief-judge", "court-insider"],
        ["judicial-assistant", "court-insider"],
      ],
      triggerConditions: [
        "A chief judge makes an off-record request connecting a pending matter to court resources.",
      ],
      playerDecisionPoints: [
        "state-boundary-and-document",
        "decline-without-separate-report",
        "report-through-conduct-channel",
      ],
      downstreamOmissions: [
        "legal-disposition-owned-by-future-court-system",
        "judicial-conduct-result-not-compiled",
        "financial-or-capacity-effect-not-compiled",
      ],
      eventType: "judicial.improper-pressure-received",
      evidenceKind: "record:private-chambers-note",
      evidenceDescription:
        "A private contemporaneous record of the chambers communication.",
      activityTitle: "Judicial independence response",
      activitySummary:
        "The judge addresses a private request that links pending work to institutional resources.",
      access: "participants",
      counterpartRoleKey: "chief-judge",
      relationshipKind: "conflict:improper-influence",
      relationshipChange: "strained",
      relationshipSummary:
        "The off-record request materially strained the relationship between the judges.",
    }),
    definition({
      id: "SEED-48",
      source:
        "Kentucky KRS 28.410; Texas Government Code 52.041; NCSC Court Reporting Alternatives and Standards.",
      roles: [
        ["principal", "court-insider"],
        ["court-reporter", "court-insider"],
        ["court-administrator", "court-insider"],
      ],
      triggerConditions: [
        "A scheduled proceeding loses its assigned record-maker and the absence is documented.",
      ],
      playerDecisionPoints: [
        "pause-scheduled-proceeding",
        "consider-reset",
        "request-qualified-substitute",
      ],
      downstreamOmissions: [
        "legal-disposition-owned-by-future-court-system",
        "case-transfer-or-docket-result-not-compiled",
        "financial-or-capacity-effect-not-compiled",
      ],
      eventType: "judicial.recording-capacity-lost",
      evidenceKind: "record:reporter-availability-notice",
      evidenceDescription:
        "A restricted operational notice documenting the reporter emergency and substitute availability.",
      activityTitle: "Record integrity response conference",
      activitySummary:
        "The court addresses the loss of a required record-making participant for a scheduled proceeding.",
      counterpartRoleKey: "court-reporter",
      relationshipKind: "work:record-integrity-response",
      relationshipChange: "maintained",
      relationshipSummary:
        "The emergency required a consequential record-integrity coordination episode.",
    }),
    definition({
      id: "SEED-49",
      source:
        "ABA Model Code of Judicial Conduct Canon 4; ABA Formal Ethics Opinion 98-412; In re Chrzanowski, 465 Mich. 468 (2001).",
      roles: [
        ["principal", "court-insider"],
        ["spouse", "shared-household"],
        ["ethics-advisor", "external-participant"],
      ],
      triggerConditions: [
        "A household political event creates a prospective judicial-ethics question before it occurs.",
      ],
      playerDecisionPoints: [
        "request-venue-change",
        "separate-from-event-and-disclose",
        "seek-formal-advisory-guidance",
      ],
      downstreamOmissions: [
        "judicial-conduct-result-not-compiled",
        "public-reputation-or-media-effect-not-compiled",
      ],
      eventType: "judicial.household-ethics-conflict-raised",
      evidenceKind: "record:event-notice",
      evidenceDescription:
        "A private event notice and request for ethics guidance concerning a shared residence.",
      activityTitle: "Household ethics discussion",
      activitySummary:
        "The judge, spouse, and adviser discuss a prospective event affecting their shared home.",
      activityKind: "tentative",
      access: "participants",
      counterpartRoleKey: "spouse",
      relationshipKind: "conflict:household-boundary",
      relationshipChange: "strained",
      relationshipSummary:
        "The prospective event created a meaningful household boundary disagreement.",
    }),
    definition({
      id: "SEED-50",
      source:
        "NCSC Judicial Performance Evaluation Guidelines; Missouri Rule 10.02; Kentucky Bar Association Judicial Evaluation Protocols.",
      roles: [
        ["principal", "court-insider"],
        ["judicial-assistant", "court-insider"],
        ["bar-liaison", "external-participant"],
      ],
      triggerConditions: [
        "A confidential professional evaluation reaches chambers before publication.",
      ],
      playerDecisionPoints: [
        "internal-practice-review",
        "private-committee-meeting",
        "public-response",
      ],
      downstreamOmissions: ["public-reputation-or-media-effect-not-compiled"],
      eventType: "judicial.professional-feedback-received",
      evidenceKind: "record:confidential-evaluation",
      evidenceDescription:
        "A restricted draft professional evaluation supplied to chambers.",
      activityTitle: "Professional feedback review",
      activitySummary:
        "Chambers reviews documented professional feedback and possible responses.",
      access: "participants",
      counterpartRoleKey: "bar-liaison",
      relationshipKind: "exchange:professional-feedback",
      relationshipChange: "maintained",
      relationshipSummary:
        "The confidential evaluation created a consequential professional-feedback exchange.",
    }),
    definition({
      id: "SEED-59",
      source:
        "Kentucky Constitution 121 and SCR Rule 4; Texas Constitution art. V, 1-a; Virginia Constitution art. VI, 10.",
      roles: [
        ["principal", "court-insider"],
        ["commission-investigator", "external-participant"],
        ["ethics-counsel", "external-participant"],
      ],
      triggerConditions: [
        "A formal conduct inquiry and its supporting record are received with a response required.",
      ],
      playerDecisionPoints: [
        "retain-counsel-and-answer",
        "request-confidential-conference",
        "prepare-personal-response",
      ],
      downstreamOmissions: [
        "judicial-conduct-result-not-compiled",
        "financial-or-capacity-effect-not-compiled",
      ],
      eventType: "judicial.conduct-inquiry-received",
      evidenceKind: "record:conduct-inquiry",
      evidenceDescription:
        "A restricted conduct inquiry and the record attached to it.",
      activityTitle: "Conduct inquiry response conference",
      activitySummary:
        "The judge and response participants review the formal inquiry and next procedural step.",
      access: "participants",
      counterpartRoleKey: "commission-investigator",
      relationshipKind: "contact:formal-inquiry",
      relationshipChange: "formed",
      relationshipSummary:
        "The formal inquiry created a consequential professional contact.",
    }),
  ];
