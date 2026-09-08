import type { IsoDate, LegislativeProvisionBeneficiary } from "./types";

/**
 * What a bill can be about, declared rather than written out one bill at a
 * time.
 *
 * The legislative core could already move a bill and, since the bargaining
 * work, say what was in one and who had promised what about it. What it could
 * not do was produce a materially different bill. Three authored scenarios
 * existed and all three were the same mechanism — a transit subsidy — with the
 * state, the bill number and the beneficiary changed. A player choosing among
 * them was choosing a label.
 *
 * This module is the content contract that fixes that. A *family* says what
 * kind of programme a bill establishes and, crucially, which clause dimensions
 * that programme is even capable of carrying. A *variant* is one supported
 * configuration of a family. The compiler in `legislation-drafting.ts` turns a
 * family, a variant and a set of parameter values into numbered clauses, and
 * refuses combinations the family does not accept.
 *
 * Two things are deliberately NOT here.
 *
 * There is no universal legal language. A family accepts a small, declared set
 * of typed parameters and nothing else; there is no expression syntax, no free
 * text driving mechanics, and no way to author a clause the family did not say
 * it could carry. The refusals in the compiler are the point of the design, not
 * an afterthought to it.
 *
 * And there is no claim that any of this is law. Every record below carries its
 * evidence class. A source example says a real measure had a shape and cites
 * where that was read; an authored parameter says a number was chosen for this
 * game and is not a measurement of anywhere; a forecast claim says an effect
 * would have to be estimated and names why the estimate is not available. The
 * three are kept apart because a renderer that cannot tell them apart will
 * eventually tell a player that a fictional bill is a statute.
 */

/* -------------------------------------------------------------------------- */
/* Evidence classes                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Where a piece of content's authority comes from.
 *
 * The kinds are exhaustive on purpose. A content record that cannot say which
 * of these it is does not get written, because the alternative — an unlabelled
 * assertion — is how an authored dollar figure ends up rendered as a measured
 * national effect.
 */
export type ProgramContentEvidence =
  /**
   * A real measure, hearing or analysis that demonstrated this *shape*. It
   * establishes that legislatures write clauses like this. It does NOT
   * establish that this game's numbers, places or programmes exist.
   */
  | {
      readonly kind: "source-example";
      readonly reference: string;
      readonly asOf: IsoDate;
      /** Precisely what the source shows, in its own terms. */
      readonly establishes: string;
    }
  /**
   * A number, threshold or label chosen for this game. It is fiction with a
   * declared author, not a measurement, and no renderer may present it as the
   * current state of any real law.
   */
  | {
      readonly kind: "authored-parameter";
      readonly note: string;
    }
  /**
   * An effect somebody would have to estimate. Recorded so the game can say
   * what it does not know, rather than quietly producing a confident number.
   */
  | {
      readonly kind: "forecast-claim";
      readonly note: string;
      /** Why this world cannot produce the estimate right now. */
      readonly unavailableReason: string;
    };

/* -------------------------------------------------------------------------- */
/* Clause dimensions and parameters                                            */
/* -------------------------------------------------------------------------- */

/**
 * The kinds of clause a bill in this game can carry.
 *
 * A family declares which of these it accepts. Asking for one it does not
 * accept is refused at the compiler boundary rather than producing a section
 * whose text says something the programme cannot do.
 */
export type ClauseDimension =
  /** A ceiling on what the measure authorizes. Money. */
  | "funding-cap"
  /** Who or where qualifies. May be a population, a place or a condition. */
  | "eligibility-scope"
  /** When it starts, how it phases, and whether it ends. */
  | "timing"
  /**
   * A duty the measure imposes that costs no money to state: an inventory, a
   * plan, a service standard, a report. Non-money clauses are first-class
   * here because a bill that only reads as an appropriation cannot express a
   * mandate, and mandates are most of what small legislatures actually pass.
   */
  | "oversight";

/** A typed, adjustable value a family exposes to the player. */
export type ProgramParameterSpec =
  | {
      readonly key: string;
      readonly dimension: ClauseDimension;
      readonly kind: "money";
      readonly label: string;
      /** Inclusive bounds. A value outside them is refused, not clamped. */
      readonly minMinorUnits: number;
      readonly maxMinorUnits: number;
      readonly currency: string;
      readonly evidence: ProgramContentEvidence;
    }
  | {
      readonly key: string;
      readonly dimension: ClauseDimension;
      readonly kind: "enumerated";
      readonly label: string;
      readonly options: readonly ProgramParameterOption[];
      readonly evidence: ProgramContentEvidence;
    }
  | {
      readonly key: string;
      readonly dimension: ClauseDimension;
      readonly kind: "duration-years";
      readonly label: string;
      readonly minYears: number;
      /** Null means the configuration supports an ongoing programme. */
      readonly maxYears: number | null;
      readonly evidence: ProgramContentEvidence;
    }
  | {
      readonly key: string;
      readonly dimension: ClauseDimension;
      readonly kind: "integer";
      readonly label: string;
      readonly min: number;
      readonly max: number;
      /** e.g. "condition rating", "households". Never parsed from prose. */
      readonly unitLabel: string;
      readonly evidence: ProgramContentEvidence;
    };

export interface ProgramParameterOption {
  readonly value: string;
  readonly label: string;
  /** How the clause text names this choice. */
  readonly clausePhrase: string;
}

/** A parameter value as chosen for one draft. */
export type ProgramParameterValue =
  | { readonly kind: "money"; readonly minorUnits: number; readonly currency: string }
  | { readonly kind: "enumerated"; readonly value: string }
  | { readonly kind: "duration-years"; readonly years: number | null }
  | { readonly kind: "integer"; readonly value: number };

/* -------------------------------------------------------------------------- */
/* Clause templates                                                            */
/* -------------------------------------------------------------------------- */

/**
 * One section a variant files, before any parameter is applied.
 *
 * `render` is a function of the resolved parameter values rather than a string
 * with holes in it, because several clauses read differently — not merely with
 * a different number — depending on what was chosen. A sunset clause with no
 * end date is not the sunset sentence with a blank in it; it is a different
 * sentence, and saying so in code is cheaper than discovering it in prose
 * review.
 */
export interface ClauseTemplate {
  readonly provisionKey: string;
  readonly dimension: ClauseDimension;
  readonly heading: string;
  /** The parameter this clause reads, when it reads one. */
  readonly parameterKey: string | null;
  readonly render: (resolved: ResolvedParameters) => ClauseRendering;
}

export interface ClauseRendering {
  readonly text: string;
  readonly beneficiary: LegislativeProvisionBeneficiary;
  /** Money this section exposes the state to. Null for a non-money clause. */
  readonly fiscalExposureLabel: string | null;
  readonly fiscalExposureMinorUnits: number | null;
}

/** Parameter values resolved and validated, keyed for a template to read. */
export interface ResolvedParameters {
  readonly values: Readonly<Record<string, ProgramParameterValue>>;
  readonly filedOn: IsoDate;
  /** Present only where the variant declares a timing parameter. */
  readonly startsOn: IsoDate;
  readonly endsOn: IsoDate | null;
  /** Formatting helpers, so no template parses or invents a money string. */
  readonly money: (key: string) => string;
  readonly choice: (key: string) => ProgramParameterOption;
  readonly integer: (key: string) => number;
}

/* -------------------------------------------------------------------------- */
/* The narrower section a colleague asks for                                   */
/* -------------------------------------------------------------------------- */

