import {
  authored,
  IIJA_HEARING_RECORD,
  TARGETED_SECTION_SOURCE,
  formatStatutoryDate,
  type IsoDate,
  type ProgramContentEvidence,
  type ProgramFamily,
} from "./legislation-content-contracts";

/**
 * The bank of acts about withstanding something.
 *
 * Three families whose eligibility operators are genuinely different from a
 * threshold. A recovery programme reaches a place because somebody declared it
 * disaster-designated, which is a status conferred elsewhere rather than a
 * number this state measures. A resilience standard reaches a utility because
 * of what it operates, not what it earns. And an assistance fund modelled on
 * the pilot's own never-adopted amendment reaches applicants by what they run,
 * with the source establishing precisely that proposed text and adopted text
 * are different records.
 */

/* -------------------------------------------------------------------------- */
/* Provenance                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A designation is a status somebody else confers.
 *
 * Structure only, and only about eligibility mechanics: it establishes that
 * whole areas are designated by name and date for the purposes of assistance,
 * so a statute can reach a place by pointing at a designation rather than by
 * measuring anything. It establishes nothing about any actual disaster,
 * designation or area, and none is reproduced.
 */
const DESIGNATION_PRODUCT: ProgramContentEvidence = {
  kind: "source-example",
  reference:
    "This repository's registered fema-disasters source domain, 721 designated-area records",
  asOf: "2024-09-28" as IsoDate,
  establishes:
    "Assistance is routinely made available to whole areas by reference to a designation conferred and dated elsewhere, so eligibility can be a status a place holds rather than a threshold it crosses.",
};

/**
 * The pilot's own proof that proposed text is not adopted text.
 *
 * The amendment that suggested a cyber-resilience assistance fund was ordered
 * to lie on the table. Its shape is read here as structure — an assistance fund
 * defined by what an applicant operates — and nothing about its fate, its
 * amounts or its sponsors is transplanted. The family exists partly to keep
 * that distinction visible: a fund somebody proposed is a proposal.
 */
const RESILIENCE_FUND_SHAPE: ProgramContentEvidence = TARGETED_SECTION_SOURCE;

/* -------------------------------------------------------------------------- */
/* Family — recovery in designated areas                                       */
/* -------------------------------------------------------------------------- */

/**
 * Reaching a place because of a status it holds.
 *
 * Every other eligibility test in the bank is a threshold: a size, a rating, an
 * income share. This one is not a measurement at all. A county is in or out
 * because a designation was made, on a date, by somebody who is not this
 * legislature — which is a materially different operator, and it makes the
 * bill's politics about the designation rather than about the number.
 */
