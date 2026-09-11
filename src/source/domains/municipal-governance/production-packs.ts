/**
 * What this repository read in the charters it retrieved.
 *
 * Every KNOWN cell below quotes the instrument it came from, and the production
 * compiler refuses the cell unless that quotation is literally present in the
 * locked enacted text the cell cites. A charter that changes under a citation
 * does not quietly become a slightly wrong fact; it fails the compile.
 *
 * The three governments here were chosen for structural difference, not for
 * size. Charlottesville is a five-member at-large council that elects its own
 * mayor and hires a manager, so nobody in it is a chief executive. Richmond
 * elects nine councilmembers by district and a mayor who is the city's chief
 * executive officer, sits in no council seat, and can veto an ordinance — with
 * an override the charter states as an exact number of seats and an exact
 * number of days. Carson City is a consolidated municipality whose Board of
 * Supervisors is one body containing its own mayor, and whose ordinances take
 * two readings and a publication before they can pass. Those are three
 * different institutions, and they read differently at every step.
 *
 * What is missing is as declared as what is present. Carson City's own whole-
 * Board passage threshold is compiled from § 2.100. Introduction authority and
 * the consequences of withholding the required mayoral signature remain
 * UNKNOWN; a passage threshold alone does not enable ordinance progression.
 */

import { SUPPLEMENTAL_PRODUCTION_PACKS } from "./supplemental-production";
import type { Cell, MunicipalPackInput } from "./parse";
import type {
  ActorRole,
  BudgetDeadlineRule,
  CompositionValue,
  FiscalYearRule,
  ManagerValue,
  MayoralActionWindow,
  MayorValue,
  PowerRule,
  PresidingRule,
  PublicAttendanceRule,
  VoteThreshold,
} from "./types";

/** The date this corpus is evaluated against. */
export const MUNICIPAL_PRODUCTION_AS_OF = "2026-09-08";

/** A fact the instrument states, quoted. */
function said(
  value: unknown,
  sourceKey: string,
  legalLocator: string,
  excerpt: string,
): Cell {
  return {
    status: "KNOWN",
    value,
    sourceKey,
    legalLocator,
    effectiveDate: MUNICIPAL_PRODUCTION_AS_OF,
    excerpt,
  };
}

/** The instrument was read at this place and is silent. */
function silent(
  sourceKey: string,
  legalLocator: string,
  excerpt: string,
  reason: string,
): Cell {
  return {
    status: "NO_REQUIREMENT_FOUND",
    sourceKey,
    legalLocator,
    reason,
    excerpt,
  };
}

/** Nobody established it in the instruments read. */
function open(reason: string): Cell {
  return { status: "UNKNOWN", reason };
}

function power(
  kind: MunicipalPackInput["enumeratedPowers"][number]["power"],
  role: ActorRole,
  held: boolean,
  rule: PowerRule,
  sourceKey: string,
  legalLocator: string,
  excerpt: string,
): MunicipalPackInput["enumeratedPowers"][number] {
  return {
    power: kind,
    heldByRole: role,
    capability: said(held, sourceKey, legalLocator, excerpt),
    details: said(rule, sourceKey, legalLocator, excerpt),
  };
}

// ---------------------------------------------------------------------------
// Charlottesville, Virginia — city manager plan, five councilors at large
// ---------------------------------------------------------------------------

const CVILLE_FORM_EXCERPT =
  "The form of government for said city shall be the city manager plan as follows: All corporate powers and legislative and executive authority vested in the City of Charlottesville by law shall be and are hereby vested in a council of five members to be elected at large from the qualified voters of the city";
const CVILLE_MAYOR_EXCERPT =
  "the council shall elect one of its members to act as mayor, who shall preside at its meetings and continue in office two years";
const CVILLE_MAYOR_VOTE_EXCERPT =
  "shall be entitled to a vote on all questions as any other councilor, but in no case shall they be entitled to a second vote on any question.";
const CVILLE_QUORUM_EXCERPT =
  "Three councilors shall constitute a quorum for the transaction of business at any meeting of the council.";
const CVILLE_MANAGER_EXCERPT =
  "The council shall elect a city manager, at the salary to be fixed by the council, who shall serve at the pleasure of the council.";
const CVILLE_MANAGER_AUTHORITY_EXCERPT =
  "the city manager shall have full executive and administrative authority and shall have the right to employ and discharge all employees under his control. All departments of city government, including the fire department and police department, shall be under the general supervision of the city manager.";
const CVILLE_OPEN_MEETING_EXCERPT =
  "The council shall keep a journal of its proceedings, and its meetings shall be open, except when it votes to hold an executive or closed session";
const CVILLE_MEETING_TIME_EXCERPT =
  "The council shall fix by ordinance the time for holding their stated meetings";
const CVILLE_FISCAL_EXCERPT =
  "The city's fiscal year shall begin on July 1 of every year and conclude on June 30 of the following year.";
const CVILLE_BUDGET_PREPARE_EXCERPT =
  "The city manager shall prepare and submit to the council a budget.";
const CVILLE_BUDGET_AMEND_EXCERPT =
  "the council may insert new items of expenditures or may increase, decrease, or strike out items of expenditure in the budget";
const CVILLE_APPROPRIATION_EXCERPT =
  "Prior to the end of each fiscal year, the council shall pass an appropriation ordinance, which shall be based on the budget submitted by the city manager";
const CVILLE_BALANCED_EXCERPT =
  "The total amount of appropriations shall not exceed the estimated revenues of the city.";
const CVILLE_TERM_EXCERPT = "Councilors shall serve terms of four years.";
const CVILLE_VACANCY_EXCERPT =
  "Whenever, from any cause, a vacancy shall occur in the office of mayor, the council shall elect one of its members as mayor for the remainder of the term. A vacancy in the office of councilor shall be filled by that body in accordance with the general laws of the Commonwealth.";

const CARSON_PASSAGE_EXCERPT =
  "No ordinance may be passed except by bill and by a majority vote of the whole Board of Supervisors.";
const RICHMOND_BUDGET_AMENDMENT_EXCERPT =
  "After the conclusion of the public hearing, the council may insert new items of expenditure or may increase, decrease or strike out items of expenditure in the budget, except that no item of expenditure for debt service or required to be included by this charter or other provision of law shall be reduced or stricken out.";
const RICHMOND_BUDGET_BALANCE_EXCERPT =
  "The council shall in no event adopt a budget in which the total of expenditures exceeds the receipts, estimated as provided in § 6.04, unless at the same time it adopts measures for providing additional revenue in the ensuing fiscal year sufficient to make up this difference.";
const RICHMOND_BUDGET_ADOPTION_EXCERPT =
  "Not later than the thirty-first day of May in each year the council shall adopt the budget, the appropriation ordinances and such ordinances providing for additional revenue as may be necessary to put the budget in balance.";
const RICHMOND_BUDGET_FALLBACK_EXCERPT =
  "If for any reason the council fails to adopt the budget on or before such day, the budget as submitted by the mayor shall be the budget for the ensuing year and the appropriation ordinance and the ordinances providing additional revenue, if any, as recommended by the mayor shall have full force and effect to the same extent as if the same had been adopted by the council, notwithstanding anything to the contrary in this charter.";
const RICHMOND_BUDGET_VETO_EXCERPT =
  "The mayor shall have the power to veto any particular item or items of any city budget ordinance by written notice of veto delivered to the city clerk within 14 calendar days of council's action. Council may thereafter override the mayor's veto with a vote of six or more of the currently filled seats on council at any regular or special meeting held within 14 calendar days of the city clerk's receipt of the notice of veto. Vetoes of any one or more items shall not affect other items not vetoed.";

const VA_PASSAGE_EXCERPT =
  "an ordinance may be adopted by majority vote of those present and voting at any lawful meeting";
