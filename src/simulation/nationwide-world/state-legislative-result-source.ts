import source from "../../../data/research/elections/state-legislative-district-results.json" with { type: "json" };
import type { DistrictIdentity } from "../../districts/types";
import type { SeededRng } from "../rng";
import type { IsoDate } from "../types";

export interface RecordedDistrictWinner {
  readonly date: string;
  readonly candidateId: string;
  readonly partyCode: string;
  readonly partyName: string;
  readonly caseIds: readonly string[];
  readonly seatsContested: number;
  readonly districtSeats: number;
  readonly redistrictingCode: string;
}

export interface DistrictResultSource {
  readonly bindings: readonly {
    readonly districtRecordId: string;
    readonly districtVintage: string;
    readonly memberOrdinal: number;
    readonly sourceSeatKey: string;
    readonly boundaryEvidence: string;
  }[];
  readonly records: readonly {
    readonly key: string;
    readonly stateUsps: string;
    readonly chamber: string;
    readonly boundaryRegime: number;
    readonly winners: readonly RecordedDistrictWinner[];
  }[];
}

const recordedSource: DistrictResultSource = source;

/** No district-number proxy: an evidenced boundary/seat binding is required. */
export function recordedDistrictOpeningWinner(
  district: DistrictIdentity | null,
  memberOrdinal: number,
  date: IsoDate,
  rng: SeededRng,
  records: DistrictResultSource = recordedSource,
): RecordedDistrictWinner | null {
  if (!district || district.isUnassignedResidual) return null;
  const bindings = records.bindings.filter(
    (row) =>
      row.districtRecordId === district.recordId &&
      row.districtVintage === district.vintage &&
      row.memberOrdinal === memberOrdinal &&
      row.boundaryEvidence.trim().length > 0,
  );
  if (bindings.length !== 1) return null;
  const seats = records.records.filter(
    (row) =>
      row.key === bindings[0]!.sourceSeatKey &&
      row.stateUsps === district.stateUsps &&
      row.chamber === district.chamber,
  );
  if (seats.length !== 1) return null;
  const winners = seats[0]!.winners.filter(
    (row) => row.date <= date && row.caseIds.length > 0,
  );
  // A free-for-all multimember contest needs a recorded seat crosswalk, not
  // candidate ranking manufactured here. Duplicate-date options are refused.
  if (new Set(winners.map((row) => row.date)).size !== winners.length)
    return null;
  if (winners.length === 0) return null;
  return winners.length === 1 ? winners[0]! : rng.pick(winners);
}
