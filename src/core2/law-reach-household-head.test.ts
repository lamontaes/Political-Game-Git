/**
 * PW-4 step 4: a household-level law record stays with one person.
 *
 * Two adults born months apart share a whole-year age for part of each year.
 * Picking the household's head by whole-year age moved a price rule's record
 * from one to the other on each birthday (attached each September, removed
 * each February in the sim-stories run). The head is the earlier birth date,
 * every month of the year.
 */
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import {
  selectResidents,
  type ResidentFacts,
  type TownFacts,
} from "./law-reach/group-b-people";

function facts(date: string): TownFacts {
  const people = [
    // The lower id is the younger one, so an age tie would pick them.
    { id: "a-younger", birthDate: "1971-02-01" },
    { id: "b-older", birthDate: "1970-09-10" },
  ];
  const residents: ResidentFacts[] = people.map((p) => ({
    id: p.id,
    named: true,
    householdId: "household-1",
    age: ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(date)),
    birthDate: p.birthDate,
    weeklyMinutes: 0,
    employed: false,
  }));
  return {
    residents,
    households: new Map([
      [
        "household-1",
        {
          id: "household-1",
          named: true,
          size: 2,
          incomeDollars: 0,
          ages: residents.map((r) => r.age),
        },
      ],
    ]),
    modeled: residents.length,
  };
}

describe("PW-4: household head", () => {
  it("is the same person on every monthly review of a year", () => {
    const heads = new Set<string>();
    for (let month = 1; month <= 12; month += 1) {
      const date = `2027-${String(month).padStart(2, "0")}-12`;
      const picked = selectResidents(
        facts(date),
        { ageFrom: "adultAge", householdHead: true },
        "US-TN",
      );
      expect(picked.length).toBe(1);
      heads.add(picked[0]!.id);
    }
    expect([...heads]).toEqual(["b-older"]);
  });
});
