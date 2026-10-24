// M2-10's seating rule must fail a winner seated late, a seat nobody took, and
// a U.S. seat whose seating day is wrong, whatever day the world has reached.
import { describe, expect, it } from "vitest";
import { seatingProblems } from "./m2-10-seating";

const sideOf = (party: string | null) =>
  party === "republican" ? 1 : party === "democratic" ? -1 : 0;
const house = {
  seatId: "seat:US-OH:us-house:03",
  office: "us-house",
  seatedOn: "2027-01-03",
  winnerParty: "democratic",
};

describe("M2-10's seating rule", () => {
  it("passes a winner serving from the seating day", () => {
    expect(
      seatingProblems(
        house,
        [{ party: "democratic", from: "2027-01-03" }],
        sideOf,
      ),
    ).toEqual([]);
  });
  it("fails a winner whose term starts after the seating day", () => {
    expect(
      seatingProblems(
        house,
        [{ party: "democratic", from: "2027-01-20" }],
        sideOf,
      ),
    ).toHaveLength(1);
  });
  it("fails a seat the other party holds, or nobody", () => {
    expect(
      seatingProblems(
        house,
        [{ party: "republican", from: "2027-01-03" }],
        sideOf,
      ),
    ).toHaveLength(1);
    expect(seatingProblems(house, [], sideOf)).toHaveLength(1);
  });
  it("fails a U.S. seat seated on any day but January 3, 2027", () => {
    const late = { ...house, seatedOn: "2030-01-03" };
    const problems = seatingProblems(
      late,
      [{ party: "democratic", from: "2030-01-03" }],
      sideOf,
    );
    expect(problems).toEqual([
      "seat:US-OH:us-house:03 seats on 2030-01-03, not January 3, 2027",
    ]);
  });
});
