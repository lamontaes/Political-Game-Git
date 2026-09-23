/**
 * A playable legislature for a state whose own instruments have not been read.
 *
 * Nine legislatures are compiled from their own constitutions. Forty-two states
 * are not, and until now that meant something stronger than "we have not read
 * them": it meant those states had no legislature at all. `resolvePlayGeography`
 * returned a null rule pack, so a player living in Texas or California could not
 * be in a chamber, could not carry a bill, and could not see a floor vote. The
 * absence of research had become an absence of government.
 *
 * That is the same mistake `office-qualification-profile` fixes for standing for
 * office, and it takes the same three-state shape. A rule is either read from
 * the state's own law, or generated from the spread real states span and
 * recorded as the game's own, or genuinely unknown. Only the middle state was
 * missing.
 *
 * What a generated pack draws, and what it does not:
 *
 * A seat count is drawn from the interior of the researched spread, because a
 * chamber genuinely can be any size — real houses run from forty members to
 * four hundred, and no integer between them would look out of place. A veto
 * window is drawn only from values a legislature actually enacted, because that
 * is a discrete institutional choice rather than a continuum: the researched
 * spread runs from three days to sixty, and drawing uniformly across it would
 * hand most of the country a forty-day veto window no state has ever written.
 * The same reasoning governs override thresholds, which are always a named
 * fraction and never an arbitrary one.
 *
 * A senate is never drawn independently of its house. Every researched state
 * seats between a fifth and a half as many senators as representatives, and a
 * senate larger than its house is the one shape American bicameralism never
 * takes. So the upper chamber is drawn as a proportion of the lower.
 *
 * Every draw is a stable hash of the state's own key, so a state answers the
 * same way in every session, in every save, on every machine. A value rolled
 * per session would let one save contradict itself between two readings.
 *
 * And nothing here claims to be law. Every source ref carries authority
 * `game-profile` and verification `game-profile`, `assertRulePackIntegrity`
 * refuses a pack that mixes the two kinds, and compiling the state's own
 * constitution replaces the whole pack.
 */

import {
  knownRule,
  fractionOf,
  majorityOf,
  unknownRule,
  type ChamberRule,
  type LegislativeRulePack,
  type RuleSourceRef,
  type VoteDenominator,
  type VoteThresholdRule,
} from "./legislature-rules";
import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import { STATES } from "./state-reference";
import { vetoOverrideReadingFor } from "./veto-override-source-readings";

/**
 * The version of the generated ruleset.
 *
 * Changing any rule below means a new version. A save records the version its
 * legislature was created under, so an existing game is never silently
 * re-legislated underneath the player.
 */
export const LEGISLATURE_GAME_PROFILE_VERSION =
  "ocd-legislature-game-profile/v1";

function profileSource(citation: string, note: string): RuleSourceRef {
  return {
    authority: "game-profile",
    citation,
    sourceTitle: `Our Civic Duty legislature profile (${LEGISLATURE_GAME_PROFILE_VERSION})`,
    sourceUrl: null,
    retrievedAt: null,
    verification: "game-profile",
    note,
  };
}

