import { normalizeRetrievedText } from "../core/index";
import type { ArtifactLock, OpenedArtifact } from "../core/index";
import {
  CIVIL_SERVICE_LABOR_AS_OF,
  CIVIL_SERVICE_LABOR_SOURCES,
} from "../domains/civil-service-labor/index";
import type {
  PersonnelProcedure,
  PersonnelProcedureKey,
  PersonnelProcedureTerm,
} from "../../simulation/civil-personnel-contract";
import { PERSONNEL_PROCEDURE_KEYS } from "../../simulation/civil-personnel-contract";

interface ProcedureDeclaration {
  readonly key: PersonnelProcedureKey;
  readonly jurisdictionKey: "US-MN" | "US-AK";
  readonly artifactId: string;
  readonly citation: string;
  readonly statement: string;
  readonly excerpts: readonly string[];
  /** Each term names the literal words that fix it inside the excerpts. */
  readonly terms?: Readonly<
    Record<
      string,
      { readonly value: PersonnelProcedureTerm; readonly evidence: string }
    >
  >;
}

const MN = "mn-civil-service-statutes";
const AK = "ak-civil-service-statutes";

/**
 * Reviewed transcriptions of the already-acquired chapters. Only the enacted
 * text the rights scope hands a compiler is searched, so a definition outside
 * the pinned region (Minn. Stat. § 43A.02, for example) cannot be cited here.
 */
