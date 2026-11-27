/**
 * The counted residents' ballots, kept by column, and a race's result record.
 *
 * Split out of voting.ts by scripts/elections/split-module.ts (structure only);
 * voting.ts re-exports every export of this file by name.
 */
import { countedAppeal } from "../electorate";
import type { CoreAPI } from "../types";
import { type StanceProfile } from "../campaign-views";
import { table } from "./voting-base";
import type {
  BallotRow,
  CountedBallotRow,
  CountedBallotsRow,
  ResultRow,
} from "./voting-base";

/** Why one named voter voted as they did. */
export function ballotOf(
  api: CoreAPI,
  contestId: string,
  voterId: string,
): BallotRow | null {
  return (
    (table(api, "ballots").get(`ballot:${contestId}:${voterId}`) as unknown as
      BallotRow | undefined) ?? null
  );
}

/**
 * Keep results, not their history (owner, Oct 7, Nov 5, Nov 8): a race's
 * counted ballots (every counted voter's turnout, split and reasons) are
 * read only by the "why did this resident vote so" lookups (`countedBallotOf`,
 * `countedBallotsOf`); the race's result, returns and the named voters'
 * ballots stay. In play, when a new race's counted ballots are kept, those
 * of races more than countedBallotRetentionDays past go. Kept, they were
 * 80 MB in 45 rows at Montpelier, Vermont, year 4 (Nov 9, 2026). With
 * bookkeeping on (tests, proofs) every row stays.
 */
export function dropOldCountedBallots(api: CoreAPI): void {
  const rows = table(api, "countedBallots");
  const cutoff = new Date(`${api.state.date}T00:00:00Z`);
  cutoff.setUTCDate(
    cutoff.getUTCDate() - api.parameter("countedBallotRetentionDays"),
  );
  const before = cutoff.toISOString().slice(0, 10);
  for (const row of [
    ...(rows.rows() as unknown as { id: string; date: string }[]),
  ])
    if (row.date < before) rows.remove(row.id);
}

function countedRow(
  api: CoreAPI,
  contestId: string,
): CountedBallotsRow | undefined {
  return table(api, "countedBallots").get(`counted:${contestId}`) as unknown as
    CountedBallotsRow | undefined;
}

/** The engine's own reading of one kept counted ballot. */
/** What a counted voter's group has heard or lived on each question, where it has moved them (null where nothing has). */
export function heardOn(
  profile: StanceProfile,
  questions: readonly string[],
): Readonly<Record<string, number>> | null {
  let heard: Record<string, number> | null = null;
  for (const question of questions) {
    const shift = profile.heard?.(question) ?? 0;
    if (shift) (heard ??= {})[question] = shift;
  }
  return heard;
}

/** A profile whose heard term is the values read for the ballot (none where nothing has moved the voter). */
export function keptHeard(
  profile: StanceProfile,
  heard: Readonly<Record<string, number>> | null,
): StanceProfile {
  return {
    ...profile,
    heard: heard ? (question: string) => heard[question] ?? 0 : undefined,
  };
}

/**
 * The stance profile a kept counted ballot was read with: the voter's faith
 * and degree, the world's country view, their circumstances and what their
 * group had heard, so a ballot read back has the appeal the count decided by.
 * A row kept before a column was reads without it.
 */
function keptProfile(row: CountedBallotsRow, i: number): StanceProfile | null {
  const heard = row.heard?.[i];
  const faith =
    row.faith && row.college && Number.isFinite(row.faith[i])
      ? {
          faithFromAverage: row.faith[i]!,
          ...(Number.isFinite(row.college[i])
            ? { collegeFromAverage: row.college[i]! }
            : {}),
        }
      : null;
  const life = row.life?.[i] ?? undefined;
  if (row.seed === undefined && !life && !heard) return faith;
  const kept: StanceProfile = {
    ...faith,
    ...(row.seed === undefined ? {} : { seed: row.seed }),
    ...(life ? { life } : {}),
  };
  return heard ? keptHeard(kept, heard) : kept;
}

export function countedBallotAt(
  row: CountedBallotsRow,
  i: number,
): CountedBallotRow {
  return {
    id: `ballot:${row.contestId}:${row.voterIds[i]!}`,
    contestId: row.contestId,
    voterId: row.voterIds[i]!,
    date: row.date,
    counted: true,
    turnout: row.voted[i]!,
    turnoutReasons: {
      duty: row.duty[i]!,
      interest: row.interest[i]!,
      cost: row.cost[i]!,
      propensity: row.voted[i]!,
    },
    split: Object.fromEntries(
      row.field.map((f, j) => [f.id, row.split[i]?.[j] ?? 0]),
    ),
    appeal: countedAppeal(row.lean[i]!, row.field, {
      inTown: true,
      local: true,
      incumbentLean: row.incumbentLean[i]!,
      trust: row.trust?.[i] ?? 1,
      ballotForm: i,
      pledges: row.pledges?.[i] ?? undefined,
      warmths: row.warmths?.[i] ?? undefined,
      endorsed: row.endorsed?.[i] ?? undefined,
      divides: true,
      profile: keptProfile(row, i),
    }),
    basis: "party-name-incumbency",
    lean: row.lean[i]!,
    weight: row.weight?.[i] ?? 1,
  };
}

/** Why one counted resident voted as they did: their ballot and its reasons. */
export function countedBallotOf(
  api: CoreAPI,
  contestId: string,
  voterId: string,
): CountedBallotRow | null {
  const row = countedRow(api, contestId);
  const i = row ? row.voterIds.indexOf(voterId) : -1;
  return row && i >= 0 ? countedBallotAt(row, i) : null;
}

/** Every counted resident's ballot in a contest, with its reasons. */
export function countedBallotsOf(
  api: CoreAPI,
  contestId: string,
): readonly CountedBallotRow[] {
  const row = countedRow(api, contestId);
  return row ? row.voterIds.map((_, i) => countedBallotAt(row, i)) : [];
}

/**
 * Whether a person was on a count's roll: a named voter the count gave a
 * ballot in the contest, cast or not (every eligible adult in its ward, or
 * in town for an at-large or wider seat). The press reads it for who a
 * race's result concerns.
 */
export function onContestRoll(
  api: CoreAPI,
  contestId: string,
  personId: string,
): boolean {
  return !!table(api, "ballots").get(`ballot:${contestId}:${personId}`);
}

export function resultOf(api: CoreAPI, contestId: string): ResultRow | null {
  return (
    (table(api, "results").get(`result:${contestId}`) as unknown as
      ResultRow | undefined) ?? null
  );
}
