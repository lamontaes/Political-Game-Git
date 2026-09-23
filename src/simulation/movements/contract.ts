/**
 * Movements: the contract.
 *
 * The owner asked (2026-09-23, 12:19 a.m. ET) whether civil rights is in the
 * game, whether someone who holds no office can lead, and whether the player
 * can take part. Before this there were unrest events per state with no cause,
 * no leader and no end, and three mass migration waves with no leader at all.
 *
 * A movement is people in one state organized around one demand: a policy
 * question in the world's catalog and the answer they want. It grows out of
 * a grievance the world recorded, never from a timer:
 *
 * 1. Worker movements: lasting unrest in a state whose anger came mostly from
 *    rising unemployment. The demand is a question the catalog says is
 *    consistent with worker protection and the state has not already enacted.
 * 2. Rights movements: a law the state enacted that the catalog says runs
 *    against equal treatment or equal opportunity. The demand is to reverse
 *    it. This is the one recorded form of unequal treatment the world holds;
 *    unequal treatment in daily life (who is hired, who is stopped) is not
 *    recorded anywhere, so it founds nothing yet (`MOVEMENT_SEAMS`).
 * 3. Founded: a person, the player included, starts one on any question.
 *
 * A movement has a leader, who may hold no office, and members. It grows with
 * the anger in its state and with its leader, marches in public when strong,
 * draws backlash that holds it back, and ends when a law answering its demand
 * is enacted (a win) or when it dwindles (it fades). A leader who dies is
 * succeeded.
 *
 * Every number in `BLANKET_MOVEMENTS` is a placeholder chosen so the mechanism
 * is visible, never a researched value. Filed with ChatGPT as
 * `movements-how-they-form-spread-and-win`.
 */

import type { EntityId, IsoDate } from "../types";

export const MOVEMENTS_CONTRACT_VERSION = "movements/v1" as const;

export const MOVEMENT_FOUNDED_EVENT = "movement.founded";
export const MOVEMENT_MARCH_EVENT = "movement.march";
export const MOVEMENT_BACKLASH_EVENT = "movement.backlash";
export const MOVEMENT_LEADER_EVENT = "movement.leader";
export const MOVEMENT_WON_EVENT = "movement.won";
export const MOVEMENT_FADED_EVENT = "movement.faded";
export const MOVEMENT_JOINED_EVENT = "movement.joined";
export const MOVEMENT_LEFT_EVENT = "movement.left";
export const MOVEMENT_OPPOSED_EVENT = "movement.opposed";
export const MOVEMENT_STATEMENT_EVENT = "movement.statement";

export type MovementCause = "worker" | "rights" | "founded";

export type MovementPhase = "organizing" | "marching" | "won" | "faded";

export type MovementRoleKind = "leader" | "member" | "opponent";

/** One person's part in a movement over a span. Append-only. */
export interface MovementRole {
  readonly personId: EntityId;
  readonly role: MovementRoleKind;
  readonly since: IsoDate;
  /** When they stopped: left, died, or handed over the lead. */
  readonly until: IsoDate | null;
}

export type MovementStatementStance = "support" | "condemn" | "calm";

export interface Movement {
  /** Stable identity, also the stem of every event it records. */
  readonly key: string;
  readonly stateKey: string;
  readonly jurisdictionId: EntityId;
  readonly cause: MovementCause;
  /** The question in the world's policy catalog, and the answer wanted. */
  readonly propositionId: EntityId;
  readonly answer: "yes" | "no";
  /** What founded it: unrest events, the enacted law, or the founder. */
  readonly evidenceIds: readonly EntityId[];
  readonly foundedAt: IsoDate;
  /** Pressure quarter it was founded in; 0 when founded between quarters. */
  readonly foundedQuarter: number;
  readonly phase: MovementPhase;
  /** How much of a force it is, from 0 to 1. */
  readonly strength: number;
  /** Organized opposition to it, from 0 to 1. */
  readonly backlash: number;
  readonly marches: number;
  readonly roles: readonly MovementRole[];
  /** The last pressure quarter this movement was stepped in. */
  readonly lastQuarter: number;
  readonly endedAt: IsoDate | null;
  /** The enacted measure that answered its demand, when it won. */
  readonly wonByMeasureId: EntityId | null;
}

/** Optional on the world: a save written before movements has none. */
export interface MovementStore {
  readonly contractVersion: typeof MOVEMENTS_CONTRACT_VERSION;
  readonly movements: readonly Movement[];
}

