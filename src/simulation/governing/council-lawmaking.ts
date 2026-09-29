import { addDays } from "../dates";
import { STATUTE_EFFECTIVE_DEFAULT_DAYS } from "../enacted-rule-changes";
import { measurePosition } from "../legislation";
import { personName } from "../people";
import type {
  EntityId,
  IsoDate,
  LegislativeMeasureRecord,
  LegislativeVoteDisposition,
  PolicyPropositionDefinition,
  World,
} from "../types";
import { decideChamberVote, publicPartyOf } from "./chamber-votes";
import { outranks } from "../law-hierarchy";
import { lawInForce, ownLawLevel } from "./law-in-force";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "./officeholder-principles";

/**
 * COUNCIL LAWMAKING (Build 25, CTO ruling of September 29, 12:24 a.m.).
 *
 * A town council and the Council of the District of Columbia make local law
 * the way a legislature makes state law. Before this, a randomly drawn member
 * filed an ordinance on a random question, a coin flip picked its answer, and
 * each member's ballot was a hash (two in three yes in a town, one in two in
 * the District). Now:
 *
 * 1. Who files, and what. A member files an ordinance on the question their
 *    own principles press hardest (`officeholder-principles.ts`), where the
 *    town's law in force does not already say what they want and no
 *    ordinance on it is moving: to enact what they support, or to repeal a
 *    law in force they oppose. This is the state member agenda's rule
 *    (`member-agenda.ts`), read against the town's own law.
 * 2. How members vote. Every member answers through the legislatures' vote
 *    engine (`decideChamberVote`): their principles, what they said on the
 *    record, a cue from whoever carries the ordinance, and, for a council,
 *    the voters of the town (`constituentsConsideration`).
 *
 * The player is never decided for: a player who sits on the council files
 * nothing through this and is recorded absent on a vote they did not cast.
 */

export const COUNCIL_LAWMAKING_VERSION = "council-lawmaking/v1";

/**
 * GAME ASSUMPTION, shared with the state member agenda (`member-agenda.ts`):
 * the least summed principle weight that moves a member to file.
 */
const FILING_THRESHOLD = 3;

/**
 * GAME ASSUMPTION (Build 25), hand-set until the research on how often a
 * council takes a question back up is read: a member does not refile a
 * question the same body voted down in the past year.
 */
const REFILE_AFTER_DAYS = 365;

/**
 * The reason a member with no view and no cue on an ordinance votes for it.
 * Councils vote together far more than legislatures: 87 percent of recorded
 * votes in California city councils were unanimous, against 10 percent of
 * votes in Congress (Participation and Representation in Local Government
 * Speech, arXiv 2604.21202, 2026); Austin's council agreed more than 95
 * percent of the time in 2025 (Austin American-Statesman), Boulder's more
 * than 70 percent (Boulder Reporting Lab, 2026). The most common real rule
 * for a member who has nothing at stake is to go along with the item before
 * the body. Only a member with no view, no record and no cue defers; one who
 * has any of those decides from them.
 */
export const COUNCIL_DEFERENCE_REASON = "member:council-deference";

export const COUNCIL_VOTE_NOTE = `${COUNCIL_LAWMAKING_VERSION}: each member decided their own ballot from their principles, their record, the ordinance's sponsor and the town's voters.`;

export interface CouncilMember {
  readonly personId: EntityId;
}

export interface CouncilFiling {
  readonly sponsorPersonId: EntityId;
  readonly proposition: PolicyPropositionDefinition;
  readonly answer: "yes" | "no";
  /** The member's summed principle weight on the question: why they filed. */
  readonly leaning: number;
}

/** Whether an ordinance on this question is still moving before the body. */
function moving(
  world: World,
  measures: readonly LegislativeMeasureRecord[],
  propositionId: EntityId,
): boolean {
  return measures.some(
    (measure) =>
      (measure.propositionIds ?? []).includes(propositionId) &&
      !measurePosition(world, measure.id).terminal,
  );
}

/**
 * Whether the body enacted an ordinance on this question that has not taken
 * effect yet: a member does not refile what is only waiting for its day.
 */
function awaitingEffect(
  world: World,
  measures: readonly LegislativeMeasureRecord[],
  propositionId: EntityId,
): boolean {
  const ids = new Set(
    measures
      .filter((measure) =>
        (measure.propositionIds ?? []).includes(propositionId),
      )
      .map((measure) => measure.id),
  );
  return (world.history.legislativeEnactments ?? []).some(
    (enactment) =>
      ids.has(enactment.measureId) &&
      // The same operative date the law in force reads (`law-in-force.ts`).
      (enactment.effectiveAt ??
        addDays(enactment.resolvedAt, STATUTE_EFFECTIVE_DEFAULT_DAYS)) >
        world.currentDate,
  );
}

/** Whether the body voted an ordinance on this question down since `since`. */
function recentlyDefeated(
  world: World,
  measures: readonly LegislativeMeasureRecord[],
  propositionId: EntityId,
  since: IsoDate,
): boolean {
  return measures.some(
    (measure) =>
      (measure.propositionIds ?? []).includes(propositionId) &&
      measurePosition(world, measure.id).phase === "failed" &&
      (world.history.legislativeVotes ?? []).some(
        (vote) =>
          vote.measureId === measure.id &&
          vote.outcome !== "passed" &&
          vote.takenAt >= since,
      ),
  );
}