const VA_EFFECT_EXCERPT =
  "An ordinance shall become effective upon adoption or upon a date fixed by the governing body.";
const VA_AMEND_EXCERPT =
  "An ordinance may be amended or repealed in the same manner, or by the same procedure, in which, or by which, ordinances are adopted.";
const VA_QUORUM_EXCERPT =
  "A majority of the governing body shall constitute a quorum";

const VA_MAJORITY_PRESENT: VoteThreshold = {
  numerator: 1,
  denominator: 2,
  denominatorBasis: "MEMBERS_PRESENT_AND_VOTING",
  fixedVotesRequired: null,
};

const CHARLOTTESVILLE: MunicipalPackInput = {
  sourceGovernmentKey: "us-va-charlottesville",
  state: "VA",
  jurisdictionDisplayName: "City of Charlottesville",
  censusGovernmentUnitReference: open(
    "no canonical government-unit key has been reconciled for this government.",
  ),
  legalBasis: {
    form: said(
      "COUNCIL_MANAGER",
      "va-charlottesville-charter",
      "Charter § 5(b)",
      CVILLE_FORM_EXCERPT,
    ),
    basisType: said(
      "City manager plan under the city's charter",
      "va-charlottesville-charter",
      "Charter § 5(b)",
      CVILLE_FORM_EXCERPT,
    ),
    controllingAuthority: said(
      "Charter of the City of Charlottesville, Virginia",
      "va-charlottesville-charter",
      "Charter § 5",
      CVILLE_FORM_EXCERPT,
    ),
    effectiveDate: open(
      "the enacted text read fixes the form but not the date on which the city manager plan took effect.",
    ),
  },
  electedStructure: {
    bodyName: said(
      "Council of the City of Charlottesville",
      "va-charlottesville-charter",
      "Charter § 5(b)",
      CVILLE_FORM_EXCERPT,
    ),
    executiveSelection: said(
      "There is no separately elected executive. The council elects one of its own members as mayor at its first meeting in January 2022 and biennially thereafter.",
      "va-charlottesville-charter",
      "Charter § 9",
      CVILLE_MAYOR_EXCERPT,
    ),
    bodySize: said(
      5,
      "va-charlottesville-charter",
      "Charter § 5(b)",
      CVILLE_FORM_EXCERPT,
    ),
    composition: said(
      {
        pattern: "AT_LARGE",
        districtSeats: null,
        atLargeSeats: 5,
        wardSeats: null,
        note: "A council of five members elected at large from the qualified voters of the city.",
      } satisfies CompositionValue,
      "va-charlottesville-charter",
      "Charter § 5(b)",
      CVILLE_FORM_EXCERPT,
    ),
    presidingOffice: said(
      "Mayor",
      "va-charlottesville-charter",
      "Charter § 9",
      CVILLE_MAYOR_EXCERPT,
    ),
    presidingRules: [
      {
        rule: said(
          {
            context: "REGULAR_MEETING",
            presidingRole: "MAYOR",
            legislativeVoteRole: "FULL_VOTE",
            conditions: [
              "The mayor votes on all questions as any other councilor.",
              "The mayor is never entitled to a second vote on a question.",
            ],
          } satisfies PresidingRule,
          "va-charlottesville-charter",
          "Charter § 9",
          CVILLE_MAYOR_VOTE_EXCERPT,
        ),
      },
    ],
    partisanshipHistory: [],
    electionCalendar: open(
      "the enacted text read does not fix the primary and general timing of council elections beyond naming November of odd years.",
    ),
    terms: [
      {
        seatClass: "councilor",
        termYears: said(
          4,
          "va-charlottesville-charter",
          "Charter § 5(d)",
          CVILLE_TERM_EXCERPT,
        ),
        termLimit: open(
          "the enacted text read imposes no limit on the number of terms a councilor may serve and states none.",
        ),
      },
      {
        seatClass: "mayor",
        termYears: said(
          2,
          "va-charlottesville-charter",
          "Charter § 9",
          CVILLE_MAYOR_EXCERPT,
        ),
        termLimit: open(
          "the enacted text read states no limit on how often a councilor may be elected mayor.",
        ),
      },
    ],
    vacancyMechanism: said(
      "A vacancy in the office of mayor is filled by the council from among its own members for the remainder of the term; a vacancy in a council seat is filled by the council under the general laws of the Commonwealth.",
      "va-charlottesville-charter",
      "Charter § 8",
      CVILLE_VACANCY_EXCERPT,
    ),
  },
  administrativeStructure: {
    executiveLegislativeSeparation: said(
      "EXECUTIVE_AND_LEGISLATIVE_FUSED_IN_BODY",
      "va-charlottesville-charter",
      "Charter § 5(b)",
      CVILLE_FORM_EXCERPT,
    ),
    mayor: said(
      {
        title: "Mayor",
        structuralPosition: "PRESIDING_MEMBER_OF_BODY",
      } satisfies MayorValue,
      "va-charlottesville-charter",
      "Charter § 9",
      CVILLE_MAYOR_EXCERPT,
    ),
    professionalManager: said(
      {
        title: "City Manager",
        appointedByRole: "COUNCIL",
        removableByRole: "COUNCIL",
        confirmationRequired: false,
        removalConditions: ["Serves at the pleasure of the council."],
        statedRole:
          "Full executive and administrative authority, subject to the general control of the council.",
      } satisfies ManagerValue,
      "va-charlottesville-charter",
      "Charter §§ 5(e), 5.01",
      CVILLE_MANAGER_EXCERPT,
    ),
    departmentHeadAuthority: said(
      "All departments of city government, including the fire and police departments, are under the general supervision of the city manager, who may employ and discharge all employees under the manager's control.",
      "va-charlottesville-charter",
      "Charter § 5.01",
      CVILLE_MANAGER_AUTHORITY_EXCERPT,
    ),
    reportingRelationships: said(
      "The city manager is subject to the general control of the council.",
      "va-charlottesville-charter",
      "Charter § 5.01",
      CVILLE_MANAGER_AUTHORITY_EXCERPT,
    ),
  },
  enumeratedPowers: [
    power(
      "APPOINTMENT",
      "COUNCIL",
      true,
      {
        allowed: true,
        target: "City Manager",
        conditions: ["The council fixes the manager's salary."],
        threshold: null,
        exceptions: [],
      },
      "va-charlottesville-charter",
      "Charter § 5(e)",
      CVILLE_MANAGER_EXCERPT,
    ),
    power(
      "REMOVAL",
      "COUNCIL",
      true,
      {
        allowed: true,
        target: "City Manager",
        conditions: ["The manager serves at the pleasure of the council."],
        threshold: null,
        exceptions: [],
      },
      "va-charlottesville-charter",
      "Charter § 5(e)",
      CVILLE_MANAGER_EXCERPT,
    ),
    power(
      "DEPARTMENT_SUPERVISION",
      "CITY_MANAGER",
      true,
      {
        allowed: true,
        target: "All departments of city government",
        conditions: ["Subject to the general control of the council."],
        threshold: null,
        exceptions: [],
      },
      "va-charlottesville-charter",
      "Charter § 5.01",
      CVILLE_MANAGER_AUTHORITY_EXCERPT,
    ),
    power(
      "PRESIDE",
      "MAYOR",
      true,
      {
        allowed: true,
        target: "Meetings of the council",
        conditions: [],
        threshold: null,
        exceptions: [
          "The vice-mayor presides in the mayor's absence or inability.",
        ],
      },
      "va-charlottesville-charter",
      "Charter § 9",
      CVILLE_MAYOR_EXCERPT,
    ),
    power(
      "LEGISLATIVE_VOTE",
      "MAYOR",
      true,
      {
        allowed: true,
        target: "All questions before the council",
        conditions: ["The mayor votes as any other councilor."],
        threshold: null,
        exceptions: ["Never a second vote on the same question."],
      },
      "va-charlottesville-charter",
      "Charter § 9",
      CVILLE_MAYOR_VOTE_EXCERPT,
    ),
    power(
      "ORDINANCE_ADOPTION",
      "COUNCIL",
      true,
      {
        allowed: true,
        target: "Ordinances of the city",
        conditions: [
          "A majority of those present and voting, at any lawful meeting.",
        ],
        threshold: VA_MAJORITY_PRESENT,
        exceptions: [
          "Unless otherwise specifically provided for by the Constitution or by other general or special law.",
        ],
      },
      "va-code-15-2-1427",
      "Code of Virginia § 15.2-1427(A)",
      VA_PASSAGE_EXCERPT,
    ),
    power(
      "BUDGET_PROPOSAL",
      "CITY_MANAGER",
      true,
      {
        allowed: true,
        target: "The annual budget",
        conditions: [],
        threshold: null,
        exceptions: [],
      },
      "va-charlottesville-charter",
      "Charter § 19",
      CVILLE_BUDGET_PREPARE_EXCERPT,
    ),
    power(
      "BUDGET_ADOPTION",
      "COUNCIL",
      true,
      {
        allowed: true,
        target: "The annual appropriation ordinance",
        conditions: ["Passed prior to the end of each fiscal year."],
        threshold: null,
        exceptions: [],
      },
      "va-charlottesville-charter",
      "Charter § 19",
      CVILLE_APPROPRIATION_EXCERPT,
    ),
    {
      power: "VETO",
      heldByRole: "MAYOR",
      capability: silent(
        "va-charlottesville-charter",
        "Charter §§ 5, 9",
        CVILLE_MAYOR_VOTE_EXCERPT,
        "The charter gives the mayor a councilor's vote and no other action on an adopted measure; neither the charter sections read nor Code of Virginia § 15.2-1427 establishes a mayoral veto here.",
      ),
      details: open(
        "there is no veto rule to state, because no instrument read establishes a veto.",
      ),
    },
  ],
  legislativeProcedure: {
    measureTypes: said(
      ["ordinance", "resolution"],
      "va-code-15-2-1427",
      "Code of Virginia § 15.2-1427",
      VA_PASSAGE_EXCERPT,
    ),
    introductionSponsorship: open(
      "no instrument read states who may introduce an ordinance in this council.",
    ),
    readings: open(
      "no instrument read requires a number of readings for an ordinance in this city.",
    ),
    committeeReferral: open(
      "no instrument read establishes a standing committee system or a referral requirement.",
    ),
    publicHearing: open(
      "no instrument read imposes a public hearing on an ordinance generally; the charter requires one only on the budget.",
    ),
    quorum: said(
      "Three councilors constitute a quorum for the transaction of business at any meeting of the council.",
      "va-charlottesville-charter",
      "Charter § 12",
      CVILLE_QUORUM_EXCERPT,
    ),
    quorumRule: said(
      {
        numerator: 3,
        denominator: 5,
        denominatorBasis: "FIXED_COUNT",
        fixedVotesRequired: 3,
      } satisfies VoteThreshold,
      "va-charlottesville-charter",
      "Charter § 12",
      CVILLE_QUORUM_EXCERPT,
    ),
    passageThreshold: said(
      "An ordinance may be adopted by majority vote of those present and voting at any lawful meeting.",
      "va-code-15-2-1427",
      "Code of Virginia § 15.2-1427(A)",
      VA_PASSAGE_EXCERPT,
    ),
    amendment: said(
      "An ordinance may be amended or repealed in the same manner, or by the same procedure, by which ordinances are adopted.",
      "va-code-15-2-1427",
      "Code of Virginia § 15.2-1427(D)",
      VA_AMEND_EXCERPT,
    ),
    mayoralAction: open(
      "The retrieved charter sections do not establish post-adoption mayoral action; silence is not proof that presentment is inapplicable.",
    ),
    mayoralActionWindow: open("Post-adoption mayoral action remains UNKNOWN."),
    override: open(
      "A veto and override process has not been established by the retrieved sections.",
    ),
    effectivePublication: said(
      "An ordinance becomes effective upon adoption or upon a date fixed by the governing body.",
      "va-code-15-2-1427",
      "Code of Virginia § 15.2-1427(B)",
      VA_EFFECT_EXCERPT,
    ),
  },
  budgetProcedure: {
    fiscalYear: said(
      {
        beginsMonthDay: "07-01",
        endsMonthDay: "06-30",
      } satisfies FiscalYearRule,
      "va-charlottesville-charter",
      "Charter § 19",
      CVILLE_FISCAL_EXCERPT,
    ),
    prepares: said(
      ["CITY_MANAGER"],
      "va-charlottesville-charter",
      "Charter § 19",
      CVILLE_BUDGET_PREPARE_EXCERPT,
    ),
    proposes: said(
      "CITY_MANAGER",
      "va-charlottesville-charter",
      "Charter § 19",
      CVILLE_BUDGET_PREPARE_EXCERPT,
    ),
    amends: said(
      "COUNCIL",
      "va-charlottesville-charter",
      "Charter § 19",
      CVILLE_BUDGET_AMEND_EXCERPT,
    ),
    adopts: said(
      "COUNCIL",
      "va-charlottesville-charter",
      "Charter § 19",
      CVILLE_APPROPRIATION_EXCERPT,
    ),
    submissionDeadline: open(
      "the charter requires the manager to submit a budget but fixes no date for doing so.",
    ),
    adoptionDeadline: said(
      {
        monthDay: "06-30",
        minimumDaysBeforeFiscalYear: null,
      } satisfies BudgetDeadlineRule,
      "va-charlottesville-charter",
      "Charter § 19",
      CVILLE_APPROPRIATION_EXCERPT,
    ),
    balancedBudgetConstraint: said(
      "The total amount of appropriations shall not exceed the estimated revenues of the city, and proposed general fund expenditures shall not exceed estimated general fund income.",
      "va-charlottesville-charter",
      "Charter § 19",
      CVILLE_BALANCED_EXCERPT,
    ),
  },
  consolidation: {
    consolidationType: silent(
      "va-charlottesville-charter",
      "Charter § 5",
      CVILLE_FORM_EXCERPT,
      "The enacted text read establishes a city government and no consolidation with a county.",
    ),
    enablingAuthority: open("there is no consolidation to authorize."),
    consolidationEffectiveDate: open("there is no consolidation to date."),
    predecessorUnits: [],
    retainedNestedGovernments: [],
    retainedCountyEquivalentOffices: [],
    serviceDistricts: [],
    separateSchoolOrSpecialDistricts: [],
    nestedGovernmentCount: open(
      "the enacted text read counts no governments inside this one.",
    ),
    parallelGeneralGovernment: open(
      "the enacted text read does not describe another general-purpose government covering the same territory.",
    ),
  },
  meetingPlaces: [],
  meetingSeries: [
    {
      seriesKey: "stated-meeting",
      kind: "REGULAR_MEETING",
      bodyName: said(
        "Council of the City of Charlottesville",
        "va-charlottesville-charter",
        "Charter § 12",
        CVILLE_MEETING_TIME_EXCERPT,
      ),
      cadence: silent(
        "va-charlottesville-charter",
        "Charter § 12",
        CVILLE_MEETING_TIME_EXCERPT,
        "The charter delegates the time of stated meetings to ordinance, so the cadence is not in the instrument read.",
      ),
      venue: open(
        "the enacted text read names no meeting place for this council.",
      ),
      publicAttendance: said(
        {
          openToPublic: true,
          publicCommentOffered: "UNKNOWN",
          note: "Council meetings are open except when the council votes to hold an executive or closed session under the general laws of the Commonwealth. The charter says nothing about a right to address the council.",
        } satisfies PublicAttendanceRule,
        "va-charlottesville-charter",
        "Charter § 12",
        CVILLE_OPEN_MEETING_EXCERPT,
      ),
    },
  ],
  unresolved: [
    "The charter delegates the time of stated council meetings to ordinance; the ordinance was not read, so no cadence is established.",
    "No instrument read establishes readings, committee referral, introduction rights or a general public-hearing requirement for a Charlottesville ordinance.",
    "Whether council elections here are partisan or nonpartisan was not established by any instrument read.",
  ],
  asOf: MUNICIPAL_PRODUCTION_AS_OF,
  citedSources: [],
};

