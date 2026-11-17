/**
 * Who at home has a stake in a filing, from the household's own records
 * (scenes-from-life, `docs/design/scenes/from-life/spouse-stake-after-filing.md`).
 * A relative reacts to a filing only when the records give them one: what
 * the race itself costs the house (the filer's own money in the campaign, the
 * pay of a job given up for it) when that cost is what leaves the savings
 * short of the race, or a young child at home while the filer holds a job.
 * With neither, the filing is the player's news, told at home by the talk's
 * player-news subject (conversation.ts), not a stake scene. The strongest stake casts the relative and
 * gives the scene its facts; with none, the scene is not staged. The stake is
 * read from persons and the filing record; nothing is rolled.
 */
import { ageOnDate, daysBetweenText } from "../core2/kernel/dates";
import { CAMPAIGNS_MODULE_ID } from "../core2/modules/campaigns";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import { moneySaid, votesSaid } from "../english/count-words";
import { spanSaid } from "../english/span-words";
import { employerSaidAs } from "../english/said-as";
import { businessNameSaid } from "./words";
import type { CoreState, PersonId } from "../core2/types";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };

const RULES = rulesFile.familyStakes;
const zero = P.zero;
const one = P.one;

export type StakeKind = "money" | "time" | "worked" | "gave";

export interface StakeFact {
  text: string;
  recordIds: string[];
}

export interface Stake {
  kind: StakeKind;
  /** 0 to 1: how much of what the relative has on the line the run puts at risk. */
  strength: number;
  /** What the exchange may say, by the fact keys the bank's lines require. */
  facts: Record<string, StakeFact>;
}

/** Whole days from one ISO date to another. */
const daysBetween = daysBetweenText;

const ageOn = ageOnDate;

/** The filer's employer as people say it, from the job's organization record, or nothing. */
function employerFact(
  core: Readonly<CoreState>,
  jobId: string | undefined,
): Record<string, StakeFact> {
  const job = jobId ? core.jobs.get(jobId) : undefined;
  const org = job ? core.organizations.get(job.organizationId) : undefined;
  const text = org
    ? employerSaidAs({
        name: businessNameSaid(org),
        kind: org.kind,
        outside: !!org.outsideFlow,
        ...(org.classification ? { classification: org.classification } : {}),
        ...(org.governmentFacts
          ? { governmentFacts: org.governmentFacts }
          : {}),
      })
    : null;
  return job && org && text
    ? { employer: { text, recordIds: [job.id, org.id] } }
    : {};
}

interface RaceCost {
  /** The filer's own money in the campaign, from its gift row. */
  givenMinor: number;
  giftId: string | null;
  /** The daily pay of a job the filer left since filing. */
  lostDailyMinor: number;
  left: { jobId: string; orgId: string; employer: string | null } | null;
  recordIds: string[];
}

/**
 * What the race costs the filer's household, from the campaign's and the
 * jobs engine's records: the filer's own money given to the campaign (the
 * gift row the campaign keeps for it, the money posted from their cash), and
 * the pay of a job the filer left on or after the day they filed (the job's
 * ended status the filer holds). Nothing else the campaign spends comes out
 * of the house: its cash is what others gave it.
 */
function raceCostOf(
  core: Readonly<CoreState>,
  filerId: PersonId,
  filingId: string | undefined,
  filedOn: string | undefined,
): RaceCost {
  const cost: RaceCost = {
    givenMinor: zero,
    giftId: null,
    lostDailyMinor: zero,
    left: null,
    recordIds: [],
  };
  if (typeof filingId === "string" && core.modules.has(CAMPAIGNS_MODULE_ID)) {
    const giftId = `${filingId}|${filerId}`;
    const gift = coreAPI(core as CoreState)
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("gifts")
      .get(giftId) as unknown as { totalMinor: number } | undefined;
    if ((gift?.totalMinor ?? zero) > zero) {
      cost.givenMinor = gift!.totalMinor;
      cost.giftId = giftId;
      cost.recordIds.push(filingId, giftId);
    }
  }
  if (typeof filedOn === "string")
    for (const [key, row] of core.knowledgeByPerson.get(filerId) ?? []) {
      const match = /^job:(.+):status$/.exec(key);
      if (!match || row.value !== "ended" || row.learnedAt < filedOn) continue;
      const job = core.jobs.get(match[one]!);
      if (!job || job.personId !== filerId || !job.endsAt) continue;
      cost.lostDailyMinor += job.wageDailyMinor;
      const said = employerFact(core, job.id).employer;
      cost.left = {
        jobId: job.id,
        orgId: job.organizationId,
        employer: said?.text ?? null,
      };
      cost.recordIds.push(job.id);
    }
  return cost;
}