/**
 * The ordinances members file at one meeting: at most one each, on the
 * question their principles press hardest, where the town's law does not
 * already say what they want. Where two members press the same question, the
 * one with the stronger stake carries it, and the other files on their next
 * question or not at all; nothing is drawn. Empty when no member leans hard
 * enough on anything open.
 *
 * HARDWIRED, until the council seats carry seniority: between two members
 * with the same stake in the same question, the one listed first on the body
 * carries it.
 *
 * Call `ensureOfficeholderPrinciples` for the members first.
 */
export function councilFilings(
  world: World,
  input: {
    readonly stableKey: string;
    readonly jurisdictionId: EntityId;
    readonly members: readonly CouncilMember[];
    readonly questions: readonly PolicyPropositionDefinition[];
    /** Every ordinance this body has had before it. */
    readonly measures: readonly LegislativeMeasureRecord[];
    readonly playerPersonId: EntityId | null;
  },
): readonly CouncilFiling[] {
  const members = input.members.filter(
    (member) => member.personId !== input.playerPersonId,
  );
  const since = addDays(world.currentDate, -REFILE_AFTER_DAYS);
  const own = ownLawLevel(input.jurisdictionId);
  const closed = new Set<EntityId>();
  for (const proposition of input.questions)
    if (
      moving(world, input.measures, proposition.id) ||
      recentlyDefeated(world, input.measures, proposition.id, since) ||
      awaitingEffect(world, input.measures, proposition.id)
    )
      closed.add(proposition.id);
  // Every filing any member would make, before anyone claims a question.
  const wanted: { filing: CouncilFiling; seat: number }[] = [];
  for (const proposition of input.questions) {
    if (closed.has(proposition.id)) continue;
    let law: ReturnType<typeof lawInForce> | undefined;
    members.forEach((member, seat) => {
      const leaning = principledLeaning(
        world,
        member.personId,
        proposition.id,
      ).score;
      if (Math.abs(leaning) < FILING_THRESHOLD) return;
      if (law === undefined)
        law = lawInForce(world, input.jurisdictionId, proposition.id);
      // Support files to enact unless the law already says yes; opposition
      // files only a repeal of a law that says yes.
      const answer: "yes" | "no" | null =
        leaning > 0
          ? law?.answer === "yes"
            ? null
            : "yes"
          : law?.answer === "yes"
            ? "no"
            : null;
      if (!answer) return;
      // A higher law this body cannot override is no reason to file: the
      // ordinance would be on the record and govern nothing. A state "no"
      // that leaves its localities free is not such a law.
      if (law && outranks(law.level, own) && law.preempts !== false) return;
      wanted.push({
        filing: {
          sponsorPersonId: member.personId,
          proposition,
          answer,
          leaning,
        },
        seat,
      });
    });
  }
  // The strongest stakes are claimed first.
  wanted.sort(
    (left, right) =>
      Math.abs(right.filing.leaning) - Math.abs(left.filing.leaning) ||
      left.seat - right.seat,
  );
  const filed = new Set<EntityId>();
  const filings: CouncilFiling[] = [];
  for (const { filing } of wanted) {
    if (filed.has(filing.sponsorPersonId)) continue;
    if (closed.has(filing.proposition.id)) continue;
    filed.add(filing.sponsorPersonId);
    closed.add(filing.proposition.id);
    filings.push(filing);
  }
  return filings;
}

/** Ensures every member holds principles before anything is filed or voted. */
export function ensureCouncilPrinciples(
  world: World,
  members: readonly CouncilMember[],
): World {
  return ensureOfficeholderPrinciples(
    world,
    members.map((member) => member.personId),
  );
}

/**
 * Every seated member's ballot on one council question, through the
 * legislatures' vote engine with the town's voters as the members'
 * constituents.
 */
export function decideCouncilVote(
  world: World,
  input: {
    readonly stableKey: string;
    readonly measureId: EntityId;
    readonly jurisdictionId: EntityId;
    readonly members: readonly CouncilMember[];
    readonly playerPersonId: EntityId | null;
    readonly questionLabel: string;
    /** The mayor, whose known position every member hears. */
    readonly executivePersonId: EntityId | null;
    /** Members are elected without party labels (`body-partisanship.ts`). */
    readonly nonpartisan: boolean;
  },
): readonly LegislativeVoteDisposition[] {
  const decided = decideChamberVote(world, {
    stableKey: input.stableKey,
    question: {
      question: {
        measureId: input.measureId,
        purpose: "floor-stage",
        forumKey: "council",
        floorStageKey: null,
        amendmentStableKey: null,
        provisionKey: null,
      },
      questionLabel: input.questionLabel,
    },
    members: input.members.map((member, index) => ({
      memberKey: `council:${index + 1}`,
      name: personName(world.people[member.personId]!),
      personId: member.personId,
      caucusLabel: publicPartyOf(world, member.personId) ?? "No party",
    })),
    playerPersonId: input.playerPersonId,
    playerBallot: null,
    constituencyId: input.jurisdictionId,
    executivePersonId: input.executivePersonId,
    nonpartisan: input.nonpartisan,
  });
  // A member with nothing of their own to weigh on the question goes along
  // with the ordinance that reached the floor, the way councils do.
  return decided.map((row) =>
    row.disposition === "present-not-voting" &&
    row.reason === "member:no-reason" &&
    row.personId !== input.playerPersonId
      ? { ...row, disposition: "yea", reason: COUNCIL_DEFERENCE_REASON }
      : row,
  );
}
