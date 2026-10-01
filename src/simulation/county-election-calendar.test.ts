import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { governmentUnit, countyGovernmentUnit } from "./government-units";
import { nextCountyElection } from "./nationwide-world/county-election-calendar";

const deSoto = governmentUnit("gus2025:127794")!;
const loudon = countyGovernmentUnit("47105")!;
describe("sourced county dates remain distinct from municipal defaults", () => {
  it("uses the adjusted DeSoto 2027 primary, qualifying and later term start", () => {
    expect(nextCountyElection(deSoto, makeIsoDate("2026-10-01"))).toMatchObject(
      {
        status: "read",
        dates: {
          electionDate: "2027-11-20",
          primaryDate: "2027-10-09",
          qualifyingOpens: "2027-08-03",
          qualifyingCloses: "2027-08-05",
          termStarts: "2028-01-10",
          termYears: 4,
        },
      },
    );
  });
  it("does not roll Louisiana's holiday-adjusted date into an unread later cycle", () => {
    expect(nextCountyElection(deSoto, makeIsoDate("2027-10-09")).status).toBe(
      "unknown",
    );
    expect(nextCountyElection(deSoto, makeIsoDate("2030-01-01")).status).toBe(
      "unknown",
    );
  });
  it("computes Loudon's actual August cycle and September start without guessing filing", () => {
    expect(nextCountyElection(loudon, makeIsoDate("2026-01-01"))).toMatchObject(
      {
        status: "read",
        dates: {
          electionDate: "2026-08-06",
          primaryDate: null,
          qualifyingCloses: null,
          termStarts: "2026-09-01",
        },
      },
    );
    expect(nextCountyElection(loudon, makeIsoDate("2026-08-06"))).toMatchObject(
      {
        status: "read",
        dates: { electionDate: "2030-08-01", termStarts: "2030-09-01" },
      },
    );
  });
  it("never transfers a read county calendar to a city, inactive unit or other county", () => {
    for (const unit of [
      { ...deSoto, unitType: "municipality" as const },
      { ...deSoto, functionalActive: false },
      { ...deSoto, countyGeoid: "22017" },
      { ...loudon, countyGeoid: "47093" },
      { ...loudon, stateUsps: "KY" },
    ])
      expect(nextCountyElection(unit, makeIsoDate("2026-01-01")).status).toBe(
        "unknown",
      );
  });
});
