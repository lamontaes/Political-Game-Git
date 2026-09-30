import { describe, expect, it } from "vitest";
import { electionTurnout, electionYearKind } from "./election-turnout";
const base = {
  presidentialBase: 0.65,
  democraticShare: 0.5,
  registrationChange: 0,
  identificationChange: 0,
};
describe("election participation follows the year and the race", () => {
  it("presidential exceeds midterm, which exceeds off-cycle", () => {
    expect(electionYearKind(2028)).toBe("presidential");
    expect(electionTurnout({ ...base, year: 2028 })).toBeGreaterThan(
      electionTurnout({ ...base, year: 2026 }),
    );
    expect(electionTurnout({ ...base, year: 2026 })).toBeGreaterThan(
      electionTurnout({ ...base, year: 2027 }),
    );
  });
  it("competition and registration change turnout continuously", () => {
    expect(electionTurnout({ ...base, year: 2026 })).toBeGreaterThan(
      electionTurnout({ ...base, year: 2026, democraticShare: 0.8 }),
    );
    expect(
      electionTurnout({ ...base, year: 2026, registrationChange: 0.015 }) -
        electionTurnout({ ...base, year: 2026 }),
    ).toBeCloseTo(0.015);
  });
  it("never counts more ballots than eligible voters", () => {
    expect(
      electionTurnout({
        ...base,
        year: 2028,
        presidentialBase: 1,
        registrationChange: 1,
      }),
    ).toBe(1);
  });
});
