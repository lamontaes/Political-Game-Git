import { describe, expect, it } from "vitest";
import { createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { spoken } from "./words";
import {
  askAtCounter,
  filedAtCounter,
  openFilingVisit,
  pickContest,
  type FilingCheck,
} from "./filing-visit";
import { expectUpToFourDifferent } from "./reply-set-check";

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
  // A seat on a body: said by the body ("the city council", then "the council").
  seat: { title: "Council member", seats: 7, bodyName: "City Council" },
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

// The player's town, as the clerk names it in the greeting.
const town = spoken(corePlaceByJurisdictionId(player.placeId as never)!);

describe("the filing visit", () => {
  it("states the terms from the record and offers to file", () => {
    const visit = openFilingVisit(core, player.id, [contest]);
    // The clerk greets the player by the town they run in.
    expect(visit.lines[0]!.text).toContain(town);
    expect(visit.choices.map((row) => row.text)).toEqual([
      "I want to run for the City Council.",
    ]);
    pickContest(core, visit, contest.id, terms, [
      check("minimum-age", true, "18", "40"),
    ]);
    const said = visit.lines.at(-1)!.text;
    // Said as people say a date: no year within the year (words.ts spokenDate).
    expect(said).toMatch(/March 5\b/);
    expect(said).not.toMatch(/2021/);
    expect(visit.choices.map((row) => row.action)).toEqual([
      { kind: "file", contestId: contest.id },
      { kind: "ask", contestId: contest.id, about: "filed" },
      { kind: "ask", contestId: contest.id, about: "dates" },
      { kind: "done" },
    ]);
    // Filing is its own control, apart from acknowledging a refusal, and
    // worded as the player's own reply (owner, Nov 1: "It should be an
    // actual reply"), never an acknowledgment like "I see."
    expect(visit.choices.map((row) => row.control)).toEqual([
      "file",
      "ask",
      "ask",
      "leave",
    ]);
    // Four replies, each a different move about the race, and no two
    // carrying the same insert: filing names the office, asking who filed
    // names the town, asking the dates names the deadline.
    expect(visit.choices[0]!.text).toContain("the council");
    expect(visit.choices[1]!.text).toContain(town);
    expect(visit.choices[2]!.text).toMatch(/March 5/);
    for (const choice of visit.choices.slice(1))
      expect(choice.text).not.toMatch(/council/i);
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
    // One answer in connected sentences after the player names the office,
    // never a stack of one-line facts (owner, Nov 1).
    expect(visit.lines.at(-1)!.speaker).toBe("clerk");
    expect(visit.lines.at(-2)!.speaker).toBe("player");
    const clerk = visit.lines
      .filter((row) => row.speaker === "clerk")
      .map((row) => row.text)
      .join(" ");
    expect(clerk).toMatch(/the council/);
    // Nobody says a form's title in a sentence.
    expect(clerk).not.toMatch(/Council member|Seat 2/);
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
    // The turndown says where the person must live and where their records
    // put them, never the filing office's research note.
    expect(told).toMatch(/live in Springfield/);
    expect(told).toMatch(/has you in Shelbyville/);
    expect(told).toMatch(/registered voter/);
  });

  it("answers who else has filed from the filings, and the dates from the race's record", () => {
    const race = {
      ...contest,
      electionDate: "2021-11-02",
      primaryDate: null,
      termYears: 4,
      kind: "municipalOffice-body",
      filed: {
        count: 2,
        first: { name: "Dana Whitfield", recordId: "filing:dana" },
        recordIds: ["filing:dana", "filing:lee"],
      },
    };
    const visit = openFilingVisit(core, player.id, [race]);
    pickContest(core, visit, race.id, terms, []);
    const moves = new Map([
      ["file", "agree"],
      ["ask-filed", "ask"],
      ["ask-dates", "tell"],
      ["leave", "leave"],
    ]);
    expectUpToFourDifferent(
      visit.choices.map((row) => ({
        move: moves.get(row.key)!,
        text: row.text,
      })),
      "the counter's replies",
    );
    askAtCounter(core, visit, "ask-filed");
    const filed = visit.lines.at(-1)!;
    expect(filed.speaker).toBe("clerk");
    expect(filed.text).toMatch(/two other candidates/);
    expect(filed.text).toContain("Dana Whitfield");
    expect(filed.sourceRecordIds).toContain("filing:dana");
    // A question asked is not offered again; the rest are.
    expect(visit.choices.map((row) => row.key)).toEqual([
      "file",
      "ask-dates",
      "leave",
    ]);
    askAtCounter(core, visit, "ask-dates");
    expect(visit.lines.at(-1)!.text).toMatch(/November 2/);
    expect(visit.lines.at(-1)!.text).toMatch(/March 5/);
    // Filing: the clerk takes the papers, naming the office, and the vote's day.
    const file = visit.choices.find((row) => row.key === "file")!;
    filedAtCounter(core, visit, file);
    expect(visit.lines.at(-2)!.text).toBe(file.text);
    const taken = visit.lines.at(-1)!;
    expect(taken.speaker).toBe("clerk");
    expect(taken.text).toMatch(/the council|Dana Whitfield|two other/);
    expect(visit.choices).toEqual([]);
  });

  it("says nobody else has filed when the filings hold no one", () => {
    const race = {
      ...contest,
      electionDate: "2021-11-02",
      filed: { count: 0, recordIds: [] },
    };
    const visit = openFilingVisit(core, player.id, [race]);
    pickContest(core, visit, race.id, terms, []);
    askAtCounter(core, visit, "ask-filed");
    expect(visit.lines.at(-1)!.text).toMatch(/nobody|no one|first|not a soul/i);
  });
});
