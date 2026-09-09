/**
 * The contracts a bill's content is written against.
 *
 * Separated from the content itself so that the banks can grow without this
 * file growing with them. Everything here is a type, a rule table or a
 * formatter; nothing here is a bill. The banks in `legislation-*-families.ts`
 * import these, and `legislation-program-families.ts` assembles them into the
 * one registry the game reads.
 */

import type { IsoDate, LegislativeProvisionBeneficiary } from "./types";

export type { IsoDate };

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
  | "oversight"
  /**
   * A charge, rate or dedication the measure imposes — money moving toward the
   * state rather than out of it.
   *
   * Separate from `funding-cap` because the two are not the same quantity with
   * opposite signs. A cap is the most a programme may spend; a charge is what
   * somebody is made to pay, and the pilot's own analyst treats revenue and
   * spending as different lines that are not netted against each other before
   * anybody has argued about them.
   */
  | "revenue"
  /**
   * The clause that names what this Act acts upon.
   *
   * An appropriation, an eligibility amendment and a repeal are all about
   * something that already exists, and the sentence identifying it is operative
   * text rather than a preamble: get it wrong and the Act does nothing. It is
   * its own dimension so the compiler can require it exactly where the
   * instrument needs it and refuse it where it would be meaningless.
   */
  | "authority-reference";

/* -------------------------------------------------------------------------- */
/* Legal instruments                                                           */
/* -------------------------------------------------------------------------- */

/**
 * What kind of legal act a configuration is.
 *
 * Subject area, legal instrument and procedural stage are three different
 * questions, and collapsing them is the specific failure this type exists to
 * prevent. "Broadband" is a subject; "authorizes a grant programme" is an
 * instrument; "on the floor of the second chamber" is a stage. A bank that
 * knows only the subject produces eight bills that are one bill with eight
 * titles — every one of them a funding slider — because authorizing a
 * programme is the only thing it can express.
 *
 * These are the instruments this game supports. Each one is enforced: the
 * compiler reads the rule below and refuses a configuration that carries a
 * clause its instrument cannot carry, omits one its instrument requires, or
 * acts on an existing authority without naming one.
 */
export type LegalInstrument =
  /** Creates a programme and states the most it may spend. */
  | "programme-authorization"
  /**
   * Makes money available for something already authorized.
   *
   * The pilot's analyst is explicit that authorizing legislation and
   * appropriation treatment are different, and this is that distinction made
   * mechanical: an appropriation names an existing authority, cannot exceed the
   * ceiling that authority set, and is refused outright when no such authority
   * exists.
   */
  | "appropriation"
  /**
   * Changes who or what qualifies under an authority that already exists.
   *
   * It states no amount. Widening eligibility is a real legislative act with
   * real politics and no funding slider anywhere in it, and a bank that cannot
   * express one will keep re-describing grants instead.
   */
  | "eligibility-amendment"
  /** Imposes a duty or a standard on the parties it reaches. */
  | "regulatory-requirement"
  /** Requires a public body to report, publish or submit to audit. */
  | "oversight-reporting"
  /** Ends, shortens or extends an authority that already exists. */
  | "sunset-repeal"
  /** Imposes or dedicates a charge. Money toward the state, not out of it. */
  | "revenue-measure"
  /** Authorizes positions in a public body, in whole counted posts. */
  | "position-authorization";

/**
 * What each instrument may and must do.
 *
 * Declared as data rather than as branching in the compiler so that the answer
 * to "can this instrument carry a funding cap" is one readable table instead of
 * a condition spread across three modules. The compiler is the only consumer
 * that enforces it; everything else reads it to explain itself.
 */
export interface LegalInstrumentRule {
  readonly instrument: LegalInstrument;
  readonly label: string;
  /** One line a player reads. What this kind of bill does, in plain words. */
  readonly description: string;
  /** Dimensions a configuration of this instrument may carry. */
  readonly permittedDimensions: readonly ClauseDimension[];
  /** Dimensions it must carry, or it is not that kind of act at all. */
  readonly requiredDimensions: readonly ClauseDimension[];
  /** Whether it may state a ceiling of its own. */
  readonly mayAuthorizeAppropriation: boolean;
  /**
   * Whether it makes money available as opposed to permitting it to be spent.
   *
   * True for exactly one instrument. An authorization sets a ceiling nobody has
   * funded; an appropriation is the act that funds it. Reporting them as the
   * same number is the mistake the pilot's own estimate went out of its way not
   * to make.
   */
  readonly makesMoneyAvailable: boolean;
  /** Whether it must name an authority that already exists. */
  readonly requiresPredicateAuthority: boolean;
  /** Whether a predicate authority must itself carry a spending ceiling. */
  readonly predicateMustAuthorizeSpending: boolean;
}

