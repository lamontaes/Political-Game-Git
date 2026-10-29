/**
 * Who at home has a stake in a filing, from the household's own records
 * (scenes-from-life, `docs/design/scenes/from-life/spouse-stake-after-filing.md`).
 * A relative reacts to a filing only when the records give them one: the
 * household's money against the length of the race, or a young child at home
 * while the filer holds a job. The strongest stake casts the relative and
 * gives the scene its facts; with none, the scene is not staged. The stake is
 * read from persons and the filing record; nothing is rolled.
 */
import { ageOnDate, daysBetweenText } from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import { spanSaid } from "../english/span-words";
import type { CoreState, PersonId } from "../core2/types";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };

const RULES = rulesFile.familyStakes;
const zero = P.zero;
const one = P.one;

export type StakeKind = "money" | "time";

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

/**
 * The stake one relative has in the filing, or null. `causeId` is the filing's
 * own record (`candidate-filed:<id>`), which names the election date.
 */
export function stakeOf(
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

  // Money: how many days the household's savings carry what its pay does
  // not (living costs less the wages its members' jobs pay, as the business
  // engine reads a founder's runway) against the days the race has left to
  // run. A household whose pay covers its costs has no money to say about it
  // (owner, Oct 28 sitting, 38: "who says the player is not campaigning
  // after work?").
  const electionDate = core.durableLog.get(causeId)?.facts?.electionDate;
  const liquid = members.reduce((sum, row) => sum + row.liquidMinor, zero);
  const pay = members.reduce((sum, row) => {
    const job = row.jobId ? core.jobs.get(row.jobId) : undefined;
    return sum + (job && !job.endsAt ? job.wageDailyMinor : zero);
  }, zero);
  const cost =
    members.reduce((sum, row) => sum + row.livingCostDailyMinor, zero) - pay;
  const raceDays =
    typeof electionDate === "string"
      ? daysBetween(core.date, electionDate)
      : zero;
  if (cost > zero && raceDays > zero) {
    const runwayDays = Math.max(zero, Math.floor(liquid / cost));
    const shortfall = one - runwayDays / raceDays;
    if (shortfall >= RULES.runwayShortfall.value)
      stakes.push({
        kind: "money",
        strength: Math.min(one, shortfall),
        facts: {
          "stake-money": {
            text: "money",
            recordIds: [
              causeId,
              household.id,
              ...members.map((m) => m.id),
              ...members.flatMap((m) => (m.jobId ? [m.jobId] : [])),
            ],
          },
          cushion: {
            text: spanSaid(runwayDays),
            recordIds: [household.id, ...members.map((m) => m.id)],
          },
          remaining: {
            text: spanSaid(raceDays),
            recordIds: [causeId],
          },
        },
      });
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
      },
    });
  }
  return stakes.sort((a, b) => b.strength - a.strength)[zero] ?? null;
}

/**
 * The household members with a stake in a filing, the strongest first (ties
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