// ---------------------------------------------------------------------------
// Richmond, Virginia — elected mayor as chief executive, nine districts, veto
// ---------------------------------------------------------------------------

const RICHMOND_DISTRICTS_EXCERPT =
  "there shall be held a general city election at which shall be elected by the qualified voters of the city one member of council from each of the nine election districts in the city";
const RICHMOND_TERM_EXCERPT =
  "council members shall be elected for a term of four years";
const RICHMOND_COUNCIL_EXCERPT = "The council shall consist of nine members";
const RICHMOND_MAYOR_EXCERPT =
  "The mayor shall be the chief executive officer of the city and shall be responsible for the proper administration of city government.";
const RICHMOND_CAO_EXCERPT =
  "The mayor shall appoint a chief administrative officer, subject to the advice and consent of a majority of the members of city council";
const RICHMOND_CAO_TENURE_EXCERPT =
  "The chief administrative officer shall serve at the pleasure of the mayor.";
const RICHMOND_MAYOR_NO_VOTE_EXCERPT =
  "all meetings of the council with the right to speak but not to vote";
const RICHMOND_VETO_EXCERPT =
  "the mayor shall have the power to veto any city ordinance by written notice of veto delivered to the city clerk within 14 calendar days of council's actions, subject to override thereafter by the council with a vote of six or more of the currently filled seats on council at any regular or special meeting held within 14 calendar days of the clerk's receipt of the notice of veto";
