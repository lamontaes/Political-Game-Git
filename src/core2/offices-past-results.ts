/**
 * The one lookup of a past race's real result (the 2024 research corpus) and
 * this world's share of it. The offices engine reads it when it records the
 * race behind a sitting holder, and past-elections reads it when it sizes a
 * race no term recorded (the federal executive's), so both carry one number.
 */
import corpus from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import { partySide } from "./appointments";
import { pastParameter, seededBetween } from "./past-module";

type Corpus = {
  house: {
    seatKey: string;
    stateUsps: string;
    certifiedWinnerParty: string;
    democraticTwoPartyShare: number | null;
    totalVotes: number;
    electionDate: string;
  }[];
  senate: {
    stateUsps: string;
    certifiedWinnerParty: string;
    democraticTwoPartyShare: number | null;
    totalVotes: number;
    lastElectionYear: number;
  }[];
  presidentialByState: {
    stateUsps: string;
    democraticTwoPartyShare: number | null;
    totalVotes: number;
  }[];
};

export const CORPUS = corpus as unknown as Corpus;

/** The race as the lookup needs it: the office's kind, the seat, the state. */
export interface PastRace {
  readonly officeKind: string;
  readonly seatId: string;
  /** The state's postal code. */
  readonly usps: string;
  /** The holder's party. */
  readonly party: string | null;
  /** The general election's day. */
  readonly date: string;
}

/** The winner's real two-party share and votes cast where the research has this race and the holder's party won it. */
export function realResult(
  race: PastRace,
): { share: number; total: number } | null {
  const year = Number(race.date.slice(0, 4));
  const side = partySide(race.party);
  const fromDemShare = (
    dem: number | null,
    winner: string,
    total: number,
  ): { share: number; total: number } | null => {
    if (dem === null || side === 0 || partySide(winner) !== side) return null;
    return { share: side < 0 ? dem : 1 - dem, total };
  };
  if (race.officeKind === "us-house") {
    const key = `us-house:${race.usps}-${race.seatId.split(":").at(-1)}`;
    const row = CORPUS.house.find((r) => r.seatKey === key);
    return row && row.electionDate.startsWith(String(year))
      ? fromDemShare(
          row.democraticTwoPartyShare,
          row.certifiedWinnerParty,
          row.totalVotes,
        )
      : null;
  }
  if (race.officeKind === "us-senate") {
    const rows = CORPUS.senate.filter(
      (r) => r.stateUsps === race.usps && r.lastElectionYear === year,
    );
    const row = rows.find((r) => partySide(r.certifiedWinnerParty) === side);
    return row
      ? fromDemShare(
          row.democraticTwoPartyShare,
          row.certifiedWinnerParty,
          row.totalVotes,
        )
      : null;
  }
  if (race.officeKind === "president" || race.officeKind === "vice-president") {
    if (year !== pastParameter(null, "pastPresidentialElectionYear"))
      return null;
    let total = 0;
    let dem = 0;
    for (const row of CORPUS.presidentialByState) {
      if (row.democraticTwoPartyShare === null) continue;
      total += row.totalVotes;
      dem += row.democraticTwoPartyShare * row.totalVotes;
    }
    return side === 0
      ? null
      : fromDemShare(dem / total, race.party ?? "", total);
  }
  return null;
}

/**
 * The winner's share in a world, on the world's one unit for the seat and date
 * (`<seat>:<date>:share`). A recorded race (`recordedTotal`, its votes cast)
 * maps that unit into the room the record allows: from the winner still
 * winning by one vote of its total (or the real share drifted down, where that
 * is higher) to the real share drifted up. No clamp, so no two races pile onto
 * one value. A race with no record keeps the past race's bounds
 * (`pastWinnerShareMin`, `pastWinnerShareMax`), the rule that a winner holds
 * more than half.
 */
export function worldWinnerShare(
  seed: string,
  race: Pick<PastRace, "seatId" | "date">,
  base: number,
  halfWidth: number,
  recordedTotal?: number,
): number {
  const low = recordedTotal
    ? Math.min(base, Math.max(base - halfWidth, 0.5 + 1 / recordedTotal))
    : base - halfWidth;
  const high = recordedTotal ? Math.min(1, base + halfWidth) : base + halfWidth;
  const share = seededBetween(
    seed,
    `${race.seatId}:${race.date}:share`,
    low,
    high,
  );
  return recordedTotal
    ? share
    : Math.min(
        pastParameter(null, "pastWinnerShareMax"),
        Math.max(pastParameter(null, "pastWinnerShareMin"), share),
      );
}

/** The race's real result in this world (owner: recognizable with drift), or null where the research does not have it. */
export function recordedRaceShare(
  seed: string,
  race: PastRace,
): { share: number; total: number } | null {
  const real = realResult(race);
  if (!real) return null;
  return {
    share: worldWinnerShare(
      seed,
      race,
      real.share,
      pastParameter(null, "pastRealShareDrift"),
      real.total,
    ),
    total: real.total,
  };
}
