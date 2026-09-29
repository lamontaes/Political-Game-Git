import { stateCandidacyPack } from "../candidacy-packs";
import { addDays } from "../dates";
import {
  SENATE_SELECTION_OFFICE_KEY,
  enactedRuleChanges,
  ruleChangeInForce,
} from "../enacted-rule-changes";
import {
  stateLegislatureEstablished,
  stateLegislators,
} from "../nationwide-world/state-legislature-opening";
import type { IsoDate, World } from "../types";

/**
 * HOW A STATE'S U.S. SENATORS ARE CHOSEN.
 *
 * The real 2026 rule is the Seventeenth Amendment (ratified 1913): "The
 * Senate of the United States shall be composed of two Senators from each
 * State, elected by the people thereof." Before it, Article I, section 3 had
 * each state's legislature choose. A game can change the rule only by
 * amending the Constitution (`senate.selection` in
 * `enacted-rule-changes.ts`), and the amendment in force governs every state
 * alike.
 *
 * Where the legislatures choose, the game follows the federal law that
 * governed those elections, the Act of July 25, 1866 (ch. 245, 14 Stat.
 * 243): the legislature elects by a majority of all members of both houses
 * voting in joint assembly. Its rule on timing, the second Tuesday after
 * the legislature has notice of a vacancy, sets when an empty seat is
 * filled. The members vote with their party caucus, as senators were in
 * practice chosen, so the seat goes to the party holding a majority of the
 * joint assembly.
 *
 * NOT MODELED: an amendment that leaves the method to each state; each
 * house voting separately first (the 1866 act's first step); deadlocked
 * legislatures, which left seats empty for years before 1913; a
 * legislature out of session when a seat empties; and members crossing
 * their caucus.
 */

export type SenateSelectionMethod = "popular-vote" | "state-legislature";

export interface SenateSelectionRule {
  readonly method: SenateSelectionMethod;
  /** The law the rule comes from. */
  readonly basis: string;
}

const SEVENTEENTH_AMENDMENT = "U.S. Const. amend. XVII";

/** The rule for choosing senators in force on `date`. */
export function senateSelectionRuleAt(
  world: World,
  date: IsoDate,
): SenateSelectionRule {
  // Cheap guard: most worlds never amend the Constitution.
  if (
    !(world.history.constitutionalMeasures ?? []).some(
      (measure) =>
        measure.ruleDelta.kind === "rule-field" &&
        measure.ruleDelta.field === "senate.selection",
    )
  )
    return { method: "popular-vote", basis: SEVENTEENTH_AMENDMENT };
  const governing = ruleChangeInForce(
    enactedRuleChanges(world).filter(
      (change) =>
        change.field === "senate.selection" &&
        change.officeKey === SENATE_SELECTION_OFFICE_KEY &&
        change.operativeAt <= date,
    ),
  );
  if (!governing || typeof governing.value !== "string")
    return { method: "popular-vote", basis: SEVENTEENTH_AMENDMENT };
  return {
    method: governing.value as SenateSelectionMethod,
    basis: governing.designation,
  };
}

export interface LegislatureMajority {
  /** The party holding a majority of the joint assembly. */
  readonly party: string;
  readonly partyMembers: number;
  readonly sittingMembers: number;
}

/**
 * The party holding a majority of all sitting members of a state's
 * legislature, both houses together, or null when no legislature is seated
 * there or no party holds a majority.
 */
export function stateLegislatureMajority(
  world: World,
  stateUsps: string,
): LegislatureMajority | null {
  const pack = stateCandidacyPack(`US-${stateUsps}`);
  if (!pack || !stateLegislatureEstablished(world, pack.packId)) return null;
  const members = stateLegislators(world, pack.packId);
  const counts = new Map<string, number>();
  for (const member of members)
    if (member.party)
      counts.set(member.party, (counts.get(member.party) ?? 0) + 1);
  for (const [party, count] of counts)
    if (count * 2 > members.length)
      return {
        party,
        partyMembers: count,
        sittingMembers: members.length,
      };
  return null;
}

/**
 * LAW (Act of July 25, 1866, sec. 2): a legislature fills a vacancy on the
 * second Tuesday after it has notice of it.
 */
export function legislativeSenateElectionDay(noticeDate: IsoDate): IsoDate {
  const weekday = new Date(`${noticeDate}T00:00:00Z`).getUTCDay();
  const toTuesday = (2 - weekday + 7) % 7 || 7;
  return addDays(noticeDate, toTuesday + 7);
}
