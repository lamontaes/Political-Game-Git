import {
  majorityOf,
  unknownRule,
  type CommitteeRule,
  type LegislativeRulePack,
  type RuleSourceRef,
} from "./legislature-rules";

export const STANDING_COMMITTEE_RULE_VERSION = "standing-committee/v1";
/** The citation the researched-pack check admits under a chamber's committees. */
export const STANDING_COMMITTEE_CITATION = "Standing committee (stand-in)";

/**
 * PLACEHOLDER until research question
 * `legislative-committees-and-assignment-by-chamber` is answered for this
 * state: one standing committee of about a sixth of the chamber's seats,
 * between five and twenty-five, reporting on a majority of its members. It is
 * the rule a generated legislature profile uses.
 *
 * A researched state whose committees were never read gets it too. Without a
 * committee no bill in that state could be referred, so none ever became law
 * (Minnesota, Illinois, Maryland, Missouri, Nevada and Ohio). It is labeled a
 * game rule, not the state's law, and the real committee list replaces it when
 * the research is read.
 */
export function standingCommittee(
  chamberKey: string,
  /** Null where the chamber's seat count is not known: the smallest panel. */
  seats: number | null,
  stateName: string,
): CommitteeRule {
  const source: RuleSourceRef = {
    authority: "game-profile",
    citation: STANDING_COMMITTEE_CITATION,
    sourceTitle: `Our Civic Duty standing rule (${STANDING_COMMITTEE_RULE_VERSION})`,
    sourceUrl: null,
    retrievedAt: null,
    verification: "game-profile",
    note: `The game's standing rule until ${stateName}'s committee rules are read: one standing committee hears every bill and reports it on a majority of its members. This is not a reading of ${stateName}'s law.`,
  };
  return {
    committeeKey: `${chamberKey}-standing`,
    name: "Standing committee",
    appointedMembers:
      seats === null ? 5 : Math.max(5, Math.min(25, Math.round(seats / 6))),
    membershipBasis: "scenario-fixture",
    reportThreshold: majorityOf(
      "committee-members-appointed",
      "a majority of the committee's membership",
      source,
    ),
    chairMayDeclineToHear: unknownRule(
      `Whether a committee chair in ${stateName} may decline to take a bill up is set by the chamber's own rules, which have not been read.`,
    ),
    publicHearingNotice: unknownRule(
      `How much notice a committee hearing in ${stateName} takes is set by the chamber's own rules, which have not been read.`,
    ),
  };
}

const STATE_NAMES: Readonly<Record<string, string>> = {
  "us-mn-legislature-v1": "Minnesota",
  "us-il-general-assembly-v1": "Illinois",
  "us-md-general-assembly-v1": "Maryland",
  "us-mo-general-assembly-v1": "Missouri",
  "us-nv-legislature-v1": "Nevada",
  "us-oh-general-assembly-v1": "Ohio",
};

const derived = new WeakMap<LegislativeRulePack, LegislativeRulePack>();

/**
 * The pack the game plays: the researched pack as read, with a standing
 * committee stood in for each chamber whose committees were never read. The
 * researched record itself is unchanged, and a chamber with any committee on
 * record keeps exactly its own.
 */
export function withCommitteeStandIns(
  pack: LegislativeRulePack,
): LegislativeRulePack {
  if (pack.chambers.every((chamber) => chamber.committees.length > 0))
    return pack;
  let played = derived.get(pack);
  if (!played) {
    const stateName = STATE_NAMES[pack.packId] ?? pack.displayName;
    played = {
      ...pack,
      chambers: pack.chambers.map((chamber) =>
        chamber.committees.length > 0
          ? chamber
          : {
              ...chamber,
              committees: [
                standingCommittee(
                  chamber.chamberKey,
                  chamber.seats.kind === "known" ? chamber.seats.value : null,
                  stateName,
                ),
              ],
            },
      ),
    };
    derived.set(pack, played);
  }
  return played;
}
