import { describe, expect, it } from "vitest";

import type { IsoDate } from "../simulation/types";
import { spokenDay } from "./contextual-scene-families";

const iso = (value: string) => value as IsoDate;

describe("a day spoken in a reply reads as a sentence", () => {
  const today = iso("2026-01-01");

  it.each([
    ["2026-01-01", "today"],
    ["2026-01-02", "tomorrow"],
    ["2026-01-15", "on January 15, 2026"],
  ])("says %s as %s", (date, spoken) => {
    expect(spokenDay(iso(date), today)).toBe(spoken);
  });

  it("fits after 'make it' for every distance", () => {
    for (const date of [
      "2026-01-01",
      "2026-01-02",
      "2026-01-04",
      "2026-01-15",
    ]) {
      const line = `I can’t make it ${spokenDay(iso(date), today)}.`;
      expect(line).not.toMatch(/ do on /);
      expect(line).not.toMatch(/ on on /);
    }
  });
});
