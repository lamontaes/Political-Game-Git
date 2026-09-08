/**
 * Runtime institutional rule contract for municipal elections and municipal
 * direct democracy.
 *
 * This module describes what a *state's general municipal law* says about how
 * local officers are elected and how citizens may legislate, recall or veto by
 * petition. It contains no jurisdiction-specific facts: those live in packs
 * compiled from a cited corpus. Nothing here models political behaviour — who
 * is likely to win, which slate a labour council endorses, or whether a recall
 * would succeed. Formal rule and observed political behaviour stay separate
 * concepts by construction.
 *
 * It deliberately mirrors the epistemics already accepted for legislatures in
 * `legislature-rules.ts` rather than inventing a second discipline, and it
 * imports nothing from that module so the two lanes never collide in one file.
 * Two things here are genuinely new, and both come from the domain rather than
 * from taste:
 *
 * 1. **A fourth epistemic state, `locally-selectable`.** A legislature is one
 *    institution and its rule has one value. A state's municipalities are many,
 *    and American municipal law routinely resolves *that a city chooses* while
 *    resolving nothing about what any particular city chose. That is not
 *    `unknown` — state law settled it — and it is not `known`, because there is
 *    no single operative value. Collapsing it into either would be a lie in a
 *    different direction each time.
 *
 * 2. **An explicit source tier.** Every value in the first wave was read from a
 *    research synthesis, not from the statute the synthesis cites. The
 *    substrate elsewhere in this repository refuses to compile production
 *    corpora from secondary sources at all; this domain admits them, but only
 *    as a *declared* tier that travels with every single value and that a
 *    consuming system can refuse. See {@link MUNICIPAL_RULES_AUDIT_GATE}.
 *
 * Three epistemic states are distinct everywhere and never collapse:
 * - `known`              the rule is resolved to one operative value;
 * - `unknown`            no source resolved it (NOT zero, NOT none, NOT absent);
 * - `not-applicable`     the concept does not exist in this institution;
 * - `locally-selectable` state law resolves an option set, not a value.
 *
 * A rule that genuinely says "there is none" is a `known` value carrying the
 * negative fact — a state whose general law authorises no citizen initiative
 * has a `known` initiative form of `prohibited`, not an `unknown` one.
 */

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

/**
 * What was actually read to produce a value.
 *
 * This is a claim about evidence, not a default, and nothing is promoted by
 * construction. The whole point of separating the two is that promoting a value
 * from `secondary-synthesis-only` to `primary-text-read` is a real act someone
 * has to perform against the cited instrument.
 */
export type MunicipalVerification =
  /** The operative text of the cited instrument was read and says this. */
  | "primary-text-read"
  /**
   * A research synthesis reports this and names the instrument, but the
   * instrument itself was not opened here. The citation is the synthesis's
   * claim about the law, not this repository's.
   */
  | "secondary-synthesis-only";

/** The kind of instrument a citation points at. */
export type MunicipalAuthorityLayer =
  | "state-constitution"
  | "state-statute"
  | "federal-statute"
  | "municipal-charter"
  | "judicial-decision";

/** Citation for one municipal rule, carried into the runtime. */
export interface MunicipalSourceRef {
  readonly authority: MunicipalAuthorityLayer;
  /** The instrument and section, e.g. "Idaho Code § 50-403". */
  readonly citation: string;
  /** The corpus this value was read out of. */
  readonly corpusId: string;
  readonly asOf: string;
  readonly readOn: string;
  readonly verification: MunicipalVerification;
  readonly note: string | null;
}

