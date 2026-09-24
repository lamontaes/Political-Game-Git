import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { nextStateLegislativeElection } from "./state-legislative-election-calendar";

describe("when a state legislative seat is next on the ballot", () => {
  it("is November of the next even year in most states, not four weeks after filing", () => {
    expect(
      nextStateLegislativeElection("NV", makeIsoDate("2026-08-01")),
    ).toMatchObject({
      electionDate: "2026-11-03",
      fieldClosesOn: "2026-09-04",
    });
    // Once the field has closed, a filing stands in the next election.
    expect(
      nextStateLegislativeElection("NV", makeIsoDate("2026-09-05"))
        .electionDate,
    ).toBe("2028-11-07");
    // An odd year has no legislative election in an even-year state.
    expect(
      nextStateLegislativeElection("MN", makeIsoDate("2027-02-01"))
        .electionDate,
    ).toBe("2028-11-07");
  });

  it("uses odd years where the state does", () => {
    expect(
      nextStateLegislativeElection("VA", makeIsoDate("2026-01-05"))
        .electionDate,
    ).toBe("2027-11-02");
    expect(
      nextStateLegislativeElection("NJ", makeIsoDate("2027-12-01"))
        .electionDate,
    ).toBe("2029-11-06");
    // Every four years in Mississippi and Louisiana.
    expect(
      nextStateLegislativeElection("MS", makeIsoDate("2028-01-01"))
        .electionDate,
    ).toBe("2031-11-04");
  });
});