const DECLARATIONS: readonly ProcedureDeclaration[] = [
  {
    key: "mn-just-cause",
    jurisdictionKey: "US-MN",
    artifactId: MN,
    citation: "Minn. Stat. § 43A.33, subd. 1",
    statement:
      "A permanent classified employee may be reprimanded, discharged, suspended without pay or demoted only for just cause, after managers and employees attempt informal resolution.",
    excerpts: [
      "Managers and employees shall attempt to resolve disputes through informal means prior to the initiation of disciplinary action.",
      "No permanent employee in the classified service shall be reprimanded, discharged, suspended without pay, or demoted, except for just cause.",
    ],
  },
  {
    key: "mn-just-cause-grounds",
    jurisdictionKey: "US-MN",
    artifactId: MN,
    citation: "Minn. Stat. § 43A.33, subd. 2",
    statement:
      "Just cause includes, without being limited to, the four named grounds; policy violations count only when the policies are applied uniformly and without discrimination.",
    excerpts: [
      "just cause includes, but is not limited to, consistent failure to perform assigned duties, substandard performance, insubordination, and serious violation of written policies and procedures, provided the policies and procedures are applied in a uniform, nondiscriminatory manner.",
    ],
    terms: {
      grounds: {
        value: [
          "consistent-failure-to-perform",
          "substandard-performance",
          "insubordination",
          "serious-policy-violation",
        ],
        evidence:
          "consistent failure to perform assigned duties, substandard performance, insubordination, and serious violation of written policies and procedures",
      },
    },
  },
  {
    key: "mn-agreement-procedures",
    jurisdictionKey: "US-MN",
    artifactId: MN,
    citation: "Minn. Stat. § 43A.33, subd. 3(a)",
    statement:
      "Discipline and discharge procedures for employees covered by a collective bargaining agreement are governed by that agreement.",
    excerpts: [
      "Procedures for discipline and discharge of employees covered by collective bargaining agreements shall be governed by the agreements.",
    ],
  },
  {
    key: "mn-discipline-notice",
    jurisdictionKey: "US-MN",
    artifactId: MN,
    citation: "Minn. Stat. § 43A.33, subd. 3(b)",
    statement:
      "For a discharge, suspension without pay or demotion of a permanent classified employee not covered by an agreement, the appointing authority gives written notice no later than the effective date. The notice states the right to appeal to the Bureau of Mediation Services within 30 calendar days, and the notice and any reply are filed with the commissioner within ten calendar days.",
    excerpts: [
      "For discharge, suspension without pay or demotion, no later than the effective date of such action, a permanent classified employee not covered by a collective bargaining agreement shall be given written notice by the appointing authority.",
      "The notice shall also include a statement that the employee may elect to appeal the action to the Bureau of Mediation Services within 30 calendar days following the effective date of the disciplinary action.",
      "A copy of the notice and the employee's reply, if any, shall be filed by the appointing authority with the commissioner no later than ten calendar days following the effective date of the disciplinary action.",
    ],
    terms: {
      appealWithinCalendarDays: {
        value: 30,
        evidence:
          "within 30 calendar days following the effective date of the disciplinary action",
      },
      commissionerFilingWithinCalendarDays: {
        value: 10,
        evidence:
          "no later than ten calendar days following the effective date of the disciplinary action",
      },
    },
  },
  {
    key: "mn-notice-plan-content",
    jurisdictionKey: "US-MN",
    artifactId: MN,
    citation: "Minn. Stat. § 43A.33, subd. 3(b)",
    statement:
      "The applicable plan's grievance procedure prescribes further notice content and the reply procedure; that plan is not acquired.",
    excerpts: [
      "The content of that notice as well as the employee's right to reply to the appointing authority shall be as prescribed in the grievance procedure contained in the applicable plan established pursuant to section 43A.18 .",
    ],
  },
  {
    key: "mn-commissioner-settlement",
    jurisdictionKey: "US-MN",
    artifactId: MN,
    citation: "Minn. Stat. § 43A.33, subd. 3(b)",
    statement:
      "The commissioner decides whether the appointing authority must settle the dispute before the hearing.",
    excerpts: [
      "The commissioner shall have final authority to decide whether the appointing authority shall settle the dispute prior to the hearing provided under this subdivision.",
    ],
  },
  {
    key: "mn-probationary-grievance",
    jurisdictionKey: "US-MN",
    artifactId: MN,
    citation: "Minn. Stat. § 43A.33, subd. 3(c)",
    statement:
      "Grievances over discipline during an initial probationary period follow the plan, which is not acquired.",
    excerpts: [
      "For discharge, suspension, or demotion of an employee serving an initial probationary period, and for noncertification in any subsequent probationary period, grievance procedures shall be as provided in the plan established pursuant to section 43A.18 .",
    ],
  },
  {
    key: "mn-arbitration",
    jurisdictionKey: "US-MN",
    artifactId: MN,
    citation: "Minn. Stat. § 43A.33, subd. 3(d)",
    statement:
      "The Bureau's commissioner provides a list of potential arbitrators under Bureau rules. Selection follows the plan and the hearing follows Bureau rules; neither is acquired.",
    excerpts: [
      "Within ten days of receipt of the employee's written notice of appeal, the commissioner of the Bureau of Mediation Services shall provide both parties with a list of potential arbitrators according to the rules of the Bureau of Mediation Services to hear the appeal.",
      "The process of selecting the arbitrator from the list shall be determined by the plan.",
    ],
  },
  {
    key: "mn-reinstatement",
    jurisdictionKey: "US-MN",
    artifactId: MN,
    citation: "Minn. Stat. § 43A.15, subd. 15",
    statement:
      "An appointing authority may directly reinstate a former permanent or probationary employee of the job class within four years of separation from the class.",
    excerpts: [
      "An appointing authority may directly reinstate a person who is a former permanent or probationary employee of the job class, within four years of separation from the class.",
    ],
    terms: {
      withinYearsOfSeparation: {
        value: 4,
        evidence: "within four years of separation from the class",
      },
    },
  },
  {
    key: "mn-probation",
    jurisdictionKey: "US-MN",
    artifactId: MN,
    citation: "Minn. Stat. § 43A.16, subds. 1-2",
    statement:
      "A classified probationary period lasts between 30 days and two years of full-time-equivalent service, as the agreement or plan sets. An appointing authority may require probation for reinstatements of former employees of a different appointing authority.",
    excerpts: [
      "All unlimited appointments to positions in the classified service except as provided in this subdivision shall be for a probationary period the duration of which shall be determined through collective bargaining agreements or plans established pursuant to section 43A.18 but which shall not be less than 30 days of full-time equivalent service nor more than two years of full-time equivalent service.",
      "An appointing authority may require a probationary period for transfers, reinstatements, voluntary demotions, and appointments from layoff lists of former employees of a different appointing authority.",
      "There is no presumption of continued employment during a probationary period.",
    ],
    terms: {
      minimumFullTimeEquivalentDays: {
        value: 30,
        evidence: "not be less than 30 days of full-time equivalent service",
      },
      maximumFullTimeEquivalentYears: {
        value: 2,
        evidence: "nor more than two years of full-time equivalent service",
      },
    },
  },
  {
    key: "mn-unclassified-offices",
    jurisdictionKey: "US-MN",
    artifactId: MN,
    citation: "Minn. Stat. § 43A.08, subd. 1(6), (11)",
    statement:
      "Employees in the offices of the governor and lieutenant governor, and the attorney general's attorneys, legal assistants and three confidential employees, hold unclassified positions.",
    excerpts: [
      "Unclassified positions are held by employees who are:",
      "(6) employees in the offices of the governor and of the lieutenant governor",
      "(11) attorneys, legal assistants, and three confidential employees appointed by the attorney general or employed with the attorney general's authorization",
    ],
  },
  {
    key: "ak-hearing",
    jurisdictionKey: "US-AK",
    artifactId: AK,
    citation: "Alaska Stat. § 39.25.170(a)",
    statement:
      "A classified employee who is dismissed, demoted or suspended for more than 30 working days in 12 months gets written notice and a reason from the employer, and may request a public Personnel Board hearing within 15 days.",
    excerpts: [
      "An employee in the classified service who is dismissed, demoted, or suspended for more than 30 working days in a 12-month period shall be notified in writing by the employer of the action and the reason for it and may be heard publicly by the personnel board and may be represented by counsel at the hearing.",
      "In order to be heard, the complainant shall request a hearing within 15 days of dismissal, demotion, or suspension.",
    ],
    terms: {
      requestWithinDays: {
        value: 15,
        evidence: "request a hearing within 15 days",
      },
      suspensionThresholdWorkingDays: {
        value: 30,
        evidence: "more than 30 working days in a 12-month period",
      },
    },
  },
  {
    key: "ak-board-remedy",
    jurisdictionKey: "US-AK",
    artifactId: AK,
    citation: "Alaska Stat. § 39.25.170(b)",
    statement:
      "The board reinstates without loss when it finds a political, racial or religious reason or a violation of the chapter or its rules; otherwise it reports findings and recommendations.",
    excerpts: [
      "If the board finds that the action complained of was taken for a political, racial, or religious reason, or in violation of this chapter or the rules adopted under this chapter, the officer or employee shall be reinstated to the position without loss of pay or leave benefit for the period of dismissal, demotion, or suspension.",
      "In all other cases, the board shall report its findings and recommendations to both parties.",
    ],
  },
  {
    key: "ak-partially-exempt",
    jurisdictionKey: "US-AK",
    artifactId: AK,
    citation: "Alaska Stat. § 39.25.120(b)",
    statement:
      "A partially exempt employee is not eligible for a Personnel Board hearing on dismissal, demotion or suspension.",
    excerpts: [
      "A person holding a position in the partially exempt service is not required to complete an assessment and is not eligible for a hearing by the personnel board in case of dismissal, demotion, or suspension.",
    ],
  },
  {
    key: "ak-exempt",
    jurisdictionKey: "US-AK",
    artifactId: AK,
    citation: "Alaska Stat. § 39.25.110",
    statement:
      "Exempt-service positions are outside chapter 39.25 and its rules, including its hearing right.",
    excerpts: [
      "positions in the state service constitute the exempt service and are exempt from the provisions of this chapter and the rules adopted under it",
    ],
  },
  {
    key: "ak-governor-office-exempt",
    jurisdictionKey: "US-AK",
    artifactId: AK,
    citation: "Alaska Stat. § 39.25.110(20)",
    statement:
      "Employees of the offices of the governor and lieutenant governor are in the exempt service.",
    excerpts: [
      "(20) employees of the Office of the Governor and the office of the lieutenant governor, including the staff of the governor's mansion;",
    ],
  },
  {
    key: "ak-probation",
    jurisdictionKey: "US-AK",
    artifactId: AK,
    citation: "Alaska Stat. § 39.25.150(7)",
    statement:
      "Personnel rules provide a probation of at most one year before an appointment becomes permanent, unless an agreement extends it.",
    excerpts: [
      "a period of probation not to exceed one year before an appointment to a position becomes permanent, unless the period of probation is extended as set out in a collective bargaining agreement under AS 23.40",
    ],
    terms: {
      maximumYears: { value: 1, evidence: "not to exceed one year" },
    },
  },
  {
    key: "ak-discipline-rules",
    jurisdictionKey: "US-AK",
    artifactId: AK,
    citation: "Alaska Stat. § 39.25.150(15)-(16)",
    statement:
      "Disciplinary measures and the review of disputed personnel actions are set by personnel rules, which are not acquired.",
    excerpts: [
      "the establishment of disciplinary measures, which may include disciplinary suspension without pay;",
      "the procedures for review of disputed personnel actions, for resolving employee and interagency grievances",
    ],
  },
  {
    key: "ak-merit",
    jurisdictionKey: "US-AK",
    artifactId: AK,
    citation: "Alaska Stat. § 39.25.160(f)",
    statement:
      "An action affecting a classified employee's status may not be taken or withheld for a reason not related to merit.",
    excerpts: [
      "action affecting the employment status of an employee in the classified service, including appointment, promotion, demotion, suspension, or removal, may not be taken or withheld for a reason not related to merit.",
    ],
  },
];

