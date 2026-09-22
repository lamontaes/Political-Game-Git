import { knownRule, unknownRule } from "../legislature-rules";
import type { RuleSourceRef } from "../legislature-rules";
import type { CandidacyPack, ElectiveOfficeOption } from "../candidacy-packs";
import { congressSeats, MINIMUM_AGE } from "../living-world/congress-seats";
import type { CongressSeat } from "../living-world/congress-seats";
import { US_STATE_NAMES } from "./state-executive-candidacy-packs";

/**
 * Seats in the U.S. House and Senate as candidacy packs, one per seat.
 *
 * A leaf like its state-executive neighbour: no places, no World. The seat
 * keys are the Congress record's own (`us-house:NV-02`,
 * `us-senate:NV:class-3`), used as the office key AND the seat key on the
 * contest, so the contest a player files in is the one congressional
 * turnover reads on election day, and the member it seats on 3 January is the
 * same person the Congress overview shows.
 *
 * What the Constitution itself establishes is carried as known: a
 * Representative is at least twenty-five and a Senator at least thirty, and
 * each must be an inhabitant of the state when elected (Article I, sections 2
 * and 3). Living in a particular House district is not a constitutional
 * requirement, which is why every district in a candidate's state is open to
 * them. Two things are deliberately NOT applied, and say so:
 *
 * - The citizenship requirement (seven years for the House, nine for the
 *   Senate). The game records no one's citizenship, so it can neither grant
 *   nor refuse on it. Not applied; not assumed met.
 * - Filing deadlines, petitions, fees and primaries. No state's ballot-access
 *   law for Congress has been read, so a filing is a general-election
 *   candidacy and nothing more, the same as the governorship.
 */

const CONSTITUTION: RuleSourceRef = {
  authority: "constitution",
  citation: "U.S. Const. art. I, §§ 2–3",
  sourceTitle: "Constitution of the United States",
  sourceUrl: "https://constitution.congress.gov/constitution/article-1/",
  retrievedAt: null,
  verification: "verified",
  note: "Age, citizenship and state inhabitancy for Representatives and Senators, and their term lengths.",
};

export const CONGRESS_CITIZENSHIP_NOT_APPLIED =
  "The Constitution requires seven years of citizenship for the House and nine for the Senate. The game records no one's citizenship, so this requirement is not applied.";

const NO_FILING_PROCEDURE =
  "No filing deadline, petition, fee, primary or party nomination for Congress has been read for this state.";

export interface CongressSeatIdentity {
  readonly seat: CongressSeat;
  readonly stateUsps: string;
  readonly jurisdictionKey: string;
  /** The Congress record's seat key; also the contest's office and seat key. */
  readonly officeKey: string;
  readonly title: "U.S. Representative" | "U.S. Senator";
  /** "U.S. Representative for Nevada's 2nd congressional district". */
  readonly displayName: string;
  readonly minimumAge: number;
  readonly termYears: number;
  readonly candidacyPackId: string;
}

function ordinal(value: number): string {
  const rem100 = value % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${value}th`;
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

export function congressSeatDisplayName(seat: CongressSeat): string {
  const state =
    US_STATE_NAMES[seat.stateUsps as keyof typeof US_STATE_NAMES] ??
    seat.stateUsps;
  if (seat.chamberKey === "us-senate") return `U.S. Senator from ${state}`;
  const district =
    seat.district === "00"
      ? "at-large congressional district"
      : `${ordinal(Number(seat.district))} congressional district`;
  return `U.S. Representative for ${state}'s ${district}`;
}

function identityFor(seat: CongressSeat): CongressSeatIdentity {
  const house = seat.chamberKey === "us-house";
  return {
    seat,
    stateUsps: seat.stateUsps,
    jurisdictionKey: `US-${seat.stateUsps}`,
    officeKey: seat.seatKey,
    title: house ? "U.S. Representative" : "U.S. Senator",
    displayName: congressSeatDisplayName(seat),
    minimumAge: MINIMUM_AGE[seat.chamberKey],
    termYears: house ? 2 : 6,
    candidacyPackId: `${seat.seatKey}:candidacy`,
  };
}

let bySeatKey: ReadonlyMap<string, CongressSeatIdentity> | null = null;

function identities(): ReadonlyMap<string, CongressSeatIdentity> {
  bySeatKey ??= new Map(
    congressSeats().map((seat) => [seat.seatKey, identityFor(seat)]),
  );
  return bySeatKey;
}

/** The seat this office key names, or null for anything that is not one. */
export function congressSeatIdentityForOfficeKey(
  officeKey: string,
): CongressSeatIdentity | null {
  if (!officeKey.startsWith("us-house:") && !officeKey.startsWith("us-senate:"))
    return null;
  return identities().get(officeKey) ?? null;
}

export function congressSeatIdentityForPackId(
  packId: string,
): CongressSeatIdentity | null {
  const suffix = ":candidacy";
  return packId.endsWith(suffix)
    ? congressSeatIdentityForOfficeKey(packId.slice(0, -suffix.length))
    : null;
}

/** Every House and Senate seat of one state, House first, in a stable order. */
export function congressSeatIdentitiesForState(
  stateUsps: string,
): readonly CongressSeatIdentity[] {
  return [...identities().values()].filter(
    (identity) => identity.stateUsps === stateUsps,
  );
}

export function congressCandidacyPack(
  identity: CongressSeatIdentity,
): CandidacyPack {
  const option: ElectiveOfficeOption = {
    officeKey: identity.officeKey,
    chamberName:
      identity.seat.chamberKey === "us-house"
        ? "U.S. House of Representatives"
        : "U.S. Senate",
    office: {
      officeKey: identity.officeKey,
      title: identity.title,
      seatKey: identity.officeKey,
      occupationClassification: `service:${identity.seat.chamberKey}`,
    },
    seats: knownRule(1, CONSTITUTION),
    recordedBy: {
      packId: identity.candidacyPackId,
      packName: identity.displayName,
    },
    qualification: {
      minimumAge: knownRule(identity.minimumAge, CONSTITUTION),
      residency: knownRule(
        "An inhabitant of the state when elected; living in the district is not required.",
        CONSTITUTION,
      ),
      termYears: knownRule(identity.termYears, CONSTITUTION),
      filing: unknownRule(NO_FILING_PROCEDURE),
    },
    unresolvedGaps: [NO_FILING_PROCEDURE, CONGRESS_CITIZENSHIP_NOT_APPLIED],
  };
  return {
    packId: identity.candidacyPackId,
    jurisdictionKey: identity.jurisdictionKey,
    displayName: identity.displayName,
    legislativeRulePackId: identity.seat.chamberKey,
    offices: [option],
    unresolvedGaps: [NO_FILING_PROCEDURE, CONGRESS_CITIZENSHIP_NOT_APPLIED],
  };
}
