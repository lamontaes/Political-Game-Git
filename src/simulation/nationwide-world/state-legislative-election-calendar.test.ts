import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import {
  legislativeTermDates,
  supportedLegislativeTermDates,
} from "../legislative-office-terms";
import { isElectionYear } from "./state-executive-term-rules";
import {
  isStateLegislativeSeatDue,
  nextStateLegislativeElection,
  REVIEWED_REGULAR_SEAT_CYCLES,
  stateLegislativeElectionRule,
} from "./state-legislative-election-calendar";

describe("when a state legislative seat is next on the ballot", () => {
  it("keeps both Kentucky chambers in the admitted term capability", () => {
    for (const chamber of ["house", "senate"]) {
      expect(
        supportedLegislativeTermDates(
          `us-ky-general-assembly-v1:${chamber}`,
          makeIsoDate("2026-11-03"),
        ),
      ).toMatchObject({ sourceStatus: "admitted" });
    }
  });

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

  it("keeps Kansas House biennial and its whole Senate on the 2024/2028 cycle", () => {
    const house = "us-ks-legislature-profile-v1:house";
    const senate = "us-ks-legislature-profile-v1:senate";
    expect(isStateLegislativeSeatDue("KS", house, 125, 2026)).toBe(true);
    expect(isStateLegislativeSeatDue("KS", senate, 39, 2026)).toBe(false);
    expect(isStateLegislativeSeatDue("KS", senate, 39, 2028)).toBe(true);
    expect(
      nextStateLegislativeElection("KS", makeIsoDate("2026-01-05"), {
        officeKey: senate,
        ordinal: 39,
      }).electionDate,
    ).toBe("2028-11-07");
    expect(
      legislativeTermDates(house, makeIsoDate("2026-11-03")),
    ).toMatchObject({
      startsAt: "2027-01-11",
      endsAt: "2029-01-08",
      basis: "reviewed-profile",
      sourceStatus: "official-primary-reviewed-not-source-admitted",
    });
    expect(
      supportedLegislativeTermDates(house, makeIsoDate("2026-11-03")),
    ).toBeNull();
    expect(
      legislativeTermDates(senate, makeIsoDate("2028-11-07")),
    ).toMatchObject({
      startsAt: "2029-01-08",
      endsAt: "2033-01-10",
    });
  });

  it("alternates Nebraska's recorded even and odd district cohorts", () => {
    const officeKey = "us-ne-legislature-v1:legislature";
    expect(isStateLegislativeSeatDue("NE", officeKey, 2, 2026)).toBe(true);
    expect(isStateLegislativeSeatDue("NE", officeKey, 41, 2026)).toBe(false);
    expect(isStateLegislativeSeatDue("NE", officeKey, 41, 2028)).toBe(true);
    expect(isStateLegislativeSeatDue("NE", officeKey, 2, 2028)).toBe(false);
    expect(
      nextStateLegislativeElection("NE", makeIsoDate("2026-01-05"), {
        officeKey,
        ordinal: 41,
      }).electionDate,
    ).toBe("2028-11-07");
    expect(() =>
      nextStateLegislativeElection("NE", makeIsoDate("2026-01-05"), {
        officeKey,
        ordinal: null,
      }),
    ).toThrow(/recorded district/);
    expect(
      legislativeTermDates(officeKey, makeIsoDate("2026-11-03")),
    ).toMatchObject({
      startsAt: "2027-01-07",
      endsAt: "2031-01-09",
      basis: "reviewed-profile",
      sourceStatus: "official-primary-reviewed-not-source-admitted",
    });
    expect(
      supportedLegislativeTermDates(officeKey, makeIsoDate("2026-11-03")),
    ).toBeNull();
  });

  it("retains the disclosed whole-chamber game profile where no cohort was reviewed", () => {
    expect(
      isStateLegislativeSeatDue(
        "GA",
        "us-ga-legislature-profile-v1:senate",
        56,
        2026,
      ),
    ).toBe(true);
    expect(
      REVIEWED_REGULAR_SEAT_CYCLES.every(
        (row) =>
          row.sourceStatus === "official-primary-reviewed-not-source-admitted",
      ),
    ).toBe(true);
    for (const row of REVIEWED_REGULAR_SEAT_CYCLES) {
      const stateRule = stateLegislativeElectionRule(row.stateUsps);
      for (let year = 2024; year <= 2032; year += 1) {
        if (isElectionYear(row.election, year))
          expect(isElectionYear(stateRule, year)).toBe(true);
      }
    }
  });
});