/**
 * The stake one relative has in the filing, or null. `causeId` is the filing's
 * own record (`candidate-filed:<id>`), which names the election date.
 */
function filingStakeOf(
  core: Readonly<CoreState>,
  filerId: PersonId,
  causeId: string,
  relativeId: PersonId,
): Stake | null {
  const filer = core.people.get(filerId);
  const relative = core.people.get(relativeId);
  if (!filer || !relative || relative.id === filer.id || !relative.alive)
    return null;
  if (relative.householdId !== filer.householdId) return null;
  if (ageOn(relative.birthDate, core.date) < P.votingAge) return null;
  const household = core.households.get(filer.householdId);
  if (!household) return null;
  const members = [...household.memberIds]
    .map((id) => core.people.get(id))
    .filter((row): row is NonNullable<typeof row> => !!row?.alive);
  const stakes: Stake[] = [];

  // Money: what the race itself costs this household, read from its books,
  // and said only when that cost is what leaves the house short (owner,
  // Nov 17: "Their savings and time are at stake... You took that literally";
  // the CTO's rule from that grade: money talk comes from the household's
  // actual books and only when they matter). The race costs the house the
  // filer's own money in the campaign (the campaign's gift row for it) and
  // the pay of a job the filer left since filing (the job's ended row); a
  // working filer campaigns after work and loses no pay (owner, Oct 28
  // sitting, 38). The household's gap is its living costs less its pay. The
  // stake is there only when the savings left carry that gap for too little
  // of the race while the same house, without the race's cost, would have
  // been carried: a house already short before the race, or one whose pay
  // covers its costs, has no money to say about the filing.
  const record = core.durableLog.get(causeId);
  const electionDate = record?.facts?.electionDate;
  const filingId = record?.facts?.filingId;
  const raceDays =
    typeof electionDate === "string"
      ? daysBetween(core.date, electionDate)
      : zero;
  const liquid = members.reduce((sum, row) => sum + row.liquidMinor, zero);
  const pay = members.reduce((sum, row) => {
    const job = row.jobId ? core.jobs.get(row.jobId) : undefined;
    return sum + (job && !job.endsAt ? job.wageDailyMinor : zero);
  }, zero);
  const gap =
    members.reduce((sum, row) => sum + row.livingCostDailyMinor, zero) - pay;
  const race = raceCostOf(core, filer.id, filingId, record?.date);
  const cost = race.givenMinor + race.lostDailyMinor;
  if (gap > zero && raceDays > zero && cost > zero) {
    const runwayDays = Math.max(zero, Math.floor(liquid / gap));
    const gapWithout = gap - race.lostDailyMinor;
    const runwayWithout =
      gapWithout > zero
        ? Math.floor((liquid + race.givenMinor) / gapWithout)
        : Number.POSITIVE_INFINITY;
    const shortfall = one - runwayDays / raceDays;
    const shortfallWithout = one - runwayWithout / raceDays;
    const gate = RULES.runwayShortfall.value;
    if (shortfall >= gate && shortfallWithout < gate) {
      const books = [household.id, ...members.map((m) => m.id)];
      stakes.push({
        kind: "money",
        strength: Math.min(one, shortfall),
        facts: {
          "stake-money": {
            text: "money",
            recordIds: [causeId, ...race.recordIds, ...books],
          },
          cushion: {
            text: spanSaid(runwayDays),
            recordIds: [...books, ...race.recordIds],
          },
          remaining: { text: spanSaid(raceDays), recordIds: [causeId] },
          ...(race.givenMinor > zero && race.giftId
            ? {
                "gave-own": {
                  text: "yes",
                  recordIds: [race.giftId, String(filingId)],
                },
              }
            : {}),
          ...(race.left
            ? {
                "left-job": { text: "yes", recordIds: [race.left.jobId] },
                ...(race.left.employer
                  ? {
                      employer: {
                        text: race.left.employer,
                        recordIds: [race.left.jobId, race.left.orgId],
                      },
                    }
                  : {}),
              }
            : {}),
        },
      });
    }
  }

  // Time: a young child at home while the filer holds a job the campaign's
  // evenings come out of.
  const children = members
    .filter(
      (row) => ageOn(row.birthDate, core.date) < RULES.youngChildAge.value,
    )
    .sort(
      (a, b) =>
        b.birthDate.localeCompare(a.birthDate) || a.id.localeCompare(b.id),
    );
  if (filer.jobId && children.length) {
    const child = children[zero]!;
    stakes.push({
      kind: "time",
      strength: RULES.timeStrength.value,
      facts: {
        "stake-time": {
          text: "time",
          recordIds: [causeId, child.id, filer.jobId],
        },
        child: { text: child.givenName, recordIds: [child.id] },
        ...employerFact(core, filer.jobId),
      },
    });
  }
  return stakes.sort((a, b) => b.strength - a.strength)[zero] ?? null;
}