const DISASTER_RECOVERY: ProgramFamily = {
  familyKey: "disaster-recovery",
  familyVersion: "v1",
  title: "Recovery in designated areas",
  mechanism:
    "Reaches a place because it holds a designation conferred elsewhere, rather than because it crosses a threshold this state measures.",
  acceptedDimensions: [
    "funding-cap",
    "eligibility-scope",
    "timing",
    "oversight",
  ],
  structuralProvenance: [DESIGNATION_PRODUCT, IIJA_HEARING_RECORD],
  intendedOutcome: {
    metricStableKey: "recovery.designated-area-awards",
    baselineSeriesKey: "recovery:designated-area-awards",
    statement:
      "How much reaches designated areas, and how long after the designation.",
    evidence: {
      kind: "forecast-claim",
      note: "How much a designated area draws depends on what was damaged there, which this Act does not know.",
      unavailableReason:
        "Nothing in this world records damage or designations against a place, so what a designated area would draw cannot be reported.",
    },
  },
  variants: [
    {
      variantKey: "designated-area-grants",
      instrument: "programme-authorization",
      label: "Grants in designated areas",
      synopsis:
        "Authorizes awards to local governments in areas holding a current designation, for a stated window after it.",
      shortTitle: "Designated Area Grants",
      subjectClass: "appropriation",
      authorizesAppropriation: true,
      declaredLimits: [
        "A place that was damaged but not designated draws nothing under this Act.",
        "It states a ceiling. Whether the money arrives in time is a different question from whether it was authorized.",
      ],
      defaults: {
        "recovery-fund": {
          kind: "money",
          minorUnits: 900_000_000,
          currency: "USD",
        },
        "designation-basis": {
          kind: "enumerated",
          value: "current-designation",
        },
        "claim-window": { kind: "duration-years", years: 2 },
        "award-publication": {
          kind: "enumerated",
          value: "publish-by-place",
        },
      },
      parameters: [
        {
          key: "recovery-fund",
          dimension: "funding-cap",
          kind: "money",
          label: "Recovery fund",
          minMinorUnits: 100_000_000,
          maxMinorUnits: 6_000_000_000,
          currency: "USD",
          evidence: authored(
            "An authored ceiling for a fictional recovery fund. No real disaster's cost is asserted.",
          ),
        },
        {
          key: "designation-basis",
          dimension: "eligibility-scope",
          kind: "enumerated",
          label: "Which designations qualify a place",
          options: [
            {
              value: "current-designation",
              label: "A designation currently in effect",
              clausePhrase:
                "a designation in effect on the date the application is filed",
            },
            {
              value: "designation-within-term",
              label: "A designation made within the claim window",
              clausePhrase:
                "a designation made at any time within the period stated in this Act, whether or not it remains in effect",
            },
            {
              value: "designation-or-adjacent",
              label: "That, or a place adjoining one",
              clausePhrase:
                "a designation made at any time within the period stated in this Act, or adjacency to a place holding such a designation",
            },
          ],
          evidence: DESIGNATION_PRODUCT,
        },
        {
          key: "claim-window",
          dimension: "timing",
          kind: "duration-years",
          label: "Claims accepted for",
          minYears: 1,
          maxYears: 6,
          evidence: authored(
            "An authored claim window. Real deadlines vary and none is reproduced.",
          ),
        },
        {
          key: "award-publication",
          dimension: "oversight",
          kind: "enumerated",
          label: "What must be published about awards",
          options: [
            {
              value: "publish-total",
              label: "The total awarded",
              clausePhrase: "the total amount awarded under this Act",
            },
            {
              value: "publish-by-place",
              label: "The amount awarded to each place",
              clausePhrase:
                "the amount awarded under this Act to each place, and the designation on which each award was based",
            },
            {
              value: "publish-by-place-and-refusals",
              label: "That, and the applications refused",
              clausePhrase:
                "the amount awarded under this Act to each place, the designation on which each award was based, and each application refused together with the reason",
            },
          ],
          evidence: authored("An authored publication duty."),
        },
      ],
      clauses: [
        {
          provisionKey: "purpose",
          dimension: "eligibility-scope",
          heading: "Purpose",
          parameterKey: null,
          render: () => ({
            text: "It is the purpose of this Act to assist local governments with the cost of restoring public facilities in areas designated for assistance, and to do so on the strength of the designation rather than on a fresh assessment by this state.",
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "every local government in a designated area",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "designation-test",
          dimension: "eligibility-scope",
          heading: "Places qualifying",
          parameterKey: "designation-basis",
          render: (resolved) => {
            const choice = resolved.choice("designation-basis");
            return {
              text: `A local government qualifies for an award under this Act if the place it governs holds ${choice.clausePhrase}. No other showing of damage is required, and no showing of damage qualifies a place that holds no designation.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every local government whose place holds ${choice.clausePhrase}`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "recovery-fund",
          dimension: "funding-cap",
          heading: "Amount authorized",
          parameterKey: "recovery-fund",
          render: (resolved) => {
            const amount = resolved.money("recovery-fund");
            const value = resolved.values["recovery-fund"];
            const minorUnits =
              value !== undefined && value.kind === "money"
                ? value.minorUnits
                : null;
            return {
              text: `There is authorized not more than ${amount} for awards under this Act. This section states a ceiling and does not provide the money.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every qualifying local government",
              },
              fiscalExposureLabel: `${amount} authorized`,
              fiscalExposureMinorUnits: minorUnits,
            };
          },
        },
        {
          provisionKey: "claim-window",
          dimension: "timing",
          heading: "Claim period",
          parameterKey: "claim-window",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "An application under this Act may be filed at any time."
                : `An application under this Act shall be filed not later than ${formatStatutoryDate(resolved.endsOn)}. An application filed after that date shall not be considered.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "every applicant within the period",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "award-publication",
          dimension: "oversight",
          heading: "Publication of awards",
          parameterKey: "award-publication",
          render: (resolved) => {
            const choice = resolved.choice("award-publication");
            return {
              text: `The administering agency shall publish ${choice.clausePhrase}.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "anyone reading the published record",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
      ],
      amendmentInvitation: {
        provisionKey: "undesignated-hardship",
        sectionNumber: 6,
        heading: "The places that were hit and not designated",
        beneficiaryLabel: "local governments damaged without a designation",
        placeLabel: "the counties just outside the line on the map",
        statedGround:
          "The line on that map is not a line the water respected, and the county on the wrong side of it is being told its bridge does not count.",
        segmentKey: "recovery.undesignated-hardship",
        requestedMinorUnits: 180_000_000,
        cappedMinorUnits: 60_000_000,
        render: (amountLabel) =>
          `Not more than ${amountLabel} of the amount authorized by this Act may be awarded to a local government that holds no designation, on a showing of damage of the same kind and in the same period as that for which a designation was made in an adjoining place.`,
        evidence: authored(
          "An authored request from a fictional member. It asks to widen a designation-based test, and nothing in the world says it was granted.",
        ),
      },
    },
    {
      variantKey: "post-designation-waiver",
      instrument: "regulatory-requirement",
      label: "Waiver of ordinary requirements after a designation",
      synopsis:
        "Suspends stated procedural requirements in designated areas for a period. It authorizes no money at all.",
      shortTitle: "Post-Designation Waiver",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It suspends requirements. It provides nothing and awards nothing.",
        "It does not suspend a requirement imposed by any authority other than this state.",
      ],
      defaults: {
        "waiver-scope": {
          kind: "enumerated",
          value: "procurement-and-permits",
        },
        "waiver-term": { kind: "duration-years", years: 1 },
        "waiver-reporting": {
          kind: "enumerated",
          value: "report-each-use",
        },
      },
      parameters: [
        {
          key: "waiver-scope",
          dimension: "eligibility-scope",
          kind: "enumerated",
          label: "What is suspended",
          options: [
            {
              value: "procurement-only",
              label: "Competitive procurement timing",
              clausePhrase:
                "the periods this state requires between advertising and awarding a contract",
            },
            {
              value: "procurement-and-permits",
              label: "That, and permit review periods",
              clausePhrase:
                "the periods this state requires between advertising and awarding a contract, and the periods it requires for review of a permit to rebuild a public facility",
            },
          ],
          evidence: DESIGNATION_PRODUCT,
        },
        {
          key: "waiver-term",
          dimension: "timing",
          kind: "duration-years",
          label: "The waiver lasts",
          minYears: 1,
          maxYears: 3,
          evidence: authored(
            "An authored waiver period. It is short by design; a suspension of ordinary process that does not end is not a waiver.",
          ),
        },
        {
          key: "waiver-reporting",
          dimension: "oversight",
          kind: "enumerated",
          label: "What must be recorded when it is used",
          options: [
            {
              value: "report-each-use",
              label: "Each use, and what it was for",
              clausePhrase:
                "A local government relying on this Act shall record each contract or permit to which it applied the waiver, and shall publish that record",
            },
            {
              value: "report-each-use-and-cost",
              label: "That, and what the contract cost",
              clausePhrase:
                "A local government relying on this Act shall record each contract or permit to which it applied the waiver, the amount of each such contract, and shall publish that record",
            },
          ],
          evidence: authored("An authored recording duty."),
        },
      ],
      clauses: [
        {
          provisionKey: "designated-places",
          dimension: "eligibility-scope",
          heading: "Where this Act applies",
          parameterKey: "waiver-scope",
          render: (resolved) => {
            const choice = resolved.choice("waiver-scope");
            return {
              text: `In a place holding a designation for assistance, ${choice.clausePhrase} do not apply to work undertaken to restore a public facility. This Act suspends no requirement imposed otherwise than by this state.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every local government in a designated place",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "waiver-term",
          dimension: "timing",
          heading: "Duration of the waiver",
          parameterKey: "waiver-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "The waiver made by this Act continues until repealed."
                : `The waiver made by this Act applies to work commenced before ${formatStatutoryDate(resolved.endsOn)} and not afterwards.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "work commenced within the period",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "waiver-reporting",
          dimension: "oversight",
          heading: "Record of use",
          parameterKey: "waiver-reporting",
          render: (resolved) => ({
            text: `${resolved.choice("waiver-reporting").clausePhrase}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "anyone reading the published record",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "local-preference",
        sectionNumber: 4,
        heading: "A preference for contractors already in the county",
        beneficiaryLabel: "contractors and crews based in the designated place",
        placeLabel: "the county doing the rebuilding",
        statedGround:
          "Suspend the advertising period and the contract goes to whoever was already mobilised, which is never anybody from the county that was hit.",
        segmentKey: "recovery.local-contractor-preference",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "A local government applying the waiver made by this Act shall give preference to a contractor whose principal place of business is in the designated place, where the contractor is able to perform the work.",
        evidence: authored(
          "An authored request from a fictional member. It attaches a condition to a waiver rather than asking for money.",
        ),
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Family — utility resilience                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Reaching a party because of what it operates.
 *
 * The eligibility operator here is neither a threshold nor a status: it is a
 * fact about what somebody runs. That is the operator a service standard needs,
 * and it is the reason this family can carry both an authorization and a bare
 * requirement without either one being the other with a slider moved.
 */
const UTILITY_RESILIENCE: ProgramFamily = {
  familyKey: "utility-resilience",
  familyVersion: "v1",
  title: "Utility resilience",
  mechanism:
    "Reaches a utility because of what it operates, and either funds hardening or requires it.",
  acceptedDimensions: [
    "funding-cap",
    "eligibility-scope",
    "timing",
    "oversight",
  ],
  structuralProvenance: [IIJA_HEARING_RECORD],
  intendedOutcome: {
    metricStableKey: "utilities.sustained-interruptions",
    baselineSeriesKey: "utilities:sustained-interruptions",
    statement:
      "How long customers are without service, and how often, after the work is done.",
    evidence: {
      kind: "forecast-claim",
      note: "Whether hardening shortens an outage depends on the weather that tests it.",
      unavailableReason:
        "Nothing in this world records service interruptions, so no change in them can be reported.",
    },
  },
  variants: [
    {
      variantKey: "hardening-grants",
      instrument: "programme-authorization",
      label: "Hardening grants",
      synopsis:
        "Authorizes awards to utilities above a stated size to harden distribution, on a matched basis.",
      shortTitle: "Hardening Grants",
      subjectClass: "appropriation",
      authorizesAppropriation: true,
      declaredLimits: [
        "It reaches utilities by what they operate. A utility below the size threshold draws nothing.",
        "It states a ceiling. Nothing here provides the money or does the work.",
      ],
      defaults: {
        "hardening-fund": {
          kind: "money",
          minorUnits: 1_500_000_000,
          currency: "USD",
        },
        "customer-threshold": { kind: "integer", value: 25_000 },
        "programme-term": { kind: "duration-years", years: 5 },
        "outage-reporting": {
          kind: "enumerated",
          value: "report-interruptions",
        },
      },
      parameters: [
        {
          key: "hardening-fund",
          dimension: "funding-cap",
          kind: "money",
          label: "Hardening fund",
          minMinorUnits: 200_000_000,
          maxMinorUnits: 9_000_000_000,
          currency: "USD",
          evidence: authored("An authored ceiling for a fictional programme."),
        },
        {
          key: "customer-threshold",
          dimension: "eligibility-scope",
          kind: "integer",
          label: "Utilities serving at least",
          min: 1_000,
          max: 400_000,
          unitLabel: "customers",
          evidence: authored(
            "An authored size threshold. No real utility's customer count is asserted.",
          ),
        },
        {
          key: "programme-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Awards may be made for",
          minYears: 2,
          maxYears: 10,
          evidence: authored("An authored programme term."),
        },
        {
          key: "outage-reporting",
          dimension: "oversight",
          kind: "enumerated",
          label: "What a recipient must report",
          options: [
            {
              value: "report-completion",
              label: "That the work was finished",
              clausePhrase: "report the completion of each funded work",
            },
            {
              value: "report-interruptions",
              label: "That, and interruptions before and after",
              clausePhrase:
                "report the completion of each funded work and, for the two years before and the two years after it, the number and total duration of sustained interruptions on the circuits it affected",
            },
          ],
          evidence: authored("An authored reporting duty."),
        },
      ],
      clauses: [
        {
          provisionKey: "covered-utilities",
          dimension: "eligibility-scope",
          heading: "Utilities covered",
          parameterKey: "customer-threshold",
          render: (resolved) => {
            const customers = resolved.integer("customer-threshold");
            return {
              text: `A utility serving ${customers.toLocaleString("en-US")} or more customers in this state may apply for an award under this Act. A utility serving fewer may not, and this Act imposes no duty on one.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every utility serving ${customers.toLocaleString("en-US")} or more customers`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "hardening-fund",
          dimension: "funding-cap",
          heading: "Amount authorized",
          parameterKey: "hardening-fund",
          render: (resolved) => {
            const amount = resolved.money("hardening-fund");
            const value = resolved.values["hardening-fund"];
            const minorUnits =
              value !== undefined && value.kind === "money"
                ? value.minorUnits
                : null;
            return {
              text: `There is authorized not more than ${amount} for awards under this Act, of which no award may exceed half the cost of the work it funds. This section states a ceiling and does not provide the money.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every covered utility that applies",
              },
              fiscalExposureLabel: `${amount} authorized`,
              fiscalExposureMinorUnits: minorUnits,
            };
          },
        },
        {
          provisionKey: "hardening-term",
          dimension: "timing",
          heading: "Period of the programme",
          parameterKey: "programme-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "Awards may be made under this Act until the authority is withdrawn."
                : `No award may be made under this Act after ${formatStatutoryDate(resolved.endsOn)}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "every applicant within the period",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "outage-reporting",
          dimension: "oversight",
          heading: "Reporting by recipients",
          parameterKey: "outage-reporting",
          render: (resolved) => {
            const choice = resolved.choice("outage-reporting");
            return {
              text: `A utility receiving an award under this Act shall ${choice.clausePhrase}, and the department shall publish what it receives.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel:
                  "customers of the utilities that receive awards",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
      ],
      amendmentInvitation: {
        provisionKey: "small-cooperative-share",
        sectionNumber: 5,
        heading: "A share for the small cooperatives this excludes",
        beneficiaryLabel: "cooperatives below the customer threshold",
        placeLabel: "the districts served by a cooperative and nobody else",
        statedGround:
          "The threshold in Section 1 excludes every cooperative in my district, and they are the ones whose lines come down.",
        segmentKey: "utilities.small-cooperative-share",
        requestedMinorUnits: 300_000_000,
        cappedMinorUnits: 120_000_000,
        render: (amountLabel) =>
          `Not less than ${amountLabel} of the amount authorized by this Act shall be reserved for utilities serving fewer customers than the threshold stated in Section 1, which may apply for an award from that reservation.`,
        evidence: authored(
          "An authored request from a fictional member. It carves out a reservation, and nothing says it was granted.",
        ),
      },
    },
    {
      variantKey: "restoration-standard",
      instrument: "regulatory-requirement",
      label: "Restoration and notice standard",
      synopsis:
        "Requires utilities above a stated size to publish a restoration plan and to notify customers. It funds nothing.",
      shortTitle: "Restoration Standard",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It requires a plan and a notice. It does not require a single pole to be replaced.",
        "It appropriates nothing; the cost of complying falls on the utility and, through it, on its customers.",
      ],
      defaults: {
        "customer-threshold": { kind: "integer", value: 25_000 },
        "standard-contents": {
          kind: "enumerated",
          value: "plan-and-notice",
        },
        "compliance-term": { kind: "duration-years", years: 2 },
      },
      parameters: [
        {
          key: "customer-threshold",
          dimension: "eligibility-scope",
          kind: "integer",
          label: "Utilities serving at least",
          min: 1_000,
          max: 400_000,
          unitLabel: "customers",
          evidence: authored(
            "An authored size threshold, on the same fictional basis as the grant variant.",
          ),
        },
        {
          key: "standard-contents",
          dimension: "oversight",
          kind: "enumerated",
          label: "What the standard requires",
          options: [
            {
              value: "plan-only",
              label: "A published restoration plan",
              clausePhrase:
                "publish a plan stating the order in which it restores service after an interruption and the basis of that order",
            },
            {
              value: "plan-and-notice",
              label: "That, and notice to customers during an outage",
              clausePhrase:
                "publish a plan stating the order in which it restores service after an interruption and the basis of that order, and give each affected customer an estimate of when service will be restored and notice when that estimate changes",
            },
            {
              value: "plan-notice-and-priority",
              label: "That, and a registered priority list",
              clausePhrase:
                "publish a plan stating the order in which it restores service after an interruption and the basis of that order, give each affected customer an estimate of when service will be restored and notice when that estimate changes, and maintain a register of customers who rely on electrically powered medical equipment and restore them first where it is practicable to do so",
            },
          ],
          evidence: authored(
            "An authored service standard. No utility's actual practice is described.",
          ),
        },
        {
          key: "compliance-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Time to comply",
          minYears: 1,
          maxYears: 4,
          evidence: authored("An authored compliance window."),
        },
      ],
      clauses: [
        {
          provisionKey: "covered-utilities",
          dimension: "eligibility-scope",
          heading: "Utilities covered",
          parameterKey: "customer-threshold",
          render: (resolved) => {
            const customers = resolved.integer("customer-threshold");
            return {
              text: `This Act applies to a utility serving ${customers.toLocaleString("en-US")} or more customers in this state. A utility serving fewer is not subject to it and may comply voluntarily.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every utility serving ${customers.toLocaleString("en-US")} or more customers`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "restoration-standard",
          dimension: "oversight",
          heading: "The standard",
          parameterKey: "standard-contents",
          render: (resolved) => {
            const choice = resolved.choice("standard-contents");
            return {
              text: `A utility to which this Act applies shall ${choice.clausePhrase}.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every customer of a covered utility",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "restoration-compliance",
          dimension: "timing",
          heading: "Compliance",
          parameterKey: "compliance-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "A covered utility shall comply with this Act on a date the department publishes."
                : `A covered utility shall comply with this Act not later than ${formatStatutoryDate(resolved.endsOn)}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "every covered utility, on the same date",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "cost-recovery-bar",
        sectionNumber: 4,
        heading: "Whether customers pay for the plan",
        beneficiaryLabel: "customers of the covered utilities",
        placeLabel: "every household on a covered line",
        statedGround:
          "An unfunded duty on a regulated utility arrives on the bill within a year, and the people who wanted the notice are the ones who pay for it.",
        segmentKey: "utilities.cost-recovery-bar",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "The cost of complying with this Act shall not be recovered through a rate increase within three years of its enactment, and a utility seeking to recover it afterwards shall state the amount separately.",
        evidence: authored(
          "An authored request from a fictional member. It bars a cost recovery rather than appropriating one.",
        ),
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Family — critical infrastructure assistance                                 */
/* -------------------------------------------------------------------------- */

/**
 * The fund somebody proposed.
 *
 * Its shape is read from an amendment that was ordered to lie on the table —
 * an assistance fund defined by what an applicant operates rather than by where
 * it is or what it earns. The source's value here is precisely that it was
 * never adopted: it is the game's own reminder that a text existing, being
 * sponsored and being argued over says nothing about whether it became law.
 */
const CRITICAL_INFRASTRUCTURE: ProgramFamily = {
  familyKey: "critical-infrastructure",
  familyVersion: "v1",
  title: "Critical infrastructure assistance",
  mechanism:
    "Assists operators of systems the state depends on, reaching them by what they operate rather than by where they are.",
  acceptedDimensions: [
    "funding-cap",
    "eligibility-scope",
    "timing",
    "oversight",
  ],
  structuralProvenance: [RESILIENCE_FUND_SHAPE, IIJA_HEARING_RECORD],
  intendedOutcome: {
    metricStableKey: "infrastructure.assisted-operators",
    baselineSeriesKey: "infrastructure:assisted-operators",
    statement:
      "Which operators are assisted, and whether the systems they run hold up.",
    evidence: {
      kind: "forecast-claim",
      note: "Whether assistance prevented anything is not observable from the assistance.",
      unavailableReason:
        "Nothing in this world records incidents against the systems this Act reaches, so no averted incident can be claimed.",
    },
  },
  variants: [
    {
      variantKey: "operator-assistance-fund",
      instrument: "programme-authorization",
      label: "Assistance fund for covered operators",
      synopsis:
        "Authorizes assistance to operators of stated systems, on application, with the assistance reported publicly and the details not.",
      shortTitle: "Operator Assistance",
      subjectClass: "appropriation",
      authorizesAppropriation: true,
      declaredLimits: [
        "It assists operators. It does not require any operator to do anything.",
        "It states a ceiling and provides no money.",
      ],
      defaults: {
        "assistance-fund": {
          kind: "money",
          minorUnits: 700_000_000,
          currency: "USD",
        },
        "covered-systems": { kind: "enumerated", value: "water-and-power" },
        "programme-term": { kind: "duration-years", years: 4 },
        "disclosure-rule": {
          kind: "enumerated",
          value: "amounts-public-details-not",
        },
      },
      parameters: [
        {
          key: "assistance-fund",
          dimension: "funding-cap",
          kind: "money",
          label: "Assistance fund",
          minMinorUnits: 50_000_000,
          maxMinorUnits: 4_000_000_000,
          currency: "USD",
          evidence: authored("An authored ceiling for a fictional fund."),
        },
        {
          key: "covered-systems",
          dimension: "eligibility-scope",
          kind: "enumerated",
          label: "Systems whose operators may apply",
          options: [
            {
              value: "water-only",
              label: "Community water systems",
              clausePhrase: "a community water system",
            },
            {
              value: "water-and-power",
              label: "Water systems and electric distribution",
              clausePhrase:
                "a community water system, or a utility distributing electricity",
            },
            {
              value: "water-power-and-emergency",
              label: "Those, and emergency communications",
              clausePhrase:
                "a community water system, a utility distributing electricity, or an operator of an emergency communications system",
            },
          ],
          evidence: RESILIENCE_FUND_SHAPE,
        },
        {
          key: "programme-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Assistance available for",
          minYears: 2,
          maxYears: 8,
          evidence: authored("An authored programme term."),
        },
        {
          key: "disclosure-rule",
          dimension: "oversight",
          kind: "enumerated",
          label: "What is published about an award",
          options: [
            {
              value: "amounts-public-details-not",
              label: "The amount and the recipient, not the weakness",
              clausePhrase:
                "The department shall publish the amount of each award and the operator receiving it, and shall not publish any description of a vulnerability identified in the application",
            },
            {
              value: "aggregate-only",
              label: "Only the total, by kind of system",
              clausePhrase:
                "The department shall publish, for each kind of system, the total amount awarded and the number of operators assisted, and shall publish nothing identifying an individual operator",
            },
          ],
          evidence: authored(
            "An authored disclosure rule. Both options are real legislative choices and the Act says which it made.",
          ),
        },
      ],
      clauses: [
        {
          provisionKey: "covered-operators",
          dimension: "eligibility-scope",
          heading: "Operators who may apply",
          parameterKey: "covered-systems",
          render: (resolved) => {
            const choice = resolved.choice("covered-systems");
            return {
              text: `An operator of ${choice.clausePhrase} serving this state may apply for assistance under this Act. Eligibility turns on what the applicant operates and on nothing else.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every operator of ${choice.clausePhrase}`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "assistance-fund",
          dimension: "funding-cap",
          heading: "Amount authorized",
          parameterKey: "assistance-fund",
          render: (resolved) => {
            const amount = resolved.money("assistance-fund");
            const value = resolved.values["assistance-fund"];
            const minorUnits =
              value !== undefined && value.kind === "money"
                ? value.minorUnits
                : null;
            return {
              text: `There is authorized not more than ${amount} for assistance under this Act. This section states a ceiling and does not provide the money.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every covered operator that applies",
              },
              fiscalExposureLabel: `${amount} authorized`,
              fiscalExposureMinorUnits: minorUnits,
            };
          },
        },
        {
          provisionKey: "assistance-term",
          dimension: "timing",
          heading: "Period of the programme",
          parameterKey: "programme-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "Assistance may be provided under this Act until the authority is withdrawn."
                : `No assistance may be provided under this Act after ${formatStatutoryDate(resolved.endsOn)}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "every applicant within the period",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "disclosure-rule",
          dimension: "oversight",
          heading: "Publication",
          parameterKey: "disclosure-rule",
          render: (resolved) => ({
            text: `${resolved.choice("disclosure-rule").clausePhrase}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "anyone reading the published record",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "smallest-operators-reserve",
        sectionNumber: 5,
        heading: "A reservation for operators with no staff to apply",
        beneficiaryLabel: "the smallest covered operators",
        placeLabel: "the districts where the water system has two employees",
        statedGround:
          "An application process assists the operators who can write an application, and the systems I am worried about are run by two people and a part-time bookkeeper.",
        segmentKey: "infrastructure.smallest-operator-reserve",
        requestedMinorUnits: 160_000_000,
        cappedMinorUnits: 55_000_000,
        render: (amountLabel) =>
          `Not less than ${amountLabel} of the amount authorized by this Act shall be reserved for operators in the smallest quartile by persons served, and the department shall provide assistance in preparing an application to any operator in that quartile that requests it.`,
        evidence: authored(
          "An authored request from a fictional member. Nothing in the world says it was granted.",
        ),
      },
    },
    {
      variantKey: "continuity-planning-duty",
      instrument: "regulatory-requirement",
      label: "Continuity planning duty",
      synopsis:
        "Requires covered operators to hold and exercise a continuity plan, and to say when they last did. It funds nothing.",
      shortTitle: "Continuity Planning",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It requires a plan and an exercise. It does not require the plan to be a good one.",
        "It appropriates nothing, and the cost falls on the operator.",
      ],
      defaults: {
        "covered-systems": { kind: "enumerated", value: "water-and-power" },
        "exercise-cycle": { kind: "enumerated", value: "biennial-exercise" },
        "compliance-term": { kind: "duration-years", years: 2 },
      },
      parameters: [
        {
          key: "covered-systems",
          dimension: "eligibility-scope",
          kind: "enumerated",
          label: "Operators covered",
          options: [
            {
              value: "water-only",
              label: "Community water systems",
              clausePhrase: "a community water system",
            },
            {
              value: "water-and-power",
              label: "Water systems and electric distribution",
              clausePhrase:
                "a community water system, or a utility distributing electricity",
            },
          ],
          evidence: RESILIENCE_FUND_SHAPE,
        },
        {
          key: "exercise-cycle",
          dimension: "oversight",
          kind: "enumerated",
          label: "What the duty requires",
          options: [
            {
              value: "plan-only",
              label: "Hold a plan",
              clausePhrase:
                "maintain a written plan for continuing service during an interruption, and file with the department a statement that it holds one",
            },
            {
              value: "biennial-exercise",
              label: "Hold one, and exercise it every two years",
              clausePhrase:
                "maintain a written plan for continuing service during an interruption, exercise it not less than once in every two years, and file with the department a statement of the date it last did so",
            },
            {
              value: "biennial-exercise-and-findings",
              label: "That, and say what the exercise found",
              clausePhrase:
                "maintain a written plan for continuing service during an interruption, exercise it not less than once in every two years, and file with the department a statement of the date it last did so together with the deficiencies the exercise identified and what has been done about them",
            },
          ],
          evidence: authored("An authored planning duty."),
        },
        {
          key: "compliance-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Time to comply",
          minYears: 1,
          maxYears: 4,
          evidence: authored("An authored compliance window."),
        },
      ],
      clauses: [
        {
          provisionKey: "covered-operators",
          dimension: "eligibility-scope",
          heading: "Operators covered",
          parameterKey: "covered-systems",
          render: (resolved) => {
            const choice = resolved.choice("covered-systems");
            return {
              text: `This Act applies to an operator of ${choice.clausePhrase} serving this state. It provides no assistance and authorizes no amount.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every operator of ${choice.clausePhrase}`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "planning-duty",
          dimension: "oversight",
          heading: "The duty",
          parameterKey: "exercise-cycle",
          render: (resolved) => {
            const choice = resolved.choice("exercise-cycle");
            return {
              text: `An operator to which this Act applies shall ${choice.clausePhrase}. A statement filed under this section is not a public record to the extent it describes a vulnerability.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "everyone served by a covered operator",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "continuity-compliance",
          dimension: "timing",
          heading: "Compliance",
          parameterKey: "compliance-term",
          render: (resolved) => ({
            text:
              resolved.endsOn === null
                ? "A covered operator shall comply with this Act on a date the department publishes."
                : `A covered operator shall comply with this Act not later than ${formatStatutoryDate(resolved.endsOn)}.`,
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "every covered operator, on the same date",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
      ],
      amendmentInvitation: {
        provisionKey: "planning-assistance",
        sectionNumber: 4,
        heading: "Help writing the plan this requires",
        beneficiaryLabel: "operators with nobody on staff to write one",
        placeLabel: "the small districts this reaches for the first time",
        statedGround:
          "We are requiring a continuity plan from systems that do not have anybody who has written one, and the statement they file will say so.",
        segmentKey: "infrastructure.planning-assistance",
        requestedMinorUnits: 0,
        cappedMinorUnits: 0,
        render: () =>
          "The department shall publish a model plan sufficient to satisfy this Act, and an operator adopting it without modification is deemed to comply with the requirement to maintain one.",
        evidence: authored(
          "An authored request from a fictional member. It lowers a barrier rather than funding one.",
        ),
      },
    },
  ],
};

export const RESILIENCE_FAMILIES: readonly ProgramFamily[] = [
  DISASTER_RECOVERY,
  UTILITY_RESILIENCE,
  CRITICAL_INFRASTRUCTURE,
];