/**
 * The amendment this variant's politics are actually about.
 *
 * The bargaining work already models a colleague asking for a narrower section
 * and a fiscal guardian counting what the bill commits. That machinery is
 * reused exactly as accepted; what it was missing was any way to be about
 * something other than a transit local match. A variant supplies its own ask,
 * so a broadband bill is bargained over broadband and a water bill over water,
 * through the same accepted writers.
 */
export interface AmendmentInvitation {
  readonly provisionKey: string;
  readonly sectionNumber: number;
  readonly heading: string;
  readonly beneficiaryLabel: string;
  readonly placeLabel: string;
  /** The public argument for writing it narrowly. Recorded, not implied. */
  readonly statedGround: string;
  readonly segmentKey: `${string}.${string}`;
  readonly requestedMinorUnits: number;
  /** What the fiscal side says it could carry instead. */
  readonly cappedMinorUnits: number;
  readonly render: (amountLabel: string) => string;
  readonly evidence: ProgramContentEvidence;
}

/* -------------------------------------------------------------------------- */
/* Families and variants                                                       */
/* -------------------------------------------------------------------------- */

export interface ProgramVariant {
  readonly variantKey: string;
  readonly label: string;
  /** One sentence a player reads before choosing. Plain language. */
  readonly synopsis: string;
  readonly shortTitle: string;
  readonly subjectClass: "appropriation" | "general-policy";
  /**
   * Whether this configuration authorizes money at all.
   *
   * False is not a formality. A mandate that appropriates nothing is a real
   * legislative act with real politics, and the compiler refuses to attach a
   * funding cap to one rather than quietly turning it into a spending bill.
   */
  readonly authorizesAppropriation: boolean;
  /**
   * The configuration a player is offered before touching anything.
   *
   * Declared rather than derived from each parameter's minimum, because a
   * variant's default is a piece of authored content in its own right: the
   * transit pilot's default is the $8,000,000 two-year programme the accepted
   * bargaining sitting is written against, and deriving it would silently
   * restate that bill the first time somebody widened a bound.
   */
  readonly defaults: Readonly<Record<string, ProgramParameterValue>>;
  readonly parameters: readonly ProgramParameterSpec[];
  readonly clauses: readonly ClauseTemplate[];
  readonly amendmentInvitation: AmendmentInvitation;
  /** What this configuration does NOT do, said plainly. */
  readonly declaredLimits: readonly string[];
}

export interface ProgramFamily {
  readonly familyKey: string;
  /**
   * Bumped when a family's clause meaning changes. Saved bills record the
   * version they were compiled at, so editing this bank cannot silently
   * restate a bill a player already filed.
   */
  readonly familyVersion: string;
  readonly title: string;
  /** The mechanism, in one line. Two families may not share one. */
  readonly mechanism: string;
  readonly acceptedDimensions: readonly ClauseDimension[];
  /** Source material that demonstrated this clause shape exists. */
  readonly structuralProvenance: readonly ProgramContentEvidence[];
  /**
   * What the programme is meant to change, and why the game cannot score it.
   *
   * Declared so the analysis surface can name the exact series an estimate
   * would need instead of producing a confident number from nothing. A world
   * that has never measured this series has no business forecasting a change
   * in it, and saying which series is missing is more useful to a player than
   * a fabricated total would be.
   */
  readonly intendedOutcome: {
    /** The metric-catalog key: dotted, as metric definitions are keyed. */
    readonly metricStableKey: string;
    /**
     * The policy-semantics series key: colon-namespaced, as baselines and
     * estimates are keyed. Held separately rather than derived from the metric
     * key, because the two key spaces are validated by different rules and a
     * silent transformation between them would be a guess.
     */
    readonly baselineSeriesKey: `${string}:${string}`;
    readonly statement: string;
    readonly evidence: ProgramContentEvidence;
  };
  readonly variants: readonly ProgramVariant[];
}

/* -------------------------------------------------------------------------- */
/* Shared evidence                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The one federal episode this tranche's clause shapes were read from.
 *
 * It is cited for structure only. Nothing below replays its outcome, adopts its
 * amounts, transplants federal procedure into a state legislature, or puts its
 * speakers' words in a fictional member's mouth. What it establishes is that
 * real measures separate authorization from appropriation, carry condition
 * thresholds and service standards as operative text, and attract narrow
 * targeted sections that may never be adopted.
 */
const IIJA_HEARING_RECORD: ProgramContentEvidence = {
  kind: "source-example",
  reference:
    "House Transportation and Infrastructure hearing record CHRG-117hhrg45093",
  asOf: "2021-06-04" as IsoDate,
  establishes:
    "Infrastructure argument in a real hearing record recurs around maintenance backlog, rural access, broadband, water and named local projects, and members ask for locally important provisions inside a larger package.",
};

const IIJA_FISCAL_TREATMENT: ProgramContentEvidence = {
  kind: "source-example",
  reference: "Congressional Budget Office publication 57406",
  asOf: "2021-08-05" as IsoDate,
  establishes:
    "An official estimate distinguishes authorizing legislation from appropriation treatment and states which effects it did not model, rather than presenting one confident total.",
};

const TARGETED_SECTION_SOURCE: ProgramContentEvidence = {
  kind: "source-example",
  reference: "Senate Amendment 2638 to Senate Amendment 2137, 117th Congress",
  asOf: "2021-08-03" as IsoDate,
  establishes:
    "A narrow targeted section can be drafted, sponsored and laid on the table without ever entering the enacted text, so proposed text and adopted text are different records.",
};

/** Authored fiction. Cited on every number a player can move. */
function authored(note: string): ProgramContentEvidence {
  return { kind: "authored-parameter", note };
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The one place a money figure becomes words.
 *
 * Exact minor units in, a label out. Nothing in this feature reads a number
 * back out of a string, so a label can never become the value that drives a
 * clause.
 */
export function formatMinorUnits(minorUnits: number, currency: string): string {
  if (!Number.isSafeInteger(minorUnits) || minorUnits < 0) {
    throw new Error(
      `A clause amount must be a non-negative whole number of minor units; received ${minorUnits}.`,
    );
  }
  if (currency !== "USD") {
    throw new Error(
      `This content bank is written in USD; received '${currency}'.`,
    );
  }
  const major = Math.trunc(minorUnits / 100);
  const cents = minorUnits % 100;
  const body = major.toLocaleString("en-US");
  return cents === 0 ? `$${body}` : `$${body}.${String(cents).padStart(2, "0")}`;
}

function yearsPhrase(years: number): string {
  return years === 1 ? "one year" : `${numberWord(years)} years`;
}

/**
 * The attributive form: "a two-year pilot", never "a two years pilot".
 *
 * Kept separate from `yearsPhrase` because the two are not interchangeable —
 * "once every two years" and "the two-year pilot" are both correct and neither
 * spelling works in the other's sentence.
 */
function yearsAttributive(years: number): string {
  return `${numberWord(years)}-year`;
}

function numberWord(value: number): string {
  const words = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
  ];
  return words[value] ?? String(value);
}

/* -------------------------------------------------------------------------- */
/* Family 1 — transit access                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Fare relief and formula access.
 *
 * The first variant is the shape the accepted bargaining work was written
 * against: a two-year pilot that removes the fare for riders already enrolled
 * in state assistance, funded in proportion to eligible boardings and naming
 * nobody. Its numbers and text are held identical to the accepted content so
 * the existing sitting is unchanged by this bank existing.
 *
 * The second is deliberately a different mechanism rather than the same one
 * relabelled: it does not touch fares at all, and reaches counties by the
 * absence of a fixed-route provider instead of reaching riders by enrolment.
 */
