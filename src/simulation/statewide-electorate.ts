import {
  livingWorldOrganizationId,
  LIVING_WORLD_KEYS,
  LIVING_WORLD_WRITER_VERSION,
  SEAT_TENURE_EVENT,
  SEAT_VACANCY_EVENT,
} from "./living-world/opening";
import { recordsWithFieldValue } from "./history-index";
import { publicPartyAffiliation } from "./living-world/congress";
import { chiefExecutiveJurisdictionId } from "./nationwide-world/government-jurisdiction";
import { stateJurisdictionForKey } from "./life-places";
import {
  politicalStartingConditions,
  seatStartingCondition,
} from "./world-setup/conditions";
import {
  applySwing,
  calibrationRow,
  calibrationRows,
  ELECTORAL_CALIBRATION,
  sharedSwing,
} from "./world-setup/political-start";
import type { EntityId, IsoDate, World } from "./types";

/**
 * Who votes in a statewide race, and how they lean.
 *
 * A statewide contest nobody campaigns in (a governor's race in a state the
 * player does not live in) used to be decided by drawing 1,000 to 10,000
 * votes for each candidate, so a governor could win on 14,595 ballots with
 * no party at all. The state's voters decide it now.
 *
 * ESTIMATED FROM AVERAGE: the only statewide two-party vote the calibration
 * source carries for every state is the certified 2024 presidential result
 * (`electoral-calibration.generated.json`, `us-president:<state>`); its
 * governor rows name the sitting governor's party but carry no tally. So a
 * statewide race starts from the state's 2024 two-party presidential share,
 * moved by the same national, regional and state swing this world drew at
 * its start, and its ballots are the 2024 presidential ballots. Those are the
 * state's voters, not a borrowed result: which candidate they choose still
 * follows the candidates' own parties.
 */
export interface StatewideElectorate {
  readonly stateUsps: string;
  /** Democratic share of the two-party vote, this world's swing applied. */
  readonly democraticShare: number;
  readonly ballots: number;
  /**
   * Share of all ballots cast for anyone outside the two major parties
   * (independents, minor parties, write-ins) in the same 2024 presidential
   * count. ESTIMATED FROM AVERAGE: the only race every state reports this way.
   */
  readonly neitherMajorShare: number;
}

function neitherMajorShareOf(stateUsps: string): number {
  const row = ELECTORAL_CALIBRATION.presidentialByState?.find(
    (candidate) => candidate.stateUsps === stateUsps,
  );
  if (!row || !row.totalVotes || row.totalVotes <= 0) return 0;
  const major =
    (row.totalsByParty.democratic ?? 0) + (row.totalsByParty.republican ?? 0);
  return Math.max(0, (row.totalVotes - major) / row.totalVotes);
}

const STATE_FOR_JURISDICTION = new Map<EntityId, string | null>();

function stateForJurisdiction(jurisdictionId: EntityId): string | null {
  if (!STATE_FOR_JURISDICTION.has(jurisdictionId)) {
    const usps =
      calibrationRows("us-president")
        .map((row) => row.stateUsps)
        .find(
          (candidate) =>
            chiefExecutiveJurisdictionId(candidate) === jurisdictionId ||
            stateJurisdictionForKey(`US-${candidate}`)?.id === jurisdictionId,
        ) ?? null;
    STATE_FOR_JURISDICTION.set(jurisdictionId, usps);
  }
  return STATE_FOR_JURISDICTION.get(jurisdictionId)!;
}

/** The electorate of a state-level jurisdiction, or null for any other. */
export function statewideElectorate(
  world: World,
  jurisdictionId: EntityId,
): StatewideElectorate | null {
  const stateUsps = stateForJurisdiction(jurisdictionId);
  if (!stateUsps) return null;
  const row = calibrationRows("us-president").find(
    (candidate) => candidate.stateUsps === stateUsps,
  );
  if (
    !row ||
    row.democraticTwoPartyShare === null ||
    row.totalVotes === null ||
    row.totalVotes <= 0
  )
    return null;
  const conditions = politicalStartingConditions(world);
  return {
    stateUsps,
    democraticShare: applySwing(
      row.democraticTwoPartyShare,
      conditions ? sharedSwing(conditions, stateUsps) : 0,
    ),
    ballots: row.totalVotes,
    neitherMajorShare: neitherMajorShareOf(stateUsps),
  };
}

/** "democratic", "republican", or null for anybody with neither on record. */
export function majorPartyOf(
  world: World,
  personId: EntityId,
  asOf: IsoDate,
): "democratic" | "republican" | null {
  // A party is read as of the day asked, or today when that is still ahead.
  const partyId = publicPartyAffiliation(world, personId, {
    asOf: asOf > world.currentDate ? world.currentDate : asOf,
  });
  if (!partyId) return null;
  for (const party of ["democratic", "republican"] as const)
    if (
      partyId ===
      livingWorldOrganizationId(world, LIVING_WORLD_KEYS.nationalParty(party))
    )
      return party;
  return null;
}

/**
 * Who votes for one seat in Congress, and how they lean.
 *
 * The ballots are the seat's own last certified count in the calibration
 * source (the 2024 House race, or the Senate class's last race), and the lean
 * is the two-party share this world generated for the seat at its start from
 * that same result. Null for a seat whose printed figures give no two-party
 * share (an uncontested or undetermined race): it has no count to divide.
 * The vote for neither major party is the state's (see `neitherMajorShare`).
 */
export interface SeatElectorate extends StatewideElectorate {
  readonly seatKey: string;
  /** Who held the seat on the day asked, if anybody. */
  readonly holderPersonId: EntityId | null;
}

export function congressSeatElectorate(
  world: World,
  seatKey: string,
  asOf: IsoDate,
): SeatElectorate | null {
  if (!/^us-(house|senate):/.test(seatKey)) return null;
  const row = calibrationRow(seatKey);
  const share = seatStartingCondition(world, seatKey)?.generatedShare;
  if (
    !row ||
    row.totalVotes === null ||
    row.totalVotes <= 0 ||
    share === null ||
    share === undefined
  )
    return null;
  return {
    seatKey,
    stateUsps: row.stateUsps,
    democraticShare: share,
    ballots: row.totalVotes,
    neitherMajorShare: neitherMajorShareOf(row.stateUsps),
    holderPersonId: seatHolderOn(world, seatKey, asOf),
  };
}

function seatHolderOn(
  world: World,
  seatKey: string,
  asOf: IsoDate,
): EntityId | null {
  let latest: World["history"]["events"][number] | undefined;
  for (const type of [SEAT_TENURE_EVENT, SEAT_VACANCY_EVENT])
    for (const event of recordsWithFieldValue(
      world.history.events,
      "type",
      type,
    )) {
      if (
        event.occurredAt > asOf ||
        !event.tags.includes(LIVING_WORLD_WRITER_VERSION) ||
        !event.tags.includes(`seat:${seatKey}`)
      )
        continue;
      if (
        !latest ||
        event.occurredAt > latest.occurredAt ||
        (event.occurredAt === latest.occurredAt &&
          event.sequence > latest.sequence)
      )
        latest = event;
    }
  if (latest?.type !== SEAT_TENURE_EVENT) return null;
  return (
    latest.participants.find((p) => p.role === "focus:subject")?.personId ??
    null
  );
}
