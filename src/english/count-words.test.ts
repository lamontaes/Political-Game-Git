import { describe, expect, it } from "vitest";
import {
  lateSaid,
  lengthSaid,
  moneySaid,
  monthsOfRentDays,
} from "./count-words";

// How a sum and a stretch of unpaid rent are said aloud (owner, Nov 8
// playtest: a notice that printed "$14" for a $14 shortfall and said "that far
// behind" of every amount).
describe("sums and stretches as people say them", () => {
  it("says a small sum near its size and a large one rounded", () => {
    expect(moneySaid(1400)).toBe("about $15");
    expect(moneySaid(200)).toBe("about $2");
    expect(moneySaid(40_000)).toBe("about $400");
    expect(moneySaid(231_700)).toBe("about $2,300");
  });

  it("says how long rent has gone unpaid in weeks and months, never in days", () => {
    expect(lateSaid(6)).toBe("a week or so");
    expect(lateSaid(18)).toBe("a couple of weeks");
    expect(lateSaid(30)).toBe("about a month");
    expect(lateSaid(61)).toBe("about two months");
    expect(lateSaid(400)).toBe("a year or more");
    expect(lateSaid(monthsOfRentDays(2))).toBe("about two months");
    expect(lateSaid(monthsOfRentDays(0.03))).toBe("a week or so");
    for (const days of [1, 17, 44, 75, 200, 349, 900])
      expect(lateSaid(days), `${days} days`).not.toMatch(/\d/);
  });
});

describe("a length of time as people say it in talk", () => {
  it("is always words: months under two years, years rounded to the half after", () => {
    expect(lengthSaid(1)).toBe("a month");
    expect(lengthSaid(8)).toBe("eight months");
    expect(lengthSaid(13)).toBe("thirteen months");
    expect(lengthSaid(23)).toBe("twenty-three months");
    expect(lengthSaid(24)).toBe("two years");
    expect(lengthSaid(30)).toBe("two and a half years");
    expect(lengthSaid(34)).toBe("almost three years");
    expect(lengthSaid(26)).toBe("a little over two years");
    expect(lengthSaid(60)).toBe("five years");
  });
});