/** Every excerpt and term must be present in the pinned enacted text. */
export function compilePersonnelProcedures(
  opened: Readonly<Record<string, OpenedArtifact>>,
  lock: ArtifactLock,
): readonly PersonnelProcedure[] {
  const keys = DECLARATIONS.map((declaration) => declaration.key);
  if (
    keys.length !== PERSONNEL_PROCEDURE_KEYS.length ||
    PERSONNEL_PROCEDURE_KEYS.some((key) => !keys.includes(key))
  )
    throw new Error("Every personnel procedure key needs one declaration.");
  const texts = new Map<string, string>();
  return DECLARATIONS.map((declaration) => {
    const artifact = opened[declaration.artifactId];
    const locked = lock.artifacts.find(
      (candidate) => candidate.artifactId === declaration.artifactId,
    );
    const source = CIVIL_SERVICE_LABOR_SOURCES.find(
      (candidate) => candidate.artifactId === declaration.artifactId,
    );
    if (!artifact || !locked || !source)
      throw new Error(
        `${declaration.key} cites unopened artifact ${declaration.artifactId}.`,
      );
    let text = texts.get(declaration.artifactId);
    if (text === undefined) {
      text = normalizeRetrievedText(artifact.bytes);
      texts.set(declaration.artifactId, text);
    }
    for (const excerpt of declaration.excerpts)
      if (!text.includes(excerpt))
        throw new Error(
          `${declaration.citation} no longer contains its declared excerpt in ${declaration.artifactId}.`,
        );
    const terms: Record<string, PersonnelProcedureTerm> = {};
    for (const [name, term] of Object.entries(declaration.terms ?? {})) {
      if (
        !declaration.excerpts.some((excerpt) => excerpt.includes(term.evidence))
      )
        throw new Error(
          `${declaration.key} term ${name} is not fixed by its excerpts.`,
        );
      terms[name] = term.value;
    }
    return {
      key: declaration.key,
      jurisdictionKey: declaration.jurisdictionKey,
      validity: {
        state: "CURRENT_OBSERVATION",
        observedOn: CIVIL_SERVICE_LABOR_AS_OF,
      },
      statement: declaration.statement,
      citation: {
        artifactId: locked.artifactId,
        sha256: locked.bytes.sha256,
        citation: declaration.citation,
        url: source.url,
      },
      excerpts: declaration.excerpts,
      terms,
    };
  });
}
