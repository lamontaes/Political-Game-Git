import { LEGISLATIVE_RULE_PACKS } from "./legislature-rule-packs";
import { unknownRule } from "./legislature-rules";
import type { LegislativeRulePack, RuleValue } from "./legislature-rules";
import type { ElectiveOfficeRef } from "./types";

/**
 * Which offices exist to be run for, and on whose authority.
 *
 * A leaf on purpose. This module reads the accepted legislative rule packs and
 * nothing else, so the integrity pass — which runs inside `world.ts` — can
 * check that a campaign cites a real office without dragging the place registry
 * and the scenario builder into a cycle around the world module. Who may stand,
 * and where, lives next door in `candidacy.ts`, which is free to know about
 * places because nothing in the world's own import graph needs it.
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
  /** The chamber, by the name the accepted pack gives it. */
  readonly chamberName: string;
  /** Members elected to the chamber, as the accepted pack records it. */
  readonly seats: number;
  /**
   * Where the seat count comes from: the accepted rule pack, by name.
   *
   * Deliberately not a `RuleSourceRef`. The packs cite instruments for the
   * procedural rules they were compiled for, and none of those citations
   * establishes the size of the chamber — attaching the nearest one to this
   * number would be a false attribution, which is the exact failure this lane
   * exists to avoid. So the claim made here is the true and smaller one: the
   * accepted pack records this many seats, and it is named so anybody can go
   * and check it.
   */
  readonly recordedBy: { readonly packId: string; readonly packName: string };
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

const NO_MEMBERSHIP_INSTRUMENT =
  "The seat count is the accepted rule pack's own recorded value. No instrument establishing the size of the chamber, or who may sit in it, has been read into this repository.";

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
      chamberName: chamber.name,
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
      recordedBy: { packId: pack.packId, packName: pack.displayName },
      qualification: officeQualification(),
      unresolvedGaps: [
        NO_QUALIFICATION_CORPUS,
        NO_MEMBERSHIP_INSTRUMENT,
        NO_DISTRICT_GEOGRAPHY,
      ],
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

const CANDIDACY_PACKS: readonly CandidacyPack[] = LEGISLATIVE_RULE_PACKS.map(
  candidacyPackFromRulePack,
);

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
