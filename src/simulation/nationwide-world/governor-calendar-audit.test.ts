import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { addDays, makeIsoDate as d } from "../dates";
import { chiefExecutiveBaselineRows } from "./chief-executive-baseline";
import { CHIEF_EXECUTIVE_ELECTION_CYCLE_SOURCE } from "./chief-executive-election-cycles";
import {
  commencementAfter,
  generalElectionDay,
  nextRegularElection,
  regularTermWindowOn,
  stateExecutiveTermRule,
  termDatesAfterElection,
} from "./state-executive-term-rules";

/**
 * Every governorship's calendar, walked term by term from the day a new game
 * opens to 2046, against the researched nationwide calendar.
 *
 * Two failures this exists to catch. An office whose terms leave a gap sits
 * empty for years with nobody on the ballot; North Carolina was reported to
 * go four years without a governor. And an office that elects in the wrong
 * years changes hands in the wrong January; Missouri was reported to change
 * governors in 2027 when it elects in 2028.
 */

interface CalendarRow {
  readonly name: string;
  readonly termYears: number;
  readonly referenceYear: number;
  readonly cycleYears: number;
}

/** The answer's own table, read from the file rather than copied into a test. */
function researchedCalendar(): ReadonlyMap<string, CalendarRow> {
  const text = readFileSync(CHIEF_EXECUTIVE_ELECTION_CYCLE_SOURCE, "utf8");
  const rows = new Map<string, CalendarRow>();
  for (const line of text.split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    const term = /^(\d+) y$/.exec(cells[2] ?? "");
    const cycle = /^(\d{4}); (\d+) y$/.exec(cells[3] ?? "");
    if (!term || !cycle) continue;
    rows.set(cells[1]!.replace(/ \(mayor\)$/, ""), {
      name: cells[1]!,
      termYears: Number(term[1]),
      referenceYear: Number(cycle[1]),
      cycleYears: Number(cycle[2]),
    });
  }
  return rows;
}

const OPENING = d("2026-01-05");
const HORIZON = "2046-01-01";

describe("every governor's calendar", () => {
  const calendar = researchedCalendar();
  const jurisdictions = chiefExecutiveBaselineRows();

  it("reads a row for every state and the District", () => {
    expect(jurisdictions).toHaveLength(51);
    for (const row of jurisdictions)
      expect(calendar.get(row.name)).toBeDefined();
  });

  for (const row of chiefExecutiveBaselineRows()) {
    it(`${row.name} holds its elections in the researched years, with no gap between terms`, () => {
      const rule = stateExecutiveTermRule(row.key)!;
      const researched = calendar.get(row.name)!;
      expect(rule.termYears).toBe(researched.termYears);

      let term = regularTermWindowOn(rule, OPENING);
      expect(term.startsAt <= OPENING && OPENING < term.endsAt).toBe(true);
      const elections: number[] = [];
      while (term.endsAt < HORIZON) {
        const election = nextRegularElection(rule, addDays(term.startsAt, 1));
        const next = termDatesAfterElection(rule, election);
        // The next term begins the day the last one ends: no empty stretch,
        // and no two governors at once.
        expect(next.startsAt).toBe(term.endsAt);
        expect(election < next.startsAt).toBe(true);
        expect(commencementAfter(rule.commencement, election)).toBe(
          next.startsAt,
        );
        elections.push(Number(election.slice(0, 4)));
        term = next;
      }
      expect(elections.length).toBeGreaterThanOrEqual(4);
      for (const year of elections) {
        expect(
          (year - researched.referenceYear) % researched.cycleYears,
          `${row.name} elects in ${year}`,
        ).toBe(0);
        expect(generalElectionDay(rule.election, year).slice(5, 7)).toBe("11");
      }
    });
  }

  it("seats Alaska and Hawaii in December, the month after the vote", () => {
    for (const usps of ["AK", "HI"]) {
      const rule = stateExecutiveTermRule(usps)!;
      expect(termDatesAfterElection(rule, d("2026-11-03"))).toEqual({
        startsAt: d("2026-12-07"),
        endsAt: d("2030-12-02"),
      });
    }
  });

  it("starts the terms whose clause was read on the day it names", () => {
    const starts: Record<string, string> = {
      DE: "2029-01-16", // third Tuesday
      FL: "2027-01-05", // first Tuesday after the first Monday
      LA: "2028-01-10", // second Monday
      ME: "2027-01-06", // first Wednesday after the first Tuesday
      VA: "2030-01-12", // Saturday after the second Wednesday
      NC: "2029-01-01", // not read: the game's first Monday of January
    };
    for (const [usps, expected] of Object.entries(starts)) {
      const rule = stateExecutiveTermRule(usps)!;
      const election = nextRegularElection(rule, d("2026-10-01"));
      expect(commencementAfter(rule.commencement, election), usps).toBe(
        expected,
      );
    }
  });
});
