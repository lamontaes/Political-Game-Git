import { candidacyPackById, GAME_ADULT_CANDIDACY_AGE } from "./candidacy-packs";
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
  const packId =
    lifePlaceByJurisdictionId(jurisdictionId)?.capabilities.candidacyPackId ??
    null;
  return packId === null ? null : candidacyPackById(packId);
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
    pack?.offices.find(
      (candidate) => candidate.officeKey === input.officeKey,
    ) ?? null;
  if (!option) {
    blocks.push({
      kind: "no-sourced-office",
      reason:
        "Nobody has written down which offices are elected here or who may stand for them, and the game will not borrow another state's rules to fill the gap.",
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