const INSTRUMENT_RULES: readonly LegalInstrumentRule[] = [
  {
    instrument: "programme-authorization",
    label: "Programme authorization",
    description:
      "Creates a programme and states the most it may spend. Stating a ceiling is not the same as providing the money.",
    permittedDimensions: [
      "funding-cap",
      "eligibility-scope",
      "timing",
      "oversight",
    ],
    requiredDimensions: ["eligibility-scope"],
    mayAuthorizeAppropriation: true,
    makesMoneyAvailable: false,
    requiresPredicateAuthority: false,
    predicateMustAuthorizeSpending: false,
  },
  {
    instrument: "appropriation",
    label: "Appropriation",
    description:
      "Provides money for a programme that is already authorized. It creates nothing and may not exceed what the authority it names allows.",
    permittedDimensions: [
      "authority-reference",
      "funding-cap",
      "timing",
      "oversight",
    ],
    requiredDimensions: ["authority-reference", "funding-cap"],
    mayAuthorizeAppropriation: true,
    makesMoneyAvailable: true,
    requiresPredicateAuthority: true,
    predicateMustAuthorizeSpending: true,
  },
  {
    instrument: "eligibility-amendment",
    label: "Eligibility amendment",
    description:
      "Changes who or what qualifies under an existing authority. It states no amount and provides no money.",
    permittedDimensions: [
      "authority-reference",
      "eligibility-scope",
      "timing",
      "oversight",
    ],
    requiredDimensions: ["authority-reference", "eligibility-scope"],
    mayAuthorizeAppropriation: false,
    makesMoneyAvailable: false,
    requiresPredicateAuthority: true,
    predicateMustAuthorizeSpending: false,
  },
  {
    instrument: "regulatory-requirement",
    label: "Regulatory requirement",
    description:
      "Imposes a duty or a standard on the parties it reaches. The cost of complying falls where the Act puts it.",
    permittedDimensions: [
      "eligibility-scope",
      "timing",
      "oversight",
      "funding-cap",
    ],
    requiredDimensions: ["eligibility-scope", "oversight"],
    mayAuthorizeAppropriation: true,
    makesMoneyAvailable: false,
    requiresPredicateAuthority: false,
    predicateMustAuthorizeSpending: false,
  },
  {
    instrument: "oversight-reporting",
    label: "Reporting and oversight duty",
    description:
      "Requires a public body to report, publish or submit to audit. It changes what is known, not what is spent.",
    permittedDimensions: [
      "eligibility-scope",
      "timing",
      "oversight",
      "authority-reference",
    ],
    requiredDimensions: ["oversight", "timing"],
    mayAuthorizeAppropriation: false,
    makesMoneyAvailable: false,
    requiresPredicateAuthority: false,
    predicateMustAuthorizeSpending: false,
  },
  {
    instrument: "sunset-repeal",
    label: "Sunset or repeal",
    description:
      "Ends, shortens or extends an authority that already exists. Removing a ceiling is not a saving anybody has banked.",
    permittedDimensions: ["authority-reference", "timing", "oversight"],
    requiredDimensions: ["authority-reference", "timing"],
    mayAuthorizeAppropriation: false,
    makesMoneyAvailable: false,
    requiresPredicateAuthority: true,
    predicateMustAuthorizeSpending: false,
  },
  {
    instrument: "revenue-measure",
    label: "Revenue measure",
    description:
      "Imposes or dedicates a charge. What it raises is not what a programme may spend, and the two are not netted here.",
    permittedDimensions: [
      "revenue",
      "eligibility-scope",
      "timing",
      "oversight",
    ],
    requiredDimensions: ["revenue"],
    mayAuthorizeAppropriation: false,
    makesMoneyAvailable: false,
    requiresPredicateAuthority: false,
    predicateMustAuthorizeSpending: false,
  },
  {
    instrument: "position-authorization",
    label: "Position authorization",
    description:
      "Authorizes counted posts in a public body. Posts are whole positions, not a budget line divided by a salary.",
    permittedDimensions: [
      "eligibility-scope",
      "timing",
      "oversight",
      "funding-cap",
    ],
    requiredDimensions: ["eligibility-scope"],
    mayAuthorizeAppropriation: true,
    makesMoneyAvailable: false,
    requiresPredicateAuthority: false,
    predicateMustAuthorizeSpending: false,
  },
];

export function legalInstrumentRule(
  instrument: LegalInstrument,
): LegalInstrumentRule {
  const rule = INSTRUMENT_RULES.find(
    (entry) => entry.instrument === instrument,
  );
  if (!rule) {
    throw new Error(`No rule is declared for the '${instrument}' instrument.`);
  }
  return rule;
}

export function legalInstrumentRules(): readonly LegalInstrumentRule[] {
  return INSTRUMENT_RULES;
}

/* -------------------------------------------------------------------------- */
/* Acting on something that already exists                                     */
/* -------------------------------------------------------------------------- */

/**
 * The authority a bill acts upon.
 *
 * Half the instruments above are about something that is already law, and a
 * bill that appropriates against nothing, or repeals nothing, is not a bill —
 * it is a sentence with a hole in it. So the authority is passed in as a typed
 * fact rather than named in prose, and the compiler refuses when the instrument
 * requires one and none arrived.
 *
 * Two things can be an authority. A standing statute is authored background:
 * the programme this jurisdiction is fictionally assumed to already run. A
 * docket measure is a bill the player themselves filed earlier in this life,
 * which is what lets a second bill be *about* the first one rather than merely
 * next to it on a list.
 */
