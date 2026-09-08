import {
  authored,
  formatStatutoryDate,
  numberWord,
  type IsoDate,
  type PredicateAuthority,
  type ProgramContentEvidence,
  type ProgramFamily,
} from "./legislation-content-contracts";

/**
 * The bank of acts about how the state administers what it already does.
 *
 * Three families, three instruments none of the infrastructure families can
 * express. A reporting duty changes what is known rather than what is spent. An
 * eligibility amendment changes who qualifies under a programme that already
 * exists, and states no amount at all. A position authorization counts posts,
 * which is not a budget line divided by a salary.
 *
 * These are the acts a real legislature spends most of its floor time on, and a
 * bank that could only authorize programmes could not write one of them.
 */

/* -------------------------------------------------------------------------- */
/* Provenance: the game's own registered source domains                        */
/* -------------------------------------------------------------------------- */

/**
 * Published income limits are a real, dated product.
 *
 * Cited as structure, and only as structure: it establishes that eligibility
 * for assistance is routinely written against a limit somebody publishes and
 * revises on a schedule, rather than against a number written into the statute.
 * It establishes nothing about what any limit is. No value from this product is
 * reproduced, asserted or used to drive a clause.
 */
const PUBLISHED_LIMIT_PRODUCT: ProgramContentEvidence = {
  kind: "source-example",
  reference:
    "This repository's registered hud-housing source domain, 9,528 fair-market-rent and income-limit observations",
  asOf: "2025-09-30" as IsoDate,
  establishes:
    "Assistance eligibility is commonly keyed to a limit that an agency publishes and revises on a schedule, so a statute can point at the published limit instead of fixing a number in law.",
};

/**
 * Public bodies report their finances and their staffing on a schedule.
 *
 * Structure only. It establishes that counted, dated administrative reporting
 * is a real thing legislatures require; it establishes nothing about any
 * government's actual finances or headcount, and none is reproduced.
 */
const ADMINISTRATIVE_REPORTING_PRODUCT: ProgramContentEvidence = {
  kind: "source-example",
  reference:
    "This repository's registered government-finances (886 records) and public-employment (298 records) source domains",
  asOf: "2025-03-31" as IsoDate,
  establishes:
    "Governments report finances and employment as counted, dated series, so a statute requiring publication on a schedule is describing something that is actually done rather than inventing a duty nobody could discharge.",
};

/**
 * Public employment terms are set jurisdiction by jurisdiction.
 *
 * Structure only. It establishes that the rules governing public posts differ
 * by state and are written down; it establishes nothing about any state's
 * rules, and reproduces none of them.
 */
const CIVIL_SERVICE_PRODUCT: ProgramContentEvidence = {
  kind: "source-example",
  reference:
    "This repository's registered civil-service-labor source domain, 51 jurisdiction records",
  asOf: "2026-09-06" as IsoDate,
  establishes:
    "The terms on which a state employs people are set by that state and recorded per jurisdiction, so a bill about public posts is a state-level act rather than a national one.",
};

/* -------------------------------------------------------------------------- */
/* The assistance programme these amendments act on                            */
/* -------------------------------------------------------------------------- */

/**
 * An authored standing assistance programme.
 *
 * It exists so that an eligibility amendment has something to amend on a
 * member's first day. It is fiction with a declared author: no real assistance
 * programme, statute, limit or caseload is described.
 */
const HOUSEHOLD_ASSISTANCE_ACT: PredicateAuthority = {
  kind: "standing-statute",
  authorityKey: "standing:household-assistance",
  citationLabel: "the Household Utility Assistance Act",
  programmeLabel: "the household utility assistance programme",
  authorizesSpending: true,
  authorizedCeilingMinorUnits: 1_800_000_000,
  currency: "USD",
  evidence: authored(
    "An authored standing programme. No real assistance programme, eligibility rule or caseload is described.",
  ),
};

/* -------------------------------------------------------------------------- */
/* Family — who qualifies                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Changing who qualifies, and nothing else.
 *
 * Every bill in this family states no amount. That is the whole point of it:
 * widening eligibility is one of the commonest things a legislature does, it is
 * politically expensive precisely because it costs money nobody has counted,
 * and a bank whose only lever is a funding slider cannot write one. The
 * compiler refuses to let any configuration here carry a funding cap.
 */
