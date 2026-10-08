import { describe, expect, it } from "vitest";
import calendarProfiles from "../../data/research/government/county-election-calendar-profiles.json" with { type: "json" };
import { makeIsoDate } from "./dates";
import stateSchedule from "../../data/research/government/county-election-schedule-by-state.json" with { type: "json" };
import {
  governmentUnit,
  countyGovernmentUnit,
  governmentUnitsForState,
} from "./government-units";
import { SeededRng, pickDistinct } from "./rng";
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
  it("never transfers a read county calendar to a city or inactive unit", () => {
    for (const unit of [
      { ...deSoto, unitType: "municipality" as const },
      { ...deSoto, functionalActive: false },
    ])
      expect(nextCountyElection(unit, makeIsoDate("2026-01-01")).status).toBe(
        "unknown",
      );
  });
  it("does not let a returned source list mutate the recorded calendar profile", () => {
    const first = nextCountyElection(deSoto, makeIsoDate("2026-01-01"));
    expect(first.status).toBe("read");
    if (first.status !== "read") throw new Error("Published calendar missing");
    const original = [...first.dates.sourceUrls];
    (first.dates.sourceUrls as string[]).push("https://invalid.example");
    const again = nextCountyElection(deSoto, makeIsoDate("2026-01-01"));
    expect(again).toMatchObject({
      status: "read",
      dates: { sourceUrls: original },
    });
  });
});

it("refuses invalid profile term lengths before date reads or recurring search", () => {
  for (const unit of [deSoto, loudon]) {
    const profile = calendarProfiles.profiles.find(
      (entry) =>
        entry.stateUsps === unit.stateUsps &&
        entry.countyGeoid === unit.countyGeoid,
    )!;
    const original = profile.termYears;
    try {
      for (const invalid of [
        0,
        -1,
        0.5,
        NaN,
        Infinity,
        Number.MAX_SAFE_INTEGER + 1,
      ]) {
        profile.termYears = invalid;
        expect(nextCountyElection(unit, makeIsoDate("2026-01-01"))).toEqual({
          status: "unknown",
          reason: "County term length is invalid.",
        });
      }
    } finally {
      profile.termYears = original;
    }
    expect(nextCountyElection(unit, makeIsoDate("2026-01-01")).status).toBe(
      "read",
    );
  }
});

describe("every county reads its state's statutory calendar", () => {
  const seed = "co1-2026-10-06";
  const full = stateSchedule.states.filter(
    (row) => row.countyGovernment === "full",
  );
  const states = pickDistinct(
    new SeededRng(seed),
    full.map((row) => row.stateUsps),
    5,
  );
  it.each(states)("a random county in %s (seed " + seed + ")", (usps) => {
    const row = full.find((entry) => entry.stateUsps === usps)!;
    const counties = governmentUnitsForState(usps).filter(
      (unit) => unit.unitType === "county" && unit.functionalActive,
    );
    expect(counties.length).toBeGreaterThan(0);
    const county =
      counties[new SeededRng(`${seed}:${usps}`).integer(0, counties.length)]!;
    const read = nextCountyElection(county, makeIsoDate("2026-10-07"));
    if (county.stateUsps === "LA" || county.stateUsps === "TN") return;
    expect(read.status).toBe("read");
    if (read.status !== "read") return;
    const year = Number(read.dates.electionDate.slice(0, 4));
    expect(row.body!.electionYearResidues).toContain(
      year % row.body!.cycleYears,
    );
    expect(new Date(read.dates.electionDate).getUTCMonth() + 1).toBe(
      row.body!.election.month,
    );
    expect(read.dates.termYears).toBe(row.body!.termYears);
    expect(read.dates.estimated).toBe(true);
    expect(read.dates.termStarts > read.dates.electionDate).toBe(true);
  });
});