/**
 * The stake one relative has in a lost race, or null: they are counted among
 * the campaign's volunteers (they worked it), or the candidate gave their own
 * money to it (the household's savings went in). `causeId` is the race's
 * count (`election-result:<contest>` or `primary-result:<contest>`), which
 * holds each candidate's votes; the facts say how close it was
 * (docs/design/scenes/from-life/household-after-the-loss.md).
 */
function lossStakeOf(
  core: Readonly<CoreState>,
  filerId: PersonId,
  causeId: string,
  relativeId: PersonId,
): Stake | null {
  const filer = core.people.get(filerId);
  const relative = core.people.get(relativeId);
  if (!filer || !relative || relative.id === filer.id || !relative.alive)
    return null;
  if (relative.householdId !== filer.householdId) return null;
  if (ageOn(relative.birthDate, core.date) < P.votingAge) return null;
  if (!core.modules.has(CAMPAIGNS_MODULE_ID)) return null;
  const record = core.durableLog.get(causeId);
  const contestId = record?.facts?.contestId;
  if (typeof contestId !== "string") return null;
  const filingId = `filing:${contestId}:${filerId}`;
  const tables = coreAPI(core as CoreState).moduleState(CAMPAIGNS_MODULE_ID);
  const campaign = tables.table("campaigns").get(filingId) as unknown as
    { volunteerIds: readonly string[] } | undefined;
  const gift = tables
    .table("gifts")
    .get(`${filingId}|${filerId}`) as unknown as
    { totalMinor: number } | undefined;
  const counted = JSON.parse(
    String(record?.facts?.totals ?? record?.facts?.votes ?? "{}"),
  ) as Record<string, number>;
  const own = counted[filerId] ?? zero;
  const best = Math.max(zero, ...Object.values(counted));
  const margin: StakeFact = {
    text: votesSaid(best - own),
    recordIds: [causeId],
  };
  if (campaign?.volunteerIds.includes(relativeId))
    return {
      kind: "worked",
      strength: one,
      facts: {
        margin,
        "stake-worked": {
          text: "worked",
          recordIds: [filingId, relativeId, causeId],
        },
      },
    };
  if ((gift?.totalMinor ?? zero) > zero)
    return {
      kind: "gave",
      strength: RULES.gaveStrength.value,
      facts: {
        margin,
        "stake-gave": { text: "gave", recordIds: [filingId, causeId] },
        given: { text: moneySaid(gift!.totalMinor), recordIds: [filingId] },
      },
    };
  return null;
}

/** The stake a relative has in what a record says happened: a filing or a lost race. */
export function stakeOf(
  core: Readonly<CoreState>,
  filerId: PersonId,
  causeId: string,
  relativeId: PersonId,
): Stake | null {
  return /^(election|primary)-result:/.test(causeId)
    ? lossStakeOf(core, filerId, causeId, relativeId)
    : filingStakeOf(core, filerId, causeId, relativeId);
}

/**
 * The household members with a stake in a filing or a lost race, the strongest first (ties
 * to the nearest by id, as the director's other household fills break them).
 */
export function stakeholders(
  core: Readonly<CoreState>,
  filerId: PersonId,
  causeId: string,
  candidates: readonly PersonId[],
): PersonId[] {
  return candidates
    .map((id) => ({ id, stake: stakeOf(core, filerId, causeId, id) }))
    .filter((row): row is { id: PersonId; stake: Stake } => !!row.stake)
    .sort((a, b) => b.stake.strength - a.stake.strength)
    .map((row) => row.id);
}