export function assertMunicipalSourceRef(
  source: MunicipalSourceRef,
  label: string,
): void {
  if (!source || typeof source !== "object") {
    throw new Error(`${label} must carry a source reference.`);
  }
  const citation = source.citation.trim();
  if (citation.length === 0) {
    throw new Error(`${label} must cite an instrument.`);
  }
  if (
    /^(?:authority|citation|source|statute)\s*:?\s*$/i.test(citation) ||
    !/[A-Za-z0-9]/.test(citation)
  ) {
    throw new Error(
      `${label} carries a placeholder or malformed citation: "${source.citation}".`,
    );
  }
  if (source.corpusId.trim().length === 0) {
    throw new Error(`${label} must name the corpus it was read from.`);
  }
  if (!ISO_DATE.test(source.asOf) || !ISO_DATE.test(source.readOn)) {
    throw new Error(`${label} must carry ISO as-of and read dates.`);
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Rule values
// ---------------------------------------------------------------------------

export type MunicipalRule<T> =
  | {
      readonly kind: "known";
      readonly value: T;
      readonly source: MunicipalSourceRef;
    }
  | { readonly kind: "unknown"; readonly note: string }
  | { readonly kind: "not-applicable"; readonly note: string }
  | {
      readonly kind: "locally-selectable";
      /** Every option state law puts on the table, in a stable order. */
      readonly options: readonly T[];
      /**
       * The option that applies when a municipality makes no choice, where the
       * source resolves one. `null` means state law offers a menu and names no
       * fallback; it never means "the first option".
       */
      readonly statutoryDefault: T | null;
      readonly source: MunicipalSourceRef;
    };

export function knownMunicipalRule<T>(
  value: T,
  source: MunicipalSourceRef,
): MunicipalRule<T> {
  assertMunicipalSourceRef(source, "A known municipal rule");
  return { kind: "known", value, source };
}

export function unknownMunicipalRule<T>(note: string): MunicipalRule<T> {
  if (note.trim().length === 0) {
    throw new Error(
      "An unknown municipal rule must explain what is unresolved.",
    );
  }
  return { kind: "unknown", note };
}

export function notApplicableMunicipalRule<T>(note: string): MunicipalRule<T> {
  if (note.trim().length === 0) {
    throw new Error("A not-applicable municipal rule must explain why.");
  }
  return { kind: "not-applicable", note };
}

export function locallySelectableMunicipalRule<T>(
  options: readonly T[],
  statutoryDefault: T | null,
  source: MunicipalSourceRef,
): MunicipalRule<T> {
  if (options.length < 2) {
    throw new Error(
      "A locally-selectable municipal rule needs at least two options; with one option state law resolved the value and it is known.",
    );
  }
  if (new Set(options).size !== options.length) {
    throw new Error("A locally-selectable municipal rule repeats an option.");
  }
  if (statutoryDefault !== null && !options.includes(statutoryDefault)) {
    throw new Error(
      "A locally-selectable municipal rule's statutory default must be one of its options.",
    );
  }
  assertMunicipalSourceRef(source, "A locally-selectable municipal rule");
  return { kind: "locally-selectable", options, statutoryDefault, source };
}

export function isKnownMunicipalRule<T>(
  rule: MunicipalRule<T>,
): rule is { kind: "known"; value: T; source: MunicipalSourceRef } {
  return rule.kind === "known";
}

/**
 * Reads a single operative value, or null for every other state.
 *
 * A `locally-selectable` rule returns null here even when it names a statutory
 * default, because the default is what applies absent a local choice and this
 * corpus never resolves whether a local choice was made.
 */
export function municipalValueOrNull<T>(rule: MunicipalRule<T>): T | null {
  return rule.kind === "known" ? rule.value : null;
}

/**
 * Requires a resolved rule. The three unresolved states produce *different*
 * errors so a caller can never silently treat one as another.
 */
export function requireKnownMunicipalRule<T>(
  rule: MunicipalRule<T>,
  label: string,
): T {
  switch (rule.kind) {
    case "known":
      return rule.value;
    case "unknown":
      throw new Error(
        `${label} is unresolved for this jurisdiction: ${rule.note}`,
      );
    case "not-applicable":
      throw new Error(
        `${label} does not apply in this jurisdiction: ${rule.note}`,
      );
    case "locally-selectable":
      throw new Error(
        `${label} is chosen locally in this jurisdiction and state law resolves only the option set (${rule.options.join(", ")}).`,
      );
  }
}

/** Every option a rule could operate under, for a caller enumerating a space. */
export function municipalRuleOptions<T>(rule: MunicipalRule<T>): readonly T[] {
  if (rule.kind === "known") return [rule.value];
  if (rule.kind === "locally-selectable") return rule.options;
  return [];
}

/** The citation behind a rule, where it has one. */
export function municipalRuleSource<T>(
  rule: MunicipalRule<T>,
): MunicipalSourceRef | null {
  return rule.kind === "known" || rule.kind === "locally-selectable"
    ? rule.source
    : null;
}

// ---------------------------------------------------------------------------
// Domain vocabularies
// ---------------------------------------------------------------------------

/** How much power a state's constitution or statutes leave to municipalities. */
export type HomeRuleFoundation =
  | "dillons-rule-strict"
  | "statutory-optional-charter"
  | "constitutional-home-rule"
  | "federal-home-rule-act";

/** The institutional family a state's municipal law belongs to. Descriptive. */
export type MunicipalOptionFamily =
  | "new-england-town-meeting"
  | "mid-atlantic-partisan-dillon"
  | "southern-runoff-general-law"
  | "midwestern-optional-charter"
  | "western-constitutional-direct-democracy"
  | "consolidated-city-county";

/** Whether party labels reach the municipal ballot, and who decides. */
export type MunicipalBallotStructure =
  | "nonpartisan-mandatory"
  | "partisan-mandatory"
  | "nonpartisan-default-partisan-optional"
  | "partisan-default-nonpartisan-optional"
  | "charter-determined";

/**
 * When municipal elections are held. The union is the set the corpus's state
 * profiles actually use, which is wider than the enum its own summary section
 * proposes; see the `section-6-timing-enum-narrower-than-profiles` conflict.
 */
export type MunicipalElectionTiming =
  | "even-year-november-consolidated"
  | "odd-year-november-consolidated"
  | "even-year-june-consolidated"
  | "even-year-august-consolidated"
  | "even-year-may-consolidated"
  | "odd-year-autumn"
  | "odd-year-spring"
  | "spring-annual"
  | "spring-even-year"
  | "annual-spring-april"
  | "annual-spring-may"
  | "annual-autumn-october"
  | "autumn-gubernatorial"
  | "town-meeting-day-march"
  | "town-meeting-day-spring"
  | "quadrennial-summer-june"
  | "quadrennial-late-summer-august";

/** What it takes to win a municipal office. */
export type MunicipalRunoffRule =
  | "pure-plurality"
  | "majority-50-plus-1"
  | "top-two-primary-runoff"
  | "ranked-choice-instant-runoff";

/** Who administers the count, which is also who pays for it. */
export type ElectionAdministrationModel =
  | "municipal-clerk-locally-administered"
  | "county-election-board-coordinated"
  | "hybrid-clerk-and-county"
  | "state-election-board";

/** What happens to a seat that empties mid-term. */
export type MunicipalVacancyRule =
  | "council-appointment-full-term"
  | "council-appointment-with-special-election-threshold"
  | "party-precinct-committeeperson-caucus"
  | "mayoral-appointment-council-consent"
  | "special-election-mandatory";

/** How, or whether, voters may remove a municipal officer before term's end. */
export type MunicipalRecallDoctrine =
  /** Recall vote and replacement race decided on one ballot. */
  | "two-question-standalone"
  /** The incumbent runs against challengers in a single replacement contest. */
  | "simultaneous-incumbent-replacement"
  /** A bare keep-or-remove question; the seat then fills under vacancy rules. */
  | "yes-no-retention"
  /** No recall election exists; removal runs through a court. */
  | "judicial-cause-removal-trial"
  /** State general law authorises no municipal recall at all. */
  | "prohibited";

/** How, or whether, citizens may legislate a municipal ordinance directly. */
export type MunicipalInitiativeForm =
  /** A certified petition goes to the council first, and to the ballot only if it fails to act. */
  | "indirect-council-first"
  /** A certified petition goes straight to the ballot. */
  | "direct-to-ballot"
  /** Articles are placed on a town meeting warrant by a count of signers. */
  | "town-meeting-warrant"
  /** State general law authorises no citizen ordinance initiative. */
  | "prohibited";

/** Whether citizens may suspend and put an enacted ordinance to a vote. */
export type ProtestReferendumAvailability = "available" | "prohibited";

/** What a signature requirement is a percentage *of*. */
export type PetitionSignatureBase =
  /** Everyone on the municipality's rolls. The largest base, and the hardest. */
  | "registered-voters"
  /** Votes cast for the office at issue, or for the executive head. */
  | "votes-cast-for-office"
  /** Total votes cast at the last regular municipal election. */
  | "votes-cast-last-election"
  /** Votes cast in the municipality for Governor at the last state election. */
  | "last-gubernatorial-vote";

/**
 * A bounded signature requirement.
 *
 * The percentage is meaningless without its base — 25% of the votes cast for
 * one council seat and 25% of a city's registered voters are different
 * petitions by an order of magnitude — so the two are never separable here.
 */
export interface PetitionThreshold {
  readonly percent: number;
  readonly base: PetitionSignatureBase;
}

export function assertPetitionThreshold(
  threshold: PetitionThreshold,
  label: string,
): void {
  if (
    typeof threshold.percent !== "number" ||
    !Number.isFinite(threshold.percent) ||
    threshold.percent <= 0 ||
    threshold.percent > 100
  ) {
    throw new Error(
      `${label} must be a percentage in (0, 100]: ${threshold.percent}`,
    );
  }
}

/**
 * Turns a percentage requirement plus a concrete electorate into the exact
 * number of signatures required. Pure integer arithmetic; a petition needs a
 * whole signature, and a fractional requirement always rounds up.
 */
export function resolveRequiredSignatures(
  threshold: PetitionThreshold,
  baseCount: number,
): number {
  assertPetitionThreshold(threshold, "A petition threshold");
  if (!Number.isSafeInteger(baseCount) || baseCount < 0) {
    throw new Error(
      `A petition signature base must be a non-negative integer: ${baseCount}`,
    );
  }
  // `Math.ceil` of a small negative is -0, and a signature count of -0 is not
  // a number anyone should ever read out of this function.
  return Math.max(0, Math.ceil((baseCount * threshold.percent) / 100 - 1e-9));
}

// ---------------------------------------------------------------------------
// The pack
// ---------------------------------------------------------------------------

/** How a state's general law elects municipal officers. */
export interface MunicipalElectoralFramework {
  readonly ballotStructure: MunicipalRule<MunicipalBallotStructure>;
  readonly electionTiming: MunicipalRule<MunicipalElectionTiming>;
  readonly runoffRule: MunicipalRule<MunicipalRunoffRule>;
  /**
   * The share needed to win outright. Not-applicable under pure plurality,
   * where no threshold exists. Where the runoff rule is locally selectable,
   * the source resolves no operative local trigger, so this stays unknown.
   */
  readonly majorityTriggerPercent: MunicipalRule<number>;
  readonly administration: MunicipalRule<ElectionAdministrationModel>;
}

/** How a state's general law fills a municipal seat that empties mid-term. */
export interface MunicipalVacancyFramework {
  readonly rule: MunicipalRule<MunicipalVacancyRule>;
  /** Months remaining in the term above which a special election is required. */
  readonly specialElectionCutoffMonths: MunicipalRule<number>;
  /** Whether the vacating officer's party caucus fills the seat outright. */
  readonly partyCaucusSuccession: MunicipalRule<boolean>;
  /** Whether citizens may petition a special election over an appointment. */
  readonly citizenPetitionOverride: MunicipalRule<boolean>;
}

/** How, or whether, citizens may act directly on municipal government. */
export interface MunicipalDirectDemocracyFramework {
  readonly recallDoctrine: MunicipalRule<MunicipalRecallDoctrine>;
  /** Whether a petition must plead legal cause rather than mere disagreement. */
  readonly recallGroundsRequired: MunicipalRule<boolean>;
  readonly recallPetitionThreshold: MunicipalRule<PetitionThreshold>;
  readonly recallCirculationWindowDays: MunicipalRule<number>;

  readonly initiativeForm: MunicipalRule<MunicipalInitiativeForm>;
  readonly initiativePetitionThreshold: MunicipalRule<PetitionThreshold>;
  /** Subjects state law places beyond citizen initiative, in a stable order. */
  readonly initiativeExemptSubjects: readonly string[];

  readonly protestReferendum: MunicipalRule<ProtestReferendumAvailability>;
  readonly protestReferendumWindowDays: MunicipalRule<number>;
  /** Whether a certified petition suspends the ordinance until the vote. */
  readonly protestReferendumSuspendsOrdinance: MunicipalRule<boolean>;
  readonly protestReferendumThreshold: MunicipalRule<PetitionThreshold>;
}

/**
 * One state's general municipal-election law.
 *
 * A pack is a claim about **state general law only**. It is never a claim about
 * any particular city: a named charter can and routinely does displace what is
 * here, and this corpus resolves no charter. A consumer that needs a specific
 * municipality's rule must treat a pack as the backdrop against which that
 * municipality's own instrument is read, not as its answer.
 */
export interface MunicipalElectionRulePack {
  /** USPS code for the state or the District of Columbia. */
  readonly usps: string;
  readonly stateName: string;
  readonly optionFamily: MunicipalOptionFamily;
  readonly homeRuleFoundation: MunicipalRule<HomeRuleFoundation>;
  readonly electoral: MunicipalElectoralFramework;
  readonly vacancy: MunicipalVacancyFramework;
  readonly directDemocracy: MunicipalDirectDemocracyFramework;
}

/**
 * Why nothing may consume these packs as settled law yet.
 *
 * Stated as a constant so a consuming system reads the gate rather than
 * discovering it, and so a test can assert the gate still holds. Lifting it is
 * a source audit — promoting values from `secondary-synthesis-only` to
 * `primary-text-read` against the instruments each one cites — not a decision
 * anyone can make by reading this file.
 */
export const MUNICIPAL_RULES_AUDIT_GATE =
  "Every value in the first wave carries verification 'secondary-synthesis-only': it was read from the 92O national research synthesis, not from the statute or constitution that synthesis cites. This corpus is source authority for later systems to consume, and it is not yet audited law. Candidacy, election and player-facing surfaces must not read it as settled until an independent municipal-election source audit promotes values to 'primary-text-read'. See docs/systems/municipal-election-rule-sources.md.";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const USPS = /^[A-Z]{2}$/;

/**
 * Checks a pack's internal consistency.
 *
 * This catches the failure this domain is most exposed to: a rule whose
 * dependents contradict its doctrine. A jurisdiction that prohibits recall
 * cannot also carry a recall petition threshold, and one that elects by
 * plurality cannot also carry a majority trigger. Both would be silent lies
 * that read perfectly well as data.
 */
export function assertMunicipalElectionRulePack(
  pack: MunicipalElectionRulePack,
): void {
  const where = `Municipal rule pack ${pack.usps}`;
  if (!USPS.test(pack.usps)) {
    throw new Error(`${where}: usps must be two upper-case letters.`);
  }
  if (pack.stateName.trim().length === 0) {
    throw new Error(`${where}: must carry a state name.`);
  }

  const plurality =
    municipalValueOrNull(pack.electoral.runoffRule) === "pure-plurality";
  if (
    plurality &&
    pack.electoral.majorityTriggerPercent.kind !== "not-applicable"
  ) {
    throw new Error(
      `${where}: a pure-plurality jurisdiction cannot carry a majority trigger.`,
    );
  }

  const recall = municipalValueOrNull(pack.directDemocracy.recallDoctrine);
  const recallHasNoElection =
    recall === "prohibited" || recall === "judicial-cause-removal-trial";
  if (recallHasNoElection) {
    for (const [label, rule] of [
      [
        "recall petition threshold",
        pack.directDemocracy.recallPetitionThreshold,
      ],
      [
        "recall circulation window",
        pack.directDemocracy.recallCirculationWindowDays,
      ],
      [
        "recall grounds requirement",
        pack.directDemocracy.recallGroundsRequired,
      ],
    ] as const) {
      if (rule.kind !== "not-applicable") {
        throw new Error(
          `${where}: recall doctrine '${recall}' has no recall election, so its ${label} must be not-applicable, not '${rule.kind}'.`,
        );
      }
    }
  }

  if (
    municipalValueOrNull(pack.directDemocracy.initiativeForm) === "prohibited"
  ) {
    if (
      pack.directDemocracy.initiativePetitionThreshold.kind !== "not-applicable"
    ) {
      throw new Error(
        `${where}: a prohibited initiative cannot carry a petition threshold.`,
      );
    }
  }

  if (
    municipalValueOrNull(pack.directDemocracy.protestReferendum) ===
    "prohibited"
  ) {
    for (const [label, rule] of [
      ["window", pack.directDemocracy.protestReferendumWindowDays],
      ["threshold", pack.directDemocracy.protestReferendumThreshold],
      [
        "suspension effect",
        pack.directDemocracy.protestReferendumSuspendsOrdinance,
      ],
    ] as const) {
      if (rule.kind !== "not-applicable") {
        throw new Error(
          `${where}: a prohibited protest referendum cannot carry a ${label}.`,
        );
      }
    }
  }

  if (
    municipalValueOrNull(pack.vacancy.rule) ===
      "party-precinct-committeeperson-caucus" &&
    municipalValueOrNull(pack.vacancy.partyCaucusSuccession) !== true
  ) {
    throw new Error(
      `${where}: a party-caucus vacancy rule must record party caucus succession as true.`,
    );
  }

  for (const threshold of [
    pack.directDemocracy.recallPetitionThreshold,
    pack.directDemocracy.initiativePetitionThreshold,
    pack.directDemocracy.protestReferendumThreshold,
  ]) {
    if (threshold.kind === "known") {
      assertPetitionThreshold(threshold.value, `${where}: petition threshold`);
    }
  }

  const exempt = pack.directDemocracy.initiativeExemptSubjects;
  if (new Set(exempt).size !== exempt.length) {
    throw new Error(`${where}: initiative exempt subjects repeat.`);
  }
}
