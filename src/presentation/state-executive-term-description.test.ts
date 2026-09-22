import { describe, expect, it } from "vitest";
import {
  STATE_EXECUTIVE_GAME_PROFILE,
  stateExecutiveTermRule,
} from "../simulation";
import { describeStateExecutiveTerm } from "./state-executive-term-description";

describe("the office calendar a player reads", () => {
  it("states the rules and never where they came from", () => {
    const text = describeStateExecutiveTerm(STATE_EXECUTIVE_GAME_PROFILE);
    expect(text).toBe(
      "A term here lasts four years. The general election is held in November every four years, on the first Tuesday after the first Monday, and the winner takes office on the first Monday of January after the election.",
    );
    expect(text).not.toMatch(/law|compiled|source|game's|profile|rule set/i);
  });

  it("reads Washington's own start day", () => {
    const rule = stateExecutiveTermRule("WA");
    expect(rule).not.toBeNull();
    expect(describeStateExecutiveTerm(rule!)).toContain(
      "on the Wednesday after the second Monday of January following the election",
    );
  });
});