export type PredicateAuthority =
  | {
      readonly kind: "standing-statute";
      readonly authorityKey: string;
      /** How the Act names it in its own operative text. */
      readonly citationLabel: string;
      readonly programmeLabel: string;
      readonly authorizesSpending: boolean;
      /** The ceiling that authority set, where it set one. */
      readonly authorizedCeilingMinorUnits: number | null;
      readonly currency: string;
      readonly evidence: ProgramContentEvidence;
    }
  | {
      readonly kind: "docket-measure";
      readonly authorityKey: string;
      readonly citationLabel: string;
      readonly programmeLabel: string;
      readonly authorizesSpending: boolean;
      readonly authorizedCeilingMinorUnits: number | null;
      readonly currency: string;
      /** The measure on this player's own docket. */
      readonly measureId: string;
      readonly docketKey: string;
      /** Pending references are conditional proposals, never existing law. */
      readonly legalStatus?: "proposed" | "enacted";
    };

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
  | {
      readonly kind: "money";
      readonly minorUnits: number;
      readonly currency: string;
    }
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
  /** Omitted on legacy whole-programme amounts. */
  readonly fiscalPeriod?: "annual";
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
  /**
   * The authority this Act acts upon, where its instrument takes one.
   *
   * Null for an instrument that creates rather than amends. A template that
   * reads it on an instrument that has none is an authoring error the compiler
   * catches before any text is rendered, because the required dimension would
   * be missing.
   */
  readonly authority: PredicateAuthority | null;
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
  /**
   * What kind of legal act this configuration is.
   *
   * Declared per variant rather than per family, because one subject genuinely
   * supports several instruments: the same water programme can be a duty with
   * no money attached and a funded replacement, and calling those one thing is
   * how a bank ends up with a single mechanism wearing different titles.
   */
  readonly instrument: LegalInstrument;
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
  /**
   * Authorities a bill in this family may act upon without the player having
   * filed one first.
   *
   * Authored background: the programmes this state is assumed already to run.
   * They exist so that an appropriation or a repeal is playable on the first
   * day of a term rather than only after the player has authorized something
   * themselves — and they are declared here, with evidence, rather than
   * conjured by whichever renderer needed one.
   */
  readonly standingAuthorities?: readonly PredicateAuthority[];
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
export const IIJA_HEARING_RECORD: ProgramContentEvidence = {
  kind: "source-example",
  reference:
    "House Transportation and Infrastructure hearing record CHRG-117hhrg45093",
  asOf: "2021-06-04" as IsoDate,
  establishes:
    "Infrastructure argument in a real hearing record recurs around maintenance backlog, rural access, broadband, water and named local projects, and members ask for locally important provisions inside a larger package.",
};

export const IIJA_FISCAL_TREATMENT: ProgramContentEvidence = {
  kind: "source-example",
  reference: "Congressional Budget Office publication 57406",
  asOf: "2021-08-05" as IsoDate,
  establishes:
    "An official estimate distinguishes authorizing legislation from appropriation treatment and states which effects it did not model, rather than presenting one confident total.",
};

export const TARGETED_SECTION_SOURCE: ProgramContentEvidence = {
  kind: "source-example",
  reference: "Senate Amendment 2638 to Senate Amendment 2137, 117th Congress",
  asOf: "2021-08-03" as IsoDate,
  establishes:
    "A narrow targeted section can be drafted, sponsored and laid on the table without ever entering the enacted text, so proposed text and adopted text are different records.",
};

/** Authored fiction. Cited on every number a player can move. */
export function authored(note: string): ProgramContentEvidence {
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
  return cents === 0
    ? `$${body}`
    : `$${body}.${String(cents).padStart(2, "0")}`;
}

/**
 * A date the way a bill writes one.
 *
 * Statutes do not carry ISO strings, and a player reading "not later than
 * 2029-01-05" is reading a database field rather than a deadline. The input is
 * still the canonical IsoDate; only the rendering changes.
 */
export function formatStatutoryDate(date: IsoDate): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const year = date.slice(0, 4);
  const month = months[Number(date.slice(5, 7)) - 1] ?? date.slice(5, 7);
  const day = Number(date.slice(8, 10));
  return `${month} ${day}, ${year}`;
}

export function yearsPhrase(years: number): string {
  return years === 1 ? "one year" : `${numberWord(years)} years`;
}

/**
 * The attributive form: "a two-year pilot", never "a two years pilot".
 *
 * Kept separate from `yearsPhrase` because the two are not interchangeable —
 * "once every two years" and "the two-year pilot" are both correct and neither
 * spelling works in the other's sentence.
 */
export function yearsAttributive(years: number): string {
  return `${numberWord(years)}-year`;
}

export function numberWord(value: number): string {
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
