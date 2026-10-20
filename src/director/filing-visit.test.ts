import { describe, expect, it } from "vitest";
import { buildDeepPast } from "../core2/deep-past";
import { createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import {
  confirmFiled,
  openFilingVisit,
  pickContest,
  type FilingCheck,
} from "./filing-visit";

// Golden path step 3: the clerk at the filing office speaks from GOV's
// records (contest, deadline, each eligibility rule).
const core = createLifeCore(
  buildDeepPast(
    buildPopulation({
      seed: "filing-visit",
      startedAt: "2021-01-01",
      minimumPeople: 200,
    }),
  ),
);
const player = [...core.people.values()].find((row) => row.tier !== "husk")!;
const contest = {
  id: "contest:council-2021",
  title: "City Council, Seat 2",
  filingDeadline: "2021-03-05",
  sourceIds: ["fixture:election-calendar"],
};
const terms = {
  filedWith: "City Clerk",
  source: "Fixture state election code",
};
const check = (
  rule: string,
  met: boolean,
  required: string,
  actual: string,
): FilingCheck => ({
  rule,
  met,
  required,
  actual,
  source: terms.source,
});

describe("the filing visit", () => {
  it("states the terms from the record and offers to file", () => {
    const visit = openFilingVisit(core, player.id, [contest]);
    expect(visit.lines[0]!.text).toMatch(/^(?:How|What|Can) .+\?$/);
    expect(visit.choices.map((row) => row.text)).toEqual([
      "I want to run for City Council, Seat 2.",
    ]);
    pickContest(core, visit, contest.id, terms, [
      check("minimum-age", true, "18", "40"),
    ]);
    const said = visit.lines.at(-1)!.text;
    expect(said).toBe("The deadline is March 5, 2021.");
    expect(visit.choices.map((row) => row.action)).toEqual([
      { kind: "file", contestId: contest.id },
    ]);
    // The player files in words about the office; the clerk then says it is in.
    expect(visit.choices[0]!.text).toMatch(/City Council, Seat 2\.$/);
    expect(visit.choices[0]!.text).not.toBe("I understand.");
    confirmFiled(core, visit, contest.id, "filing:fixture-1");
    const filed = visit.lines.at(-1)!;
    expect(filed.speaker).toBe("clerk");
    expect(filed.text).toMatch(/City Council, Seat 2/);
    expect(filed.sourceRecordIds).toContain("filing:fixture-1");
    // Filing is its own control, apart from acknowledging a refusal.
    expect(visit.choices.map((row) => row.control)).toEqual(["file"]);
    for (const line of visit.lines)
      expect(line.sourceRecordIds.length).toBeGreaterThan(0);
  });

  it("tells the rule that stops a filing, and offers no way to file", () => {
    const visit = openFilingVisit(core, player.id, [contest]);
    pickContest(core, visit, contest.id, terms, [
      check("minimum-age", false, "18", "16"),
      check("filing-deadline", false, "2021-03-05", "2021-03-09"),
    ]);
    const clerk = visit.lines
      .filter((row) => row.speaker === "clerk")
      .map((row) => row.text);
    expect(
      clerk.some((text) =>
        /^You have to be (?:at least )?18(?: by election day)?\.$/.test(text),
      ),
    ).toBe(true);
    // No mined sentence says a missed deadline, so that rule is left out.
    expect(clerk.some((text) => /closed/.test(text))).toBe(false);
    expect(visit.choices.map((row) => row.action.kind)).toEqual(["done"]);
    expect(visit.choices.map((row) => row.control)).toEqual(["acknowledge"]);
  });
});