const ASSISTANCE_ELIGIBILITY: ProgramFamily = {
  familyKey: "assistance-eligibility",
  familyVersion: "v1",
  title: "Assistance eligibility",
  mechanism:
    "Changes who qualifies under an assistance programme that already exists, without providing a dollar.",
  acceptedDimensions: [
    "authority-reference",
    "eligibility-scope",
    "timing",
    "oversight",
  ],
  structuralProvenance: [PUBLISHED_LIMIT_PRODUCT],
  standingAuthorities: [HOUSEHOLD_ASSISTANCE_ACT],
  intendedOutcome: {
    metricStableKey: "assistance.households-qualifying",
    baselineSeriesKey: "assistance:households-qualifying",
    statement:
      "How many households qualify after the change, and how many of them apply.",
    evidence: {
      kind: "forecast-claim",
      note: "Widening eligibility changes who may apply. How many do is a behaviour, and how many are served depends on money this Act does not provide.",
      unavailableReason:
        "Nothing in this world counts the households the programme reaches, so the number who would newly qualify cannot be reported.",
    },
  },
  variants: [
    {
      variantKey: "raise-income-limit",
      instrument: "eligibility-amendment",
      label: "Raise the income limit",
      synopsis:
        "Qualifies households at a higher share of the published limit. It provides no money, so more qualifying may mean a longer queue.",
      shortTitle: "Income Limit Amendment",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It states no amount and provides no money. The programme's funding is whatever it already was.",
        "Qualifying is not receiving. If more households qualify and nothing is appropriated, the queue gets longer.",
      ],
      defaults: {
        "limit-share": { kind: "integer", value: 60 },
        "effective-term": { kind: "duration-years", years: 1 },
        "caseload-report": { kind: "enumerated", value: "annual-caseload" },
      },
      parameters: [
        {
          key: "limit-share",
          dimension: "eligibility-scope",
          kind: "integer",
          label: "Qualifying share of the published limit",
          min: 30,
          max: 120,
          unitLabel: "per cent",
          evidence: authored(
            "An authored threshold, expressed against whatever limit the administering agency publishes. No published limit's value is reproduced or asserted here.",
          ),
        },
        {
          key: "effective-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Applies from the next programme year, for",
          minYears: 1,
          maxYears: 8,
          evidence: authored("An authored duration for the change."),
        },
        {
          key: "caseload-report",
          dimension: "oversight",
          kind: "enumerated",
          label: "What the agency must report about it",
          options: [
            {
              value: "no-report",
              label: "Nothing beyond its usual reporting",
              clausePhrase:
                "This Act requires no report beyond those the administering agency already makes",
            },
            {
              value: "annual-caseload",
              label: "How many newly qualified, and how many were served",
              clausePhrase:
                "The administering agency shall report annually on the number of households qualifying under this Act who did not qualify before it, and on how many of them received assistance",
            },
            {
              value: "annual-caseload-and-queue",
              label: "That, and how long the queue is",
              clausePhrase:
                "The administering agency shall report annually on the number of households qualifying under this Act who did not qualify before it, on how many of them received assistance, and on the number of qualifying households awaiting a determination at the end of the year",
            },
          ],
          evidence: authored("An authored reporting duty."),
        },
      ],
      clauses: [
        {
          provisionKey: "authority-named",
          dimension: "authority-reference",
          heading: "Programme amended",
          parameterKey: null,
          render: (resolved) => {
            const authority = resolved.authority;
            if (!authority) {
              throw new Error(
                "An eligibility amendment reached its authority clause without an authority.",
              );
            }
            return {
              text: `This Act amends the eligibility requirements of ${authority.citationLabel}. It makes no other change to ${authority.programmeLabel}, and appropriates nothing.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `everyone applying under ${authority.citationLabel}`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "qualifying-threshold",
          dimension: "eligibility-scope",
          heading: "Households qualifying",
          parameterKey: "limit-share",
          render: (resolved) => {
            const share = resolved.integer("limit-share");
            return {
              text: `A household whose income does not exceed ${share} per cent of the income limit published by the administering agency for the area in which the household lives qualifies for assistance under the Act named in Section 1. Where the published limit is revised, this section applies to the limit as revised.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every household at or below ${share} per cent of the published limit for its area`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "application",
          dimension: "timing",
          heading: "Application of this Act",
          parameterKey: "effective-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "This Act applies to determinations made in and after the next programme year and continues until amended."
                : `This Act applies to determinations made in and after the next programme year and has no effect on a determination made after ${formatStatutoryDate(resolved.endsOn)}, when the requirement it amends resumes as it stood before.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "every applicant within the period",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "caseload-report",
          dimension: "oversight",
          heading: "Report",
          parameterKey: "caseload-report",
          render: (resolved) => ({
            text: `${resolved.choice("caseload-report").clausePhrase}.`,
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
        provisionKey: "queue-priority",
        sectionNumber: 5,
        heading: "Priority for households already waiting",
        beneficiaryLabel:
          "households that qualified before this Act and are still waiting",
        placeLabel: "the households already at the back of the queue",
        statedGround:
          "Widening the door without widening the room puts the newly qualified in front of people who have been waiting two winters, and nothing in this bill says otherwise.",
        segmentKey: "assistance.existing-queue-priority",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "A household that qualified before this Act and whose application is pending shall be determined before a household qualifying only by reason of this Act.",
        evidence: authored(
          "An authored request from a fictional member. It reorders a queue rather than asking for money.",
        ),
      },
    },
    {
      variantKey: "add-household-category",
      instrument: "eligibility-amendment",
      label: "Add a qualifying category",
      synopsis:
        "Qualifies a category of household outright, whatever the income test says. It provides no money.",
      shortTitle: "Categorical Eligibility",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It states no amount and provides no money.",
        "It qualifies a category. It does not require that any member of that category be served.",
      ],
      defaults: {
        category: { kind: "enumerated", value: "medical-equipment" },
        "effective-term": { kind: "duration-years", years: 3 },
        "category-review": { kind: "enumerated", value: "count-by-category" },
      },
      parameters: [
        {
          key: "category",
          dimension: "eligibility-scope",
          kind: "enumerated",
          label: "Category qualifying outright",
          options: [
            {
              value: "medical-equipment",
              label: "Households running medical equipment at home",
              clausePhrase:
                "a household in which a member relies on electrically powered medical equipment in the home",
            },
            {
              value: "recent-disconnection",
              label: "Households disconnected in the last year",
              clausePhrase:
                "a household whose service was disconnected for non-payment within the preceding twelve months",
            },
            {
              value: "fixed-income-elderly",
              label: "Households whose only income is a fixed benefit",
              clausePhrase:
                "a household whose sole income is a fixed retirement or disability benefit",
            },
          ],
          evidence: authored(
            "An authored category. It is a design choice about who a fictional programme should reach, not a finding about who needs help.",
          ),
        },
        {
          key: "effective-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Applies for",
          minYears: 1,
          maxYears: 10,
          evidence: authored("An authored duration for the change."),
        },
        {
          key: "category-review",
          dimension: "oversight",
          kind: "enumerated",
          label: "What the agency must report about it",
          options: [
            {
              value: "no-report",
              label: "Nothing beyond its usual reporting",
              clausePhrase:
                "This Act requires no report beyond those the administering agency already makes",
            },
            {
              value: "count-by-category",
              label: "How many qualified this way",
              clausePhrase:
                "The administering agency shall report annually on the number of households qualifying under this Act and on the basis on which each was found to qualify",
            },
          ],
          evidence: authored("An authored reporting duty."),
        },
      ],
      clauses: [
        {
          provisionKey: "authority-named",
          dimension: "authority-reference",
          heading: "Programme amended",
          parameterKey: null,
          render: (resolved) => {
            const authority = resolved.authority;
            if (!authority) {
              throw new Error(
                "An eligibility amendment reached its authority clause without an authority.",
              );
            }
            return {
              text: `This Act amends the eligibility requirements of ${authority.citationLabel} by adding a category qualifying without regard to the income test in that Act. It appropriates nothing.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `everyone applying under ${authority.citationLabel}`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "qualifying-category",
          dimension: "eligibility-scope",
          heading: "Category qualifying",
          parameterKey: "category",
          render: (resolved) => {
            const choice = resolved.choice("category");
            return {
              text: `Notwithstanding the income test in the Act named in Section 1, ${choice.clausePhrase} qualifies for assistance under that Act. A household qualifying under this section is not thereby entitled to a payment of any particular amount.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every household that is ${choice.clausePhrase}`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "application",
          dimension: "timing",
          heading: "Application of this Act",
          parameterKey: "effective-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "This Act applies to determinations made after its enactment and continues until amended."
                : `This Act applies to determinations made after its enactment and has no effect on a determination made after ${formatStatutoryDate(resolved.endsOn)}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "every applicant within the period",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "category-review",
          dimension: "oversight",
          heading: "Report",
          parameterKey: "category-review",
          render: (resolved) => ({
            text: `${resolved.choice("category-review").clausePhrase}.`,
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
        provisionKey: "verification-burden",
        sectionNumber: 5,
        heading: "Proof a household can actually produce",
        beneficiaryLabel: "households that qualify but cannot document it",
        placeLabel: "the counties with one clinic and no records office",
        statedGround:
          "Qualifying on paper and being able to prove it are different things, and the proof this will take is a letter from a doctor two counties away.",
        segmentKey: "assistance.verification-burden",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "The administering agency shall accept a self-certification, subject to later verification, as proof of qualification under this Act, and shall not deny an application solely for want of documentation at the time it is filed.",
        evidence: authored(
          "An authored request from a fictional member. It changes what proof is required rather than who qualifies.",
        ),
      },
    },
    {
      variantKey: "index-to-published-limit",
      instrument: "eligibility-amendment",
      label: "Index eligibility to the published limit",
      synopsis:
        "Stops the threshold being a number in the statute and ties it to whatever the agency publishes, so it moves without a bill.",
      shortTitle: "Indexed Eligibility",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It states no amount and provides no money.",
        "It hands the threshold to whoever publishes the limit. That is the point of it and also the objection to it.",
      ],
      defaults: {
        "index-basis": { kind: "enumerated", value: "area-limit" },
        "revision-lag": { kind: "duration-years", years: 1 },
        "publication-duty": {
          kind: "enumerated",
          value: "publish-and-notify",
        },
      },
      parameters: [
        {
          key: "index-basis",
          dimension: "eligibility-scope",
          kind: "enumerated",
          label: "What the threshold follows",
          options: [
            {
              value: "area-limit",
              label: "The published limit for the household's own area",
              clausePhrase:
                "the income limit published by the administering agency for the area in which the household lives",
            },
            {
              value: "statewide-limit",
              label: "A single statewide published limit",
              clausePhrase:
                "the statewide income limit published by the administering agency",
            },
            {
              value: "higher-of-either",
              label: "Whichever of the two is higher",
              clausePhrase:
                "the higher of the income limit published by the administering agency for the area in which the household lives and the statewide income limit it publishes",
            },
          ],
          evidence: PUBLISHED_LIMIT_PRODUCT,
        },
        {
          key: "revision-lag",
          dimension: "timing",
          kind: "duration-years",
          label: "A revised limit takes effect after",
          minYears: 1,
          maxYears: 3,
          evidence: authored(
            "An authored lag between publication and effect, so a household is not disqualified by a revision it has not heard of.",
          ),
        },
        {
          key: "publication-duty",
          dimension: "oversight",
          kind: "enumerated",
          label: "What the agency must do when the limit moves",
          options: [
            {
              value: "publish-only",
              label: "Publish the new limit",
              clausePhrase:
                "The administering agency shall publish each revised limit applicable under this Act",
            },
            {
              value: "publish-and-notify",
              label: "Publish it, and tell the households it disqualifies",
              clausePhrase:
                "The administering agency shall publish each revised limit applicable under this Act and shall give written notice to every household that would cease to qualify by reason of the revision",
            },
          ],
          evidence: authored("An authored publication duty."),
        },
      ],
      clauses: [
        {
          provisionKey: "authority-named",
          dimension: "authority-reference",
          heading: "Programme amended",
          parameterKey: null,
          render: (resolved) => {
            const authority = resolved.authority;
            if (!authority) {
              throw new Error(
                "An eligibility amendment reached its authority clause without an authority.",
              );
            }
            return {
              text: `This Act amends ${authority.citationLabel} so that the threshold for qualification is fixed by reference to a published limit rather than stated in that Act. It appropriates nothing.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `everyone applying under ${authority.citationLabel}`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "indexed-threshold",
          dimension: "eligibility-scope",
          heading: "Threshold",
          parameterKey: "index-basis",
          render: (resolved) => {
            const choice = resolved.choice("index-basis");
            return {
              text: `The threshold for qualification under the Act named in Section 1 is ${choice.clausePhrase}, as it stands from time to time. No amount is stated in this Act, and a revision of the published limit revises the threshold without further legislation.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every household measured against that limit",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "revision-lag",
          dimension: "timing",
          heading: "When a revision takes effect",
          parameterKey: "revision-lag",
          render: (resolved) => {
            const value = resolved.values["revision-lag"];
            const years =
              value !== undefined && value.kind === "duration-years"
                ? value.years
                : null;
            return {
              text:
                years === null
                  ? "A revised limit takes effect when it is published."
                  : `A revised limit takes effect ${numberWord(years)} ${years === 1 ? "year" : "years"} after it is published, and until then the limit last in effect governs.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel:
                  "every household whose qualification would change on the revision",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "publication-duty",
          dimension: "oversight",
          heading: "Publication",
          parameterKey: "publication-duty",
          render: (resolved) => ({
            text: `${resolved.choice("publication-duty").clausePhrase}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "every household the published limit reaches",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "floor-on-revision",
        sectionNumber: 5,
        heading: "A floor, so a revision cannot take the programme backwards",
        beneficiaryLabel: "households who would lose eligibility on a revision",
        placeLabel: "the areas where the published limit has fallen before",
        statedGround:
          "Handing the threshold to a published figure means handing it to whoever revises that figure, and it has gone down before.",
        segmentKey: "assistance.indexed-floor",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "A revision of the published limit shall not reduce the threshold under this Act below the threshold in effect on its enactment.",
        evidence: authored(
          "An authored request from a fictional member. It constrains a mechanism rather than asking for money.",
        ),
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Family — reporting and oversight                                            */
/* -------------------------------------------------------------------------- */

/**
 * Making the state say what it is doing.
 *
 * The cheapest instrument to pass and the one with no funding lever at all. It
 * is here because a bank that cannot write a reporting duty cannot express the
 * commonest compromise on a floor — the bill that does not do the thing, but
 * requires somebody to find out whether the thing should be done.
 */
const AGENCY_REPORTING: ProgramFamily = {
  familyKey: "agency-reporting",
  familyVersion: "v1",
  title: "Reporting and oversight",
  mechanism:
    "Requires a public body to report, publish or submit to audit. It changes what is known, not what is spent.",
  acceptedDimensions: [
    "eligibility-scope",
    "timing",
    "oversight",
    "authority-reference",
  ],
  structuralProvenance: [ADMINISTRATIVE_REPORTING_PRODUCT],
  intendedOutcome: {
    metricStableKey: "administration.published-reporting",
    baselineSeriesKey: "administration:published-reporting",
    statement: "What is published, on time, and whether anybody acts on it.",
    evidence: {
      kind: "forecast-claim",
      note: "A reporting duty produces a document. Whether the document changes anything is a separate question this Act does not answer.",
      unavailableReason:
        "Nothing in this world records whether a required report was filed, so compliance cannot be reported.",
    },
  },
  variants: [
    {
      variantKey: "annual-legislative-report",
      instrument: "oversight-reporting",
      label: "Annual report to the legislature",
      synopsis:
        "Requires an agency to report on a stated schedule, and says what the report must contain.",
      shortTitle: "Annual Report",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It requires a report. It requires nothing to be done about what the report says.",
        "It provides nothing for the cost of preparing it.",
      ],
      defaults: {
        "reporting-body": { kind: "enumerated", value: "administering-agency" },
        "report-cycle": { kind: "integer", value: 1 },
        "report-contents": {
          kind: "enumerated",
          value: "spending-and-caseload",
        },
      },
      parameters: [
        {
          key: "reporting-body",
          dimension: "eligibility-scope",
          kind: "enumerated",
          label: "Who must report",
          options: [
            {
              value: "administering-agency",
              label: "The agency that runs the programme",
              clausePhrase: "the agency administering the programme",
            },
            {
              value: "every-recipient-government",
              label: "Every local government that received money",
              clausePhrase:
                "every local government that received an award in the reporting period",
            },
            {
              value: "agency-and-recipients",
              label: "Both the agency and the recipients",
              clausePhrase:
                "the agency administering the programme, and every local government that received an award in the reporting period",
            },
          ],
          evidence: ADMINISTRATIVE_REPORTING_PRODUCT,
        },
        {
          key: "report-cycle",
          dimension: "timing",
          kind: "integer",
          label: "Report once every",
          min: 1,
          max: 5,
          unitLabel: "years",
          evidence: authored("An authored reporting cadence."),
        },
        {
          key: "report-contents",
          dimension: "oversight",
          kind: "enumerated",
          label: "What the report must contain",
          options: [
            {
              value: "spending-only",
              label: "What was spent",
              clausePhrase: "the amounts obligated and expended in the period",
            },
            {
              value: "spending-and-caseload",
              label: "What was spent, and who was served",
              clausePhrase:
                "the amounts obligated and expended in the period, and the number of applicants served and refused",
            },
            {
              value: "spending-caseload-and-unmet",
              label: "That, and who was not reached",
              clausePhrase:
                "the amounts obligated and expended in the period, the number of applicants served and refused, and the agency's own account of demand it was unable to meet",
            },
          ],
          evidence: authored("An authored specification of report contents."),
        },
      ],
      clauses: [
        {
          provisionKey: "reporting-body",
          dimension: "eligibility-scope",
          heading: "Who must report",
          parameterKey: "reporting-body",
          render: (resolved) => {
            const choice = resolved.choice("reporting-body");
            return {
              text: `The duty imposed by this Act falls on ${choice.clausePhrase}.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: choice.clausePhrase,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "report-cycle",
          dimension: "timing",
          heading: "When the report is due",
          parameterKey: "report-cycle",
          render: (resolved) => {
            const years = resolved.integer("report-cycle");
            return {
              text:
                years === 1
                  ? "The report required by this Act shall be submitted not later than the first day of the regular session in each year."
                  : `The report required by this Act shall be submitted once every ${numberWord(years)} years, not later than the first day of the regular session in the year it is due.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "the legislature, on a fixed schedule",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "report-contents",
          dimension: "oversight",
          heading: "Contents of the report",
          parameterKey: "report-contents",
          render: (resolved) => {
            const choice = resolved.choice("report-contents");
            return {
              text: `The report required by this Act shall state ${choice.clausePhrase}. It shall be published, and the publication shall be free of charge.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "anyone who reads the published report",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
      ],
      amendmentInvitation: {
        provisionKey: "county-breakdown",
        sectionNumber: 4,
        heading: "A breakdown by county",
        beneficiaryLabel: "the counties that suspect they are being missed",
        placeLabel: "the counties that never appear in a statewide total",
        statedGround:
          "A statewide total tells you the programme spent its money. It does not tell you that the same nine counties have had none of it for six years.",
        segmentKey: "administration.county-breakdown",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "The report required by this Act shall state the amounts and the numbers it reports separately for each county, and shall identify each county in which no award was made.",
        evidence: authored(
          "An authored request from a fictional member. It asks for disaggregation rather than for money.",
        ),
      },
    },
    {
      variantKey: "independent-audit",
      instrument: "oversight-reporting",
      label: "Independent audit",
      synopsis:
        "Requires an audit by somebody who does not run the programme, and says what happens to the findings.",
      shortTitle: "Audit Requirement",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It requires an audit. It provides nothing for the cost of one.",
        "It does not empower the auditor to change anything they find.",
      ],
      defaults: {
        "audit-scope": { kind: "enumerated", value: "programme-and-awards" },
        "audit-cycle": { kind: "integer", value: 2 },
        "findings-handling": {
          kind: "enumerated",
          value: "published-with-response",
        },
      },
      parameters: [
        {
          key: "audit-scope",
          dimension: "eligibility-scope",
          kind: "enumerated",
          label: "What is audited",
          options: [
            {
              value: "accounts-only",
              label: "The accounts",
              clausePhrase: "the accounts of the programme",
            },
            {
              value: "programme-and-awards",
              label: "The accounts, and how awards were decided",
              clausePhrase:
                "the accounts of the programme and the basis on which each award was decided",
            },
          ],
          evidence: ADMINISTRATIVE_REPORTING_PRODUCT,
        },
        {
          key: "audit-cycle",
          dimension: "timing",
          kind: "integer",
          label: "Audit once every",
          min: 1,
          max: 6,
          unitLabel: "years",
          evidence: authored("An authored audit cadence."),
        },
        {
          key: "findings-handling",
          dimension: "oversight",
          kind: "enumerated",
          label: "What happens to the findings",
          options: [
            {
              value: "filed-only",
              label: "They are filed with the legislature",
              clausePhrase:
                "The auditor shall file the findings with the legislature",
            },
            {
              value: "published-with-response",
              label: "Published, with the agency's answer beside them",
              clausePhrase:
                "The auditor shall publish the findings, and the agency shall publish its response to each finding within ninety days",
            },
            {
              value: "published-with-remediation",
              label: "Published, answered, and a plan required",
              clausePhrase:
                "The auditor shall publish the findings; the agency shall publish its response to each finding within ninety days; and where a finding is not disputed the agency shall publish what it will do about it and by when",
            },
          ],
          evidence: authored("An authored handling rule for audit findings."),
        },
      ],
      clauses: [
        {
          provisionKey: "audit-scope",
          dimension: "eligibility-scope",
          heading: "Scope of the audit",
          parameterKey: "audit-scope",
          render: (resolved) => {
            const choice = resolved.choice("audit-scope");
            return {
              text: `An audit under this Act shall examine ${choice.clausePhrase}. The audit shall be conducted by a person who is not employed by, and does not report to, the agency administering the programme.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "the programme and everyone it awards to",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "audit-cycle",
          dimension: "timing",
          heading: "When the audit is due",
          parameterKey: "audit-cycle",
          render: (resolved) => {
            const years = resolved.integer("audit-cycle");
            return {
              text:
                years === 1
                  ? "An audit under this Act shall be completed in each year."
                  : `An audit under this Act shall be completed once every ${numberWord(years)} years.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "the legislature, on a fixed schedule",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "findings-handling",
          dimension: "oversight",
          heading: "Findings",
          parameterKey: "findings-handling",
          render: (resolved) => ({
            text: `${resolved.choice("findings-handling").clausePhrase}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "anyone who reads the published findings",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "audit-cost",
        sectionNumber: 4,
        heading: "Who pays for the audit",
        beneficiaryLabel:
          "the agency required to procure an audit with no money for it",
        placeLabel: "the programme that will pay for it out of awards",
        statedGround:
          "An audit requirement with no money attached is paid for out of the programme, which means it is paid for by whoever would have had the last award.",
        segmentKey: "administration.audit-cost",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "The cost of an audit required by this Act shall not be charged against the programme audited, and the agency shall report the cost separately.",
        evidence: authored(
          "An authored request from a fictional member. It reallocates a cost rather than appropriating one.",
        ),
      },
    },
    {
      variantKey: "published-performance-measures",
      instrument: "oversight-reporting",
      label: "Published performance measures",
      synopsis:
        "Requires the agency to name its own measures in advance and publish against them, so success is not defined afterwards.",
      shortTitle: "Performance Measures",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It requires measures to be published. It does not require them to be good ones, or to be met.",
        "It provides nothing, and it does not let the legislature set the measures itself.",
      ],
      defaults: {
        "measure-setter": { kind: "enumerated", value: "agency-with-comment" },
        "publication-cycle": { kind: "integer", value: 1 },
        "revision-rule": { kind: "enumerated", value: "revision-explained" },
      },
      parameters: [
        {
          key: "measure-setter",
          dimension: "eligibility-scope",
          kind: "enumerated",
          label: "Who sets the measures",
          options: [
            {
              value: "agency-alone",
              label: "The agency, alone",
              clausePhrase:
                "The agency shall determine the measures by which its performance is to be reported",
            },
            {
              value: "agency-with-comment",
              label: "The agency, after a public comment period",
              clausePhrase:
                "The agency shall determine the measures by which its performance is to be reported, after publishing them in draft and allowing not less than thirty days for comment",
            },
          ],
          evidence: authored("An authored rule about who defines success."),
        },
        {
          key: "publication-cycle",
          dimension: "timing",
          kind: "integer",
          label: "Publish results once every",
          min: 1,
          max: 4,
          unitLabel: "years",
          evidence: authored("An authored publication cadence."),
        },
        {
          key: "revision-rule",
          dimension: "oversight",
          kind: "enumerated",
          label: "What happens when the agency changes a measure",
          options: [
            {
              value: "revision-free",
              label: "It may change them freely",
              clausePhrase: "The agency may revise a measure at any time",
            },
            {
              value: "revision-explained",
              label: "It must publish the old measure beside the new one",
              clausePhrase:
                "Where the agency revises a measure, it shall publish the measure as it stood, the measure as revised, and its reason, and shall report against both for the first period after the revision",
            },
          ],
          evidence: authored(
            "An authored rule against redefining success after the fact.",
          ),
        },
      ],
      clauses: [
        {
          provisionKey: "measure-setter",
          dimension: "eligibility-scope",
          heading: "Setting the measures",
          parameterKey: "measure-setter",
          render: (resolved) => ({
            text: `${resolved.choice("measure-setter").clausePhrase}. The measures shall be published before the period they apply to begins.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "anyone who reads the published measures",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "publication-cycle",
          dimension: "timing",
          heading: "Publication of results",
          parameterKey: "publication-cycle",
          render: (resolved) => {
            const years = resolved.integer("publication-cycle");
            return {
              text:
                years === 1
                  ? "The agency shall publish its results against the measures in each year."
                  : `The agency shall publish its results against the measures once every ${numberWord(years)} years.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "anyone who reads the published results",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "revision-rule",
          dimension: "oversight",
          heading: "Revision of a measure",
          parameterKey: "revision-rule",
          render: (resolved) => ({
            text: `${resolved.choice("revision-rule").clausePhrase}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel:
                "anyone comparing one year's results with another's",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "legislative-measure",
        sectionNumber: 4,
        heading: "One measure the legislature sets",
        beneficiaryLabel: "the chamber that will be judging the results",
        placeLabel: "the chamber itself",
        statedGround:
          "An agency that picks its own measures will report that it met them, and the one number this room actually cares about will not be among them.",
        segmentKey: "administration.legislative-measure",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "In addition to the measures the agency determines, the agency shall report against one measure specified by the legislature, which the agency may not revise.",
        evidence: authored(
          "An authored request from a fictional member. It moves an authority rather than asking for money.",
        ),
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Family — public posts                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Counted posts, not a budget line divided by a salary.
 *
 * A position authorization is its own instrument because posts are whole
 * things: a legislature authorizes eleven inspectors, and eleven is the
 * operative number even where the money is separate. The classification variant
 * beside it is deliberately a regulatory requirement rather than an
 * authorization, because setting the terms of a post and creating one are
 * different acts and the bank should not be able to pretend otherwise.
 */
const PUBLIC_WORKFORCE: ProgramFamily = {
  familyKey: "public-workforce",
  familyVersion: "v1",
  title: "Public posts",
  mechanism:
    "Authorizes counted posts in a public body, or sets the terms on which they are filled.",
  acceptedDimensions: [
    "eligibility-scope",
    "timing",
    "oversight",
    "funding-cap",
  ],
  structuralProvenance: [
    CIVIL_SERVICE_PRODUCT,
    ADMINISTRATIVE_REPORTING_PRODUCT,
  ],
  intendedOutcome: {
    metricStableKey: "administration.filled-posts",
    baselineSeriesKey: "administration:filled-posts",
    statement:
      "How many authorized posts are actually filled, and for how long.",
    evidence: {
      kind: "forecast-claim",
      note: "Authorizing a post does not fill it. Whether anybody takes the job at the salary offered is the thing that decides it.",
      unavailableReason:
        "Nothing in this world records the posts a public body has or fills, so the number filled cannot be reported.",
    },
  },
  variants: [
    {
      variantKey: "authorize-positions",
      instrument: "position-authorization",
      label: "Authorize inspection posts",
      synopsis:
        "Authorizes a stated number of posts and says what they are for. Authorizing a post is not filling it.",
      shortTitle: "Position Authorization",
      subjectClass: "appropriation",
      authorizesAppropriation: true,
      declaredLimits: [
        "It authorizes posts and states a salary ceiling for them. It does not fill a single one.",
        "It does not say what happens if nobody applies at the salary the ceiling allows.",
      ],
      defaults: {
        "post-count": { kind: "integer", value: 11 },
        "salary-ceiling": {
          kind: "money",
          minorUnits: 96_000_000,
          currency: "USD",
        },
        "post-term": { kind: "duration-years", years: 4 },
        "vacancy-report": { kind: "enumerated", value: "annual-vacancy" },
      },
      parameters: [
        {
          key: "post-count",
          dimension: "eligibility-scope",
          kind: "integer",
          label: "Posts authorized",
          min: 1,
          max: 120,
          unitLabel: "posts",
          evidence: authored(
            "An authored number of posts. No real agency's staffing is described.",
          ),
        },
        {
          key: "salary-ceiling",
          dimension: "funding-cap",
          kind: "money",
          label: "Total salary ceiling",
          minMinorUnits: 5_000_000,
          maxMinorUnits: 1_200_000_000,
          currency: "USD",
          evidence: authored(
            "An authored ceiling for the posts together. It is not a salary, and the Act does not divide it by the number of posts.",
          ),
        },
        {
          key: "post-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Posts authorized for",
          minYears: 1,
          maxYears: 10,
          evidence: authored("An authored term for the authorization."),
        },
        {
          key: "vacancy-report",
          dimension: "oversight",
          kind: "enumerated",
          label: "What must be reported about them",
          options: [
            {
              value: "no-report",
              label: "Nothing",
              clausePhrase:
                "This Act requires no report concerning the posts it authorizes",
            },
            {
              value: "annual-vacancy",
              label: "How many are filled, and how many are vacant",
              clausePhrase:
                "The body shall report annually on the number of posts authorized by this Act that are filled and the number that are vacant",
            },
            {
              value: "annual-vacancy-and-duration",
              label: "That, and how long the vacancies have lasted",
              clausePhrase:
                "The body shall report annually on the number of posts authorized by this Act that are filled, the number that are vacant, and how long each vacancy has lasted",
            },
          ],
          evidence: authored("An authored reporting duty."),
        },
      ],
      clauses: [
        {
          provisionKey: "posts-authorized",
          dimension: "eligibility-scope",
          heading: "Posts authorized",
          parameterKey: "post-count",
          render: (resolved) => {
            const count = resolved.integer("post-count");
            return {
              text: `There are authorized ${count} ${count === 1 ? "post" : "posts"} of inspector in the department, to carry out inspections the department is already required to make. A post authorized by this Act is not created until it is filled.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "the department, and everyone it inspects",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "salary-ceiling",
          dimension: "funding-cap",
          heading: "Salary ceiling",
          parameterKey: "salary-ceiling",
          render: (resolved) => {
            const amount = resolved.money("salary-ceiling");
            const value = resolved.values["salary-ceiling"];
            const minorUnits =
              value !== undefined && value.kind === "money"
                ? value.minorUnits
                : null;
            return {
              text: `Not more than ${amount} in a year may be paid in salary for the posts authorized by this Act. This section states a ceiling and appropriates nothing.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "the posts this Act authorizes",
              },
              fiscalExposureLabel: `${amount} authorized in salary`,
              fiscalExposureMinorUnits: minorUnits,
            };
          },
        },
        {
          provisionKey: "post-term",
          dimension: "timing",
          heading: "Term of the authorization",
          parameterKey: "post-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "The posts authorized by this Act continue until the authorization is withdrawn."
                : `The authorization made by this Act expires on ${formatStatutoryDate(resolved.endsOn)}. A person holding a post on that date does not thereby acquire a right to continue in it.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "the department, until that date",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "vacancy-report",
          dimension: "oversight",
          heading: "Report on the posts",
          parameterKey: "vacancy-report",
          render: (resolved) => ({
            text: `${resolved.choice("vacancy-report").clausePhrase}.`,
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
        provisionKey: "regional-distribution",
        sectionNumber: 5,
        heading: "Where the posts are actually stationed",
        beneficiaryLabel:
          "the districts that have never had an inspector based in them",
        placeLabel: "the districts a day's drive from the nearest office",
        statedGround:
          "Eleven posts authorized in the capital are eleven posts in the capital, and the inspections that are not happening are the ones four hours away.",
        segmentKey: "administration.post-distribution",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "Not less than one third of the posts authorized by this Act shall be stationed outside the county in which the department has its principal office, and the department shall publish where each is stationed.",
        evidence: authored(
          "An authored request from a fictional member. It distributes posts rather than adding them.",
        ),
      },
    },
    {
      variantKey: "classification-standard",
      instrument: "regulatory-requirement",
      label: "Classification and hiring standard",
      synopsis:
        "Sets the terms on which public posts are classified and filled. It authorizes no post and no money.",
      shortTitle: "Classification Standard",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It sets terms for posts that already exist. It creates none.",
        "It appropriates nothing, and the cost of complying falls on the body it reaches.",
      ],
      defaults: {
        "covered-bodies": { kind: "enumerated", value: "state-agencies" },
        "standard-kind": { kind: "enumerated", value: "published-criteria" },
        "compliance-term": { kind: "duration-years", years: 2 },
      },
      parameters: [
        {
          key: "covered-bodies",
          dimension: "eligibility-scope",
          kind: "enumerated",
          label: "Which bodies this reaches",
          options: [
            {
              value: "state-agencies",
              label: "State agencies",
              clausePhrase: "an agency of this state",
            },
            {
              value: "state-and-local",
              label: "State agencies and local governments",
              clausePhrase:
                "an agency of this state, and a local government of this state",
            },
          ],
          evidence: CIVIL_SERVICE_PRODUCT,
        },
        {
          key: "standard-kind",
          dimension: "oversight",
          kind: "enumerated",
          label: "What the standard requires",
          options: [
            {
              value: "published-criteria",
              label: "Published criteria for each class of post",
              clausePhrase:
                "publish, for each class of post, the criteria on which it is classified and the qualifications required to hold it",
            },
            {
              value: "published-criteria-and-pay-bands",
              label: "That, and the pay band attached to each",
              clausePhrase:
                "publish, for each class of post, the criteria on which it is classified, the qualifications required to hold it, and the range of salary attached to it",
            },
            {
              value: "criteria-bands-and-appeal",
              label: "That, and a route to challenge a classification",
              clausePhrase:
                "publish, for each class of post, the criteria on which it is classified, the qualifications required to hold it, and the range of salary attached to it, and provide a route by which a person holding a post may challenge its classification",
            },
          ],
          evidence: authored(
            "An authored standard. No state's classification rules are reproduced.",
          ),
        },
        {
          key: "compliance-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Time to comply",
          minYears: 1,
          maxYears: 5,
          evidence: authored("An authored compliance window."),
        },
      ],
      clauses: [
        {
          provisionKey: "covered-bodies",
          dimension: "eligibility-scope",
          heading: "Bodies covered",
          parameterKey: "covered-bodies",
          render: (resolved) => {
            const choice = resolved.choice("covered-bodies");
            return {
              text: `This Act applies to ${choice.clausePhrase} that employs persons in classified posts. It authorizes no post and appropriates nothing.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every ${choice.clausePhrase} the Act reaches`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "classification-standard",
          dimension: "oversight",
          heading: "The standard",
          parameterKey: "standard-kind",
          render: (resolved) => {
            const choice = resolved.choice("standard-kind");
            return {
              text: `A body to which this Act applies shall ${choice.clausePhrase}.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel:
                  "every person holding or applying for a classified post",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "classification-compliance",
          dimension: "timing",
          heading: "Compliance",
          parameterKey: "compliance-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "A body to which this Act applies shall comply with it on a date the department publishes."
                : `A body to which this Act applies shall comply with it not later than ${formatStatutoryDate(resolved.endsOn)}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "every covered body, on the same date",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "small-body-relief",
        sectionNumber: 4,
        heading: "Relief for the smallest employers this reaches",
        beneficiaryLabel:
          "local governments with a handful of classified posts",
        placeLabel:
          "the towns where the clerk is also the personnel department",
        statedGround:
          "A city with four classified posts is being asked to publish a classification scheme, and the person who would write it is one of the four.",
        segmentKey: "administration.small-body-relief",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "A local government employing fewer than ten persons in classified posts may satisfy this Act by publishing the qualifications required for each post, and is not required to publish a classification scheme.",
        evidence: authored(
          "An authored request from a fictional member. It narrows a duty rather than funding it.",
        ),
      },
    },
    {
      variantKey: "fee-supported-posts",
      instrument: "position-authorization",
      label: "Posts supported by a charge already collected",
      synopsis:
        "Authorizes posts to be paid for from a fund a charge already feeds, rather than from the general fund.",
      shortTitle: "Fee-Supported Posts",
      subjectClass: "appropriation",
      authorizesAppropriation: true,
      declaredLimits: [
        "It authorizes posts against a fund. It does not impose the charge that feeds the fund.",
        "If the fund is short, the posts are not filled. The Act says so rather than assuming the money is there.",
      ],
      defaults: {
        "post-count": { kind: "integer", value: 6 },
        "salary-ceiling": {
          kind: "money",
          minorUnits: 48_000_000,
          currency: "USD",
        },
        "post-term": { kind: "duration-years", years: 6 },
        "shortfall-rule": { kind: "enumerated", value: "posts-lapse" },
      },
      parameters: [
        {
          key: "post-count",
          dimension: "eligibility-scope",
          kind: "integer",
          label: "Posts authorized",
          min: 1,
          max: 60,
          unitLabel: "posts",
          evidence: authored("An authored number of posts."),
        },
        {
          key: "salary-ceiling",
          dimension: "funding-cap",
          kind: "money",
          label: "Total drawn from the fund in a year",
          minMinorUnits: 3_000_000,
          maxMinorUnits: 500_000_000,
          currency: "USD",
          evidence: authored("An authored ceiling on the draw."),
        },
        {
          key: "post-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Posts authorized for",
          minYears: 2,
          maxYears: 12,
          evidence: authored("An authored term."),
        },
        {
          key: "shortfall-rule",
          dimension: "oversight",
          kind: "enumerated",
          label: "What happens if the fund is short",
          options: [
            {
              value: "posts-lapse",
              label: "The posts go unfilled",
              clausePhrase:
                "Where the fund is insufficient, the posts authorized by this Act shall be left vacant in reverse order of their creation, and no other source may be drawn on",
            },
            {
              value: "report-the-shortfall",
              label: "The posts go unfilled, and the shortfall is reported",
              clausePhrase:
                "Where the fund is insufficient, the posts authorized by this Act shall be left vacant in reverse order of their creation, no other source may be drawn on, and the body shall report the shortfall to the legislature within sixty days",
            },
          ],
          evidence: authored(
            "An authored shortfall rule. It exists so the Act does not quietly assume the money will be there.",
          ),
        },
      ],
      clauses: [
        {
          provisionKey: "posts-authorized",
          dimension: "eligibility-scope",
          heading: "Posts authorized",
          parameterKey: "post-count",
          render: (resolved) => {
            const count = resolved.integer("post-count");
            return {
              text: `There are authorized ${count} ${count === 1 ? "post" : "posts"} in the department, to be paid for only from the road maintenance fund. No post authorized by this Act may be paid for from the general fund.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "the department, to the extent the fund allows",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "fund-ceiling",
          dimension: "funding-cap",
          heading: "Amount drawn from the fund",
          parameterKey: "salary-ceiling",
          render: (resolved) => {
            const amount = resolved.money("salary-ceiling");
            const value = resolved.values["salary-ceiling"];
            const minorUnits =
              value !== undefined && value.kind === "money"
                ? value.minorUnits
                : null;
            return {
              text: `Not more than ${amount} in a year may be drawn from the road maintenance fund for the posts authorized by this Act. This section states a ceiling on a draw and appropriates nothing.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "the posts this Act authorizes",
              },
              fiscalExposureLabel: `${amount} drawn from the fund`,
              fiscalExposureMinorUnits: minorUnits,
            };
          },
        },
        {
          provisionKey: "post-term",
          dimension: "timing",
          heading: "Term of the authorization",
          parameterKey: "post-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "The posts authorized by this Act continue until the authorization is withdrawn."
                : `The authorization made by this Act expires on ${formatStatutoryDate(resolved.endsOn)}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "the department, until that date",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "shortfall-rule",
          dimension: "oversight",
          heading: "If the fund is insufficient",
          parameterKey: "shortfall-rule",
          render: (resolved) => ({
            text: `${resolved.choice("shortfall-rule").clausePhrase}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "the department, and the posts left vacant",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "fund-floor",
        sectionNumber: 5,
        heading: "A first call on the fund for these posts",
        beneficiaryLabel: "the posts that will be first to go vacant",
        placeLabel: "the districts those posts were meant to cover",
        statedGround:
          "Posts paid from a fund that also pays for paving will lose to paving every year, and the inspections stop in the places nobody is watching.",
        segmentKey: "administration.fund-first-call",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "The amount required for the posts authorized by this Act shall be a first call on the road maintenance fund in each year, before any other purpose.",
        evidence: authored(
          "An authored request from a fictional member. It reorders claims on a fund rather than adding to it.",
        ),
      },
    },
  ],
};

export const PUBLIC_ADMINISTRATION_FAMILIES: readonly ProgramFamily[] = [
  ASSISTANCE_ELIGIBILITY,
  AGENCY_REPORTING,
  PUBLIC_WORKFORCE,
];

/** Exported for tests that amend eligibility without a docket bill. */
export const STANDING_ASSISTANCE_AUTHORITY = HOUSEHOLD_ASSISTANCE_ACT;
