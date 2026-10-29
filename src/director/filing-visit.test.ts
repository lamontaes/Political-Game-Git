import { describe, expect, it } from "vitest";
import { createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import {
  filedAtCounter,
  openFilingVisit,
  pickContest,
  type FilingCheck,
} from "./filing-visit";

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
    // Where the player lives and whether they are registered, each from its
    // rule, through the same word maker as every scene.
    const other = openFilingVisit(core, player.id, [contest]);
    pickContest(core, other, contest.id, terms, [
      check("residency", false, "Springfield", "Shelbyville"),
      check("registered-voter", false, "registered", "not registered"),
    ]);
    const told = other.lines
      .filter((row) => row.speaker === "clerk")
      .map((row) => row.text)
      .join(" ");
    expect(told).toContain("City Clerk");
    expect(told).toMatch(/registered voter/);
  });

  it("says, once the filing is taken, the signatures its petition needs and the day they are due", () => {
    // Owner, Oct 28: filing is a petition, signatures, the clerk's check,
    // then the ballot. The clerk reads the petition record the elections
    // engine opened with the filing.
    const petition = (needed: number) => ({
      id: "petition:filing:fixture",
      needed,
      due: "2021-03-05",
    });
    const told = (needed: number) => {
      const visit = openFilingVisit(core, player.id, [contest]);
      filedAtCounter(core, visit, petition(needed));
      return visit.lines.at(-1)!;
    };
    const many = told(1250);
    expect(many.text).toContain("1,250 signatures");
    expect(many.text).toContain("March 5");
    expect(many.sourceRecordIds).toContain("petition:filing:fixture");
    expect(told(1).text).toMatch(/one signature/);
    expect(told(0).text).toMatch(/petition|signatures/);
    expect(told(0).text).not.toMatch(/March 5/);
    // No petition on record: the clerk says nothing more.
    const visit = openFilingVisit(core, player.id, [contest]);
    const before = visit.lines.length;
    filedAtCounter(core, visit, null);
    expect(visit.lines.length).toBe(before);
  });
});