const TRANSIT_ACCESS: ProgramFamily = {
  familyKey: "transit-access",
  familyVersion: "v1",
  title: "Transit access",
  mechanism:
    "Reduces what riders pay, or extends an existing assistance formula to places a provider does not serve.",
  acceptedDimensions: ["funding-cap", "eligibility-scope", "timing"],
  structuralProvenance: [IIJA_HEARING_RECORD, TARGETED_SECTION_SOURCE],
  intendedOutcome: {
    metricStableKey: "transit.eligible-boardings",
    baselineSeriesKey: "transit:eligible-boardings",
    statement:
      "Whether removing the fare actually moves boardings by riders who qualify.",
    evidence: {
      kind: "forecast-claim",
      note: "Any figure for additional boardings under this Act would be a projection, not a count.",
      unavailableReason:
        "No boardings series has been measured in this world, so there is nothing for a projection to move.",
    },
  },
  variants: [
    {
      variantKey: "enrollment-fare-relief",
      label: "Fare relief for assistance enrollees",
      synopsis:
        "Riders already enrolled in a state assistance programme ride without paying a fare, and participating providers are reimbursed in proportion to those boardings.",
      shortTitle: "Transit Access Pilot",
      subjectClass: "general-policy",
      authorizesAppropriation: true,
      declaredLimits: [
        "It creates no entitlement to service, and does not require any provider to add a route.",
        "It reimburses boardings; it does not fund vehicles, staff or maintenance.",
      ],
      defaults: {
        // Held identical to the accepted bargaining content: an $8,000,000
        // two-year pilot for assistance enrollees. The sitting that already
        // exists must be unchanged by this bank describing it.
        "support-limit": { kind: "money", minorUnits: 800_000_000, currency: "USD" },
        "rider-eligibility": { kind: "enumerated", value: "assistance-enrollees" },
        "pilot-term": { kind: "duration-years", years: 2 },
      },
      parameters: [
        {
          key: "support-limit",
          dimension: "funding-cap",
          kind: "money",
          label: "Pilot support limit",
          minMinorUnits: 200_000_000,
          maxMinorUnits: 2_000_000_000,
          currency: "USD",
          evidence: authored(
            "An authored ceiling for a fictional state pilot. It is not drawn from any real transit budget and is not a measured cost.",
          ),
        },
        {
          key: "rider-eligibility",
          dimension: "eligibility-scope",
          kind: "enumerated",
          label: "Who rides without paying",
          options: [
            {
              value: "assistance-enrollees",
              label: "Riders enrolled in state assistance",
              clausePhrase:
                "enrolled in a state assistance programme at the time of boarding",
            },
            {
              value: "assistance-and-students",
              label: "Assistance enrollees and secondary students",
              clausePhrase:
                "enrolled in a state assistance programme at the time of boarding, or enrolled in a public secondary school",
            },
            {
              value: "assistance-and-seniors",
              label: "Assistance enrollees and riders over sixty-five",
              clausePhrase:
                "enrolled in a state assistance programme at the time of boarding, or sixty-five years of age or older",
            },
          ],
          evidence: authored(
            "Authored eligibility classes for a fictional programme. No real state's assistance rules are asserted.",
          ),
        },
        {
          key: "pilot-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Pilot term",
          minYears: 1,
          maxYears: 4,
          evidence: authored(
            "An authored pilot length. It is a design choice, not a finding about how long such a pilot needs to run.",
          ),
        },
      ],
      clauses: [
        {
          provisionKey: "purpose",
          dimension: "eligibility-scope",
          heading: "Purpose and construction",
          parameterKey: null,
          render: () => ({
            text: "It is the purpose of this Act to test whether removing the fare barrier increases access to work, care and school for riders who already qualify for state assistance. Nothing in this Act creates an entitlement to service.",
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "everyone the Act reaches",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "eligibility",
          dimension: "eligibility-scope",
          heading: "Eligible riders",
          parameterKey: "rider-eligibility",
          render: (resolved) => {
            const choice = resolved.choice("rider-eligibility");
            return {
              text: `A rider is eligible under this Act if the rider is ${choice.clausePhrase}. A participating provider shall not require a separate application.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every rider ${choice.clausePhrase}`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "pilot-support-limit",
          dimension: "funding-cap",
          heading: "Pilot support limit",
          parameterKey: "support-limit",
          render: (resolved) => {
            const amount = resolved.money("support-limit");
            const term = resolved.values["pilot-term"];
            const termPhrase =
              term?.kind === "duration-years" && term.years !== null
                ? `the ${yearsAttributive(term.years)} pilot`
                : "the pilot";
            const value = resolved.values["support-limit"];
            return {
              text: `There is appropriated for ${termPhrase} a sum not to exceed ${amount}, to be distributed among participating providers in proportion to eligible boardings. No provider is named in this section.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel:
                  "every participating provider, in proportion to eligible boardings",
              },
              fiscalExposureLabel: `${amount} over ${termPhrase}`,
              fiscalExposureMinorUnits:
                value?.kind === "money" ? value.minorUnits : null,
            };
          },
        },
      ],
      amendmentInvitation: {
        provisionKey: "local-project-match",
        sectionNumber: 4,
        heading: "Local project match",
        beneficiaryLabel: "the Ashland–Boyd County Transit Authority",
        placeLabel: "Ashland",
        statedGround:
          "The authority cannot raise the local match that pilot participation requires, and without it the county's riders get nothing from a statewide programme.",
        segmentKey: "transit.ashland-boyd-local-match",
        requestedMinorUnits: 140_000_000,
        cappedMinorUnits: 60_000_000,
        render: (amountLabel) =>
          `Of the amounts appropriated by Section 3 of this Act, not more than ${amountLabel} may be awarded to the Ashland–Boyd County Transit Authority as the local match required for pilot participation, and an award under this section shall not reduce the amount available to any other participating provider.`,
        evidence: authored(
          "An authored request from a fictional member on behalf of a fictional authority. No real transit authority has asked for anything.",
        ),
      },
    },
    {
      variantKey: "unserved-county-formula",
      label: "Formula access for unserved counties",
      synopsis:
        "Counties with no fixed-route provider become eligible for the existing transit assistance formula, which today reaches only counties that already have service.",
      shortTitle: "Unserved County Transit Access",
      subjectClass: "general-policy",
      authorizesAppropriation: true,
      declaredLimits: [
        "It changes who the formula reaches. It does not change the formula's rate, and it does not create service where no provider applies.",
        "It sets no fare policy for any rider.",
      ],
      defaults: {
        "formula-addition": { kind: "money", minorUnits: 450_000_000, currency: "USD" },
        "county-test": { kind: "enumerated", value: "no-fixed-route" },
      },
      parameters: [
        {
          key: "formula-addition",
          dimension: "funding-cap",
          kind: "money",
          label: "Addition to the assistance formula",
          minMinorUnits: 100_000_000,
          maxMinorUnits: 1_200_000_000,
          currency: "USD",
          evidence: authored(
            "An authored addition to a fictional formula. No real state formula amount is asserted.",
          ),
        },
        {
          key: "county-test",
          dimension: "eligibility-scope",
          kind: "enumerated",
          label: "Which counties become eligible",
          options: [
            {
              value: "no-fixed-route",
              label: "Counties with no fixed-route provider",
              clausePhrase:
                "in which no fixed-route provider operated during the preceding fiscal year",
            },
            {
              value: "no-fixed-route-or-demand-response",
              label: "Counties with neither fixed-route nor demand-response service",
              clausePhrase:
                "in which neither a fixed-route provider nor a demand-response provider operated during the preceding fiscal year",
            },
          ],
          evidence: authored(
            "Authored service tests for a fictional formula. No county is identified and no service inventory is claimed.",
          ),
        },
      ],
      clauses: [
        {
          provisionKey: "purpose",
          dimension: "eligibility-scope",
          heading: "Purpose and construction",
          parameterKey: null,
          render: () => ({
            text: "It is the purpose of this Act to extend the transit assistance formula to counties the formula does not currently reach. Nothing in this Act obliges a county to establish service or a provider to apply.",
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "everyone the Act reaches",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "eligible-counties",
          dimension: "eligibility-scope",
          heading: "Eligible counties",
          parameterKey: "county-test",
          render: (resolved) => {
            const choice = resolved.choice("county-test");
            return {
              text: `A county is eligible for distribution under the transit assistance formula if it is a county ${choice.clausePhrase}. Eligibility under this section does not displace a county already receiving a distribution.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every county ${choice.clausePhrase}`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "formula-addition",
          dimension: "funding-cap",
          heading: "Addition to the formula",
          parameterKey: "formula-addition",
          render: (resolved) => {
            const amount = resolved.money("formula-addition");
            const value = resolved.values["formula-addition"];
            return {
              text: `There is appropriated to the transit assistance formula a sum not to exceed ${amount} for distribution to counties made eligible by this Act, distributed on the same basis as to any other eligible county.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel:
                  "every county made eligible by this Act, on the formula's existing basis",
              },
              fiscalExposureLabel: `${amount} added to the formula`,
              fiscalExposureMinorUnits:
                value?.kind === "money" ? value.minorUnits : null,
            };
          },
        },
      ],
      amendmentInvitation: {
        provisionKey: "county-hold-harmless",
        sectionNumber: 4,
        heading: "Hold-harmless for currently served counties",
        beneficiaryLabel: "counties already drawing a formula distribution",
        placeLabel: "the counties now served",
        statedGround:
          "Counties that built service on the formula should not lose ground because the formula was widened, and members from those counties will not vote to widen it otherwise.",
        segmentKey: "transit.served-county-hold-harmless",
        requestedMinorUnits: 90_000_000,
        cappedMinorUnits: 40_000_000,
        render: (amountLabel) =>
          `Of the amounts appropriated by Section 3 of this Act, not more than ${amountLabel} may be used to hold harmless a county whose distribution would otherwise fall below its distribution for the preceding fiscal year.`,
        evidence: authored(
          "An authored counter-ask from fictional members. No county has made this request.",
        ),
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Family 2 — bridge and culvert maintenance                                   */
/* -------------------------------------------------------------------------- */

/**
 * Condition, not need in general.
 *
 * This family exists to prove the bank can carry a mechanism that is not a
 * subsidy. Eligibility here is a *rating threshold*: a structure qualifies
 * because an inspection put a number on it, and the number is the operative
 * legal test. That is a genuinely different clause shape from "a rider is
 * enrolled", and the two variants invert the test rather than renaming it —
 * one funds what is already failing, the other treats what has not failed yet
 * and would become ineligible the moment it did.
 */
const BRIDGE_MAINTENANCE: ProgramFamily = {
  familyKey: "bridge-maintenance",
  familyVersion: "v1",
  title: "Bridge and culvert maintenance",
  mechanism:
    "Makes an inspection condition rating the operative test for which structures a maintenance programme may reach.",
  acceptedDimensions: ["funding-cap", "eligibility-scope", "oversight", "timing"],
  structuralProvenance: [IIJA_HEARING_RECORD, IIJA_FISCAL_TREATMENT],
  intendedOutcome: {
    metricStableKey: "structures.condition-rating-mean",
    baselineSeriesKey: "structures:condition-rating-mean",
    statement:
      "Whether repair or preventive treatment holds average structure condition.",
    evidence: {
      kind: "forecast-claim",
      note: "Any figure for structures kept out of the worst rating band would be a projection.",
      unavailableReason:
        "No structure condition series has been measured in this world, and no department has been asked to report one.",
    },
  },
  variants: [
    {
      variantKey: "worst-first-condition",
      label: "Worst-first repair",
      synopsis:
        "Only structures an inspection has already rated at or below a stated condition are eligible, and the programme reports each year on what it reached and what it did not.",
      shortTitle: "Structure Condition Repair",
      subjectClass: "appropriation",
      authorizesAppropriation: true,
      declaredLimits: [
        "It reaches structures by rating alone. A structure nobody has inspected is not eligible, because there is no rating to test.",
        "It funds repair, not replacement, and requires no new inspection programme.",
      ],
      defaults: {
        "repair-authorization": { kind: "money", minorUnits: 2_400_000_000, currency: "USD" },
        "condition-threshold": { kind: "integer", value: 4 },
        "annual-report": { kind: "enumerated", value: "reached-and-remaining" },
      },
      parameters: [
        {
          key: "repair-authorization",
          dimension: "funding-cap",
          kind: "money",
          label: "Repair authorization",
          minMinorUnits: 500_000_000,
          maxMinorUnits: 6_000_000_000,
          currency: "USD",
          evidence: authored(
            "An authored authorization ceiling for a fictional state programme. No real maintenance backlog cost is asserted.",
          ),
        },
        {
          key: "condition-threshold",
          dimension: "eligibility-scope",
          kind: "integer",
          label: "Eligible at or below condition rating",
          min: 2,
          max: 6,
          unitLabel: "condition rating",
          evidence: authored(
            "An authored rating scale for this game. It is not the National Bridge Inventory scale and no real structure's rating is claimed.",
          ),
        },
        {
          key: "annual-report",
          dimension: "oversight",
          kind: "enumerated",
          label: "What the annual report must contain",
          options: [
            {
              value: "reached-and-remaining",
              label: "Structures reached and structures still eligible",
              clausePhrase:
                "the structures repaired under this Act and the structures that remained eligible at the close of the year",
            },
            {
              value: "reached-remaining-and-deferred",
              label: "Reached, remaining, and what was deferred and why",
              clausePhrase:
                "the structures repaired under this Act, the structures that remained eligible at the close of the year, and each structure whose repair was deferred together with the reason for the deferral",
            },
          ],
          evidence: authored(
            "An authored reporting duty. No real reporting statute is reproduced.",
          ),
        },
      ],
      clauses: [
        {
          provisionKey: "purpose",
          dimension: "eligibility-scope",
          heading: "Purpose and construction",
          parameterKey: null,
          render: () => ({
            text: "It is the purpose of this Act to direct repair funds to the structures an inspection has already found to be in the worst condition. Nothing in this Act requires an inspection to be carried out.",
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "everyone the Act reaches",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "eligible-structures",
          dimension: "eligibility-scope",
          heading: "Eligible structures",
          parameterKey: "condition-threshold",
          render: (resolved) => {
            const rating = resolved.integer("condition-threshold");
            return {
              text: `A bridge or culvert on the state-maintained system is eligible for repair under this Act if its most recent recorded inspection assigned it a condition rating of ${rating} or below. A structure with no recorded inspection is not eligible under this section.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every state-maintained structure rated ${rating} or below at its most recent inspection`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "repair-authorization",
          dimension: "funding-cap",
          heading: "Repair authorization",
          parameterKey: "repair-authorization",
          render: (resolved) => {
            const amount = resolved.money("repair-authorization");
            const value = resolved.values["repair-authorization"];
            return {
              text: `There is authorized for repair of eligible structures a sum not to exceed ${amount}. An amount authorized by this section is available only for repair, and confers no obligation until it is appropriated.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every eligible structure, without preference",
              },
              fiscalExposureLabel: `${amount} authorized, not appropriated`,
              fiscalExposureMinorUnits:
                value?.kind === "money" ? value.minorUnits : null,
            };
          },
        },
        {
          provisionKey: "annual-condition-report",
          dimension: "oversight",
          heading: "Annual report",
          parameterKey: "annual-report",
          render: (resolved) => {
            const choice = resolved.choice("annual-report");
            return {
              text: `The department shall report annually to the legislature ${choice.clausePhrase}. The report shall be public.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "the legislature and the public",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
      ],
      amendmentInvitation: {
        provisionKey: "district-structure-set-aside",
        sectionNumber: 5,
        heading: "Set-aside for locally maintained structures",
        beneficiaryLabel: "county-maintained bridges in the eastern counties",
        placeLabel: "the eastern counties",
        statedGround:
          "The worst structures in these counties are county-maintained and therefore fall outside a state-system programme entirely, which is the reason their ratings are the lowest.",
        segmentKey: "structures.eastern-county-set-aside",
        requestedMinorUnits: 320_000_000,
        cappedMinorUnits: 150_000_000,
        render: (amountLabel) =>
          `Of the amounts authorized by Section 3 of this Act, not more than ${amountLabel} may be made available for repair of county-maintained structures in counties whose average recorded condition rating is below the statewide average.`,
        evidence: authored(
          "An authored request from a fictional member. No county's structures or ratings are real.",
        ),
      },
    },
    {
      variantKey: "preventive-cycle",
      label: "Preventive treatment cycle",
      synopsis:
        "Structures still in fair or better condition are treated on a fixed cycle to keep them from failing, and a structure that has already failed is handled elsewhere.",
      shortTitle: "Preventive Structure Treatment",
      subjectClass: "appropriation",
      authorizesAppropriation: true,
      declaredLimits: [
        "It deliberately does not reach the worst structures. A structure at or below the threshold leaves this programme rather than entering it.",
        "It sets a treatment cycle; it does not guarantee any structure is treated in a given year.",
      ],
      defaults: {
        "treatment-authorization": { kind: "money", minorUnits: 1_100_000_000, currency: "USD" },
        "condition-floor": { kind: "integer", value: 4 },
        "cycle-years": { kind: "duration-years", years: 4 },
      },
      parameters: [
        {
          key: "treatment-authorization",
          dimension: "funding-cap",
          kind: "money",
          label: "Treatment authorization",
          minMinorUnits: 300_000_000,
          maxMinorUnits: 4_000_000_000,
          currency: "USD",
          evidence: authored(
            "An authored authorization ceiling for a fictional programme. It is not a measured preventive-maintenance cost.",
          ),
        },
        {
          key: "condition-floor",
          dimension: "eligibility-scope",
          kind: "integer",
          label: "Eligible above condition rating",
          min: 3,
          max: 7,
          unitLabel: "condition rating",
          evidence: authored(
            "An authored rating scale for this game, on the same fictional scale as the repair variant.",
          ),
        },
        {
          key: "cycle-years",
          dimension: "timing",
          kind: "duration-years",
          label: "Treatment cycle",
          minYears: 2,
          maxYears: 10,
          evidence: authored(
            "An authored cycle length. It is a design choice, not an engineering finding.",
          ),
        },
      ],
      clauses: [
        {
          provisionKey: "purpose",
          dimension: "eligibility-scope",
          heading: "Purpose and construction",
          parameterKey: null,
          render: () => ({
            text: "It is the purpose of this Act to treat structures before they fail, on the premise that deferred treatment becomes replacement. Nothing in this Act reaches a structure that has already fallen below the condition this Act requires.",
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "everyone the Act reaches",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "eligible-structures",
          dimension: "eligibility-scope",
          heading: "Eligible structures",
          parameterKey: "condition-floor",
          render: (resolved) => {
            const rating = resolved.integer("condition-floor");
            return {
              text: `A bridge or culvert on the state-maintained system is eligible for preventive treatment under this Act if its most recent recorded inspection assigned it a condition rating above ${rating}. A structure whose rating falls to ${rating} or below ceases to be eligible under this Act.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every state-maintained structure rated above ${rating} at its most recent inspection`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "treatment-cycle",
          dimension: "timing",
          heading: "Treatment cycle",
          parameterKey: "cycle-years",
          render: (resolved) => {
            const value = resolved.values["cycle-years"];
            const years =
              value?.kind === "duration-years" && value.years !== null
                ? value.years
                : null;
            return {
              text:
                years === null
                  ? "The department shall establish a preventive treatment cycle for eligible structures and shall publish the cycle it adopts."
                  : `The department shall establish a preventive treatment cycle under which each eligible structure is considered for treatment at least once every ${yearsPhrase(years)}. Consideration under this section does not oblige treatment in a given year.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every eligible structure, on the adopted cycle",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "treatment-authorization",
          dimension: "funding-cap",
          heading: "Treatment authorization",
          parameterKey: "treatment-authorization",
          render: (resolved) => {
            const amount = resolved.money("treatment-authorization");
            const value = resolved.values["treatment-authorization"];
            return {
              text: `There is authorized for preventive treatment of eligible structures a sum not to exceed ${amount}. An amount authorized by this section confers no obligation until it is appropriated.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every eligible structure, without preference",
              },
              fiscalExposureLabel: `${amount} authorized, not appropriated`,
              fiscalExposureMinorUnits:
                value?.kind === "money" ? value.minorUnits : null,
            };
          },
        },
      ],
      amendmentInvitation: {
        provisionKey: "cycle-reporting-exception",
        sectionNumber: 5,
        heading: "Deferred treatment on low-volume routes",
        beneficiaryLabel: "low-volume routes in the western counties",
        placeLabel: "the western counties",
        statedGround:
          "A uniform cycle spends the same on a structure carrying forty vehicles a day as on one carrying four thousand, and the counties with the low-volume routes are the ones with the least other road money.",
        segmentKey: "structures.low-volume-route-cycle",
        requestedMinorUnits: 180_000_000,
        cappedMinorUnits: 75_000_000,
        render: (amountLabel) =>
          `Of the amounts authorized by Section 4 of this Act, not more than ${amountLabel} may be made available to extend the treatment cycle on routes carrying fewer vehicles than the statewide median, without reducing the amount available on any other route.`,
        evidence: authored(
          "An authored request from a fictional member. No traffic counts or routes are real.",
        ),
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Family 3 — broadband access                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A standard that binds whoever takes the money.
 *
 * The operative clause here is a *service obligation*: a minimum the recipient
 * must meet and keep meeting, enforced by a reporting duty rather than by
 * spending more. The supply-side and demand-side variants are different
 * programmes — one builds to places, the other pays toward household
 * subscriptions — and the compiler will not let a caller mix their parameters.
 */
const BROADBAND_ACCESS: ProgramFamily = {
  familyKey: "broadband-access",
  familyVersion: "v1",
  title: "Broadband access",
  mechanism:
    "Attaches a minimum service standard and a reporting duty to public support for internet service.",
  acceptedDimensions: ["funding-cap", "eligibility-scope", "oversight", "timing"],
  structuralProvenance: [IIJA_HEARING_RECORD, IIJA_FISCAL_TREATMENT],
  intendedOutcome: {
    metricStableKey: "broadband.served-household-share",
    baselineSeriesKey: "broadband:served-household-share",
    statement:
      "Whether the share of households that can and do take service actually rises.",
    evidence: {
      kind: "forecast-claim",
      note: "Any figure for households newly served or newly subscribing would be a projection.",
      unavailableReason:
        "No service or take-up series has been measured in this world, so a projection would have no baseline.",
    },
  },
  variants: [
    {
      variantKey: "unserved-buildout",
      label: "Buildout to unserved areas",
      synopsis:
        "Public support goes to construction in areas below a stated service level, and anything built with it must meet a minimum standard and report against it.",
      shortTitle: "Unserved Area Buildout",
      subjectClass: "appropriation",
      authorizesAppropriation: true,
      declaredLimits: [
        "It supports construction. It does not reduce what any household pays.",
        "It sets a standard the recipient must meet; it does not regulate any provider that takes no money under this Act.",
      ],
      defaults: {
        "buildout-authorization": { kind: "money", minorUnits: 1_800_000_000, currency: "USD" },
        "unserved-threshold": { kind: "integer", value: 25 },
        "service-standard": { kind: "enumerated", value: "speed-and-latency" },
      },
      parameters: [
        {
          key: "buildout-authorization",
          dimension: "funding-cap",
          kind: "money",
          label: "Buildout authorization",
          minMinorUnits: 400_000_000,
          maxMinorUnits: 5_000_000_000,
          currency: "USD",
          evidence: authored(
            "An authored authorization ceiling for a fictional programme. No real buildout cost is asserted.",
          ),
        },
        {
          key: "unserved-threshold",
          dimension: "eligibility-scope",
          kind: "integer",
          label: "Unserved below download speed",
          min: 10,
          max: 100,
          unitLabel: "megabits per second",
          evidence: authored(
            "An authored service threshold for this game. It is not any regulator's definition of unserved.",
          ),
        },
        {
          key: "service-standard",
          dimension: "oversight",
          kind: "enumerated",
          label: "Standard the recipient must meet",
          options: [
            {
              value: "speed-only",
              label: "A download and upload speed",
              clausePhrase:
                "deliver the download and upload speeds stated in its award agreement",
            },
            {
              value: "speed-and-latency",
              label: "Speed and a latency ceiling",
              clausePhrase:
                "deliver the download and upload speeds stated in its award agreement and keep round-trip latency below the ceiling stated in that agreement",
            },
            {
              value: "speed-latency-and-price",
              label: "Speed, latency, and a published price",
              clausePhrase:
                "deliver the download and upload speeds stated in its award agreement, keep round-trip latency below the ceiling stated in that agreement, and publish and honour the price stated in that agreement",
            },
          ],
          evidence: authored(
            "Authored obligations for a fictional award agreement. No real award terms are reproduced.",
          ),
        },
      ],
      clauses: [
        {
          provisionKey: "purpose",
          dimension: "eligibility-scope",
          heading: "Purpose and construction",
          parameterKey: null,
          render: () => ({
            text: "It is the purpose of this Act to support construction of internet service in areas that do not have it, on terms that survive the construction. Nothing in this Act obliges a provider to seek an award.",
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "everyone the Act reaches",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "eligible-areas",
          dimension: "eligibility-scope",
          heading: "Eligible areas",
          parameterKey: "unserved-threshold",
          render: (resolved) => {
            const speed = resolved.integer("unserved-threshold");
            return {
              text: `An area is eligible for an award under this Act if no provider offers service in that area at a download speed of ${speed} megabits per second or greater. An area's eligibility is determined as of the date the award is made.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every area without service at ${speed} megabits per second or greater`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "service-standard",
          dimension: "oversight",
          heading: "Service standard and reporting",
          parameterKey: "service-standard",
          render: (resolved) => {
            const choice = resolved.choice("service-standard");
            return {
              text: `A recipient of an award under this Act shall ${choice.clausePhrase}, and shall report annually on its performance against that obligation. Failure to report is itself a breach of the award agreement.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel:
                  "every household in an area built with an award under this Act",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "buildout-authorization",
          dimension: "funding-cap",
          heading: "Buildout authorization",
          parameterKey: "buildout-authorization",
          render: (resolved) => {
            const amount = resolved.money("buildout-authorization");
            const value = resolved.values["buildout-authorization"];
            return {
              text: `There is authorized for awards under this Act a sum not to exceed ${amount}. An award may not exceed the cost of construction stated in the application it is made on.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every eligible area, by application",
              },
              fiscalExposureLabel: `${amount} authorized for awards`,
              fiscalExposureMinorUnits:
                value?.kind === "money" ? value.minorUnits : null,
            };
          },
        },
      ],
      amendmentInvitation: {
        provisionKey: "cooperative-award-preference",
        sectionNumber: 5,
        heading: "Preference for cooperative applicants",
        beneficiaryLabel: "the rural electric cooperatives",
        placeLabel: "the unserved counties",
        statedGround:
          "The cooperatives are the only applicants that have ever built in these counties, and a scoring system written for large carriers will not reach them.",
        segmentKey: "broadband.cooperative-award-preference",
        requestedMinorUnits: 260_000_000,
        cappedMinorUnits: 110_000_000,
        render: (amountLabel) =>
          `Of the amounts authorized by Section 4 of this Act, not more than ${amountLabel} may be reserved for awards to applicants organized as cooperatives, and a reservation under this section shall not reduce the amount available to any other eligible applicant.`,
        evidence: authored(
          "An authored request from a fictional member. No cooperative has applied for anything.",
        ),
      },
    },
    {
      variantKey: "adoption-support",
      label: "Household adoption support",
      synopsis:
        "Eligible households get help paying for service that already reaches them, and providers report take-up rather than construction.",
      shortTitle: "Household Adoption Support",
      subjectClass: "general-policy",
      authorizesAppropriation: true,
      declaredLimits: [
        "It builds nothing. A household in an area with no service at all gets nothing from this Act.",
        "It supports subscriptions; it sets no speed a provider must deliver.",
      ],
      defaults: {
        "adoption-authorization": { kind: "money", minorUnits: 600_000_000, currency: "USD" },
        "household-test": { kind: "enumerated", value: "assistance-enrolled" },
        "take-up-report": { kind: "enumerated", value: "enrolled-count" },
      },
      parameters: [
        {
          key: "adoption-authorization",
          dimension: "funding-cap",
          kind: "money",
          label: "Adoption support authorization",
          minMinorUnits: 150_000_000,
          maxMinorUnits: 2_500_000_000,
          currency: "USD",
          evidence: authored(
            "An authored authorization ceiling for a fictional programme. No real subsidy total is asserted.",
          ),
        },
        {
          key: "household-test",
          dimension: "eligibility-scope",
          kind: "enumerated",
          label: "Which households qualify",
          options: [
            {
              value: "assistance-enrolled",
              label: "Households enrolled in state assistance",
              clausePhrase:
                "in which a member is enrolled in a state assistance programme",
            },
            {
              value: "assistance-or-school-meal",
              label: "Assistance households and school-meal households",
              clausePhrase:
                "in which a member is enrolled in a state assistance programme, or in which a child qualifies for a free or reduced-price school meal",
            },
          ],
          evidence: authored(
            "Authored eligibility classes for a fictional programme. No real assistance rules are asserted.",
          ),
        },
        {
          key: "take-up-report",
          dimension: "oversight",
          kind: "enumerated",
          label: "What providers must report",
          options: [
            {
              value: "enrolled-count",
              label: "How many eligible households enrolled",
              clausePhrase:
                "the number of eligible households enrolled in each county",
            },
            {
              value: "enrolled-and-disconnected",
              label: "Enrolments and disconnections",
              clausePhrase:
                "the number of eligible households enrolled in each county and the number disconnected for non-payment during the year",
            },
          ],
          evidence: authored(
            "An authored reporting duty. No real provider reporting is reproduced.",
          ),
        },
      ],
      clauses: [
        {
          provisionKey: "purpose",
          dimension: "eligibility-scope",
          heading: "Purpose and construction",
          parameterKey: null,
          render: () => ({
            text: "It is the purpose of this Act to help households pay for internet service that already reaches them, on the premise that service nobody subscribes to is not access. Nothing in this Act supports construction.",
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "everyone the Act reaches",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "eligible-households",
          dimension: "eligibility-scope",
          heading: "Eligible households",
          parameterKey: "household-test",
          render: (resolved) => {
            const choice = resolved.choice("household-test");
            return {
              text: `A household is eligible for support under this Act if it is a household ${choice.clausePhrase} and service is available at its address. A provider shall not require a separate application from a household the department certifies.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every household ${choice.clausePhrase} at an address service reaches`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "take-up-reporting",
          dimension: "oversight",
          heading: "Take-up reporting",
          parameterKey: "take-up-report",
          render: (resolved) => {
            const choice = resolved.choice("take-up-report");
            return {
              text: `A provider receiving support under this Act shall report annually ${choice.clausePhrase}. The report shall be public in aggregate and shall not identify a household.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "the legislature and the public, in aggregate",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "adoption-authorization",
          dimension: "funding-cap",
          heading: "Support authorization",
          parameterKey: "adoption-authorization",
          render: (resolved) => {
            const amount = resolved.money("adoption-authorization");
            const value = resolved.values["adoption-authorization"];
            return {
              text: `There is appropriated for support under this Act a sum not to exceed ${amount}, applied to the subscription of an eligible household and paid to the provider serving it.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every eligible household that enrols",
              },
              fiscalExposureLabel: `${amount} for household support`,
              fiscalExposureMinorUnits:
                value?.kind === "money" ? value.minorUnits : null,
            };
          },
        },
      ],
      amendmentInvitation: {
        provisionKey: "tribal-household-outreach",
        sectionNumber: 5,
        heading: "Outreach in structurally unserved communities",
        beneficiaryLabel: "households in communities the certification never reaches",
        placeLabel: "the communities without a county certification office",
        statedGround:
          "Certification is done at county offices, and the households furthest from one are exactly the households this Act is supposed to reach.",
        segmentKey: "broadband.certification-outreach",
        requestedMinorUnits: 95_000_000,
        cappedMinorUnits: 45_000_000,
        render: (amountLabel) =>
          `Of the amounts appropriated by Section 4 of this Act, not more than ${amountLabel} may be used for certification outreach in communities without a county certification office, and outreach under this section shall not reduce support available to any eligible household.`,
        evidence: authored(
          "An authored request from a fictional member. No community or office is real.",
        ),
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Family 4 — water service lines                                              */
/* -------------------------------------------------------------------------- */

/**
 * The family that proves a bill need not be an appropriation.
 *
 * The first variant authorizes no money at all. It is a duty with a deadline:
 * find out what you have, write down how you would replace it, and file it by
 * a date. That is an entire class of real legislation, and a content system
 * that can only express spending cannot express it — which is why this variant
 * declares `authorizesAppropriation: false` and the compiler refuses a funding
 * cap on it outright rather than letting one be attached.
 */
const WATER_SERVICE_LINES: ProgramFamily = {
  familyKey: "water-service-lines",
  familyVersion: "v1",
  title: "Water service lines",
  mechanism:
    "Imposes a dated compliance duty on water systems, with or without money attached to discharging it.",
  acceptedDimensions: ["eligibility-scope", "timing", "oversight", "funding-cap"],
  structuralProvenance: [IIJA_HEARING_RECORD, TARGETED_SECTION_SOURCE],
  intendedOutcome: {
    metricStableKey: "water.identified-service-lines",
    baselineSeriesKey: "water:identified-service-lines",
    statement:
      "How many service lines are identified, and how many are replaced.",
    evidence: {
      kind: "forecast-claim",
      note: "The inventory this Act requires is the thing that would produce the number; the number does not exist before it.",
      unavailableReason:
        "No system has filed an inventory in this world, which is precisely what the Act is for.",
    },
  },
  variants: [
    {
      variantKey: "inventory-and-plan",
      label: "Inventory and replacement plan",
      synopsis:
        "Water systems above a stated size must inventory their service lines and file a replacement plan by a deadline. The Act appropriates nothing.",
      shortTitle: "Service Line Inventory",
      subjectClass: "general-policy",
      authorizesAppropriation: false,
      declaredLimits: [
        "It appropriates nothing and reimburses nothing. The cost of complying falls on the system.",
        "It requires a plan to be filed. It does not require a single line to be replaced.",
      ],
      defaults: {
        // No money appears here at all: this configuration authorizes none,
        // and the compiler refuses a funding cap on it.
        "system-size": { kind: "integer", value: 3_300 },
        "compliance-term": { kind: "duration-years", years: 3 },
        "plan-contents": { kind: "enumerated", value: "inventory-and-sequence" },
      },
      parameters: [
        {
          key: "system-size",
          dimension: "eligibility-scope",
          kind: "integer",
          label: "Systems serving at least",
          min: 500,
          max: 50_000,
          unitLabel: "connections",
          evidence: authored(
            "An authored size threshold for a fictional programme. No real system's size is asserted.",
          ),
        },
        {
          key: "compliance-term",
          dimension: "timing",
          kind: "duration-years",
          label: "Time to comply",
          minYears: 1,
          maxYears: 6,
          evidence: authored(
            "An authored compliance window. It is a design choice, not a finding about how long an inventory takes.",
          ),
        },
        {
          key: "plan-contents",
          dimension: "oversight",
          kind: "enumerated",
          label: "What the plan must contain",
          options: [
            {
              value: "material-inventory",
              label: "A material inventory",
              clausePhrase:
                "an inventory identifying the material of each service line in the system",
            },
            {
              value: "inventory-and-sequence",
              label: "Inventory and a replacement sequence",
              clausePhrase:
                "an inventory identifying the material of each service line in the system and the sequence in which the system would replace them",
            },
            {
              value: "inventory-sequence-and-cost",
              label: "Inventory, sequence, and the system's own cost estimate",
              clausePhrase:
                "an inventory identifying the material of each service line in the system, the sequence in which the system would replace them, and the system's own estimate of the cost of doing so",
            },
          ],
          evidence: authored(
            "An authored filing duty. No real inventory rule is reproduced.",
          ),
        },
      ],
      clauses: [
        {
          provisionKey: "purpose",
          dimension: "eligibility-scope",
          heading: "Purpose and construction",
          parameterKey: null,
          render: () => ({
            text: "It is the purpose of this Act to establish what the state's water systems are actually made of before deciding what replacing it would cost. Nothing in this Act appropriates money or obliges a system to replace a service line.",
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "everyone the Act reaches",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "covered-systems",
          dimension: "eligibility-scope",
          heading: "Covered systems",
          parameterKey: "system-size",
          render: (resolved) => {
            const connections = resolved.integer("system-size");
            return {
              text: `A community water system serving ${connections.toLocaleString("en-US")} or more connections is subject to this Act. A system below that size may file under this Act voluntarily and is not subject to its deadline.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every community water system serving ${connections.toLocaleString("en-US")} or more connections`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "filing-deadline",
          dimension: "timing",
          heading: "Filing deadline",
          parameterKey: "compliance-term",
          render: (resolved) => {
            const endsOn = resolved.endsOn;
            return {
              text:
                endsOn === null
                  ? "A covered system shall file the plan required by this Act, and the department shall publish the date by which it must be filed."
                  : `A covered system shall file the plan required by this Act not later than ${endsOn}. A system that has not filed by that date shall report the reason to the department.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every covered system, on the same date",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "plan-contents",
          dimension: "oversight",
          heading: "Contents of the plan",
          parameterKey: "plan-contents",
          render: (resolved) => {
            const choice = resolved.choice("plan-contents");
            return {
              text: `The plan required by this Act shall contain ${choice.clausePhrase}. The department shall publish each filed plan.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel:
                  "every household served by a covered system, through the published plan",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
      ],
      amendmentInvitation: {
        provisionKey: "small-system-assistance",
        sectionNumber: 5,
        heading: "Assistance for the smallest covered systems",
        beneficiaryLabel: "the smallest systems this Act newly covers",
        placeLabel: "the small towns just over the threshold",
        statedGround:
          "A town just over the threshold has the same filing duty as a city and no engineer on staff to discharge it, and the duty is unfunded.",
        segmentKey: "water.small-system-assistance",
        requestedMinorUnits: 70_000_000,
        cappedMinorUnits: 30_000_000,
        render: (amountLabel) =>
          `Notwithstanding the absence of an appropriation elsewhere in this Act, not more than ${amountLabel} may be appropriated to assist covered systems in the smallest quartile by connections with the cost of preparing the plan this Act requires.`,
        evidence: authored(
          "An authored request from a fictional member. It is the ask that would turn an unfunded mandate into a funded one, and nothing in the world says it was granted.",
        ),
      },
    },
    {
      variantKey: "funded-replacement",
      label: "Funded replacement programme",
      synopsis:
        "Covered systems may draw on a replacement fund, with priority written into the statute rather than left to the department.",
      shortTitle: "Service Line Replacement",
      subjectClass: "appropriation",
      authorizesAppropriation: true,
      declaredLimits: [
        "It funds replacement for covered systems. A system below the size threshold draws nothing.",
        "It sets a priority order; it does not guarantee any system is reached.",
      ],
      defaults: {
        "replacement-fund": { kind: "money", minorUnits: 2_900_000_000, currency: "USD" },
        "system-size": { kind: "integer", value: 3_300 },
        "priority-order": { kind: "enumerated", value: "highest-share-first" },
      },
      parameters: [
        {
          key: "replacement-fund",
          dimension: "funding-cap",
          kind: "money",
          label: "Replacement fund",
          minMinorUnits: 600_000_000,
          maxMinorUnits: 8_000_000_000,
          currency: "USD",
          evidence: authored(
            "An authored fund ceiling for a fictional programme. No real replacement cost is asserted.",
          ),
        },
        {
          key: "system-size",
          dimension: "eligibility-scope",
          kind: "integer",
          label: "Systems serving at least",
          min: 500,
          max: 50_000,
          unitLabel: "connections",
          evidence: authored(
            "An authored size threshold, on the same fictional basis as the inventory variant.",
          ),
        },
        {
          key: "priority-order",
          dimension: "oversight",
          kind: "enumerated",
          label: "Priority written into the statute",
          options: [
            {
              value: "highest-share-first",
              label: "Systems with the highest share of covered lines",
              clausePhrase:
                "to the systems with the highest share of service lines identified as requiring replacement",
            },
            {
              value: "least-capacity-first",
              label: "Systems with the least ability to pay",
              clausePhrase:
                "to the systems whose residential rates would rise the most if the replacement were funded from rates alone",
            },
          ],
          evidence: authored(
            "An authored priority rule. No real allocation rule is reproduced.",
          ),
        },
      ],
      clauses: [
        {
          provisionKey: "purpose",
          dimension: "eligibility-scope",
          heading: "Purpose and construction",
          parameterKey: null,
          render: () => ({
            text: "It is the purpose of this Act to fund replacement of the service lines a filed plan has identified, in an order the statute itself states. Nothing in this Act obliges a system to replace a line the fund does not reach.",
            beneficiary: {
              kind: "general-application",
              appliesToLabel: "everyone the Act reaches",
            },
            fiscalExposureLabel: null,
            fiscalExposureMinorUnits: null,
          }),
        },
        {
          provisionKey: "covered-systems",
          dimension: "eligibility-scope",
          heading: "Covered systems",
          parameterKey: "system-size",
          render: (resolved) => {
            const connections = resolved.integer("system-size");
            return {
              text: `A community water system serving ${connections.toLocaleString("en-US")} or more connections that has filed a replacement plan may draw on the fund established by this Act.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: `every community water system serving ${connections.toLocaleString("en-US")} or more connections that has filed a plan`,
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
        {
          provisionKey: "replacement-fund",
          dimension: "funding-cap",
          heading: "Replacement fund",
          parameterKey: "replacement-fund",
          render: (resolved) => {
            const amount = resolved.money("replacement-fund");
            const value = resolved.values["replacement-fund"];
            return {
              text: `There is appropriated to a service line replacement fund a sum not to exceed ${amount}, available to covered systems that have filed a replacement plan.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every covered system that has filed a plan",
              },
              fiscalExposureLabel: `${amount} to the replacement fund`,
              fiscalExposureMinorUnits:
                value?.kind === "money" ? value.minorUnits : null,
            };
          },
        },
        {
          provisionKey: "priority-order",
          dimension: "oversight",
          heading: "Order of distribution",
          parameterKey: "priority-order",
          render: (resolved) => {
            const choice = resolved.choice("priority-order");
            return {
              text: `The department shall distribute from the fund ${choice.clausePhrase}, and shall publish the order it applies each year. A system's place in the order is not a guarantee of a distribution.`,
              beneficiary: {
                kind: "general-application",
                appliesToLabel: "every covered system, in the stated order",
              },
              fiscalExposureLabel: null,
              fiscalExposureMinorUnits: null,
            };
          },
        },
      ],
      amendmentInvitation: {
        provisionKey: "school-and-childcare-priority",
        sectionNumber: 5,
        heading: "Priority for schools and childcare premises",
        beneficiaryLabel: "school and licensed childcare premises",
        placeLabel: "statewide",
        statedGround:
          "A priority order written around whole systems can leave a school at the back of its own system's queue, and members will not defend that to a parent.",
        segmentKey: "water.school-childcare-priority",
        requestedMinorUnits: 210_000_000,
        cappedMinorUnits: 95_000_000,
        render: (amountLabel) =>
          `Of the amounts appropriated by Section 3 of this Act, not more than ${amountLabel} may be reserved for replacement of service lines serving school and licensed childcare premises, ahead of the order stated in Section 4.`,
        evidence: authored(
          "An authored request from a fictional member. No school or premises is real.",
        ),
      },
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* The bank                                                                    */
/* -------------------------------------------------------------------------- */

const FAMILIES: readonly ProgramFamily[] = [
  TRANSIT_ACCESS,
  BRIDGE_MAINTENANCE,
  BROADBAND_ACCESS,
  WATER_SERVICE_LINES,
];

export function programFamilies(): readonly ProgramFamily[] {
  return FAMILIES;
}

export function programFamilyKeys(): readonly string[] {
  return FAMILIES.map((family) => family.familyKey);
}

export function programFamily(familyKey: string): ProgramFamily {
  const family = FAMILIES.find((entry) => entry.familyKey === familyKey);
  if (!family) {
    throw new Error(`No programme family is defined for '${familyKey}'.`);
  }
  return family;
}

export function programVariant(
  familyKey: string,
  variantKey: string,
): { readonly family: ProgramFamily; readonly variant: ProgramVariant } {
  const family = programFamily(familyKey);
  const variant = family.variants.find(
    (entry) => entry.variantKey === variantKey,
  );
  if (!variant) {
    throw new Error(
      `The ${family.title} family has no '${variantKey}' configuration.`,
    );
  }
  return { family, variant };
}

/** Every family/variant pair the bank offers, in declaration order. */
export function programConfigurations(): readonly {
  readonly familyKey: string;
  readonly variantKey: string;
}[] {
  return FAMILIES.flatMap((family) =>
    family.variants.map((variant) => ({
      familyKey: family.familyKey,
      variantKey: variant.variantKey,
    })),
  );
}
