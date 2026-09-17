import { describe, expect, it } from "vitest";
import { congressSeats } from "../living-world/congress-seats";
import calibration from "./electoral-calibration.generated.json" with { type: "json" };

type Row = {
  readonly seatKey: string;
  readonly democraticTwoPartyShare: number | null;
  readonly totalVotes: number | null;
  readonly certifiedWinnerParty: string | null;
  readonly candidateTotalsByParty: Record<string, number>;
  readonly ambiguous: boolean;
  readonly uncontested: boolean;
};

const house = calibration.house as unknown as readonly Row[];
const senate = calibration.senate as unknown as readonly Row[];

function expectSaneShares(rows: readonly Row[]): void {
  for (const row of rows) {
    const share = row.democraticTwoPartyShare;
    if (share !== null) {
      expect(Number.isFinite(share), row.seatKey).toBe(true);
      expect(share, row.seatKey).toBeGreaterThanOrEqual(0);
      expect(share, row.seatKey).toBeLessThanOrEqual(1);
    }
    if (row.totalVotes !== null) {
      expect(Number.isFinite(row.totalVotes), row.seatKey).toBe(true);
    }
    for (const votes of Object.values(row.candidateTotalsByParty)) {
      expect(Number.isFinite(votes), row.seatKey).toBe(true);
    }
  }
}

function winnerCounts(rows: readonly Row[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = row.certifiedWinnerParty ?? "undetermined";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

describe("electoral calibration reference observations", () => {
  it("declares its schema and as-of date", () => {
    expect(calibration.schema).toBe("political-geography-v1");
    expect(calibration.asOfDate).toBe("2026-01-05");
    expect(calibration.provenanceClass).toBe("reference-observation");
  });

  it("covers every House seat exactly once", () => {
    const expected = congressSeats()
      .filter((seat) => seat.chamberKey === "us-house")
      .map((seat) => seat.seatKey)
      .sort();
    const keys = house.map((row) => row.seatKey);
    expect(keys).toHaveLength(435);
    expect(new Set(keys).size).toBe(435);
    expect([...keys].sort()).toEqual(expected);
  });

  it("covers every Senate seat exactly once", () => {
    const expected = congressSeats()
      .filter((seat) => seat.chamberKey === "us-senate")
      .map((seat) => seat.seatKey)
      .sort();
    const keys = senate.map((row) => row.seatKey);
    expect(keys).toHaveLength(100);
    expect(new Set(keys).size).toBe(100);
    expect([...keys].sort()).toEqual(expected);
  });

  it("keeps shares in [0, 1] or null and never NaN", () => {
    expectSaneShares(house);
    expectSaneShares(senate);
    for (const row of calibration.presidentialByState) {
      const share = row.democraticTwoPartyShare as number | null;
      if (share !== null) {
        expect(share).toBeGreaterThanOrEqual(0);
        expect(share).toBeLessThanOrEqual(1);
      }
    }
  });

  it("reports winner counts that agree with the reconciliation block", () => {
    const houseWinners = winnerCounts(house);
    const senateWinners = winnerCounts(senate);
    expect(houseWinners).toEqual(calibration.reconciliation.houseWinners);
    expect(senateWinners).toEqual(
      calibration.reconciliation.senateLastElectionWinners,
    );
    const control = calibration.reconciliation.clerkPoliticalDivisions119;
    expect(houseWinners.democratic).toBe(control.houseDemocrats);
    expect(houseWinners.republican).toBe(control.houseRepublicans);
    expect(houseWinners.undetermined).toBeUndefined();
  });

  it("lists the presidential electors of 50 states and DC, and 50 governors", () => {
    const states = calibration.presidentialByState.map((r) => r.stateUsps);
    expect(states).toHaveLength(51);
    expect(states).toContain("DC");
    expect(calibration.governors).toHaveLength(50);
    for (const governor of calibration.governors) {
      if (governor.status !== "compiled") {
        expect(governor.party).toBeNull();
      }
    }
  });
});