const RICHMOND_BUDGET_SUBMIT_EXCERPT =
  "On a day to be fixed by the council, but in no case earlier than the second Monday of February or later than the seventh day of April in each year, the mayor shall submit to the council";
const RICHMOND_FISCAL_EXCERPT =
  "The fiscal year of the city shall begin on July 1 and shall end on June 30 of the succeeding year.";

const RICHMOND: MunicipalPackInput = {
  sourceGovernmentKey: "us-va-richmond",
  state: "VA",
  jurisdictionDisplayName: "City of Richmond",
  censusGovernmentUnitReference: open(
    "no canonical government-unit key has been reconciled for this government.",
  ),
  legalBasis: {
    form: said(
      "MAYOR_COUNCIL",
      "va-richmond-charter",
      "Charter § 5.01",
      RICHMOND_MAYOR_EXCERPT,
    ),
    basisType: said(
      "City charter with a separately elected mayor as chief executive officer",
      "va-richmond-charter",
      "Charter § 5.01",
      RICHMOND_MAYOR_EXCERPT,
    ),
    controllingAuthority: said(
      "Charter of the City of Richmond, Virginia",
      "va-richmond-charter",
      "Charter § 4.01",
      RICHMOND_COUNCIL_EXCERPT,
    ),
    effectiveDate: open(
      "the enacted text read does not state when the current mayor-council arrangement took effect.",
    ),
  },
  electedStructure: {
    bodyName: said(
      "Council of the City of Richmond",
      "va-richmond-charter",
      "Charter § 4.01",
      RICHMOND_COUNCIL_EXCERPT,
    ),
    executiveSelection: said(
      "The mayor is elected separately from the council and is the city's chief executive officer.",
      "va-richmond-charter",
      "Charter § 5.01",
      RICHMOND_MAYOR_EXCERPT,
    ),
    bodySize: said(
      9,
      "va-richmond-charter",
      "Charter § 4.01",
      RICHMOND_COUNCIL_EXCERPT,
    ),
    composition: said(
      {
        pattern: "SINGLE_MEMBER_DISTRICT",
        districtSeats: 9,
        atLargeSeats: null,
        wardSeats: null,
        note: "One member of council from each of the nine election districts, each member residing in the district throughout the term.",
      } satisfies CompositionValue,
      "va-richmond-charter",
      "Charter § 3.01",
      RICHMOND_DISTRICTS_EXCERPT,
    ),
    presidingOffice: open(
      "the enacted text read does not say who presides over the council; it says only that the mayor may attend and speak.",
    ),
    presidingRules: [
      {
        rule: said(
          {
            context: "REGULAR_MEETING",
            presidingRole: "OTHER",
            legislativeVoteRole: "NO_VOTE",
            conditions: [
              "The mayor, or a designee, attends council meetings with the right to speak but not to vote.",
            ],
          } satisfies PresidingRule,
          "va-richmond-charter",
          "Charter § 5.05(a)",
          RICHMOND_MAYOR_NO_VOTE_EXCERPT,
        ),
      },
    ],
    partisanshipHistory: [],
    electionCalendar: open(
      "the enacted text read fixes the November general election but not a primary regime; it states that no primary is held for council and candidates are nominated only by petition.",
    ),
    terms: [
      {
        seatClass: "councilmember",
        termYears: said(
          4,
          "va-richmond-charter",
          "Charter § 3.01(A)",
          RICHMOND_TERM_EXCERPT,
        ),
        termLimit: open(
          "the enacted text read states no limit on the number of terms a councilmember may serve.",
        ),
      },
    ],
    vacancyMechanism: open(
      "the charter section on vacancies was not among the enacted-text regions retrieved for this record.",
    ),
  },
  administrativeStructure: {
    executiveLegislativeSeparation: said(
      "SEPARATE_EXECUTIVE_AND_LEGISLATIVE",
      "va-richmond-charter",
      "Charter §§ 5.01, 5.05(a)",
      RICHMOND_MAYOR_NO_VOTE_EXCERPT,
    ),
    mayor: said(
      {
        title: "Mayor",
        structuralPosition: "SEPARATE_CHIEF_EXECUTIVE",
      } satisfies MayorValue,
      "va-richmond-charter",
      "Charter § 5.01",
      RICHMOND_MAYOR_EXCERPT,
    ),
    professionalManager: said(
      {
        title: "Chief Administrative Officer",
        appointedByRole: "MAYOR",
        removableByRole: "MAYOR",
        confirmationRequired: true,
        removalConditions: ["Serves at the pleasure of the mayor."],
        statedRole:
          "Chosen solely on the basis of executive and administrative qualifications; acts under the general direction of the mayor.",
      } satisfies ManagerValue,
      "va-richmond-charter",
      "Charter § 5.01.1",
      RICHMOND_CAO_EXCERPT,
    ),
    departmentHeadAuthority: open(
      "the section giving the chief administrative officer the power of appointment and removal was not among the enacted-text regions retrieved for this record.",
    ),
    reportingRelationships: said(
      "The chief administrative officer serves at the pleasure of the mayor.",
      "va-richmond-charter",
      "Charter § 5.01.1",
      RICHMOND_CAO_TENURE_EXCERPT,
    ),
  },
  enumeratedPowers: [
    power(
      "APPOINTMENT",
      "MAYOR",
      true,
      {
        allowed: true,
        target: "Chief Administrative Officer",
        conditions: [
          "Subject to the advice and consent of a majority of the members of city council.",
        ],
        threshold: {
          numerator: 1,
          denominator: 2,
          denominatorBasis: "TOTAL_MEMBERSHIP",
          fixedVotesRequired: null,
        },
        exceptions: [],
      },
      "va-richmond-charter",
      "Charter § 5.01.1",
      RICHMOND_CAO_EXCERPT,
    ),
    power(
      "CONFIRMATION",
      "COUNCIL",
      true,
      {
        allowed: true,
        target: "The mayor's appointment of a Chief Administrative Officer",
        conditions: ["A majority of the members of city council."],
        threshold: {
          numerator: 1,
          denominator: 2,
          denominatorBasis: "TOTAL_MEMBERSHIP",
          fixedVotesRequired: null,
        },
        exceptions: [],
      },
      "va-richmond-charter",
      "Charter § 5.01.1",
      RICHMOND_CAO_EXCERPT,
    ),
    power(
      "LEGISLATIVE_VOTE",
      "MAYOR",
      false,
      {
        allowed: false,
        target: "Questions before the council",
        conditions: ["The mayor attends with the right to speak but not vote."],
        threshold: null,
        exceptions: [],
      },
      "va-richmond-charter",
      "Charter § 5.05(a)",
      RICHMOND_MAYOR_NO_VOTE_EXCERPT,
    ),
    power(
      "VETO",
      "MAYOR",
      true,
      {
        allowed: true,
        target: "Any city ordinance",
        conditions: [
          "By written notice of veto delivered to the city clerk within 14 calendar days of the council's action.",
        ],
        threshold: null,
        exceptions: [
          "The appointment of members of a redevelopment and housing authority in the city is made by the council.",
        ],
      },
      "va-richmond-charter",
      "Charter § 5.05(d)",
      RICHMOND_VETO_EXCERPT,
    ),
    power(
      "OVERRIDE",
      "COUNCIL",
      true,
      {
        allowed: true,
        target: "A mayoral veto of a city ordinance",
        conditions: [
          "Six or more of the currently filled seats on council.",
          "At any regular or special meeting held within 14 calendar days of the clerk's receipt of the notice of veto.",
        ],
        threshold: {
          numerator: 6,
          denominator: 9,
          denominatorBasis: "FIXED_COUNT",
          fixedVotesRequired: 6,
        },
        exceptions: [],
      },
      "va-richmond-charter",
      "Charter § 5.05(d)",
      RICHMOND_VETO_EXCERPT,
    ),
    power(
      "ORDINANCE_ADOPTION",
      "COUNCIL",
      true,
      {
        allowed: true,
        target: "Ordinances of the city",
        conditions: [
          "At least five affirmative votes at an open meeting; roll call recorded in the journal.",
        ],
        threshold: {
          numerator: 5,
          denominator: 9,
          denominatorBasis: "FIXED_COUNT",
          fixedVotesRequired: 5,
        },
        exceptions: [
          "Unless otherwise specifically provided for by the Constitution or by other general or special law.",
        ],
      },
      "va-richmond-charter",
      "Charter § 4.07",
      "unless it shall have received the affirmative votes of at least five members",
    ),
    power(
      "BUDGET_PROPOSAL",
      "MAYOR",
      true,
      {
        allowed: true,
        target:
          "Current expense budgets for the general government, the public schools and each utility, a budget message and a capital budget",
        conditions: [
          "On a day fixed by the council, no earlier than the second Monday of February and no later than the seventh day of April.",
        ],
        threshold: null,
        exceptions: [],
      },
      "va-richmond-charter",
      "Charter § 6.02",
      RICHMOND_BUDGET_SUBMIT_EXCERPT,
    ),
    power(
      "BUDGET_ADOPTION",
      "COUNCIL",
      true,
      {
        allowed: true,
        target:
          "Budget, appropriation ordinances and ordinances for additional revenue",
        conditions: [
          RICHMOND_BUDGET_ADOPTION_EXCERPT,
          RICHMOND_BUDGET_BALANCE_EXCERPT,
        ],
        threshold: null,
        exceptions: [RICHMOND_BUDGET_FALLBACK_EXCERPT],
      },
      "va-richmond-charter",
      "Charter §§ 6.10–6.11",
      RICHMOND_BUDGET_ADOPTION_EXCERPT,
    ),
    power(
      "LINE_ITEM_VETO",
      "MAYOR",
      true,
      {
        allowed: true,
        target: "Particular items of city budget ordinances",
        conditions: [
          "Written notice to the city clerk within 14 calendar days of council's action.",
        ],
        threshold: null,
        exceptions: [
          "Council may override with six or more currently filled seats within 14 calendar days of the clerk's receipt; other items are unaffected.",
        ],
      },
      "va-richmond-charter",
      "Charter § 6.11",
      RICHMOND_BUDGET_VETO_EXCERPT,
    ),
  ],
  legislativeProcedure: {
    measureTypes: said(
      ["ordinance", "resolution"],
      "va-code-15-2-1427",
      "Code of Virginia § 15.2-1427",
      VA_PASSAGE_EXCERPT,
    ),
    introductionSponsorship: said(
      "Any council member or committee, or the mayor, may introduce an ordinance at a regular or special council meeting.",
      "va-richmond-charter",
      "Charter § 4.10",
      "An ordinance may be introduced by any member or committee of the council or by the mayor at any regular meeting of the council or at any special meeting.",
    ),
    readings: open(
      "no instrument read requires a number of readings for a Richmond ordinance.",
    ),
    committeeReferral: open(
      "no instrument read establishes a standing committee system or a referral requirement.",
    ),
    publicHearing: said(
      "Ordinary ordinances require a hearing at least seven days after introduction, with newspaper notice and copies available at least five days before the hearing. Final passage follows introduction and the concluded hearing. Six members may reject on first reading without a hearing.",
      "va-richmond-charter",
      "Charter § 4.10",
      "not less than seven days after such introduction",
    ),
    quorum: said(
      "A majority of the governing body constitutes a quorum, and the body may exercise its powers at any meeting at which a quorum is present.",
      "va-code-15-2-1415",
      "Code of Virginia § 15.2-1415",
      VA_QUORUM_EXCERPT,
    ),
    quorumRule: said(
      {
        numerator: 1,
        denominator: 2,
        denominatorBasis: "TOTAL_MEMBERSHIP",
        fixedVotesRequired: null,
      } satisfies VoteThreshold,
      "va-code-15-2-1415",
      "Code of Virginia § 15.2-1415",
      VA_QUORUM_EXCERPT,
    ),
    passageThreshold: said(
      "An ordinary ordinance requires at least five affirmative votes at an open council meeting, with roll call recorded in the journal.",
      "va-richmond-charter",
      "Charter § 4.07",
      "unless it shall have received the affirmative votes of at least five members",
    ),
    amendment: said(
      "A substantive amendment requires renewed publication, a newly noticed hearing, and proceedings as for a newly introduced ordinance.",
      "va-richmond-charter",
      "Charter § 4.10",
      "all proceedings had as in the case of a newly introduced ordinance.",
    ),
    mayoralAction: said(
      "The mayor may veto any city ordinance by written notice of veto delivered to the city clerk within 14 calendar days of the council's action.",
      "va-richmond-charter",
      "Charter § 5.05(d)",
      RICHMOND_VETO_EXCERPT,
    ),
    mayoralActionWindow: said(
      {
        daysToAct: 14,
        dayBasis: "CALENDAR",
        inactionOutcome: "BECOMES_LAW_WITHOUT_SIGNATURE",
      } satisfies MayoralActionWindow,
      "va-richmond-charter",
      "Charter § 5.05(d)",
      RICHMOND_VETO_EXCERPT,
    ),
    override: said(
      "The council may override a veto with a vote of six or more of the currently filled seats, at any regular or special meeting held within 14 calendar days of the clerk's receipt of the notice of veto.",
      "va-richmond-charter",
      "Charter § 5.05(d)",
      RICHMOND_VETO_EXCERPT,
    ),
    effectivePublication: said(
      "Unless otherwise specified or provided by the charter, an ordinance takes effect on the tenth day following passage.",
      "va-richmond-charter",
      "Charter § 4.09",
      "an ordinance shall take effect on the tenth day following its passage.",
    ),
  },
  budgetProcedure: {
    fiscalYear: said(
      {
        beginsMonthDay: "07-01",
        endsMonthDay: "06-30",
      } satisfies FiscalYearRule,
      "va-richmond-charter",
      "Charter § 6.01",
      RICHMOND_FISCAL_EXCERPT,
    ),
    prepares: said(
      ["MAYOR"],
      "va-richmond-charter",
      "Charter § 6.02",
      RICHMOND_BUDGET_SUBMIT_EXCERPT,
    ),
    proposes: said(
      "MAYOR",
      "va-richmond-charter",
      "Charter § 6.02",
      RICHMOND_BUDGET_SUBMIT_EXCERPT,
    ),
    amends: said(
      "COUNCIL",
      "va-richmond-charter",
      "Charter § 6.10",
      RICHMOND_BUDGET_AMENDMENT_EXCERPT,
    ),
    adopts: said(
      "COUNCIL",
      "va-richmond-charter",
      "Charter § 6.11",
      RICHMOND_BUDGET_ADOPTION_EXCERPT,
    ),
    submissionDeadline: said(
      {
        monthDay: "04-07",
        minimumDaysBeforeFiscalYear: null,
      } satisfies BudgetDeadlineRule,
      "va-richmond-charter",
      "Charter § 6.02",
      RICHMOND_BUDGET_SUBMIT_EXCERPT,
    ),
    adoptionDeadline: said(
      {
        monthDay: "05-31",
        minimumDaysBeforeFiscalYear: null,
      } satisfies BudgetDeadlineRule,
      "va-richmond-charter",
      "Charter § 6.11",
      RICHMOND_BUDGET_ADOPTION_EXCERPT,
    ),
    balancedBudgetConstraint: said(
      RICHMOND_BUDGET_BALANCE_EXCERPT,
      "va-richmond-charter",
      "Charter § 6.10",
      RICHMOND_BUDGET_BALANCE_EXCERPT,
    ),
  },
  researchObservations: [
    said(
      RICHMOND_BUDGET_AMENDMENT_EXCERPT,
      "va-richmond-charter",
      "Charter § 6.10",
      RICHMOND_BUDGET_AMENDMENT_EXCERPT,
    ),
    said(
      "The council shall not alter the estimates of receipts contained in the said budget except to correct omissions or mathematical errors, and it shall not cause the total of expenditures as recommended by the mayor to be increased without a public hearing on such increase, which shall be held not less than five days after notice thereof has been printed in a newspaper published or in general circulation in the city.",
      "va-richmond-charter",
      "Charter § 6.10",
      "The council shall not alter the estimates of receipts contained in the said budget except to correct omissions or mathematical errors, and it shall not cause the total of expenditures as recommended by the mayor to be increased without a public hearing on such increase, which shall be held not less than five days after notice thereof has been printed in a newspaper published or in general circulation in the city.",
    ),
    said(
      RICHMOND_BUDGET_FALLBACK_EXCERPT,
      "va-richmond-charter",
      "Charter § 6.11",
      RICHMOND_BUDGET_FALLBACK_EXCERPT,
    ),
    said(
      "Upon final adoption, the budget shall be in effect for the ensuing fiscal year. A copy of such budget as finally adopted shall be certified by the city clerk. Copies of the budget, capital program and appropriation and revenue ordinances shall be public records and shall be made available to the public at suitable places in the city.",
      "va-richmond-charter",
      "Charter § 6.12",
      "Upon final adoption, the budget shall be in effect for the ensuing fiscal year. A copy of such budget as finally adopted shall be certified by the city clerk. Copies of the budget, capital program and appropriation and revenue ordinances shall be public records and shall be made available to the public at suitable places in the city.",
    ),
  ],
  consolidation: {
    consolidationType: silent(
      "va-richmond-charter",
      "Charter § 4.01",
      RICHMOND_COUNCIL_EXCERPT,
      "The enacted text read establishes a city government and no consolidation with a county.",
    ),
    enablingAuthority: open("there is no consolidation to authorize."),
    consolidationEffectiveDate: open("there is no consolidation to date."),
    predecessorUnits: [],
    retainedNestedGovernments: [],
    retainedCountyEquivalentOffices: [],
    serviceDistricts: [],
    separateSchoolOrSpecialDistricts: [],
    nestedGovernmentCount: open(
      "the enacted text read counts no governments inside this one.",
    ),
    parallelGeneralGovernment: open(
      "the enacted text read does not describe another general-purpose government covering the same territory.",
    ),
  },
  meetingPlaces: [],
  meetingSeries: [],
  unresolved: [
    "An exact numeric reading count and standing committee referral remain UNKNOWN. Charter §§ 4.09–4.11 establish ordinary and emergency procedure; consumer steps must enforce the stated hearing, notice and separate-meeting conditions.",
    "The council's own meeting cadence and venue are not in the enacted text retrieved for this record.",
    "Whether council elections here are partisan or nonpartisan was not established by any instrument read; the charter states only that council candidates are nominated by petition and that no primary is held.",
  ],
  asOf: MUNICIPAL_PRODUCTION_AS_OF,
  citedSources: [],
};