/** A stable hash. FNV-1a, written out so it can never be retuned under saves. */
function stableHash(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function draw(stateJurisdictionKey: string, field: string): number {
  return stableHash(
    `${LEGISLATURE_GAME_PROFILE_VERSION}|${stateJurisdictionKey}|${field}`,
  );
}

/** A whole number anywhere inside the researched spread, ends included. */
function drawWithin(
  stateJurisdictionKey: string,
  field: string,
  lowest: number,
  highest: number,
): number {
  return lowest + (draw(stateJurisdictionKey, field) % (highest - lowest + 1));
}

/** One of the values a researched legislature actually enacted. */
function drawFrom<T>(
  stateJurisdictionKey: string,
  field: string,
  options: readonly T[],
): T {
  return options[draw(stateJurisdictionKey, field) % options.length]!;
}

// ---------------------------------------------------------------------------
// What the researched packs span
// ---------------------------------------------------------------------------

function ascendingDistinct(values: readonly number[]): readonly number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

/**
 * The spread of lower-chamber sizes across the researched packs, and the
 * proportion their senates bear to them, as whole percentage points.
 *
 * Measured rather than written down, so it widens on its own as states are
 * compiled and can never drift away from its own evidence. Packs whose seat
 * counts are unresolved contribute nothing: an unknown is not a zero.
 */
export function researchedChamberSpread(): {
  readonly lowerSeats: readonly number[];
  readonly senatePercentOfHouse: readonly number[];
} {
  const lowerSeats: number[] = [];
  const senatePercentOfHouse: number[] = [];
  for (const pack of LEGISLATIVE_RULE_PACKS) {
    if (pack.basis !== "researched" || pack.structure !== "bicameral") continue;
    const [lower, upper] = pack.chamberOrder;
    const lowerChamber = pack.chambers.find((c) => c.chamberKey === lower);
    const upperChamber = pack.chambers.find((c) => c.chamberKey === upper);
    if (lowerChamber?.seats.kind !== "known") continue;
    lowerSeats.push(lowerChamber.seats.value);
    if (upperChamber?.seats.kind !== "known") continue;
    senatePercentOfHouse.push(
      Math.round((upperChamber.seats.value / lowerChamber.seats.value) * 100),
    );
  }
  return {
    lowerSeats: ascendingDistinct(lowerSeats),
    senatePercentOfHouse: ascendingDistinct(senatePercentOfHouse),
  };
}

/**
 * The in-session veto windows, post-adjournment windows and override fractions
 * the researched packs carry. Unknown and not-applicable values contribute
 * nothing rather than a number.
 */
export function researchedExecutiveSpread(): {
  readonly inSessionDays: readonly number[];
  readonly afterAdjournmentDays: readonly number[];
  readonly overrideFractions: readonly (readonly [number, number])[];
} {
  const inSessionDays: number[] = [];
  const afterAdjournmentDays: number[] = [];
  const overrideFractions: (readonly [number, number])[] = [];
  const seenFractions = new Set<string>();
  for (const pack of LEGISLATIVE_RULE_PACKS) {
    if (pack.basis !== "researched") continue;
    const executive = pack.executive;
    if (executive.actionWindowDaysInSession.kind === "known") {
      inSessionDays.push(executive.actionWindowDaysInSession.value);
    }
    if (executive.actionWindowDaysAfterAdjournment.kind === "known") {
      afterAdjournmentDays.push(
        executive.actionWindowDaysAfterAdjournment.value,
      );
    }
    // Only the each-chamber form is carried forward. A joint-session override
    // has to equal the pack's combined seats exactly, and a generated pack that
    // got that arithmetic wrong would fail its own integrity check; the form is
    // recorded as a gap instead of approximated.
    if (executive.override.kind === "each-chamber") {
      const { numerator, denominatorParts } = executive.override.threshold;
      const key = `${numerator}/${denominatorParts}`;
      if (!seenFractions.has(key)) {
        seenFractions.add(key);
        overrideFractions.push([numerator, denominatorParts]);
      }
    }
  }
  return {
    inSessionDays: ascendingDistinct(inSessionDays),
    afterAdjournmentDays: ascendingDistinct(afterAdjournmentDays),
    overrideFractions: [...overrideFractions].sort(
      (left, right) => left[0] / left[1] - right[0] / right[1],
    ),
  };
}

// ---------------------------------------------------------------------------
// The generated profile
// ---------------------------------------------------------------------------

/**
 * Jurisdictions this generator declines, because a state legislature is not
 * what they have.
 *
 * The District of Columbia is legislated for by a thirteen-member Council
 * sitting as one body. Handing it a generated House and Senate would not be a
 * provisional reading of its law, it would be a shape the District has never
 * had — and the whole point of a disclosed profile is that it resembles the
 * real thing. The Council belongs to the municipal registry, and until it is
 * compiled the District has no state legislature rather than a wrong one.
 *
 * Puerto Rico is not listed: its Legislative Assembly really is bicameral, so
 * the generated shape is the right one even before its own instruments are read.
 */
const NO_STATE_LEGISLATURE: ReadonlySet<string> = new Set(["US-DC"]);

/** The drawn shape of one state's legislature, before it becomes a rule pack. */
export interface LegislatureProfile {
  readonly stateJurisdictionKey: string;
  readonly version: string;
  readonly lowerSeats: number;
  readonly upperSeats: number;
  readonly vetoWindowDaysInSession: number;
  readonly vetoWindowDaysAfterAdjournment: number;
  readonly overrideFraction: readonly [number, number];
}

/**
 * What one unread state's legislature looks like, or null if the researched
 * packs carry too little to draw from.
 *
 * Null is not an empty legislature and not a permission: it means the game
 * cannot yet say even what is usual, which happens only if no researched pack
 * resolves a seat count at all.
 */
export function legislatureProfileFor(
  stateJurisdictionKey: string,
): LegislatureProfile | null {
  if (NO_STATE_LEGISLATURE.has(stateJurisdictionKey)) return null;
  const chambers = researchedChamberSpread();
  const executive = researchedExecutiveSpread();
  if (
    chambers.lowerSeats.length === 0 ||
    chambers.senatePercentOfHouse.length === 0 ||
    executive.inSessionDays.length === 0 ||
    executive.afterAdjournmentDays.length === 0 ||
    executive.overrideFractions.length === 0
  ) {
    return null;
  }
  const lowerSeats = drawWithin(
    stateJurisdictionKey,
    "lower-seats",
    chambers.lowerSeats[0]!,
    chambers.lowerSeats[chambers.lowerSeats.length - 1]!,
  );
  const percent = drawWithin(
    stateJurisdictionKey,
    "senate-percent",
    chambers.senatePercentOfHouse[0]!,
    chambers.senatePercentOfHouse[chambers.senatePercentOfHouse.length - 1]!,
  );
  // At least two senators, and always fewer than the house: a senate that
  // matched or outgrew its lower chamber is the one shape no state has.
  const upperSeats = Math.min(
    lowerSeats - 1,
    Math.max(2, Math.round((lowerSeats * percent) / 100)),
  );
  return {
    stateJurisdictionKey,
    version: LEGISLATURE_GAME_PROFILE_VERSION,
    lowerSeats,
    upperSeats,
    vetoWindowDaysInSession: drawFrom(
      stateJurisdictionKey,
      "veto-in-session",
      executive.inSessionDays,
    ),
    vetoWindowDaysAfterAdjournment: drawFrom(
      stateJurisdictionKey,
      "veto-after-adjournment",
      executive.afterAdjournmentDays,
    ),
    overrideFraction: drawFrom(
      stateJurisdictionKey,
      "override",
      executive.overrideFractions,
    ),
  };
}

const QUORUM_SOURCE = profileSource(
  "Quorum",
  "A majority of the members elected to a chamber is a quorum. Every researched state says so, and the game applies it where a state's own rule has not been read.",
);
const PASSAGE_SOURCE = profileSource(
  "Passage",
  "A measure passes a chamber on a majority of the members elected to it. Every researched state says so, and the game applies it where a state's own rule has not been read.",
);
const ORIGINATION_SOURCE = profileSource(
  "Origination",
  "A measure may start in either chamber. The game applies this where a state's own origination rule has not been read; a state that confines a class of measure to one chamber will say so once its instruments are compiled.",
);
/**
 * PLACEHOLDER, NOT LAW. Whether an unread state's legislature meets every year
 * or every other year, and whether a pending bill carries over, is research
 * question `generated-legislature-session-frequency-and-carryover`. Blanket
 * rule meanwhile: a regular session each year, and pending measures die at
 * adjournment sine die. Real states differ on both, so this is recorded as
 * the game's own rule rather than as the state's.
 */
const SESSION_SOURCE = profileSource(
  "Session",
  "Not researched for this state. The game's own rule until it is: a regular session each year, and a measure still pending when the legislature adjourns sine die does not carry over.",
);

function profileChamber(
  chamberKey: string,
  name: string,
  billDesignationPrefix: string,
  seats: number,
): ChamberRule {
  const seatSource = profileSource(
    "Seats",
    `The chamber seats ${seats} members, drawn from the range the compiled states span and fixed for this state.`,
  );
  const quorum: VoteThresholdRule = majorityOf(
    "members-elected",
    "a majority of the members elected to the chamber",
    QUORUM_SOURCE,
  );
  return {
    chamberKey,
    name,
    billDesignationPrefix,
    seats: knownRule(seats, seatSource),
    quorum: knownRule(quorum, QUORUM_SOURCE),
    introductionAllowed: true,
    referral: {
      authorityLabel: "Set by the chamber's own rules of proceeding",
      multipleReferralAllowed: unknownRule(
        "Whether one measure may be referred to several committees is set by this chamber's own rules, which have not been read.",
      ),
      everyMeasureMustBeHeard: unknownRule(
        "Whether every referred measure is guaranteed a hearing is set by this chamber's own rules, which have not been read.",
      ),
      source: profileSource(
        "Referral",
        "A measure is referred to committee before it reaches the floor. Which committee, and on what terms, comes from chamber rules that have not been read.",
      ),
    },
    committees: [],
    floorStages: [
      {
        stageKey: "final-passage",
        label: "Final passage",
        amendable: knownRule(true, PASSAGE_SOURCE),
        separateLegislativeDayRequired: true,
        vote: knownRule(
          majorityOf(
            "members-elected",
            "a majority of the members elected to the chamber",
            PASSAGE_SOURCE,
          ),
          PASSAGE_SOURCE,
        ),
        source: PASSAGE_SOURCE,
      },
    ],
    amendments: {
      floorAmendmentsAllowed: knownRule(true, PASSAGE_SOURCE),
      germanenessStandard: unknownRule(
        "The germaneness standard applied to an amendment is set by this chamber's own rules, which have not been read.",
      ),
      source: PASSAGE_SOURCE,
    },
  };
}

/** The pack id a generated legislature is registered and saved under. */
export function legislatureProfilePackId(stateJurisdictionKey: string): string {
  return `${stateJurisdictionKey.toLowerCase()}-legislature-profile-v1`;
}

/**
 * A complete, playable legislature for a state with no compiled pack.
 *
 * The pack declares `basis: "game-profile"`, which makes the mixing check in
 * `assertRulePackIntegrity` refuse it if any rule in it ever claims a read
 * source. It is deliberately NOT added to `LEGISLATIVE_RULE_PACKS`: that array
 * is the compiled research, and a generated legislature listed beside Ohio's
 * would read as another state that had been checked.
 */
export function legislatureProfilePack(
  stateJurisdictionKey: string,
  stateName: string,
): LegislativeRulePack | null {
  const profile = legislatureProfileFor(stateJurisdictionKey);
  if (profile === null) return null;
  const override = overrideThresholdFor(
    stateJurisdictionKey,
    profile.overrideFraction,
  );
  const overrideSource = profileSource(
    "Veto and override",
    `The governor has ${profile.vetoWindowDaysInSession} days to act on a measure during session and ${profile.vetoWindowDaysAfterAdjournment} after adjournment. Each figure is one a compiled state actually enacted, fixed for this state.`,
  );
  // The override is the one rule here that may rest on real law. Where a
  // constitution has been read for this state, the read threshold wins and
  // carries that instrument's own citation; a generated pack is allowed to hold
  // a read rule precisely so this can happen.
  const overrideThresholdSource: RuleSourceRef =
    override.basis === "read" && readingCitation(stateJurisdictionKey) !== null
      ? readingCitation(stateJurisdictionKey)!
      : overrideSource;
  return {
    packId: legislatureProfilePackId(stateJurisdictionKey),
    jurisdictionKey: stateJurisdictionKey,
    displayName: `${stateName} Legislature`,
    basis: "game-profile",
    structure: "bicameral",
    chambers: [
      profileChamber(
        "house",
        "House of Representatives",
        "HB",
        profile.lowerSeats,
      ),
      profileChamber("senate", "Senate", "SB", profile.upperSeats),
    ],
    chamberOrder: ["house", "senate"],
    origination: {
      generalOrigination: knownRule(["house", "senate"], ORIGINATION_SOURCE),
      subjectRestrictions: [],
      source: ORIGINATION_SOURCE,
    },
    interChamber: {
      kind: "second-chamber",
      concurrenceThreshold: majorityOf(
        "members-elected",
        "a majority of the members elected to the second chamber",
        PASSAGE_SOURCE,
      ),
      conference: unknownRule(
        "How this legislature resolves a difference between its chambers is set by joint rules that have not been read, so conference is not modelled.",
      ),
      source: PASSAGE_SOURCE,
    },
    executive: {
      titleLabel: "Governor",
      presentmentRequired: knownRule(true, overrideSource),
      actionWindowDaysInSession: knownRule(
        profile.vetoWindowDaysInSession,
        overrideSource,
      ),
      actionWindowDaysAfterAdjournment: knownRule(
        profile.vetoWindowDaysAfterAdjournment,
        overrideSource,
      ),
      inactionOutcomeInSession: knownRule(
        "becomes-law-without-signature",
        overrideSource,
      ),
      lineItemVeto: unknownRule(
        "Whether this governor may object to a single item of an appropriation has not been read, and the game claims neither the power nor its absence.",
      ),
      override: {
        kind: "each-chamber",
        threshold: fractionOf(
          override.numerator,
          override.denominatorParts,
          override.countedAgainst,
          override.readBasis === null
            ? `${override.numerator} of ${override.denominatorParts} of the members elected to each chamber`
            : `${override.numerator} of ${override.denominatorParts} of ${override.readBasis}`,
          overrideThresholdSource,
        ),
      },
      source: overrideSource,
    },
    enactment: {
      effectiveDateDistinctFromEnactment: unknownRule(
        "When an act of this legislature takes effect has not been read.",
      ),
      defaultEffectiveRule: unknownRule(
        "This state's default effective date has not been read.",
      ),
      source: SESSION_SOURCE,
    },
    session: {
      sessionLabel: "Regular session",
      adjournmentRule: knownRule(
        "The legislature sits in a regular session each year and adjourns sine die at its close.",
        SESSION_SOURCE,
      ),
      measuresDieAtAdjournment: knownRule(true, SESSION_SOURCE),
      source: SESSION_SOURCE,
    },
    sources:
      overrideThresholdSource === overrideSource
        ? [
            QUORUM_SOURCE,
            PASSAGE_SOURCE,
            ORIGINATION_SOURCE,
            SESSION_SOURCE,
            overrideSource,
          ]
        : [
            QUORUM_SOURCE,
            PASSAGE_SOURCE,
            ORIGINATION_SOURCE,
            SESSION_SOURCE,
            overrideSource,
            overrideThresholdSource,
          ],
    unresolvedGaps: [
      "This legislature has not been compiled from its state's own constitution or rules. Its structure, seat counts, veto windows and override threshold are the game's own, drawn from the range the compiled states span, and none of them is a claim about this state's law.",
      "The chamber names and bill prefixes are the ordinary American ones. A state whose lower chamber is an Assembly or a House of Delegates will say so once its instruments are compiled.",
      "Committee structure, referral among committees, hearing guarantees and report thresholds come from chamber rules that have not been read.",
      "How often this legislature meets and whether a pending bill carries over have not been read; the generated pack meets every year and lets pending measures die at adjournment.",
      "Conference between the chambers is not modelled.",
      "Whether this state overrides a veto in joint session rather than chamber by chamber has not been read; the generated pack uses the chamber-by-chamber form every compiled state but one uses.",
      ...override.unexpressed,
    ],
  };
}

/**
 * A generated legislature resolved from its pack id.
 *
 * A save in an uncompiled state records the pack id like any other, and the
 * engine that moves a bill resolves it through `rulePackById`. Without this
 * the id would resolve to nothing and the save would open into a state with a
 * seat the player holds and no chamber to sit in.
 *
 * The id is the only handle. A pack object cannot be handed to the engine, and
 * an id that does not name a real jurisdiction resolves to null rather than to
 * an invented legislature.
 */
export function legislatureProfilePackById(
  packId: string,
): LegislativeRulePack | null {
  const matched = /^us-([a-z]{2})-legislature-profile-v1$/.exec(packId);
  if (!matched) return null;
  const usps = matched[1]!.toUpperCase();
  const state = STATES[usps];
  if (!state) return null;
  return legislatureProfilePack(`US-${usps}`, state.name);
}

/**
 * The legislature a state plays with: its own if it has been compiled, and the
 * generated one otherwise.
 *
 * This is the function the rest of the game should ask. Reaching for
 * `LEGISLATIVE_RULE_PACKS` directly is what left forty-two states with no
 * legislature: that array answers "which states have been researched", and the
 * caller wanted "which legislature does this state have".
 */
export function legislatureForState(
  stateJurisdictionKey: string,
): LegislativeRulePack | null {
  const researched = LEGISLATIVE_RULE_PACKS.find(
    (pack) => pack.jurisdictionKey === stateJurisdictionKey,
  );
  if (researched) return researched;
  const usps = /^US-([A-Z]{2})$/.exec(stateJurisdictionKey)?.[1];
  const state = usps ? STATES[usps] : undefined;
  if (!state) return null;
  return legislatureProfilePack(stateJurisdictionKey, state.name);
}

// ---------------------------------------------------------------------------
// Seats, for anything that has to actually fill them
// ---------------------------------------------------------------------------

/** A chamber's size, and whether it was read or drawn. */
export interface ChamberSeatCount {
  readonly seats: number;
  readonly basis: "researched" | "game-profile";
}

/**
 * How many seats a chamber has, for a caller that must seat them.
 *
 * Three compiled packs carry an unresolved seat count — Kentucky, Nebraska and
 * Nevada all delegate the number to statute or to filed district shapefiles,
 * and none of those was read. That absence is true of the research and the pack
 * keeps it: `chamber.seats` still says `unknown`, and nothing is written into
 * the record.
 *
 * But an absence in the record is not a reason for a chamber to sit empty. A
 * legislature with no members is the same failure as a state with no
 * legislature, one level down, and it is the failure that leaves the whole
 * country unseated except Congress. So the correction happens here, when the
 * number is READ, exactly as the district-residence clock does: a compiled
 * count is returned as it stands, and an unresolved one draws from the spread
 * the compiled chambers span, stable for that chamber forever.
 *
 * A caller that needs to know which it got reads `basis`. A caller deciding
 * whether the LAW is known still reads `chamber.seats`, which is unchanged and
 * still says `unknown` — this function answers "how many people sit here",
 * which is a different question.
 */
export function seatsForChamber(
  pack: LegislativeRulePack,
  chamberKey: string,
): ChamberSeatCount | null {
  const chamber = pack.chambers.find(
    (candidate) => candidate.chamberKey === chamberKey,
  );
  if (!chamber) return null;
  if (chamber.seats.kind === "known") {
    // A generated pack's own seat count is known WITHIN that pack, but the pack
    // itself is the game's, so the basis follows the pack and not the field.
    // Reporting a generated legislature's seats as researched would be the one
    // claim this whole module exists to avoid.
    return {
      seats: chamber.seats.value,
      basis: pack.basis === "game-profile" ? "game-profile" : "researched",
    };
  }
  const spread = researchedChamberSpread();
  if (spread.lowerSeats.length === 0) return null;
  const lowest = spread.lowerSeats[0]!;
  const highest = spread.lowerSeats[spread.lowerSeats.length - 1]!;
  const key = `${pack.jurisdictionKey}|${chamberKey}`;

  // An upper chamber is drawn from its own lower chamber where there is one, so
  // a senate is never as large as the house it sits beside. A unicameral
  // legislature has no such pair and draws from the lower-chamber spread, which
  // is the only measurement of "a chamber that does the whole job".
  const isUpper =
    pack.structure === "bicameral" && pack.chamberOrder[1] === chamberKey;
  if (isUpper && spread.senatePercentOfHouse.length > 0) {
    const lowerKey = pack.chamberOrder[0]!;
    const lower = seatsForChamber(pack, lowerKey);
    if (lower !== null) {
      const percent = drawWithin(
        key,
        "upper-percent",
        spread.senatePercentOfHouse[0]!,
        spread.senatePercentOfHouse[spread.senatePercentOfHouse.length - 1]!,
      );
      return {
        seats: Math.min(
          lower.seats - 1,
          Math.max(2, Math.round((lower.seats * percent) / 100)),
        ),
        basis: "game-profile",
      };
    }
  }
  return {
    seats: drawWithin(key, "chamber-seats", lowest, highest),
    basis: "game-profile",
  };
}

// ---------------------------------------------------------------------------
// Real law overrides the draw
// ---------------------------------------------------------------------------

/** What a generated pack ended up using for its override, and where from. */
export interface OverrideThresholdChoice {
  readonly numerator: number;
  readonly denominatorParts: number;
  readonly countedAgainst: VoteDenominator;
  readonly basis: "read" | "game-profile";
  /** The instrument's own words, where a reading supplied them. */
  readonly readBasis: string | null;
  /** Everything the schema could not carry, in the instrument's own terms. */
  readonly unexpressed: readonly string[];
}

/**
 * The override threshold for a state, preferring what was actually read.
 *
 * A drawn threshold that contradicts a constitution we hold is worse than no
 * generator at all, and four states proved it: Tennessee's constitution sets a
 * simple majority where the draw gave two thirds, turning one of the easiest
 * override bars in the country into one of the hardest; North Carolina's is
 * three fifths of those present and voting, which is the whole reason an
 * override there is politically live; Virginia's is two conditions at once;
 * West Virginia's differs between an ordinary bill and an appropriation. So
 * the readings are consulted first and the draw only fills a silence.
 *
 * Two things this deliberately does NOT do.
 *
 * It does not invent a denominator. Where the reading says the instrument
 * counts against "members present and voting" or "the membership entitled
 * under the constitution", it records that those are not the same set as
 * anything `VoteDenominator` names and declines to map. This function keeps the
 * read FRACTION, which is what a player feels — a half and two thirds are the
 * difference between a live override and a dead one — carries the instrument's
 * own words forward in `readBasis`, and says in `unexpressed` that the
 * denominator is the game's nearest rather than the instrument's.
 *
 * And it does not flatten a rule the schema cannot hold. `OverrideForum` in the
 * each-chamber form carries ONE fraction against ONE denominator, so Virginia's
 * second condition and West Virginia's separate appropriations bar have nowhere
 * to live. They are recorded in `unexpressed` and surface in the pack's
 * `unresolvedGaps` rather than being quietly dropped or averaged. Flattening
 * them would be the same failure as promoting a summary into law.
 */
export function overrideThresholdFor(
  stateJurisdictionKey: string,
  drawn: readonly [number, number],
): OverrideThresholdChoice {
  const usps = /^US-([A-Z]{2})$/.exec(stateJurisdictionKey)?.[1] ?? "";
  const reading = vetoOverrideReadingFor(usps);
  const fallback: OverrideThresholdChoice = {
    numerator: drawn[0],
    denominatorParts: drawn[1],
    countedAgainst: "members-elected",
    basis: "game-profile",
    readBasis: null,
    unexpressed: [],
  };
  if (reading === null || reading.actions.length === 0) return fallback;

  // The ordinary-bill override, where the reading distinguishes one.
  //
  // Picking this by excluding any operation whose name mentions money was the
  // obvious approach and it was wrong twice over. Virginia states one rule for
  // "override-whole-or-item-veto" — the word "item" there is half of a combined
  // operation, not a money-only bar — and excluding it selected Virginia's
  // rule for ACCEPTING a governor's recommendation, which is not an override at
  // all. West Virginia states its ordinary rule as
  // "override-ordinary-nonappropriation-bill", and a match on "appropriation"
  // excludes the very action it names.
  //
  // So the choice is made in two steps: only actions that are overrides at all,
  // then, among those, prefer one the reading does not confine to money.
  const overrides = reading.actions.filter((action) =>
    /override|restore/i.test(action.operation),
  );
  const candidates = overrides.length > 0 ? overrides : reading.actions;
  const ordinary =
    candidates.find(
      (action) =>
        !/^(?!.*non)(?=.*(appropriation|budget|revenue)).*$/i.test(
          action.operation,
        ),
    ) ?? candidates[0]!;
  const chosen = ordinary.thresholds.find(
    (threshold) => threshold.countedAgainst !== null,
  );
  const primary = chosen ?? ordinary.thresholds[0];
  if (!primary) return fallback;

  const unexpressed: string[] = [];
  if (primary.countedAgainst === null) {
    unexpressed.push(
      `${reading.name} counts its override against "${primary.readBasis}" (${reading.locator}), which is not the same set as anything this schema names. The fraction is the instrument's; the denominator is the game's nearest.`,
    );
  }
  for (const other of ordinary.thresholds) {
    if (other === primary) continue;
    unexpressed.push(
      `${reading.name} also requires ${other.numerator} of ${other.denominatorParts} of "${other.readBasis}" for the same override (${reading.locator}). This schema carries one threshold per forum, so that condition is recorded here rather than enforced, and the override is easier in play than the instrument allows.`,
    );
  }
  for (const action of reading.actions) {
    if (action === ordinary) continue;
    const stated = action.thresholds
      .map(
        (threshold) =>
          `${threshold.numerator} of ${threshold.denominatorParts} of "${threshold.readBasis}"`,
      )
      .join(" and ");
    unexpressed.push(
      `${reading.name} sets a separate bar for ${action.operation}: ${stated} (${reading.locator}). An each-chamber forum in this schema carries no per-measure-class threshold, so that is recorded rather than applied.`,
    );
  }

  return {
    numerator: primary.numerator,
    denominatorParts: primary.denominatorParts,
    countedAgainst: primary.countedAgainst ?? "members-elected",
    basis: "read",
    readBasis: primary.readBasis,
    unexpressed,
  };
}

/**
 * The instrument's own citation for a state whose override was read.
 *
 * This is the one place a generated pack points at a real source, and it points
 * at the reading's own locator and URL rather than restating them. Verification
 * is `partial` on purpose: the threshold was read from the instrument, and the
 * rest of the pack around it was not.
 */
function readingCitation(stateJurisdictionKey: string): RuleSourceRef | null {
  const usps = /^US-([A-Z]{2})$/.exec(stateJurisdictionKey)?.[1] ?? "";
  const reading = vetoOverrideReadingFor(usps);
  if (reading === null) return null;
  return {
    authority: "constitution",
    citation: reading.locator,
    sourceTitle: `${reading.name} — veto override, read from the instrument`,
    sourceUrl: reading.url,
    retrievedAt: null,
    verification: "partial",
    note: `Read for the override threshold only (${reading.researchStatus}). The rest of this legislature is the game's own.`,
  };
}
