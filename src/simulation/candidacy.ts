import {
  candidacyPackById,
  stateCandidacyPack,
  GAME_ADULT_CANDIDACY_AGE,
} from "./candidacy-packs";
import type { CandidacyPack, ElectiveOfficeOption } from "./candidacy-packs";
import { ageOnDate } from "./dates";
import { lifePlaceByJurisdictionId } from "./life-places";
import type { EntityId, World } from "./types";

/**
 * Whether a particular character may stand, and where.
 *
 * Which offices exist at all is next door in `candidacy-packs.ts`, which is a
 * leaf so the world's integrity pass can reach it without closing a cycle. This
 * half is free to know about places, because nothing inside the world module's
 * own import graph needs it — and knowing about places is the whole point:
 * which ballot somebody can be on is a fact about where they live.
 *
 * The refusals below are of two kinds and the difference is stated rather than
 * blurred. What a jurisdiction requires of a candidate is `unknown` in every
 * case, because no accepted source in this repository says. What the game
 * itself will not do is the adult rule, and a character turned away by it is
 * told that it was the game that turned them away.
 */

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
  return candidacyAuthority(jurisdictionId).pack;
}

/** Whose authority an office here rests on, and how far it reaches. */
export type CandidacyAuthorityScope = "local" | "state";

export interface CandidacyAuthority {
  /** The pack that governs, or null when nothing sourced governs here. */
  readonly pack: CandidacyPack | null;
  /**
   * Whether the pack is the place's own or the state's above it. Null when
   * there is no pack at all.
   */
  readonly scope: CandidacyAuthorityScope | null;
  /**
   * True when this place's OWN offices are unsourced. Independent of the
   * state: a Lexington resident can stand for a Kentucky seat while the game
   * still knows nothing about Lexington's council, and both are true at once.
   */
  readonly localOfficesUnsourced: boolean;
  /** The state above this place, as the packs key it. */
  readonly stateJurisdictionKey: string | null;
}

/**
 * Which pack governs standing for office here, and on whose authority.
 *
 * A place is asked twice, in this order, because the two questions are
 * different: what does this place declare on its own, and what does the state
 * it sits inside declare? Living in a city has never put anybody outside their
 * state, so a locality with no offices of its own still reaches its state's.
 *
 * What this deliberately is NOT is a search for the nearest usable pack. The
 * state is followed by its declared key and nothing else, so Lexington reaches
 * Kentucky and reaches nowhere else. A place in a state with no accepted pack
 * gets null, exactly as before.
 */
export function candidacyAuthority(
  jurisdictionId: EntityId,
): CandidacyAuthority {
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  const stateJurisdictionKey = place?.stateJurisdictionKey ?? null;
  const ownPackId = place?.capabilities.candidacyPackId ?? null;
  const ownPack = ownPackId === null ? null : candidacyPackById(ownPackId);
  if (ownPack) {
    return {
      pack: ownPack,
      // An authored state entry declaring its own pack IS the state speaking.
      scope: place?.scope === "locality" ? "local" : "state",
      localOfficesUnsourced: place?.scope === "locality" ? false : true,
      stateJurisdictionKey,
    };
  }
  const statePack = stateCandidacyPack(stateJurisdictionKey);
  return {
    pack: statePack,
    scope: statePack === null ? null : "state",
    localOfficesUnsourced: true,
    stateJurisdictionKey,
  };
}

/**
 * Why a character cannot file. Each carries the sentence a player should read;
 * none of them is a number the player is asked to beat.
 */
export type CandidacyBlockKind =
  | "no-sourced-office"
  | "below-game-adult-age"
  | "lives-elsewhere"
  | "already-a-candidate";

export interface CandidacyBlock {
  readonly kind: CandidacyBlockKind;
  readonly reason: string;
}

/**
 * Why there is nothing to stand for, in the words that are actually true here.
 *
 * The old single sentence said "nobody has written down which offices are
 * elected here" to a character living in a state whose General Assembly the
 * game has read in full. That was the owner-play failure: a true statement
 * about Lexington's council delivered as a false one about Kentucky.
 */
function noSourcedOfficeReason(authority: CandidacyAuthority): string {
  if (authority.stateJurisdictionKey === null) {
    return "The game has not read any elected office for this place, and it will not borrow another jurisdiction's rules to fill the gap.";
  }
  if (authority.pack === null) {
    return "The game has not read this state's elected offices yet, so there is nothing to stand for here. It will not borrow another state's rules to fill the gap.";
  }
  // A pack governs; the office asked for simply is not one of its seats.
  return "That office is not one the accepted rules for this place establish, so the game will not put it on a ballot.";
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
  const authority = candidacyAuthority(input.jurisdictionId);
  const pack = authority.pack;
  const option =
    pack?.offices.find(
      (candidate) => candidate.officeKey === input.officeKey,
    ) ?? null;
  if (!option) {
    // Two different absences, said as two different sentences. A state the
    // game has never read is not the same as a city whose council it has never
    // read, and telling a Kentuckian the first when only the second is true is
    // the defect this replaced.
    blocks.push({
      kind: "no-sourced-office",
      reason: noSourcedOfficeReason(authority),
    });
  }

  const person = world.people[input.personId];
  if (!person) {
    throw new Error(
      "Candidacy eligibility asked about somebody who is not in the world.",
    );
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
