import { ageOnDate } from "./dates";
import { legislativeBlueprint } from "./legislation-scenarios";
import { lifePlaceByJurisdictionId } from "./life-places";
import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import { unknownRule } from "./legislature-rules";
import type {
  LegislativeRulePack,
  RuleSourceRef,
  RuleValue,
} from "./legislature-rules";
import type { ElectiveOfficeRef, EntityId, World } from "./types";

/**
 * Which offices a life can actually run for, and on whose authority.
 *
 * The game has no candidate-qualification corpus. What it does have is a set of
 * accepted legislative rule packs, and each of those cites the constitutional
 * text establishing a chamber and the number of members elected to it. That is
 * enough to say truthfully that the office exists and is filled by election. It
 * is not enough to say who may stand for it, when filing closes, or which
 * district a seat belongs to, and this module says so rather than filling the
 * gaps in with something plausible.
 *
 * So candidacy is offered exactly where a pack has been accepted, and nowhere
 * else. Lexington-Fayette has a jurisdiction and a household and an ordinary
 * life in it, and no sourced procedure for its own council — so a character
 * living there cannot file, and is told why. Nothing borrows Kentucky's rules
 * to cover the gap.
 */

/**
 * The game's own floor, not a jurisdiction's.
 *
 * Every real qualification below is `unknown`, and "unknown" must not resolve
 * to "anyone". So the game applies one conservative rule of its own and labels
 * it as its own: the same adult threshold the accepted setup screen already
 * uses before it will put a character to work in a legislature. When a
 * jurisdiction's real minimum age is sourced it replaces this, and a character
 * this rule turned away was turned away by the game, which is a different
 * sentence from "the law says no".
 */
export const GAME_ADULT_CANDIDACY_AGE = 21;

export interface ElectiveOfficeQualification {
  /** The age the jurisdiction requires. Unknown until a source says. */
  readonly minimumAge: RuleValue<number>;
  /** How long a candidate must have lived in the state or the district. */
  readonly residency: RuleValue<string>;
  /** How long the winner serves. */
  readonly termYears: RuleValue<number>;
  /** When candidacy papers are due, and to whom. */
  readonly filing: RuleValue<string>;
}

export interface ElectiveOfficeOption {
  /** Stable identity for this office within its pack. */
  readonly officeKey: string;
  readonly office: ElectiveOfficeRef;
  /** Members elected to the chamber, from the pack's own cited value. */
  readonly seats: number;
  /** The citation the seat count and the chamber's existence come from. */
  readonly source: RuleSourceRef;
  readonly qualification: ElectiveOfficeQualification;
  /** What is not known about this office, carried rather than guessed. */
  readonly unresolvedGaps: readonly string[];
}

export interface CandidacyPack {
  readonly packId: string;
  readonly jurisdictionKey: string;
  readonly displayName: string;
  /** The accepted legislative pack every office below is derived from. */
  readonly legislativeRulePackId: string;
  readonly offices: readonly ElectiveOfficeOption[];
  readonly unresolvedGaps: readonly string[];
}

/**
 * An honest statement of how much of standing for office the game can support,
 * in the same shape `LifePlaceCoverage` uses for places.
 */
export interface CandidacyCoverage {
  readonly kind: "derived-from-accepted-rule-packs";
  readonly packCount: number;
  readonly officeCount: number;
  /** True only once real candidate qualifications back the offer. */
  readonly qualificationsAreSourced: false;
  readonly outstandingDependency: string;
  /** The same fact, said the way a player should hear it. */
  readonly playerNote: string;
}

const NO_QUALIFICATION_CORPUS =
  "No accepted source in this repository states candidate qualifications, filing deadlines, or terms of office. The legislative rule packs describe how a measure moves through a chamber, not who may stand for a seat in it.";

const NO_DISTRICT_GEOGRAPHY =
  "The game has no district geography, so a seat in this chamber has no district identity and a contest is for a seat rather than for a numbered district.";

function officeQualification(): ElectiveOfficeQualification {
  return {
    minimumAge: unknownRule(NO_QUALIFICATION_CORPUS),
    residency: unknownRule(NO_QUALIFICATION_CORPUS),
    termYears: unknownRule(NO_QUALIFICATION_CORPUS),
    filing: unknownRule(NO_QUALIFICATION_CORPUS),
  };
}

/**
 * Turns an accepted legislative pack into the offices it demonstrably
 * establishes. One office per chamber, carrying that chamber's own citation.
 * Nothing is added that the pack does not already assert.
 */
export function candidacyPackFromRulePack(
  pack: LegislativeRulePack,
): CandidacyPack {
  const offices = pack.chambers.map((chamber): ElectiveOfficeOption => {
    const officeKey = `${pack.packId}:${chamber.chamberKey}`;
    return {
      officeKey,
      office: {
        officeKey,
        // A description of the seat, not a claimed formal title. The packs do
        // not record what members of these chambers are styled, and guessing
        // "Representative" or "Senator" from a chamber name would be inventing
        // a fact about an institution.
        title: `Seat in the ${chamber.name}`,
        // No district corpus exists, so no district is claimed.
        seatKey: null,
        occupationClassification: "service:elected-legislator",
      },
      seats: chamber.seats,
      // The chamber's amendment rule carries the instrument the chamber's own
      // record was compiled from; it is the citation nearest the seat count.
      source: chamber.amendments.source,
      qualification: officeQualification(),
      unresolvedGaps: [NO_QUALIFICATION_CORPUS, NO_DISTRICT_GEOGRAPHY],
    };
  });
  return {
    packId: `${pack.packId}:candidacy`,
    jurisdictionKey: pack.jurisdictionKey,
    displayName: pack.displayName,
    legislativeRulePackId: pack.packId,
    offices,
    unresolvedGaps: [
      NO_QUALIFICATION_CORPUS,
      NO_DISTRICT_GEOGRAPHY,
      "No primary, party nomination, ballot access or campaign finance rule is sourced, so a filing here is a general-election candidacy and nothing more.",
    ],
  };
}