// ---------------------------------------------------------------------------
// Carson City, Nevada — consolidated municipality, board containing its mayor
// ---------------------------------------------------------------------------

const CARSON_CONSOLIDATION_EXCERPT =
  "AN ACT relating to Carson City; consolidating Ormsby County and Carson City into one municipal government to be known as Carson City";
const CARSON_BOARD_EXCERPT =
  "The legislative power of Carson City is vested in a Board of Supervisors consisting of five Supervisors, including the Mayor.";
const CARSON_ATLARGE_EXCERPT =
  "All Supervisors, including the Mayor, must be voted upon by the registered voters of Carson City at large and shall serve for terms of 4 years.";
const CARSON_WARD_EXCERPT = "A resident of the ward which he or she represents";
const CARSON_QUORUM_EXCERPT =
  "a majority of all members of the Board constitutes a quorum to do business";
const CARSON_MEETINGS_EXCERPT =
  "The Board shall hold at least two regular meetings each month, and by ordinance may provide for the holding of additional regular meetings.";
const CARSON_PUBLIC_EXCERPT =
  "Except as otherwise provided by law, the sessions and all proceedings of the Board must be public.";
const CARSON_FIRST_READING_EXCERPT =
  "All proposed ordinances when first proposed must be read to the Board by title, after which an adequate number of copies of the proposed ordinance must be filed with the Clerk for public distribution.";
