import { describe, expect, it } from "vitest";
import { buildDeepPast } from "../core2/deep-past";
import { createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import {
  FILING_VISIT_WORDS,
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
    // Every line is a mined sentence from the clerk bank, filled from records.
    expect(FILING_VISIT_WORDS.greet.map((row) => row.text)).toContain(
      visit.lines[0]!.text,
    );
    expect(visit.choices).toHaveLength(1);
    expect(visit.choices[0]!.text).toContain("City Council, Seat 2");
    pickContest(core, visit, contest.id, terms, [
      check("minimum-age", true, "18", "40"),
    ]);
    const said = visit.lines.at(-1)!.text;
    expect(said).toContain("March 5, 2021");
    expect(visit.choices.map((row) => row.action)).toEqual([
      { kind: "file", contestId: contest.id },
    ]);
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
    expect(clerk.some((text) => /\b18\b/.test(text))).toBe(true);
    // No mined clerk sentence says a filing closed: that rule is left
    // unsaid, and the screen shows its record.
    expect(FILING_VISIT_WORDS.rules["filing-deadline"]).toEqual([]);
    expect(visit.choices.map((row) => row.action.kind)).toEqual(["done"]);
  });
});