const CANDIDACY_PACKS: readonly CandidacyPack[] =
  LEGISLATIVE_RULE_PACKS.map(candidacyPackFromRulePack);

export function candidacyPacks(): readonly CandidacyPack[] {
  return CANDIDACY_PACKS;
}

export function candidacyPackById(packId: string): CandidacyPack | null {
  return CANDIDACY_PACKS.find((pack) => pack.packId === packId) ?? null;
}

export function requireCandidacyPack(packId: string): CandidacyPack {
  const pack = candidacyPackById(packId);
  if (!pack) {
    throw new Error(`No candidacy pack is registered as '${packId}'.`);
  }
  return pack;
}

/** The candidacy pack a legislative scenario key implies, if one is accepted. */
export function candidacyPackForScenarioKey(
  scenarioKey: string,
): CandidacyPack | null {
  const pack = legislativeBlueprint(scenarioKey).pack;
  return candidacyPackById(`${pack.packId}:candidacy`);
}

export function electiveOfficeOption(
  packId: string,
  officeKey: string,
): ElectiveOfficeOption | null {
  return (
    candidacyPackById(packId)?.offices.find(
      (option) => option.officeKey === officeKey,
    ) ?? null
  );
}

export function candidacyCoverage(): CandidacyCoverage {
  return {
    kind: "derived-from-accepted-rule-packs",
    packCount: CANDIDACY_PACKS.length,
    officeCount: CANDIDACY_PACKS.reduce(
      (total, pack) => total + pack.offices.length,
      0,
    ),
    qualificationsAreSourced: false,
    outstandingDependency: NO_QUALIFICATION_CORPUS,
    playerNote:
      "The game knows these seats are elected because it has read the instrument that creates them. It has not read who is allowed to stand for one, so it applies its own adult rule and says so rather than pretending to quote a law.",
  };
}

/* -------------------------------------------------------------------------- */

/**
 * Why a character cannot file. Each carries the sentence a player should read;
 * none of them is a number the player is asked to beat.
 */
export type CandidacyBlockKind =
  | "no-sourced-office"
  | "below-game-adult-age"
  | "lives-elsewhere"
  | "already-a-candidate";

/**
 * The pack that governs a jurisdiction, or nothing.
 *
 * Derived from the place rather than passed in, because a caller that supplies
 * its own pack id can supply the wrong one. Asking the place is the only way to
 * make "Lexington-Fayette runs under Kentucky's General Assembly rules"
 * unsayable rather than merely discouraged.
 */
export function candidacyPackForJurisdiction(
  jurisdictionId: EntityId,
): CandidacyPack | null {
  const packId =
    lifePlaceByJurisdictionId(jurisdictionId)?.capabilities.candidacyPackId ??
    null;
  return packId === null ? null : candidacyPackById(packId);
}

export interface CandidacyBlock {
  readonly kind: CandidacyBlockKind;
  readonly reason: string;
}

export interface CandidacyEligibility {
  readonly eligible: boolean;
  readonly personId: EntityId;
  /** The pack the jurisdiction itself declares, if it declares one. */
  readonly pack: CandidacyPack | null;
  readonly office: ElectiveOfficeOption | null;
  readonly blocks: readonly CandidacyBlock[];
}

export interface CandidacyEligibilityInput {
  readonly personId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly officeKey: string;
  /** True when this person already holds an unfinished campaign. */
  readonly alreadyACandidate: boolean;
}

/**
 * Whether this character may stand, said in whole sentences.
 *
 * Every reason is either something the world records or something the game
 * openly admits is its own rule. None of them is a hidden threshold, and none
 * of them tells the player how close they came.
 */
export function candidacyEligibility(
  world: World,
  input: CandidacyEligibilityInput,
): CandidacyEligibility {
  const blocks: CandidacyBlock[] = [];
  const pack = candidacyPackForJurisdiction(input.jurisdictionId);
  const option =
    pack?.offices.find((candidate) => candidate.officeKey === input.officeKey) ??
    null;
  if (!option) {
    blocks.push({
      kind: "no-sourced-office",
      reason:
        "Nobody has written down which offices are elected here or who may stand for them, and the game will not borrow another state's rules to fill the gap.",
    });
  }

  const person = world.people[input.personId];
  if (!person) {
    throw new Error("Candidacy eligibility asked about somebody who is not in the world.");
  }
  const age = ageOnDate(person.birthDate, world.currentDate);
  if (age < GAME_ADULT_CANDIDACY_AGE) {
    blocks.push({
      kind: "below-game-adult-age",
      reason: `The game has not read this state's minimum age for the office, so it holds to its own adult rule and will not put anyone under ${GAME_ADULT_CANDIDACY_AGE} on a ballot.`,
    });
  }
  if (person.homeJurisdictionId !== input.jurisdictionId) {
    blocks.push({
      kind: "lives-elsewhere",
      reason:
        "This character does not live in the place holding the election, and the game has no sourced residency rule that would let them stand there anyway.",
    });
  }
  if (input.alreadyACandidate) {
    blocks.push({
      kind: "already-a-candidate",
      reason: "This character is already running for something.",
    });
  }

  return {
    eligible: blocks.length === 0,
    personId: input.personId,
    pack,
    office: option,
    blocks,
  };
}