/** BLANKET placeholders; see the file comment. None is researched. */
export const BLANKET_MOVEMENTS = Object.freeze({
  /** Share of a lasting-unrest state's anger that must come from jobs. */
  workerAngerShare: 0.5,
  /** Chance per unit of anger over the unrest line that a worker movement forms. */
  workerFoundPerExcess: 1,
  /** Chance each quarter that a law against equal treatment founds a movement. */
  rightsFoundBase: 0.15,
  /** Added chance per unit of the state's anger. */
  rightsFoundPerAnger: 0.5,
  /** Strength a movement starts with. */
  startStrength: 0.1,
  /** Growth each quarter with a leader, before anger and backlash. */
  ledGrowth: 0.04,
  /** Growth each quarter with no leader: it can still dwindle or hold. */
  leaderlessGrowth: -0.03,
  /** Added growth per unit of anger in the state. */
  growthPerAnger: 0.2,
  /** Growth each member who is a person in the world adds. */
  growthPerMember: 0.02,
  /** How much of the backlash comes off growth each quarter. */
  backlashDrag: 0.3,
  /** Strength at or over which it can march. */
  marchLine: 0.2,
  /** Chance of a march per unit of strength, each quarter. */
  marchPerStrength: 0.8,
  /** Backlash a march adds, per unit of the movement's strength. */
  backlashPerMarch: 0.15,
  /** Backlash each opponent who is a person in the world adds each quarter. */
  backlashPerOpponent: 0.03,
  /** Share of backlash that passes each quarter. */
  backlashFade: 0.2,
  /** Backlash at or over which a counter-rally is recorded. */
  backlashEventLine: 0.25,
  /** Strength a movement gains when its leader dies. */
  leaderDeathRally: 0.1,
  /** Under this strength, after `fadeAfterQuarters`, it fades. */
  fadeLine: 0.03,
  fadeAfterQuarters: 4,
  /** What a public statement moves. */
  statement: { support: 0.05, condemn: 0.05, calm: 0.05 },
  /** No chance here ever reaches certainty. */
  chanceCap: 0.9,
  /** A leader is an adult at least this old. */
  leaderMinAge: 18,
});

export type MovementSeamStatus = "built" | "not-built";

export interface MovementSeam {
  readonly key: string;
  readonly connects: string;
  readonly status: MovementSeamStatus;
  readonly rule: string;
  readonly where: string;
}

/** Every cause and effect, built or not, with the rule followed meanwhile. */
export const MOVEMENT_SEAMS: readonly MovementSeam[] = [
  {
    key: "cause-jobs-unrest",
    connects: "Lasting unrest driven by people losing work.",
    status: "built",
    rule: "BLANKET: unrest this quarter and in a recent one, with most of the state's anger from rising unemployment, can found a worker movement.",
    where: "src/simulation/movements/step.ts",
  },
  {
    key: "cause-unequal-law",
    connects: "A law that takes away equal treatment or equal opportunity.",
    status: "built",
    rule: "BLANKET: an enacted state law the catalog says runs against equal treatment or equal opportunity can found a movement to reverse it, likelier while anger is high.",
    where: "src/simulation/movements/step.ts",
  },
  {
    key: "cause-unequal-treatment",
    connects:
      "Unequal treatment in daily life: who is hired, housed, stopped or turned away.",
    status: "not-built",
    rule: "Founds nothing. The world records no such treatment of anyone; it needs the people lane to record it and research on what it builds to.",
    where: "src/simulation/people",
  },
  {
    key: "cause-failed-disaster-handling",
    connects: "Anger after a disaster handled badly.",
    status: "not-built",
    rule: "Feeds unrest, not a movement. No question in the catalog says what such a movement would demand.",
    where: "src/simulation/pressure/anger.ts",
  },
  {
    key: "leaders",
    connects: "Who leads: anyone, office or not.",
    status: "built",
    rule: "The leader is drawn among living adults whose home is in the state, preferring people who hold no prominent office, and never the player unless the player founds or takes the lead.",
    where: "src/simulation/movements/step.ts",
  },
  {
    key: "leaders-as-targets",
    connects: "A movement leader threatened or attacked, as a governor can be.",
    status: "not-built",
    rule: "movementLeadersIn lists them; the threat step does not read it yet. The crises and political violence lane owns the target list.",
    where: "src/simulation/pressure/events.ts prominentPeopleIn",
  },
  {
    key: "win-by-law",
    connects: "A law answering the demand being enacted.",
    status: "built",
    rule: "An enacted measure in the state or at the federal level, after the movement was founded, answering its question the way it wants, ends it as won.",
    where: "src/simulation/movements/step.ts",
  },
  {
    key: "movement-files-bills",
    connects: "A movement getting a bill introduced.",
    status: "not-built",
    rule: "A movement never files a bill itself; a legislator, the player included, files one through the ordinary route.",
    where: "src/simulation/legislation.ts",
  },
  {
    key: "movement-feeds-pressure",
    connects: "Marches, backlash and wins moving anger and hope in the state.",
    status: "not-built",
    rule: "Nothing a movement does changes the state's pressure readings yet. The migration and social movements lane owns those readings.",
    where: "src/simulation/pressure/anger.ts",
  },
  {
    key: "movement-moves-opinion",
    connects: "A movement changing what people think about its question.",
    status: "not-built",
    rule: "People's views on questions come only from their own history; a movement does not change them.",
    where: "src/simulation/living-world/political-reflection.ts",
  },
  {
    key: "officeholder-standing",
    connects:
      "An officeholder's standing rising or falling with how they answer a movement.",
    status: "not-built",
    rule: "A statement changes the movement, not the speaker's standing. No approval rating exists yet; the crises lane is building one.",
    where: "src/simulation/movements/actions.ts",
  },
  {
    key: "spread",
    connects: "A movement spreading to other states.",
    status: "not-built",
    rule: "A movement stays in its state. The world holds no record of which states border which.",
    where: "src/simulation/movements/step.ts",
  },
];
