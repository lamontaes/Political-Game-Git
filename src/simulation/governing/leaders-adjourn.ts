import { yearOf } from "../dates";
import {
  measureActions,
  measurePosition,
  requireMeasure,
} from "../legislation";
import { rulePackById } from "../legislature-rule-packs";
import type { LegislativeRulePack } from "../legislature-rules";
import type { EntityId, LegislativeMeasureRecord, World } from "../types";
import { seatedChamberForPack } from "./chamber-votes";
import {
  recordedSessionAdjournment,
  recordSessionAdjournment,
  sessionLegalLimit,
} from "./session-adjournments";

/**
 * LEADERS ADJOURN — a state legislature ends its regular session on the day
 * its leaders decide to, not on the last day its law allows (Claude CTO
 * ruling, September 29, 2026, 12:54 a.m.). The leaders are each chamber's
 * majority caucus. They weigh three things the record holds:
 *
 * 1. the budget: the session has passed an appropriation through both
 *    chambers, or it has become law;
 * 2. pending business: no bill their own caucus carries is still before the
 *    chambers;
 * 3. their own choice: bills other members carry do not hold the session
 *    open, and die with it where the state's rules say pending bills do.
 *
 * All three are read from recorded measures; nothing is drawn. The legal
 * limit still binds: past it the session is over whether or not they chose.
 * A legislature with no limit of its own, full-time or not, follows the same
 * rule. Where a chamber is not seated with real people there are no leaders
 * to decide, and the session runs to its limit.
 *
 * GAME ASSUMPTION: a session that passes no budget sits until its limit.
 * States that budget for two years at once pass none in the second year, so
 * their second session runs to the limit.
 */

/** Phases a bill reaches only after both chambers passed it. */
export const PAST_THE_CHAMBERS: ReadonlySet<string> = new Set([
  "awaiting-enrollment",
  "awaiting-presentation",
  "awaiting-executive",
  "awaiting-enactment",
]);

/** Whether the session's end stops a bill in this phase. */
export function adjournmentStopsPhase(phase: string): boolean {
  return !PAST_THE_CHAMBERS.has(phase);
}

/** The calendar year of the session a measure was introduced in. */
export function measureSessionYear(world: World, measureId: EntityId): number {
  const first = measureActions(world, measureId)[0];
  return yearOf(first?.occurredAt ?? world.currentDate);
}

/**
 * Who leads each chamber: the members of its majority caucus, or "everyone"
 * where no caucus holds a majority. Null where a chamber is not seated.
 */
export type SessionLeaders = (
  world: World,
  pack: LegislativeRulePack,
) => ReadonlyMap<string, ReadonlySet<EntityId> | "everyone"> | null;

/**
 * Each chamber's leaders are its largest caucus. A chamber split evenly has
 * no majority to set its calendar, so every member's bill holds it.
 */
export const seatedLeaders: SessionLeaders = (world, pack) => {
  const leadersOf = new Map<string, ReadonlySet<EntityId> | "everyone">();
  for (const chamber of pack.chambers) {
    const seated = seatedChamberForPack(
      world,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    );
    if (!seated || seated.body.members.length === 0) return null;
    const sizes = new Map<string, number>();
    for (const member of seated.body.members)
      sizes.set(member.caucusLabel, (sizes.get(member.caucusLabel) ?? 0) + 1);
    const ranked = [...sizes.values()].sort((l, r) => r - l);
    if (ranked.length > 1 && ranked[0] === ranked[1]) {
      leadersOf.set(chamber.chamberKey, "everyone");
      continue;
    }
    const largest = [...sizes.entries()].find(
      ([, size]) => size === ranked[0],
    )![0];
    leadersOf.set(
      chamber.chamberKey,
      new Set(
        seated.body.members.flatMap((member) =>
          member.caucusLabel === largest && member.personId
            ? [member.personId]
            : [],
        ),
      ),
    );
  }
  return leadersOf;
};

/**
 * After a step on `measureId`, whether its legislature's leaders adjourn the
 * session today, and if so the World with that recorded.
 */
export function considerSessionAdjournment(
  world: World,
  measureId: EntityId,
  leaders: SessionLeaders = seatedLeaders,
): World {
  const measure = requireMeasure(world, measureId);
  const pack = rulePackById(measure.rulePackId);
  if (!/^US-[A-Z]{2}$/.test(pack.jurisdictionKey)) return world;
  const year = yearOf(world.currentDate);
  if (measureSessionYear(world, measureId) !== year) return world;
  if (recordedSessionAdjournment(world, pack.packId, year)) return world;
  const limit = sessionLegalLimit(pack, year);
  if (limit !== null && world.currentDate > limit) return world;

  // Filtered on each record's own introduction date: replaying every
  // measure's actions on every step grew with the square of a long world's
  // bills.
  const session = (world.history.legislativeMeasures ?? []).filter(
    (candidate) =>
      candidate.rulePackId === pack.packId &&
      yearOf(candidate.introducedAt) === year,
  );
  const budget = session.find((candidate) => {
    if (candidate.subjectClass !== "appropriation") return false;
    const phase = measurePosition(world, candidate.id).phase;
    return phase === "enacted" || PAST_THE_CHAMBERS.has(phase);
  });
  if (!budget) return world;

  const leadersOf = leaders(world, pack);
  if (!leadersOf) return world;

  const pending = session.filter((candidate) => {
    const position = measurePosition(world, candidate.id);
    return !position.terminal && adjournmentStopsPhase(position.phase);
  });
  const carriedByLeaders = (candidate: LegislativeMeasureRecord): boolean => {
    const leaders = leadersOf.get(candidate.originChamberKey);
    if (leaders === undefined || leaders === "everyone") return true;
    return (
      candidate.sponsorPersonId !== null &&
      leaders.has(candidate.sponsorPersonId)
    );
  };
  if (pending.some(carriedByLeaders)) return world;

  const budgetPhase = measurePosition(world, budget.id).phase;
  const passed =
    budgetPhase === "enacted"
      ? `${budget.designation} became law`
      : `both chambers passed ${budget.designation}`;
  const left = pending.length
    ? ` ${pending.length} ${pending.length === 1 ? "bill" : "bills"} other members carried ${pending.length === 1 ? "was" : "were"} still pending, and the leaders did not wait for ${pending.length === 1 ? "it" : "them"}.`
    : "";
  return recordSessionAdjournment(world, {
    rulePackId: pack.packId,
    legislatureName: pack.displayName,
    jurisdictionId: measure.jurisdictionId,
    sessionYear: year,
    budgetMeasureId: budget.id,
    leftPendingMeasureIds: pending.map((candidate) => candidate.id),
    rationale: `The leaders adjourned the session once ${passed} and no bill their own caucus carried was still before the chambers.${left}`,
  });
}
