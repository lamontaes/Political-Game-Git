/**
 * Whether each voter turns out, and the reasons the turnout record keeps.
 *
 * Split out of voting.ts by scripts/elections/split-module.ts (structure only);
 * voting.ts re-exports every export of this file by name.
 */
import {
  townEngagementCenter,
  customPolitics,
  engagementOf,
} from "../electorate";
import { VOTING_MODULE_ID } from "../voting-module-id";
import { electionLawTurnoutCost } from "../laws-in-force";
import { ageOnElection, turnoutWeb } from "../turnout-web";
import {
  openingVoterCarry,
  habitOf,
  namedTurnout,
  propensityOf,
  reachOf,
  stakesOf,
  type TurnoutParts,
} from "../turnout";
import {
  decisionLean,
  decisionTraitWeight,
  reportOutcome,
} from "../trait-decisions";
import type { CoreAPI, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { campaignParameter } from "../campaign-data";
import { cpsAgeBand, cpsTurnout } from "../electorate-places";
import { weeklyWorkOf } from "./voting-appeal";
import { table, town } from "./voting-base";
import { keepPollDay, registrationReading } from "./voting-polling-day";

/**
 * A voter's reasons to vote apart from the race: every trait's lean between
 * voting and staying home (one term, weighted from the personality and civic
 * engagement study: duty and reliability reach it through the same lean),
 * how closely they follow politics (where PEOPLE's views engine runs; younger
 * people follow less, CES 2024), against what voting costs them that day
 * (their work hours, the election laws in force, a custom world's turnout
 * setting, and what the election adds: a midterm's, an off-cycle date's or a
 * primary's lower salience).
 */
export function turnoutReasons(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">>,
  /** A counted resident's scheduled weekly work, from their record. */
  recordedWeeklyMinutes?: number,
  /** What this election adds to the cost of voting. */
  extraCost = 0,
  /**
   * Whether the voter's registration is a record the turnout rule reads
   * (the town's own voters), so the flat parts of automatic and same-day
   * registration are left out of their cost.
   */
  registrationIsRecord = false,
): {
  readonly duty: number;
  readonly cost: number;
  /** The trait term inside the duty (the decision's weight times the lean), and the lean. */
  readonly trait: number;
  readonly lean: number;
} {
  const engagement = engagementOf(api.state as CoreState, voter);
  const lean = decisionLean(
    api.state,
    voter,
    "voting.turnout",
    "vote",
    "stay-home",
  );
  const trait = decisionTraitWeight(api.state, "voting.turnout") * lean;
  const duty =
    trait +
    (engagement === null
      ? 0
      : campaignParameter("turnoutEngagementWeight") *
        (engagement - townEngagementCenter(api.state as CoreState)));
  const state = api.state as CoreState;
  const weeklyWork = recordedWeeklyMinutes ?? weeklyWorkOf(state, voter.id);
  const cost =
    (weeklyWork / campaignParameter("turnoutWorkWeekMinutes") +
      electionLawTurnoutCost(api, voter, weeklyWork, registrationIsRecord) -
      (registrationIsRecord
        ? campaignParameter("registrationCalibrationRelief")
        : 0)) /
      customPolitics(state).turnout +
    extraCost;
  return { duty, cost, trait, lean };
}

/**
 * A counted adult's habit: the same rule a named voter's own record feeds
 * (`habitOf`), given the record people like them have: their state's CPS
 * citizen turnout in November 2024 at their age band, over the November
 * elections their adult years held. It is their history before the start,
 * what they did then, not a figure the count is held to.
 */
export function countedHabit(
  api: CoreAPI,
  voter: { readonly birthDate?: string },
  date: string,
): number {
  if (!voter.birthDate) return 0;
  const age = ageOnElection(voter.birthDate, date);
  const rate = cpsTurnout(
    town(api).stateKey.slice(3),
    cpsAgeBand(age),
  )?.turnout;
  if (rate === undefined) return 0;
  const elections = Math.max(
    0,
    Math.floor(
      (age - api.parameter("votingAge")) /
        campaignParameter("turnoutElectionYears"),
    ),
  );
  return habitOf(rate * elections, elections);
}

/** One voter's turnout on one day: its parts, the propensity, and (a named voter) the act. */
export interface TurnoutDecision extends TurnoutParts {
  /** The gap between the candidates in their own eyes, across the day's races. */
  readonly interest: number;
  readonly propensity: number;
  /** The web record behind the propensity's factor (absent where it did not move it). */
  readonly web?: {
    readonly recordId: string;
    readonly links: readonly string[];
  };
  /** A named voter's act; a counted voter votes at their propensity. */
  readonly votes: boolean;
  /** The share of the voter's people on the rolls for the election (1 or 0 for a named person). */
  readonly registered: number;
  /** The survey's registered share of citizens like them, which their propensity on the rolls is divided by. */
  readonly surveyRegistered: number;
  /** The share of them who registered at the polls and voted. */
  readonly atPolls: number;
  /** The share of them who would have voted and were turned away for not being on the rolls. */
  readonly turnedAway: number;
}

/** A named voter's record of election days: what their habit reads, and their carry. */
export interface TurnoutRecordRow {
  readonly id: string;
  readonly elections: number;
  readonly voted: number;
  readonly carry: number;
  readonly lastDate: string;
}

export const decisions = new WeakMap<object, Map<string, TurnoutDecision>>();

/**
 * Decide one voter's turnout for a day, once: a named voter from their own
 * record (habit, the carry their past elections left, the campaigns that
 * reached them), a counted voter from theirs (no individual record kept:
 * habit is the record of people like them, which their duty already carries;
 * the campaigns' reach is the town's).
 */
export function decideTurnout(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">>,
  input: {
    readonly date: string;
    readonly interest: number;
    readonly extraCost: number;
    readonly contacts: number;
    readonly recordedWeeklyMinutes?: number;
    /** Whether the day's ballot carries a local race (the web's local-turnout links move it). */
    readonly local?: boolean;
    /** How far their door "yes" to a candidate on the day's ballot still holds, 0 to 1 (a word to vote as well as how). */
    readonly pledged?: number;
  },
): TurnoutDecision {
  const map = decisions.get(api.state) ?? new Map<string, TurnoutDecision>();
  decisions.set(api.state, map);
  const key = `${input.date}|${voter.id}`;
  const hit = map.get(key);
  if (hit) return hit;
  const named = api.state.people.has(voter.id);
  const { duty, cost, trait, lean } = turnoutReasons(
    api,
    voter,
    input.recordedWeeklyMinutes,
    input.extraCost,
    true,
  );
  // Kept where the voting engine runs (a measure or recall can be counted
  // without it, with no record kept).
  const records = api.state.modules.has(VOTING_MODULE_ID)
    ? table(api, "turnout")
    : null;
  const record = named
    ? (records?.get(voter.id) as unknown as TurnoutRecordRow | undefined)
    : undefined;
  const parts: TurnoutParts = {
    duty,
    stakes: stakesOf(input.interest),
    reach: reachOf(input.contacts),
    habit: record
      ? habitOf(record.voted, record.elections)
      : named
        ? 0
        : countedHabit(
            api,
            voter as { readonly birthDate?: string },
            input.date,
          ),
    cost,
    pledge: campaignParameter("doorPledgeTurnoutWeight") * (input.pledged ?? 0),
  };
  // The web's links the engine does not read itself, by this voter's age and place.
  const who = (api.state.people.get(voter.id) ?? voter) as {
    readonly placeId?: string;
    readonly birthDate?: string;
  };
  const web =
    who.placeId && who.birthDate
      ? turnoutWeb(
          api,
          who.placeId,
          ageOnElection(who.birthDate, input.date),
          undefined,
          input.local ?? false,
        )
      : null;
  // Registration: the turnout calibration is of the whole population, the
  // unregistered among it, so a voter on the rolls turns out at their
  // propensity over the survey's registered share of people like them, and
  // one not on them (an old address, never registered, after the deadline)
  // only where the state registers people at the polls, at a cost.
  const reg = registrationReading(api, voter, input.date, duty);
  const webFactor = web ? web.factor : 1;
  const base = Math.min(1, propensityOf(parts) * webFactor);
  const onRolls = Math.min(1, base / Math.max(0.01, reg.surveyShare));
  const atPolls = reg.sameDay
    ? Math.min(
        1,
        propensityOf({
          ...parts,
          cost: parts.cost + campaignParameter("sameDayPollRegistrationCost"),
        }) * webFactor,
      )
    : 0;
  const propensity = reg.share * onRolls + (1 - reg.share) * atPolls;
  // The audit's probe (off in play) sees the propensity with and without the trait term.
  reportOutcome("voting.turnout", voter.id, lean, "probability", (withTerm) =>
    withTerm
      ? propensity
      : Math.min(
          1,
          propensityOf({ ...parts, duty: parts.duty - trait }) *
            (web ? web.factor : 1),
        ),
  );
  let votes = false;
  let registeredAtPolls = 0;
  let turnedAway = 0;
  if (named) {
    const carry = record?.carry ?? openingVoterCarry(voter.id);
    const act = namedTurnout(carry, propensity);
    votes = act.votes;
    // Not on the rolls: where they would have gone to vote, the day keeps
    // that they registered at the polls or were turned away.
    // The player's own day is the player's to act: the engine keeps no
    // poll-day row for a guess about them.
    if (reg.share < 1 && voter.id !== (api.state as CoreState).playerId) {
      const person = api.state.people.get(voter.id)!;
      if (reg.sameDay && votes) {
        registeredAtPolls = 1;
        keepPollDay(api, person, input.date, "registers-at-polls", reg.why);
      } else if (!reg.sameDay && namedTurnout(carry, onRolls).votes) {
        turnedAway = 1;
        keepPollDay(api, person, input.date, "not-on-the-list", reg.why);
      }
    }
    records?.put({
      id: voter.id,
      elections: (record?.elections ?? 0) + 1,
      voted: (record?.voted ?? 0) + (votes ? 1 : 0),
      carry: act.carry,
      lastDate: input.date,
    } as unknown as ModuleRow);
  }
  const decision = {
    ...parts,
    interest: input.interest,
    propensity,
    votes,
    registered: reg.share,
    surveyRegistered: reg.surveyShare,
    atPolls: named ? registeredAtPolls : (1 - reg.share) * atPolls,
    turnedAway: named
      ? turnedAway
      : reg.sameDay
        ? 0
        : (1 - reg.share) * onRolls,
    ...(web?.recordId && web.links.length
      ? { web: { recordId: web.recordId, links: web.links } }
      : {}),
  };
  map.set(key, decision);
  return decision;
}
