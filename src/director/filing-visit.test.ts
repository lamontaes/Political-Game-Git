import { describe, expect, it } from "vitest";
import { createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { openFilingVisit, pickContest, type FilingCheck } from "./filing-visit";

// Golden path step 3: the clerk at the filing office speaks from GOV's
// records (contest, deadline, each eligibility rule).
const core = createLifeCore(
  buildPopulation({
    seed: "filing-visit",
    startedAt: "2021-01-01",
    minimumPeople: 200,
  }),
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
    // Said as people say a date: no year within the year (words.ts spokenDate).
    expect(said).toBe("The deadline is March 5.");
    expect(visit.choices.map((row) => row.action)).toEqual([
      { kind: "file", contestId: contest.id },
    ]);
    // Filing is its own control, apart from acknowledging a refusal.
    expect(visit.choices.map((row) => row.control)).toEqual(["file"]);
    for (const line of visit.lines)
      expect(line.sourceRecordIds.length).toBeGreaterThan(0);
  });

  it("tells the race before the paperwork: the office, the dates, the term, the work", () => {
    // Owner, Oct 28 sitting, 32: "you're running for Trustee ... the primary
    // is this date and the general is this date ... here is what a trustee
    // does, here is the term".
    const race = {
      ...contest,
      electionDate: "2021-11-02",
      primaryDate: "2021-05-18",
      termYears: 4,
      kind: "municipalOffice-body",
    };
    const visit = openFilingVisit(core, player.id, [race]);
    pickContest(core, visit, race.id, terms, []);
    const clerk = visit.lines
      .filter((row) => row.speaker === "clerk")
      .map((row) => row.text)
      .join(" ");
    expect(clerk).toContain("City Council, Seat 2");
    expect(clerk).toMatch(/May 18/);
    expect(clerk).toMatch(/November 2/);
    expect(clerk).toMatch(/\b4\b/);
    expect(clerk).toMatch(/budget/);
    // Without a primary on record, the clerk says there is none.
    const plain = openFilingVisit(core, player.id, [
      { ...race, primaryDate: null },
    ]);
    pickContest(core, plain, race.id, terms, []);
    expect(plain.lines.map((row) => row.text).join(" ")).not.toMatch(
      /primary ballot|primary is/,
    );
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