const CARSON_SECOND_READING_EXCERPT =
  "At a regular meeting or adjourned meeting of the Board following the proposal of an ordinance it must be read as first introduced, or as amended, and thereupon the proposed ordinance must be finally voted upon or action thereon postponed.";
const CARSON_PUBLICATION_EXCERPT =
  "All ordinances must be signed by the Mayor, attested by the Clerk and published by title, together with the names of the Supervisors voting for or against passage";
const CARSON_MAYOR_EXCERPT =
  "Shall serve as a member of the Board and preside over its meetings.";
const CARSON_MANAGER_EXCERPT =
  "The Board may appoint a Manager who is the Chief Administrative Officer of the City. He or she is responsible for carrying out the policy of the Board.";

const CARSON_CITY: MunicipalPackInput = {
  sourceGovernmentKey: "us-nv-carson-city",
  state: "NV",
  jurisdictionDisplayName: "Carson City",
  censusGovernmentUnitReference: open(
    "no canonical government-unit key has been reconciled for this government.",
  ),
  legalBasis: {
    form: said(
      "CITY_COUNTY_CONSOLIDATED",
      "nv-carson-city-charter",
      "Charter, act title and § 1.010",
      CARSON_CONSOLIDATION_EXCERPT,
    ),
    basisType: said(
      "Consolidated municipality created by legislative charter",
      "nv-carson-city-charter",
      "Charter, act title",
      CARSON_CONSOLIDATION_EXCERPT,
    ),
    controllingAuthority: said(
      "Charter of Carson City, Nevada",
      "nv-carson-city-charter",
      "Charter, act title",
      CARSON_CONSOLIDATION_EXCERPT,
    ),
    effectiveDate: open(
      "the enacted text retrieved names the consolidating act but not the date the charter took effect.",
    ),
  },
  electedStructure: {
    bodyName: said(
      "Carson City Board of Supervisors",
      "nv-carson-city-charter",
      "Charter § 2.010(1)",
      CARSON_BOARD_EXCERPT,
    ),
    executiveSelection: said(
      "There is no separately elected executive. The Mayor is one of the five members of the Board and is elected at large like the other Supervisors.",
      "nv-carson-city-charter",
      "Charter § 2.010(4)",
      CARSON_ATLARGE_EXCERPT,
    ),
    bodySize: said(
      5,
      "nv-carson-city-charter",
      "Charter § 2.010(1)",
      CARSON_BOARD_EXCERPT,
    ),
    composition: said(
      {
        pattern: "AT_LARGE",
        districtSeats: null,
        atLargeSeats: 5,
        wardSeats: null,
        note: "All five members, the Mayor included, are voted upon at large. Each Supervisor must nonetheless be a resident of the ward that Supervisor represents, so ward residency is a qualification and not a separate electorate.",
      } satisfies CompositionValue,
      "nv-carson-city-charter",
      "Charter § 2.010(3)-(4)",
      CARSON_ATLARGE_EXCERPT,
    ),
    presidingOffice: said(
      "Mayor",
      "nv-carson-city-charter",
      "Charter § 3.010(1)(a)",
      CARSON_MAYOR_EXCERPT,
    ),
    presidingRules: [
      {
        rule: said(
          {
            context: "REGULAR_MEETING",
            presidingRole: "MAYOR",
            legislativeVoteRole: "FULL_VOTE",
            conditions: [
              "The Mayor serves as a member of the Board and presides over its meetings.",
            ],
          } satisfies PresidingRule,
          "nv-carson-city-charter",
          "Charter § 3.010(1)(a)",
          CARSON_MAYOR_EXCERPT,
        ),
      },
    ],
    partisanshipHistory: [],
    electionCalendar: open(
      "the enacted text retrieved fixes when a term begins and ends but not the primary and general election regime.",
    ),
    terms: [
      {
        seatClass: "supervisor",
        termYears: said(
          4,
          "nv-carson-city-charter",
          "Charter § 2.010(4)",
          CARSON_ATLARGE_EXCERPT,
        ),
        termLimit: open(
          "the enacted text retrieved states no limit on the number of terms a Supervisor may serve.",
        ),
      },
    ],
    vacancyMechanism: open(
      "the charter's vacancy section was not among the enacted-text regions retrieved for this record.",
    ),
  },
  administrativeStructure: {
    executiveLegislativeSeparation: said(
      "EXECUTIVE_AND_LEGISLATIVE_FUSED_IN_BODY",
      "nv-carson-city-charter",
      "Charter §§ 2.010(1), 3.010(1)(a)",
      CARSON_BOARD_EXCERPT,
    ),
    mayor: said(
      {
        title: "Mayor",
        structuralPosition: "PRESIDING_MEMBER_OF_BODY",
      } satisfies MayorValue,
      "nv-carson-city-charter",
      "Charter § 3.010(1)(a)",
      CARSON_MAYOR_EXCERPT,
    ),
    professionalManager: said(
      {
        title: "Manager",
        appointedByRole: "COMMISSION",
        removableByRole: "COMMISSION",
        confirmationRequired: false,
        removalConditions: [],
        statedRole:
          "Chief Administrative Officer of the City, responsible for carrying out the policy of the Board; duties and salary fixed by the Board.",
      } satisfies ManagerValue,
      "nv-carson-city-charter",
      "Charter § 3.020(1)",
      CARSON_MANAGER_EXCERPT,
    ),
    departmentHeadAuthority: open(
      "the enacted text retrieved does not establish who appoints or directs department heads.",
    ),
    reportingRelationships: said(
      "The Manager is responsible for carrying out the policy of the Board.",
      "nv-carson-city-charter",
      "Charter § 3.020(1)",
      CARSON_MANAGER_EXCERPT,
    ),
  },
  enumeratedPowers: [
    power(
      "PRESIDE",
      "MAYOR",
      true,
      {
        allowed: true,
        target: "Meetings of the Board of Supervisors",
        conditions: ["The Mayor serves as a member of the Board."],
        threshold: null,
        exceptions: [],
      },
      "nv-carson-city-charter",
      "Charter § 3.010(1)(a)",
      CARSON_MAYOR_EXCERPT,
    ),
    power(
      "APPOINTMENT",
      "COMMISSION",
      true,
      {
        allowed: true,
        target: "Manager, the Chief Administrative Officer of the City",
        conditions: ["The Board fixes the Manager's duties and salary."],
        threshold: null,
        exceptions: [],
      },
      "nv-carson-city-charter",
      "Charter § 3.020(1)",
      CARSON_MANAGER_EXCERPT,
    ),
    power(
      "ORDINANCE_ADOPTION",
      "COMMISSION",
      true,
      {
        allowed: true,
        target: "Ordinances of Carson City",
        conditions: [
          "Passage by bill and majority vote of the whole Board of Supervisors.",
        ],
        threshold: {
          numerator: 1,
          denominator: 2,
          denominatorBasis: "TOTAL_MEMBERSHIP",
          fixedVotesRequired: null,
        },
        exceptions: [],
      },
      "nv-carson-city-charter",
      "Charter § 2.100(1)",
      CARSON_PASSAGE_EXCERPT,
    ),
    power(
      "ORDINANCE_AMENDMENT",
      "COMMISSION",
      true,
      {
        allowed: true,
        target: "A proposed ordinance between its first and final readings",
        conditions: [
          "At the second reading the ordinance is read as first introduced or as amended, and is then finally voted upon or postponed.",
        ],
        threshold: null,
        exceptions: [],
      },
      "nv-carson-city-charter",
      "Charter § 2.110(2)",
      CARSON_SECOND_READING_EXCERPT,
    ),
  ],
  legislativeProcedure: {
    measureTypes: said(
      ["ordinance", "emergency ordinance"],
      "nv-carson-city-charter",
      "Charter § 2.110",
      CARSON_FIRST_READING_EXCERPT,
    ),
    introductionSponsorship: open(
      "the enacted text retrieved does not state who may propose an ordinance.",
    ),
    readings: said(
      2,
      "nv-carson-city-charter",
      "Charter § 2.110(1)-(2)",
      CARSON_SECOND_READING_EXCERPT,
    ),
    committeeReferral: open(
      "the enacted text retrieved establishes no committee referral for an ordinance.",
    ),
    publicHearing: said(
      "Notice of the filing of a proposed ordinance must be published once at least 10 days before its adoption, and the Board must adopt or reject the ordinance within 60 days of that publication.",
      "nv-carson-city-charter",
      "Charter § 2.110(1)",
      CARSON_FIRST_READING_EXCERPT,
    ),
    quorum: said(
      "A majority of all members of the Board constitutes a quorum to do business.",
      "nv-carson-city-charter",
      "Charter § 2.050(3)",
      CARSON_QUORUM_EXCERPT,
    ),
    quorumRule: said(
      {
        numerator: 1,
        denominator: 2,
        denominatorBasis: "TOTAL_MEMBERSHIP",
        fixedVotesRequired: null,
      } satisfies VoteThreshold,
      "nv-carson-city-charter",
      "Charter § 2.050(3)",
      CARSON_QUORUM_EXCERPT,
    ),
    passageThreshold: said(
      CARSON_PASSAGE_EXCERPT,
      "nv-carson-city-charter",
      "Charter § 2.100(1)",
      CARSON_PASSAGE_EXCERPT,
    ),
    amendment: said(
      "At the reading following its proposal an ordinance is read as first introduced or as amended, and is then finally voted upon or action on it is postponed.",
      "nv-carson-city-charter",
      "Charter § 2.110(2)",
      CARSON_SECOND_READING_EXCERPT,
    ),
    mayoralAction: said(
      "All ordinances must be signed by the Mayor and attested by the Clerk.",
      "nv-carson-city-charter",
      "Charter § 2.110(4)",
      CARSON_PUBLICATION_EXCERPT,
    ),
    mayoralActionWindow: open(
      "the enacted text retrieved requires the Mayor's signature but fixes no period for it and states no consequence of withholding it.",
    ),
    override: silent(
      "nv-carson-city-charter",
      "Charter §§ 2.110, 3.010",
      CARSON_MAYOR_EXCERPT,
      "The Mayor sits on the Board and votes there; the sections retrieved establish no veto, so there is no override provision in them.",
    ),
    effectivePublication: said(
      "An ordinance must be published by title, with the names of the Supervisors voting for and against, no later than 14 days after adoption; the Board may order publication in full instead.",
      "nv-carson-city-charter",
      "Charter § 2.110(4)",
      CARSON_PUBLICATION_EXCERPT,
    ),
  },
  budgetProcedure: {
    fiscalYear: open(
      "the charter's fiscal sections were not among the enacted-text regions retrieved for this record.",
    ),
    prepares: open("the budget sections were not retrieved for this record."),
    proposes: open("the budget sections were not retrieved for this record."),
    amends: open("the budget sections were not retrieved for this record."),
    adopts: open("the budget sections were not retrieved for this record."),
    submissionDeadline: open(
      "the budget sections were not retrieved for this record.",
    ),
    adoptionDeadline: open(
      "the budget sections were not retrieved for this record.",
    ),
    balancedBudgetConstraint: open(
      "the budget sections were not retrieved for this record.",
    ),
  },
  researchObservations: [
    said(
      "No ordinance shall contain more than one subject, which shall be briefly indicated in the title. Where the subject of the ordinance is not so expressed in the title, the ordinance is void as to the matter not expressed in the title.",
      "nv-carson-city-charter",
      "Charter § 2.100(2)",
      "No ordinance shall contain more than one subject, which shall be briefly indicated in the title. Where the subject of the ordinance is not so expressed in the title, the ordinance is void as to the matter not expressed in the title.",
    ),
    said(
      "Any ordinance which amends an existing ordinance shall set out in full the ordinance or sections thereof to be amended, and shall indicate matter to be omitted by enclosing it in brackets and shall indicate new matter by underscoring or by italics.",
      "nv-carson-city-charter",
      "Charter § 2.100(3)",
      "Any ordinance which amends an existing ordinance shall set out in full the ordinance or sections thereof to be amended, and shall indicate matter to be omitted by enclosing it in brackets and shall indicate new matter by underscoring or by italics.",
    ),
  ],
  consolidation: {
    consolidationType: said(
      "CITY_COUNTY",
      "nv-carson-city-charter",
      "Charter, act title",
      CARSON_CONSOLIDATION_EXCERPT,
    ),
    enablingAuthority: said(
      "Chapter 213, Statutes of Nevada 1969",
      "nv-carson-city-charter",
      "Charter, act title",
      CARSON_CONSOLIDATION_EXCERPT,
    ),
    consolidationEffectiveDate: open(
      "the act was approved in 1969; the enacted text retrieved does not state the day the consolidation took effect.",
    ),
    predecessorUnits: [
      {
        name: "Ormsby County",
        unitKind: "county",
        attested: said(
          true,
          "nv-carson-city-charter",
          "Charter, act title",
          CARSON_CONSOLIDATION_EXCERPT,
        ),
      },
      {
        name: "Carson City",
        unitKind: "municipality",
        attested: said(
          true,
          "nv-carson-city-charter",
          "Charter, act title",
          CARSON_CONSOLIDATION_EXCERPT,
        ),
      },
    ],
    retainedNestedGovernments: [],
    retainedCountyEquivalentOffices: [],
    serviceDistricts: [],
    separateSchoolOrSpecialDistricts: [],
    nestedGovernmentCount: open(
      "the enacted text retrieved counts no governments inside this one.",
    ),
    parallelGeneralGovernment: open(
      "the enacted text retrieved does not describe another general-purpose government covering the same territory.",
    ),
  },
  meetingPlaces: [],
  meetingSeries: [
    {
      seriesKey: "regular",
      kind: "REGULAR_MEETING",
      bodyName: said(
        "Carson City Board of Supervisors",
        "nv-carson-city-charter",
        "Charter § 2.050(1)",
        CARSON_MEETINGS_EXCERPT,
      ),
      cadence: said(
        {
          kind: "OTHER",
          ordinals: [],
          weekday: null,
          startTime: null,
          note: "At least two regular meetings each month; the Board may provide by ordinance for more. The charter fixes no day or time.",
        },
        "nv-carson-city-charter",
        "Charter § 2.050(1)",
        CARSON_MEETINGS_EXCERPT,
      ),
      venue: open(
        "the enacted text retrieved names no meeting place for the Board.",
      ),
      publicAttendance: said(
        {
          openToPublic: true,
          publicCommentOffered: "UNKNOWN",
          note: "Except as otherwise provided by law, the sessions and all proceedings of the Board must be public. The charter says nothing about a right to address the Board.",
        } satisfies PublicAttendanceRule,
        "nv-carson-city-charter",
        "Charter § 2.050(4)",
        CARSON_PUBLIC_EXCERPT,
      ),
    },
  ],
  unresolved: [
    "The vote required to pass a Carson City ordinance is not in the charter sections retrieved; the government is therefore inspectable and attendable here but cannot carry an ordinance to a final vote.",
    "The charter's budget, vacancy and department sections were not among the enacted-text regions retrieved for this record.",
    "Whether Board elections here are partisan or nonpartisan was not established by the enacted text retrieved.",
  ],
  asOf: MUNICIPAL_PRODUCTION_AS_OF,
  citedSources: [],
};

