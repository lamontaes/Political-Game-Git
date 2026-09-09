import {
  authored,
  IIJA_FISCAL_TREATMENT,
  TARGETED_SECTION_SOURCE,
  formatStatutoryDate,
  type PredicateAuthority,
  type ProgramContentEvidence,
  type ProgramFamily,
} from "./legislation-content-contracts";

/**
 * The bank of acts that are about money as such.
 *
 * The infrastructure families all answer the question "what shall the state
 * do?" — and a bank that only answers that question produces one mechanism
 * wearing different subjects, because authorizing a programme is the only act
 * it can perform. These three families answer different questions. An
 * appropriation asks what money is actually provided for something already
 * authorized. A sunset or repeal asks whether an authority should continue to
 * exist. A revenue measure asks who pays.
 *
 * The distinction is not decoration. The pilot's own analyst separated
 * authorizing legislation from appropriation treatment, and separated revenues
 * from spending, precisely because collapsing them produces a number that
 * describes nothing. The compiler enforces the same separation: an
 * appropriation must name an authority, may not exceed the ceiling that
 * authority set, and lands in a different field of the compiled draft than a
 * ceiling does.
 */

/* -------------------------------------------------------------------------- */
/* The authorities this state is assumed already to run                        */
/* -------------------------------------------------------------------------- */

/**
 * Authored background programmes.
 *
 * They exist so an appropriation or a repeal is playable on a member's first
 * day rather than only after they have authorized something themselves. Each
 * one is fiction with a declared author: no real fund, statute or citation is
 * reproduced, and the citation labels below are the game's own.
 */
const RURAL_TRANSIT_FUND: PredicateAuthority = {
  kind: "standing-statute",
  authorityKey: "standing:rural-transit-assistance",
  citationLabel: "the Rural Transit Assistance Act",
  programmeLabel: "the rural transit assistance fund",
  authorizesSpending: true,
  authorizedCeilingMinorUnits: 4_000_000_000,
  currency: "USD",
  evidence: authored(
    "An authored standing programme. No real transit fund, statute or appropriation is described, and its ceiling is a design choice rather than a figure read from anywhere.",
  ),
};

const SCHOOL_FACILITIES_FUND: PredicateAuthority = {
  kind: "standing-statute",
  authorityKey: "standing:school-facilities",
  citationLabel: "the School Facilities Revolving Fund Act",
  programmeLabel: "the school facilities revolving fund",
  authorizesSpending: true,
  authorizedCeilingMinorUnits: 12_000_000_000,
  currency: "USD",
  evidence: authored(
    "An authored standing programme. The game asserts no real school construction fund and no real balance in one.",
  ),
};

/**
 * A standing authority that spends nothing.
 *
 * Declared on purpose. It is what makes the appropriation refusal reachable in
 * play rather than only in a test: a player who tries to appropriate against a
 * recordkeeping statute is told there is nothing there to appropriate against.
 */
const RECORDS_RETENTION_ACT: PredicateAuthority = {
  kind: "standing-statute",
  authorityKey: "standing:records-retention",
  citationLabel: "the Public Records Retention Act",
  programmeLabel: "the public records retention requirements",
  authorizesSpending: false,
  authorizedCeilingMinorUnits: null,
  currency: "USD",
  evidence: authored(
    "An authored standing duty with no money attached. No real records statute is described.",
  ),
};

const APPROPRIATION_SOURCE: ProgramContentEvidence = IIJA_FISCAL_TREATMENT;

/* -------------------------------------------------------------------------- */
/* Family — appropriations                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Providing money for something that is already authorized.
 *
 * This family creates nothing. Every bill it writes names an authority that
 * already exists — a standing programme, or a measure this player authorized
 * earlier in this same life — and provides money against it. Two consequences
 * follow that no funding slider produces on its own: the bill cannot be written
 * at all when there is nothing to fund, and the amount is bounded by what that
 * authority allows rather than by a number chosen in this bank.
 */