/** Every government this domain compiles from first-party enacted text. */
export const MUNICIPAL_PRODUCTION_PACKS: readonly MunicipalPackInput[] = [
  CHARLOTTESVILLE,
  RICHMOND,
  CARSON_CITY,
  ...SUPPLEMENTAL_PRODUCTION_PACKS,
];

/** Which retrieved artifacts a government's cells are allowed to cite. */
export const PRODUCTION_PACK_ARTIFACTS: Readonly<
  Record<string, readonly string[]>
> = {
  "us-va-charlottesville": ["va-charlottesville-charter", "va-code-15-2-1427"],
  "us-va-richmond": [
    "va-richmond-charter",
    "va-code-15-2-1427",
    "va-code-15-2-1415",
  ],
  "us-nv-carson-city": ["nv-carson-city-charter"],
  "us-or-portland": ["or-portland-charter-2-102"],
};

/**
 * Which Census place each production government sits at, by the place's own
 * name in the accepted corpus.
 *
 * An assertion this repository makes, not a fact any charter states. It carries
 * a name rather than an identifier so the export resolves it and refuses an
 * ambiguous or absent match, and it backs nothing but identity: a Census place
 * is not a government and never evidence of a municipal power.
 */
export const PRODUCTION_PLACE_CROSSWALK: Readonly<Record<string, string>> = {
  "us-va-charlottesville": "Charlottesville",
  "us-va-richmond": "Richmond",
  "us-nv-carson-city": "Carson City",
};

/** The unused Carson City ward-residency clause, kept so the excerpt is cited. */
export const CARSON_WARD_RESIDENCY_EXCERPT = CARSON_WARD_EXCERPT;