const APPROPRIATIONS: ProgramFamily = {
  familyKey: "appropriations",
  familyVersion: "v2",
  title: "Appropriations",
  mechanism:
    "Provides money for a programme that is already authorized, up to what that authority allows.",
  acceptedDimensions: [
    "authority-reference",
    "funding-cap",
    "timing",
    "oversight",
  ],
  structuralProvenance: [APPROPRIATION_SOURCE],
  standingAuthorities: [
    RURAL_TRANSIT_FUND,
    SCHOOL_FACILITIES_FUND,
    RECORDS_RETENTION_ACT,
  ],
  intendedOutcome: {
    metricStableKey: "finance.appropriated-and-spent",
    baselineSeriesKey: "finance:appropriated-and-spent",
    statement:
      "How much of what was provided is actually obligated and spent, and when.",
    evidence: {
      kind: "forecast-claim",
      note: "Money provided is not money spent, and the schedule on which it goes out is its own question.",
      unavailableReason:
        "Nothing in this world records obligations or outlays against an appropriation, so the amount spent cannot be reported.",
    },
  },
  variants: [
    {
      variantKey: "single-programme",
      instrument: "appropriation",
      label: "Appropriation to a single programme",
      synopsis:
        "Provides money for one programme that is already authorized. It creates no programme and widens no eligibility.",
      shortTitle: "Programme Appropriation",
      subjectClass: "appropriation",
      authorizesAppropriation: true,
      declaredLimits: [
        "It provides money. It does not change who qualifies, what the programme does, or how long it runs.",
        "It cannot provide more than the authority it names allows.",
        "Money provided is not money spent. Nothing here records an obligation or an outlay.",
      ],
      defaults: {
        appropriation: {
          kind: "money",
          minorUnits: 1_200_000_000,
          currency: "USD",
        },
        "availability-term": { kind: "duration-years", years: 2 },
        "reporting-duty": { kind: "enumerated", value: "quarterly-statement" },
      },
      parameters: [
        {
          key: "appropriation",
          dimension: "funding-cap",
          kind: "money",
          label: "Amount provided",
          minMinorUnits: 100_000_000,
          maxMinorUnits: 15_000_000_000,
          currency: "USD",
          evidence: authored(
            "An authored range. Its upper end deliberately exceeds what some authorities allow, so a bill that would overspend its authority is refused rather than quietly reduced.",
          ),
        },
        {
          key: "availability-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Available until",
          minYears: 1,
          maxYears: 4,
          evidence: authored(
            "An authored availability period. Real lapse rules vary by state and none is reproduced here.",
          ),
        },
        {
          key: "reporting-duty",
          dimension: "oversight",
          kind: "enumerated",
          label: "What the agency must report",
          options: [
            {
              value: "annual-statement",
              label: "An annual statement of what was spent",
              clausePhrase:
                "an annual statement of the amounts obligated and expended under this appropriation",
            },
            {
              value: "quarterly-statement",
              label: "A quarterly statement of what was spent",
              clausePhrase:
                "a quarterly statement of the amounts obligated and expended under this appropriation",
            },
            {
              value: "quarterly-with-unobligated",
              label: "Quarterly, and what remains unobligated",
              clausePhrase:
                "a quarterly statement of the amounts obligated and expended under this appropriation and of the amount that remains unobligated",
            },
          ],
          evidence: authored(
            "An authored reporting duty. No real reporting statute is reproduced.",
          ),
        },
      ],
      clauses: [
        {
          provisionKey: "authority-named",
          dimension: "authority-reference",
          heading: "Programme funded",
          parameterKey: null,
          render: (resolved) => {
            const authority = resolved.authority;
            if (!authority) {
              throw new Error(
                "An appropriation reached its authority clause without an authority.",
              );
            }
            return {
              text: `The appropriation made by this Act is for ${authority.programmeLabel} as authorized by ${authority.citationLabel}. This Act establishes no programme and changes no requirement of ${authority.citationLabel}.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `everyone ${authority.citationLabel} already reaches`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "amount-provided",
          dimension: "funding-cap",
          heading: "Amount appropriated",
          parameterKey: "appropriation",
          render: (resolved) => {
            const authority = resolved.authority;
            const amount = resolved.money("appropriation");
            const value = resolved.values["appropriation"];
            const minorUnits =
              value !== undefined && value.kind === "money"
                ? value.minorUnits
                : null;
            return {
              text: `There is appropriated ${amount} for the purposes of ${authority?.citationLabel ?? "the authority named in this Act"}. This appropriation is in addition to any other amount provided for that purpose and does not increase the amount that Act authorizes.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `the programme ${authority?.citationLabel ?? "named in this Act"} authorizes`,
              },
              fiscalExposureLabel: `${amount} appropriated`,
              fiscalExposureMinorUnits: minorUnits,
            };
          },
        },
        {
          provisionKey: "availability",
          dimension: "timing",
          heading: "Period of availability",
          parameterKey: "availability-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "The amount appropriated by this Act remains available until expended."
                : `The amount appropriated by this Act remains available until ${formatStatutoryDate(resolved.endsOn)}, and any part of it not obligated by that date lapses to the fund from which it was drawn.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "the agency administering the appropriation",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "spending-report",
          dimension: "oversight",
          heading: "Report of expenditure",
          parameterKey: "reporting-duty",
          render: (resolved) => {
            const choice = resolved.choice("reporting-duty");
            return {
              text: `The agency administering this appropriation shall submit to the legislature ${choice.clausePhrase}.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "the legislature and anyone reading its record",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
      ],
      amendmentInvitation: {
        provisionKey: "district-set-aside",
        sectionNumber: 5,
        heading: "Set-aside for the counties with the oldest awards",
        beneficiaryLabel: "counties that have waited longest for an award",
        placeLabel: "the counties at the back of the queue",
        statedGround:
          "The same counties have been at the back of this queue every year the fund has existed, and an appropriation with no set-aside will put them there again.",
        segmentKey: "finance.oldest-award-set-aside",
        requestedMinorUnits: 220_000_000,
        cappedMinorUnits: 90_000_000,
        render: (amountLabel) =>
          `Of the amount appropriated by this Act, not less than ${amountLabel} shall be reserved for applicants whose applications have been pending longest, and any part of that reservation not awarded within the period of availability shall be released.`,
        evidence: TARGETED_SECTION_SOURCE,
      },
    },
    {
      variantKey: "supplemental",
      instrument: "appropriation",
      label: "Supplemental appropriation",
      synopsis:
        "Provides money mid-year for an authority already running, on a short availability with a hard lapse.",
      shortTitle: "Supplemental Appropriation",
      subjectClass: "appropriation",
      authorizesAppropriation: true,
      declaredLimits: [
        "It is a top-up. It provides money and changes nothing else about the programme.",
        "Its availability is short by design, and what is not obligated lapses.",
      ],
      defaults: {
        appropriation: {
          kind: "money",
          minorUnits: 350_000_000,
          currency: "USD",
        },
        "availability-term": { kind: "duration-years", years: 1 },
        "reporting-duty": {
          kind: "enumerated",
          value: "statement-on-lapse",
        },
      },
      parameters: [
        {
          key: "appropriation",
          dimension: "funding-cap",
          kind: "money",
          label: "Supplemental amount",
          minMinorUnits: 25_000_000,
          maxMinorUnits: 3_000_000_000,
          currency: "USD",
          evidence: authored(
            "An authored range for a mid-year top-up. It is smaller than a full-year appropriation because that is the design, not because anything measured says so.",
          ),
        },
        {
          key: "availability-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Available until",
          minYears: 1,
          maxYears: 2,
          evidence: authored(
            "An authored short availability. No real lapse rule is reproduced.",
          ),
        },
        {
          key: "reporting-duty",
          dimension: "oversight",
          kind: "enumerated",
          label: "What the agency must report",
          options: [
            {
              value: "statement-on-lapse",
              label: "A statement when the money lapses",
              clausePhrase:
                "a statement, within thirty days after the appropriation lapses, of the amount that lapsed and why",
            },
            {
              value: "statement-on-obligation",
              label: "A statement when the money is committed",
              clausePhrase:
                "a statement, within thirty days after the full amount is obligated, identifying each award made from it",
            },
          ],
          evidence: authored("An authored reporting duty."),
        },
      ],
      clauses: [
        {
          provisionKey: "authority-named",
          dimension: "authority-reference",
          heading: "Programme funded",
          parameterKey: null,
          render: (resolved) => {
            const authority = resolved.authority;
            if (!authority) {
              throw new Error(
                "A supplemental appropriation reached its authority clause without an authority.",
              );
            }
            return {
              text: `This Act makes a supplemental appropriation for ${authority.programmeLabel} as authorized by ${authority.citationLabel}. It is supplemental to, and not in substitution for, any amount already provided for that purpose.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `everyone ${authority.citationLabel} already reaches`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "amount-provided",
          dimension: "funding-cap",
          heading: "Amount appropriated",
          parameterKey: "appropriation",
          render: (resolved) => {
            const amount = resolved.money("appropriation");
            const value = resolved.values["appropriation"];
            const minorUnits =
              value !== undefined && value.kind === "money"
                ? value.minorUnits
                : null;
            return {
              text: `There is appropriated ${amount}, in addition to amounts previously appropriated, for the purposes of the Act named in Section 1.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "the programme named in Section 1",
              },
              fiscalExposureLabel: `${amount} appropriated`,
              fiscalExposureMinorUnits: minorUnits,
            };
          },
        },
        {
          provisionKey: "lapse",
          dimension: "timing",
          heading: "Lapse",
          parameterKey: "availability-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "The amount appropriated by this Act remains available until expended."
                : `The amount appropriated by this Act lapses on ${formatStatutoryDate(resolved.endsOn)}. No part of it may be obligated after that date, and no part of it may be transferred to another purpose.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "the agency administering the appropriation",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "spending-report",
          dimension: "oversight",
          heading: "Report",
          parameterKey: "reporting-duty",
          render: (resolved) => {
            const choice = resolved.choice("reporting-duty");
            return {
              text: `The agency administering this appropriation shall submit to the legislature ${choice.clausePhrase}.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "the legislature and anyone reading its record",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
      ],
      amendmentInvitation: {
        provisionKey: "carryforward",
        sectionNumber: 5,
        heading: "Carryforward for awards already in progress",
        beneficiaryLabel: "applicants whose awards straddle the lapse date",
        placeLabel: "the projects that will be halfway through when it lapses",
        statedGround:
          "A hard lapse date falls in the middle of work that is already under way, and the money goes back rather than finishing it.",
        segmentKey: "finance.in-progress-carryforward",
        requestedMinorUnits: 140_000_000,
        cappedMinorUnits: 45_000_000,
        render: (amountLabel) =>
          `Notwithstanding the lapse required by this Act, not more than ${amountLabel} obligated for work commenced before the lapse date shall remain available until that work is complete.`,
        evidence: authored(
          "An authored request from a fictional member. Nothing in the world says it was granted.",
        ),
      },
    },
    {
      variantKey: "conditional-match",
      instrument: "appropriation",
      label: "Appropriation conditioned on a local match",
      synopsis:
        "Provides money only to the extent a local government puts up a stated share of its own.",
      shortTitle: "Matched Appropriation",
      subjectClass: "appropriation",
      authorizesAppropriation: true,
      declaredLimits: [
        "A local government that cannot raise the match draws nothing, however much is appropriated.",
        "The match requirement is a condition on the money, not a change to who is eligible under the programme itself.",
      ],
      defaults: {
        appropriation: {
          kind: "money",
          minorUnits: 800_000_000,
          currency: "USD",
        },
        "match-share": { kind: "integer", value: 20 },
        "availability-term": { kind: "duration-years", years: 3 },
      },
      parameters: [
        {
          key: "appropriation",
          dimension: "funding-cap",
          kind: "money",
          label: "Amount provided",
          minMinorUnits: 100_000_000,
          maxMinorUnits: 10_000_000_000,
          currency: "USD",
          evidence: authored("An authored range for a matched appropriation."),
        },
        {
          key: "match-share",
          dimension: "oversight",
          kind: "integer",
          label: "Local share required",
          min: 0,
          max: 50,
          unitLabel: "per cent",
          evidence: authored(
            "An authored match share. Real match requirements vary widely and none is reproduced; zero is offered because a match of nothing is a real legislative choice.",
          ),
        },
        {
          key: "availability-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Available until",
          minYears: 2,
          maxYears: 6,
          evidence: authored(
            "An authored availability period, longer than a supplemental because raising a match takes a budget cycle.",
          ),
        },
      ],
      clauses: [
        {
          provisionKey: "authority-named",
          dimension: "authority-reference",
          heading: "Programme funded",
          parameterKey: null,
          render: (resolved) => {
            const authority = resolved.authority;
            if (!authority) {
              throw new Error(
                "A matched appropriation reached its authority clause without an authority.",
              );
            }
            return {
              text: `The appropriation made by this Act is for ${authority.programmeLabel} as authorized by ${authority.citationLabel}, and is subject to the condition stated in this Act.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `everyone ${authority.citationLabel} already reaches`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "amount-provided",
          dimension: "funding-cap",
          heading: "Amount appropriated",
          parameterKey: "appropriation",
          render: (resolved) => {
            const amount = resolved.money("appropriation");
            const value = resolved.values["appropriation"];
            const minorUnits =
              value !== undefined && value.kind === "money"
                ? value.minorUnits
                : null;
            return {
              text: `There is appropriated ${amount} for the purpose named in Section 1, to be disbursed only as the condition in Section 3 is satisfied.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "the programme named in Section 1",
              },
              fiscalExposureLabel: `${amount} appropriated`,
              fiscalExposureMinorUnits: minorUnits,
            };
          },
        },
        {
          provisionKey: "match-condition",
          dimension: "oversight",
          heading: "Condition on disbursement",
          parameterKey: "match-share",
          render: (resolved) => {
            const share = resolved.integer("match-share");
            return {
              text:
                share === 0
                  ? "No local contribution is required as a condition of disbursement under this Act."
                  : `No amount appropriated by this Act shall be disbursed to a local government except to the extent that the local government commits, from its own funds, an amount equal to ${share} per cent of the amount disbursed. A local government that commits less receives proportionately less, and receives nothing if it commits nothing.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel:
                  share === 0
                    ? "every local government the programme reaches"
                    : "every local government able to commit the required share",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "availability",
          dimension: "timing",
          heading: "Period of availability",
          parameterKey: "availability-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "The amount appropriated by this Act remains available until expended."
                : `The amount appropriated by this Act remains available until ${formatStatutoryDate(resolved.endsOn)}, by which date a local government must have committed its share for any amount to be disbursed to it.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "every local government within the period",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "hardship-waiver",
        sectionNumber: 5,
        heading: "Waiver of the match for the least able to pay",
        beneficiaryLabel: "local governments that cannot raise the match",
        placeLabel:
          "the counties whose whole road budget is smaller than the match",
        statedGround:
          "A match requirement gives the money to the places that already had some, and the places that need it most are the ones that will not draw a dollar.",
        segmentKey: "finance.match-hardship-waiver",
        requestedMinorUnits: 260_000_000,
        cappedMinorUnits: 110_000_000,
        render: (amountLabel) =>
          `Not more than ${amountLabel} of the amount appropriated by this Act may be disbursed without regard to the condition in Section 3, to local governments demonstrating that the required share exceeds their capacity to raise it.`,
        evidence: authored(
          "An authored request from a fictional member. It is the ask that would turn a matched appropriation into a partly unmatched one.",
        ),
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Family — sunset and repeal                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Ending, shortening or extending something that already exists.
 *
 * The only family in the bank whose bills subtract. It states no amount and
 * provides no money, and that is exactly why it is here: an act whose entire
 * content is a date and a citation cannot be confused with a funding slider,
 * and a bank that cannot write one cannot express half of what a legislature
 * spends its time doing.
 */
const PROGRAM_SUNSET: ProgramFamily = {
  familyKey: "program-sunset",
  familyVersion: "v2",
  title: "Sunset and repeal",
  mechanism:
    "Ends, shortens or extends an authority that already exists, without providing or withdrawing a dollar.",
  acceptedDimensions: ["authority-reference", "timing", "oversight"],
  structuralProvenance: [APPROPRIATION_SOURCE],
  intendedOutcome: {
    metricStableKey: "finance.authority-in-force",
    baselineSeriesKey: "finance:authority-in-force",
    statement:
      "Which authorities are in force, and what changes for the people who relied on one that ends.",
    evidence: {
      kind: "forecast-claim",
      note: "Repealing an authority removes a ceiling. What that does to anyone depends on what was being spent under it, which is a different question.",
      unavailableReason:
        "Nothing in this world records what has been spent under a standing authority, so the effect of ending one cannot be reported.",
    },
  },
  variants: [
    {
      variantKey: "terminate-on-date",
      instrument: "sunset-repeal",
      label: "Sunset on a stated date",
      synopsis:
        "Sets a date after which an existing authority has no further effect, with a report due before it arrives.",
      shortTitle: "Sunset",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It states no amount and provides no money. Removing a ceiling is not a saving anybody has banked.",
        "It does not recover money already provided under the authority it ends.",
      ],
      defaults: {
        "sunset-term": { kind: "duration-years", years: 4 },
        "pre-sunset-review": {
          kind: "enumerated",
          value: "report-before-expiry",
        },
      },
      parameters: [
        {
          key: "sunset-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Years until it ends",
          minYears: 1,
          maxYears: 10,
          evidence: authored(
            "An authored sunset horizon. No real sunset schedule is reproduced.",
          ),
        },
        {
          key: "pre-sunset-review",
          dimension: "oversight",
          kind: "enumerated",
          label: "What must happen before it ends",
          options: [
            {
              value: "no-review",
              label: "Nothing; it simply ends",
              clausePhrase:
                "No report is required before the date stated in this Act",
            },
            {
              value: "report-before-expiry",
              label: "A report to the legislature beforehand",
              clausePhrase:
                "The administering agency shall report to the legislature, not later than one year before the date stated in this Act, on what has been done under the authority this Act ends",
            },
            {
              value: "report-and-hearing",
              label: "A report, and a hearing on it",
              clausePhrase:
                "The administering agency shall report to the legislature, not later than one year before the date stated in this Act, on what has been done under the authority this Act ends, and the report shall be taken up in a public hearing",
            },
          ],
          evidence: authored("An authored review requirement."),
        },
      ],
      clauses: [
        {
          provisionKey: "authority-named",
          dimension: "authority-reference",
          heading: "Authority affected",
          parameterKey: null,
          render: (resolved) => {
            const authority = resolved.authority;
            if (!authority) {
              throw new Error(
                "A sunset reached its authority clause without an authority.",
              );
            }
            return {
              text: `This Act applies to ${authority.citationLabel} and to ${authority.programmeLabel} established under it. Nothing in this Act affects an obligation lawfully entered into before the date stated in Section 2.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `everyone ${authority.citationLabel} reaches`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "sunset-date",
          dimension: "timing",
          heading: "Expiration",
          parameterKey: "sunset-term",
          render: (resolved) => {
            const authority = resolved.authority;
            return {
              text:
                resolved.endsOn === null
                  ? `${authority?.citationLabel ?? "The Act named in Section 1"} shall expire on a date to be fixed by the legislature.`
                  : `${authority?.citationLabel ?? "The Act named in Section 1"} shall have no further effect after ${formatStatutoryDate(resolved.endsOn)}. No award may be made under it after that date.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `everyone who would otherwise have applied after that date`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "pre-sunset-review",
          dimension: "oversight",
          heading: "Review before expiration",
          parameterKey: "pre-sunset-review",
          render: (resolved) => ({
            text: `${resolved.choice("pre-sunset-review").clausePhrase}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "the legislature and anyone reading its record",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "wind-down",
        sectionNumber: 4,
        heading: "Wind-down for applications already filed",
        beneficiaryLabel:
          "applicants whose applications are pending on the date",
        placeLabel: "the towns that applied and were still waiting",
        statedGround:
          "An application filed in good faith two years ago should not be extinguished by a date, and the towns still in the queue are the ones with the least staff to reapply.",
        segmentKey: "finance.sunset-wind-down",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "Notwithstanding the expiration required by this Act, an application filed before the date stated in Section 2 shall be determined under the authority as it stood on that date.",
        evidence: authored(
          "An authored request from a fictional member. It asks for a saving clause, not for money, and nothing in the world says it was granted.",
        ),
      },
    },
    {
      variantKey: "extend-authority",
      instrument: "sunset-repeal",
      label: "Replacement expiration date",
      synopsis:
        "Sets a replacement expiration date and states the reporting conditions. It does not assume the previous expiration is known.",
      shortTitle: "Authority Expiration",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It sets a date for the authority to end. It appropriates nothing.",
        "It does not change who qualifies or what the programme may do.",
      ],
      defaults: {
        "extension-term": { kind: "duration-years", years: 6 },
        "condition-of-extension": {
          kind: "enumerated",
          value: "annual-report",
        },
      },
      parameters: [
        {
          key: "extension-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Years from filing to the proposed expiration",
          minYears: 1,
          maxYears: 12,
          evidence: authored(
            "An authored replacement expiration measured from this draft’s filing date, not an addition to an unknown earlier date.",
          ),
        },
        {
          key: "condition-of-extension",
          dimension: "oversight",
          kind: "enumerated",
          label: "What continued authority is conditioned on",
          options: [
            {
              value: "unconditional",
              label: "No additional reporting condition",
              clausePhrase:
                "The continued authority under this Act is not conditioned on any report or finding",
            },
            {
              value: "annual-report",
              label: "An annual report on what the authority did",
              clausePhrase:
                "The administering agency shall report annually on the awards made under the authority named in Section 1, and the continued authority under this Act ceases if no report is filed for two consecutive years",
            },
            {
              value: "performance-finding",
              label: "A finding that it did what it was for",
              clausePhrase:
                "The continued authority under this Act ceases unless the legislature finds, in the fourth year after enactment, that the authority has been used for the purposes stated in the Act named in Section 1",
            },
          ],
          evidence: authored("An authored condition."),
        },
      ],
      clauses: [
        {
          provisionKey: "authority-named",
          dimension: "authority-reference",
          heading: "Authority affected",
          parameterKey: null,
          render: (resolved) => {
            const authority = resolved.authority;
            if (!authority) {
              throw new Error(
                "An extension reached its authority clause without an authority.",
              );
            }
            return {
              text: `This Act replaces the expiration date of ${authority.citationLabel}. Except for the conditions stated in this Act, it makes no other change to that Act, to ${authority.programmeLabel}, or to who may draw on it.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `everyone ${authority.citationLabel} reaches`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "extension-date",
          dimension: "timing",
          heading: "Replacement expiration",
          parameterKey: "extension-term",
          render: (resolved) => {
            const value = resolved.values["extension-term"];
            const years =
              value !== undefined && value.kind === "duration-years"
                ? value.years
                : null;
            return {
              text:
                resolved.endsOn === null || years === null
                  ? "The authority named in Section 1 has no expiration date under this Act."
                  : `The expiration date of the authority named in Section 1 is replaced with ${formatStatutoryDate(resolved.endsOn)}. No earlier expiration date is asserted by this section.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel:
                  "everyone the authority named in Section 1 reaches",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "condition-of-extension",
          dimension: "oversight",
          heading: "Condition",
          parameterKey: "condition-of-extension",
          render: (resolved) => ({
            text: `${resolved.choice("condition-of-extension").clausePhrase}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "the legislature and anyone reading its record",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "shorter-extension",
        sectionNumber: 4,
        heading: "An earlier review of the authority",
        beneficiaryLabel: "the members who will have to vote on it again",
        placeLabel: "the chamber itself",
        statedGround:
          "The legislature should review the authority before the proposed expiration date.",
        segmentKey: "finance.shorter-extension",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "The authority shall be reviewed by the legislature one year before the expiration date stated in Section 2.",
        evidence: authored(
          "An authored request from a fictional member. It asks for an earlier review rather than for money.",
        ),
      },
    },
    {
      variantKey: "repeal-outright",
      instrument: "sunset-repeal",
      label: "Outright repeal",
      synopsis:
        "Repeals an existing authority on a stated date, with a saving clause for what was already done under it.",
      shortTitle: "Repeal",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It repeals an authority. It recovers nothing already provided or spent under it.",
        "It states no amount, and no saving is claimed from it.",
      ],
      defaults: {
        "repeal-term": { kind: "duration-years", years: 1 },
        "saving-clause": { kind: "enumerated", value: "pending-preserved" },
      },
      parameters: [
        {
          key: "repeal-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Years until the repeal takes effect",
          minYears: 1,
          maxYears: 5,
          evidence: authored(
            "An authored notice period before a repeal bites.",
          ),
        },
        {
          key: "saving-clause",
          dimension: "oversight",
          kind: "enumerated",
          label: "What survives the repeal",
          options: [
            {
              value: "nothing-preserved",
              label: "Nothing beyond obligations already entered into",
              clausePhrase:
                "Nothing survives the repeal made by this Act except an obligation lawfully entered into before its effective date",
            },
            {
              value: "pending-preserved",
              label: "Applications already filed",
              clausePhrase:
                "An application filed before the effective date of this Act shall be determined under the repealed authority as it stood on that date",
            },
            {
              value: "pending-and-records",
              label: "Applications already filed, and the records",
              clausePhrase:
                "An application filed before the effective date of this Act shall be determined under the repealed authority as it stood on that date, and the administering agency shall retain and publish its records of every award made under it",
            },
          ],
          evidence: authored("An authored saving clause."),
        },
      ],
      clauses: [
        {
          provisionKey: "authority-named",
          dimension: "authority-reference",
          heading: "Authority repealed",
          parameterKey: null,
          render: (resolved) => {
            const authority = resolved.authority;
            if (!authority) {
              throw new Error(
                "A repeal reached its authority clause without an authority.",
              );
            }
            return {
              text: `${authority.citationLabel} is repealed, and ${authority.programmeLabel} is discontinued, on the date stated in Section 2.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `everyone ${authority.citationLabel} reached`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "effective-date",
          dimension: "timing",
          heading: "Effective date",
          parameterKey: "repeal-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "The repeal made by this Act takes effect on enactment."
                : `The repeal made by this Act takes effect on ${formatStatutoryDate(resolved.endsOn)}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "everyone, on the same date",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "saving-clause",
          dimension: "oversight",
          heading: "Saving",
          parameterKey: "saving-clause",
          render: (resolved) => ({
            text: `${resolved.choice("saving-clause").clausePhrase}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "everyone with a matter already under way",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "transition-assistance",
        sectionNumber: 4,
        heading: "Transition for the places that relied on it",
        beneficiaryLabel: "the communities the repealed programme was serving",
        placeLabel: "the places that built a budget around it",
        statedGround:
          "This programme is a line in somebody's budget, and repealing it in twelve months without a word to them is how a county ends up cutting a service it had no warning about.",
        segmentKey: "finance.repeal-transition",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "The administering agency shall give written notice of the repeal made by this Act to every recipient of an award under the repealed authority not later than six months before its effective date.",
        evidence: authored(
          "An authored request from a fictional member. It asks for notice rather than for money.",
        ),
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Family — charges and dedications                                            */
/* -------------------------------------------------------------------------- */

/**
 * Who pays.
 *
 * Every other family in the bank spends. This one collects, and the difference
 * is kept mechanical rather than rhetorical: a revenue clause carries its
 * amount in a field nothing adds to a spending total, because netting what a
 * measure raises against what a measure spends is an argument somebody makes
 * on the floor, not arithmetic the compiler is entitled to do for them.
 */
const SERVICE_CHARGES: ProgramFamily = {
  familyKey: "service-charges",
  familyVersion: "v1",
  title: "Charges and dedications",
  mechanism:
    "Imposes a charge, or dedicates one already imposed, without authorizing anybody to spend it.",
  acceptedDimensions: ["revenue", "eligibility-scope", "timing", "oversight"],
  structuralProvenance: [APPROPRIATION_SOURCE],
  intendedOutcome: {
    metricStableKey: "finance.charge-receipts",
    baselineSeriesKey: "finance:charge-receipts",
    statement: "What the charge actually collects, and from whom.",
    evidence: {
      kind: "forecast-claim",
      note: "What a charge raises depends on how many people pay it, which is a behaviour rather than a rate.",
      unavailableReason:
        "Nothing in this world counts the transactions this charge would apply to, so receipts cannot be estimated.",
    },
  },
  variants: [
    {
      variantKey: "flat-permit-fee",
      instrument: "revenue-measure",
      label: "Flat permit fee",
      synopsis:
        "Imposes a fixed charge on a permit, with a stated exemption and a date it stops.",
      shortTitle: "Permit Fee",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It collects. It authorizes nobody to spend what it collects.",
        "What it raises is not stated here, because it depends on how many permits are issued.",
      ],
      defaults: {
        "fee-amount": { kind: "money", minorUnits: 7_500, currency: "USD" },
        exemption: { kind: "enumerated", value: "small-projects" },
        "fee-term": { kind: "duration-years", years: 5 },
      },
      parameters: [
        {
          key: "fee-amount",
          dimension: "revenue",
          kind: "money",
          label: "Fee per permit",
          minMinorUnits: 500,
          maxMinorUnits: 50_000,
          currency: "USD",
          evidence: authored(
            "An authored fee. No real permit fee schedule is reproduced.",
          ),
        },
        {
          key: "exemption",
          dimension: "eligibility-scope",
          kind: "enumerated",
          label: "Who does not pay",
          options: [
            {
              value: "nobody",
              label: "Nobody is exempt",
              clausePhrase:
                "No exemption from the fee imposed by this Act is allowed",
            },
            {
              value: "small-projects",
              label: "The smallest projects",
              clausePhrase:
                "A permit for work whose stated value is below the threshold the department publishes is exempt from the fee imposed by this Act",
            },
            {
              value: "small-projects-and-repairs",
              label: "The smallest projects, and repairs",
              clausePhrase:
                "A permit for work whose stated value is below the threshold the department publishes, and a permit for repair of an existing structure, are exempt from the fee imposed by this Act",
            },
          ],
          evidence: authored("An authored exemption."),
        },
        {
          key: "fee-term",
          dimension: "timing",
          kind: "duration-years",
          label: "The fee ends after",
          minYears: 2,
          maxYears: 10,
          evidence: authored(
            "An authored expiry. A charge with an end date is a different political proposition from a permanent one.",
          ),
        },
      ],
      clauses: [
        {
          provisionKey: "fee-imposed",
          dimension: "revenue",
          heading: "Fee imposed",
          parameterKey: "fee-amount",
          render: (resolved) => {
            const amount = resolved.money("fee-amount");
            const value = resolved.values["fee-amount"];
            const minorUnits =
              value !== undefined && value.kind === "money"
                ? value.minorUnits
                : null;
            return {
              text: `A fee of ${amount} is imposed on each permit issued under the building code of this state. The fee is payable by the applicant at the time the permit is issued.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every applicant for a permit",
              },
              fiscalExposureLabel: `${amount} per permit`,
              fiscalExposureMinorUnits: minorUnits,
            };
          },
        },
        {
          provisionKey: "exemption",
          dimension: "eligibility-scope",
          heading: "Exemptions",
          parameterKey: "exemption",
          render: (resolved) => ({
            text: `${resolved.choice("exemption").clausePhrase}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "every applicant the exemption reaches",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "fee-expiry",
          dimension: "timing",
          heading: "Expiration of the fee",
          parameterKey: "fee-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "The fee imposed by this Act continues until repealed."
                : `The fee imposed by this Act shall not be charged on a permit issued after ${formatStatutoryDate(resolved.endsOn)}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "every applicant after that date",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "fee-remission",
        sectionNumber: 4,
        heading: "Remission for owner-occupied repairs",
        beneficiaryLabel: "households repairing the house they live in",
        placeLabel: "the older neighbourhoods where the roofs are going",
        statedGround:
          "A flat fee is the same number for a subdivision and for somebody replacing a roof they live under, and it is the second one who notices it.",
        segmentKey: "revenue.owner-occupied-remission",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "The fee imposed by this Act shall be remitted on a permit for repair of a dwelling occupied by its owner, on application to the department.",
        evidence: authored(
          "An authored request from a fictional member. It narrows who pays rather than asking for money.",
        ),
      },
    },
    {
      variantKey: "dedicated-surcharge",
      instrument: "revenue-measure",
      label: "Dedicated surcharge",
      synopsis:
        "Imposes a surcharge and dedicates every dollar of it to one fund, without authorizing that fund to spend.",
      shortTitle: "Dedicated Surcharge",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "Dedicating money to a fund is not appropriating it out of that fund. Nobody may spend it until a separate Act says so.",
        "It states a rate, not a total. What it raises is not known here.",
      ],
      defaults: {
        "surcharge-amount": {
          kind: "money",
          minorUnits: 200,
          currency: "USD",
        },
        "dedication-share": { kind: "integer", value: 100 },
        "surcharge-term": { kind: "duration-years", years: 8 },
      },
      parameters: [
        {
          key: "surcharge-amount",
          dimension: "revenue",
          kind: "money",
          label: "Surcharge per transaction",
          minMinorUnits: 25,
          maxMinorUnits: 2_000,
          currency: "USD",
          evidence: authored(
            "An authored surcharge. No real rate is reproduced.",
          ),
        },
        {
          key: "dedication-share",
          dimension: "oversight",
          kind: "integer",
          label: "Share dedicated to the fund",
          min: 25,
          max: 100,
          unitLabel: "per cent",
          evidence: authored(
            "An authored dedication share. A partial dedication is a real legislative choice and is offered as one.",
          ),
        },
        {
          key: "surcharge-term",
          dimension: "timing",
          kind: "duration-years",
          label: "The surcharge ends after",
          minYears: 3,
          maxYears: 15,
          evidence: authored("An authored expiry."),
        },
      ],
      clauses: [
        {
          provisionKey: "surcharge-imposed",
          dimension: "revenue",
          heading: "Surcharge imposed",
          parameterKey: "surcharge-amount",
          render: (resolved) => {
            const amount = resolved.money("surcharge-amount");
            const value = resolved.values["surcharge-amount"];
            const minorUnits =
              value !== undefined && value.kind === "money"
                ? value.minorUnits
                : null;
            return {
              text: `A surcharge of ${amount} is imposed on each vehicle registration renewal issued in this state, and is collected with the renewal fee.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every person renewing a registration",
              },
              fiscalExposureLabel: `${amount} per renewal`,
              fiscalExposureMinorUnits: minorUnits,
            };
          },
        },
        {
          provisionKey: "dedication",
          dimension: "oversight",
          heading: "Dedication",
          parameterKey: "dedication-share",
          render: (resolved) => {
            const share = resolved.integer("dedication-share");
            return {
              text:
                share === 100
                  ? "The whole of the surcharge collected under this Act shall be deposited in the road maintenance fund. No part of it may be used for any other purpose, and nothing in this Act authorizes any amount to be spent from that fund."
                  : `${share} per cent of the surcharge collected under this Act shall be deposited in the road maintenance fund and the remainder in the general fund. Nothing in this Act authorizes any amount to be spent from either.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "the fund named in this section",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "surcharge-expiry",
          dimension: "timing",
          heading: "Expiration",
          parameterKey: "surcharge-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "The surcharge imposed by this Act continues until repealed."
                : `The surcharge imposed by this Act shall not be collected on a renewal issued after ${formatStatutoryDate(resolved.endsOn)}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "every person renewing after that date",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "rural-return",
        sectionNumber: 4,
        heading: "Return of a share to the counties that raised it",
        beneficiaryLabel:
          "counties whose registrations raise more than they get back",
        placeLabel:
          "the counties with the long distances and the short budgets",
        statedGround:
          "Every registration in the county pays this, and the fund it goes to has not paved a mile out there in nine years.",
        segmentKey: "revenue.county-return-share",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "One fifth of the surcharge collected in a county shall be returned to that county for road maintenance, and the department shall publish annually what each county paid and what it received.",
        evidence: authored(
          "An authored request from a fictional member. It redirects a share rather than raising the rate.",
        ),
      },
    },
  ],
};

export const FISCAL_INSTRUMENT_FAMILIES: readonly ProgramFamily[] = [
  APPROPRIATIONS,
  PROGRAM_SUNSET,
  SERVICE_CHARGES,
];

/** Exported for tests that need a spending authority without a docket. */
export const STANDING_TRANSIT_AUTHORITY = RURAL_TRANSIT_FUND;
export const STANDING_NON_SPENDING_AUTHORITY = RECORDS_RETENTION_ACT;
