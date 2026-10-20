/**
 * Election law from data: filing deadlines, municipal cycle years, special
 * election dates, filing fallbacks, the incumbent a contest points at, ties,
 * felony disenfranchisement and recall thresholds. Places are drawn from all
 * 56 and named in the output.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import filingDeadlines from "./data/elections/filing-deadlines.json" with { type: "json" };
import cycles from "./data/elections/municipal-cycles.json" with { type: "json" };
import felony from "./data/elections/felony-disenfranchisement.json" with { type: "json" };
import termStarts from "./data/elections/term-starts.json" with { type: "json" };
import recallUnresolved from "./data/elections/recall-threshold-unresolved.json" with { type: "json" };
import tieRules from "../../data/research/elections/tie-rules-2026.json" with { type: "json" };
import {
  electionInYear,
  municipalFilingDeadline,
  specialElectionDate,
  termStartAfter,
} from "./elections-calendar";
import { breakElectionTie } from "./election-ties";
import {
  felonyDisenfranchisedShare,
  barredFromVoting,
} from "./law-reach/group-a-voting";
import { municipalRulePackFor } from "./gov-rules/municipal-election-rule-packs";
import { FILING_LEAD_DAYS } from "./gov-rules/town-election-calendar";
import {
  ELECTIONS_MODULE_ID,
  contestsOnDate,
  fileCandidacy,
  filingRequirements,
  incumbentOf,
  openElections,
  syncIncumbent,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { OFFICES_MODULE_ID, openOffices, vacateSeat } from "./modules/offices";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import type { OfficeInput } from "./offices-local";
import type { CoreAPI } from "./types";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import { resolveMunicipalElectionTiming } from "./gov-rules/municipal-ballot-rules";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`elections-law:${Date.now()}`).digest("hex");
const drawn = drawPlace(seed, "elections-law");

const town = (stateKey: string): OfficeInput =>
  ({
    id: "office:test:council",
    level: "city",
    jurisdiction: "test",
    governmentName: "Test",
    kind: "council",
    title: "Council",
    seats: 5,
    termYears: 4,
    elected: true,
    districted: false,
    coversTown: true,
    source: stateKey,
    estimate: true,
  }) as OfficeInput;

function worldIn(placeKey: string) {
  const core = createLifeCore(
    buildPopulation({ seed, placeKey, startedAt: START, minimumPeople: 200 }),
  );
  openOffices(core, seed);
  openElections(core);
  return core;
}

function placeInState(stateKey: string): string {
  return [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: stateKey,
      scope: "locality",
    }),
  ].sort((a, b) => a.key.localeCompare(b.key))[0]!.key;
}

describe(`election law from data (place ${drawn.name}, ${drawn.state}, seed ${seed.slice(0, 12)})`, () => {
  it("a town's filing deadline is its state's own rule, not the federal average", () => {
    // The state's rule for the drawn place, wherever it is read.
    const row = (
      filingDeadlines.places as Record<string, { rule: { kind: string } }>
    )[drawn.state]!;
    const election = "2025-11-04";
    const found = municipalFilingDeadline(drawn.state, election);
    if (row.rule.kind === "unread" || row.rule.kind === "not-applicable")
      expect(found).toBeNull();
    else if (found) expect(found.date < election).toBe(true);
    // A rule written as a weekday of a month: the third Friday in July.
    const nc = municipalFilingDeadline("US-NC", election);
    expect(nc?.date).toBe("2025-07-18");
    expect(nc?.date).not.toBe(
      new Date(
        Date.parse(`${election}T00:00:00Z`) - FILING_LEAD_DAYS * 86400000,
      )
        .toISOString()
        .slice(0, 10),
    );
    // Places the code does not fix take the researched lead, marked estimated.
    for (const [state, days] of [
      ["US-AK", 60],
      ["US-DE", 45],
      ["US-FL", 75],
      ["US-MD", 45],
    ] as const) {
      const est = municipalFilingDeadline(state, "2025-11-04");
      expect(est?.estimated, state).toBe(true);
      expect(est?.date, state).toBe(
        new Date(Date.parse("2025-11-04T00:00:00Z") - days * 86400000)
          .toISOString()
          .slice(0, 10),
      );
    }
    // A rule written in days: Texas's 78th day.
    expect(municipalFilingDeadline("US-TX", "2025-05-03")?.date).toBe(
      "2025-02-14",
    );
    // Georgia's qualifying window closes the Friday after the third Monday in
    // August: August 18, 2025 is that Monday, so the deadline is the 22nd.
    expect(municipalFilingDeadline("US-GA", election)?.date).toBe("2025-08-22");
    // Nevada's window closes the second Friday after the first Monday in
    // March (2026: March 2 to 13), West Virginia's the last Saturday of
    // January, Kentucky's the second Tuesday in August.
    expect(municipalFilingDeadline("US-NV", "2026-11-03")?.date).toBe(
      "2026-03-13",
    );
    expect(municipalFilingDeadline("US-WV", "2026-06-09")?.date).toBe(
      "2026-01-31",
    );
    expect(municipalFilingDeadline("US-KY", "2025-11-04")?.date).toBe(
      "2025-08-12",
    );
    // Arizona's papers are due 120 days before the election: Tempe's March 10,
    // 2026 election closed filing on November 10, 2025.
    expect(municipalFilingDeadline("US-AZ", "2026-03-10")?.date).toBe(
      "2025-11-10",
    );
    // Wyoming's filing closes 81 days before the primary, which is the first
    // Tuesday after the third Monday in August: August 18, 2026, so May 29.
    expect(municipalFilingDeadline("US-WY", "2026-11-03")?.date).toBe(
      "2026-05-29",
    );
    // Michigan's charter cities that file for the general election close
    // on the fifteenth Tuesday before it: July 22, 2025 for November 4.
    expect(municipalFilingDeadline("US-MI", "2025-11-04")?.date).toBe(
      "2025-07-22",
    );
    // New Hampshire's window ends the Friday of the week after the seventh
    // Wednesday before a Tuesday town election: March 11, 2025 gives
    // January 31; Mississippi's closed January 31, 2025 for the April 1 primary.
    expect(municipalFilingDeadline("US-NH", "2025-03-11")?.date).toBe(
      "2025-01-31",
    );
    expect(municipalFilingDeadline("US-MS", "2025-06-03")?.date).toBe(
      "2025-01-31",
    );
    // Pennsylvania's petitions close the tenth Tuesday before the third-Tuesday
    // May primary: March 7, 2023 for the May 16 primary.
    expect(municipalFilingDeadline("US-PA", "2023-11-07")?.date).toBe(
      "2023-03-07",
    );
    // Oklahoma's filing closes the Wednesday of the first week of December,
    // the year before a February or April election: December 3, 2025 for 2026.
    expect(municipalFilingDeadline("US-OK", "2026-04-07")?.date).toBe(
      "2025-12-03",
    );
    // Indiana's city declarations close 88 days before the May primary:
    // February 3, 2023 for the May 2 primary.
    expect(municipalFilingDeadline("US-IN", "2023-11-07")?.date).toBe(
      "2023-02-03",
    );
    // Rhode Island's declarations close the Wednesday of the last Monday to
    // Wednesday run in June: June 26, 2024 and June 24, 2026 (the state's form).
    expect(municipalFilingDeadline("US-RI", "2024-11-05")?.date).toBe(
      "2024-06-26",
    );
    expect(municipalFilingDeadline("US-RI", "2026-11-03")?.date).toBe(
      "2026-06-24",
    );
    // Connecticut's petitions go to the town clerk by the 90th day before the
    // election: August 6, 2025 for November 4.
    expect(municipalFilingDeadline("US-CT", "2025-11-04")?.date).toBe(
      "2025-08-06",
    );
    // Every one of the 56 places has a row with a citation and a tag.
    const rows = Object.values(
      filingDeadlines.places as Record<
        string,
        { citation: string; tag: string }
      >,
    );
    expect(rows).toHaveLength(56);
    for (const r of rows) expect(["SOURCED", "ESTIMATED"]).toContain(r.tag);
  });

  it("a cycle town votes in its state's own cycle years", () => {
    const states = cycles.states as Record<
      string,
      { anchorYear: number; periodYears: number }
    >;
    for (const [stateKey, row] of Object.entries(states)) {
      const years: number[] = [];
      for (let year = 2020; year <= 2032; year += 1) {
        const found = electionInYear({
          office: town(stateKey),
          stateKey,
          placeGeoid: "0000000",
          year,
          onDate: `${year}-01-01`,
        });
        if (found) years.push(year);
      }
      const expected: number[] = [];
      for (let year = 2020; year <= 2032; year += 1)
        if ((year - row.anchorYear) % row.periodYears === 0)
          expected.push(year);
      expect(years, stateKey).toEqual(expected);
    }
    // Mississippi's towns vote in 2025, not only years divisible by four.
    expect(
      electionInYear({
        office: town("US-MS"),
        stateKey: "US-MS",
        placeGeoid: "0000000",
        year: 2025,
        onDate: "2025-01-01",
      })?.electionDate,
    ).toBe("2025-06-03");
  });

  it("every place's municipal election years match its state's data (all 56, the drawn place named)", () => {
    const rows = cycles.states as Record<
      string,
      { anchorYear: number; periodYears: number; timing: string }
    >;
    const yearsOf = (stateKey: string) => {
      const years: number[] = [];
      for (let year = 2020; year <= 2032; year += 1)
        if (
          electionInYear({
            office: town(stateKey),
            stateKey,
            placeGeoid: "0000000",
            year,
            // Asked from mid-year before: a spring election's filing can
            // close in the winter before it.
            onDate: `${year - 1}-06-01`,
          })?.electionDate.startsWith(`${year}-`)
        )
          years.push(year);
      return years;
    };
    const states = [
      ...new Set([...corePlaceStateIdentities()].map((s) => s.jurisdictionKey)),
    ].sort();
    expect(states.length).toBe(56);
    for (const stateKey of [drawn.state, ...states]) {
      const where = `${stateKey}${stateKey === drawn.state ? ` (drawn: ${drawn.name}, seed ${seed.slice(0, 12)})` : ""}`;
      const timing = resolveMunicipalElectionTiming(
        stateKey.slice(3),
        "0",
      )?.timing;
      if (!timing) continue;
      const years = yearsOf(stateKey);
      if (timing.startsWith("quadrennial")) {
        // A multi-year cycle is read from the state's own row, never assumed.
        const row = rows[stateKey];
        expect(row, `${where}: ${timing} has no cycle row`).toBeDefined();
        expect(row!.timing, where).toBe(timing);
        const expected: number[] = [];
        for (let year = 2020; year <= 2032; year += 1)
          if ((year - row!.anchorYear) % row!.periodYears === 0)
            expected.push(year);
        expect(years, where).toEqual(expected);
      } else {
        // Every other timing holds a town election in every four years.
        for (let start = 2020; start <= 2029; start += 1)
          expect(
            years.some((y) => y >= start && y < start + 4),
            `${where}: ${timing} holds no town election in ${start} to ${start + 3}`,
          ).toBe(true);
      }
    }
  });

  it("a special election follows the state's law for the office, else the estimate", () => {
    const office = {
      ...town("US-CA"),
      level: "federal",
      kind: "us-house",
      jurisdiction: "US-CA",
    } as OfficeInput;
    const read = specialElectionDate({
      office,
      stateKey: "US-CA",
      vacancyDate: "2026-03-01",
    });
    expect(read.electionDate).not.toBe("2026-05-30");
    expect(read.basis).toBe("estimated");
    const unread = specialElectionDate({
      office: town("US-NC"),
      stateKey: "US-NC",
      vacancyDate: "2026-03-01",
    });
    expect(unread.electionDate).toBe("2026-05-30");
    expect(unread.source).toMatch(/ESTIMATED/);
  });

  it("a U.S. House vacancy in Alaska or Iowa is dated by that state's law as GAO describes it, with the estimate's source naming the statute", () => {
    for (const [state, days, statute] of [
      ["US-AK", 135, "Alaska Stat. 15.40.140"],
      ["US-IA", 50, "Iowa Code 69.14"],
      ["US-NY", 75, "Election Law 6-114"],
      ["US-WA", 150, "RCW 29A.28.041"],
      ["US-GA", 45, "O.C.G.A. 21-2-543"],
      ["US-PA", 75, "25 P.S. 2777"],
      ["US-MA", 152, "M.G.L. ch. 54 sec. 140"],
      ["US-TN", 140, "Tenn. Code 2-16-101"],
      ["US-MD", 160, "Election Law 8-710"],
      ["US-NJ", 150, "A5886/S4664"],
      ["US-AR", 120, "Ark. Code 7-8-104"],
      ["US-VT", 120, "17 V.S.A. 2621"],
      ["US-KS", 87, "K.S.A. 25-3501"],
      ["US-NE", 82, "Neb. Rev. Stat. 32-564"],
      ["US-SD", 85, "SDCL 12-11-1"],
      ["US-WY", 89, "W.S. 22-18"],
      ["US-IL", 120, "10 ILCS 5/25-7"],
      ["US-AZ", 200, "HB 2538"],
      ["US-NV", 120, "NRS 304.230"],
      ["US-WV", 102, "W. Va. Code 3-10-4"],
      ["US-SC", 137, "S.C. Code 7-13-190"],
      ["US-CT", 70, "9-212"],
      ["US-NM", 84, "1-15-18.1"],
      ["US-MS", 90, "23-15-853"],
      ["US-MT", 92, "Montana's 2015 law"],
    ] as const) {
      const office = {
        ...town(state),
        level: "federal",
        kind: "us-house",
        jurisdiction: state,
      } as OfficeInput;
      const read = specialElectionDate({
        office,
        stateKey: state,
        vacancyDate: "2026-03-01",
      });
      const expected = new Date(Date.parse("2026-03-01") + days * 86_400_000)
        .toISOString()
        .slice(0, 10);
      expect(read.electionDate, state).toBe(expected);
      expect(read.source, state).toContain(statute);
      if (["US-AK", "US-IA"].includes(state))
        expect(read.source, state).toContain("GAO-24-107789");
    }
  });

  it("Texas dates a U.S. House vacancy on the first uniform date after the 36th day, and a governor-sets state says its law was read", () => {
    const house = (state: string) =>
      ({
        ...town(state),
        level: "federal",
        kind: "us-house",
        jurisdiction: state,
      }) as OfficeInput;
    // 2026-01-05 + 36 days = 2026-02-10: the first uniform date after it is the first Saturday in May.
    const spring = specialElectionDate({
      office: house("US-TX"),
      stateKey: "US-TX",
      vacancyDate: "2026-01-05",
    });
    expect(spring.electionDate).toBe("2026-05-02");
    expect(spring.source).toContain("203.004");
    // 2026-06-01 + 36 days = 2026-07-07: the next uniform date is the November general election day.
    const fall = specialElectionDate({
      office: house("US-TX"),
      stateKey: "US-TX",
      vacancyDate: "2026-06-01",
    });
    expect(fall.electionDate).toBe("2026-11-03");
    // Ohio's governor sets the day: the estimate dates it and the source cites the law.
    const ohio = specialElectionDate({
      office: house("US-OH"),
      stateKey: "US-OH",
      vacancyDate: "2026-03-01",
    });
    expect(ohio.basis).toBe("estimated");
    expect(ohio.source).toContain("3521.03");
    expect(ohio.electionDate).toBe("2026-05-30");
    // Colorado's governor sets the day; the estimate dates it, and the source cites the section.
    const colorado = specialElectionDate({
      office: house("US-CO"),
      stateKey: "US-CO",
      vacancyDate: "2026-03-01",
    });
    expect(colorado.source).toContain("1-12-202");
    expect(colorado.basis).toBe("estimated");
  });

  it("a state legislative vacancy is dated by the state's law where the data reads it", () => {
    const seat = (state: string) =>
      ({
        ...town(state),
        level: "state",
        kind: "legislature-upper",
        jurisdiction: state,
      }) as OfficeInput;
    for (const [state, days, cite] of [
      ["US-GA", 55, "21-2-544"],
      ["US-MN", 35, "204D.19"],
      ["US-DE", 33, "7102"],
      ["US-NY", 35, "6-114"],
    ] as const) {
      const read = specialElectionDate({
        office: seat(state),
        stateKey: state,
        vacancyDate: "2026-03-01",
      });
      const expected = new Date(Date.parse("2026-03-01") + days * 86_400_000)
        .toISOString()
        .slice(0, 10);
      expect(read.electionDate, state).toBe(expected);
      expect(read.source, state).toContain(cite);
    }
  });

  it("a term starts on the office's own rule, the data's default where none is read", () => {
    const office = town("US-NC");
    const start = termStartAfter(office, "2026-11-03");
    expect(start).toBe(`2027-${termStarts.default.monthDay}`);
    expect(
      termStartAfter({ ...office, termStarts: "01-20" }, "2028-11-07"),
    ).toBe("2029-01-20");
  });

  it("a governor's term starts on the state's own clause where it is read", () => {
    const governor = (state: string) => ({
      ...town(state),
      jurisdiction: state,
      level: "state" as const,
      kind: "governor",
    });
    // Alaska: first Monday in December following the vote.
    expect(termStartAfter(governor("US-AK"), "2026-11-03")).toBe("2026-12-07");
    // Florida: first Tuesday after the first Monday in January.
    expect(termStartAfter(governor("US-FL"), "2026-11-03")).toBe("2027-01-05");
    // Virginia: Saturday after the second Wednesday in January.
    expect(termStartAfter(governor("US-VA"), "2025-11-04")).toBe("2026-01-17");
    // Washington: Wednesday after the second Monday in January.
    expect(termStartAfter(governor("US-WA"), "2024-11-05")).toBe("2025-01-15");
    // An unread state keeps the data's default.
    expect(termStartAfter(governor("US-NC"), "2026-11-03")).toBe(
      `2027-${termStarts.default.monthDay}`,
    );
  });

  it("filing fallbacks come from data and say so", () => {
    // The places whose county row is unread take the data's age and title.
    const unread = filingRequirements("US-AK", "countyOffice");
    expect(unread.fallbacks).toContain("minimumAge");
    expect(unread.estimate).toBe(true);
    expect(unread.minimumAge).toBeGreaterThanOrEqual(18);
    const own = filingRequirements(drawn.state, "usHouse");
    expect(own.minimumAge).toBe(25);
    expect(own.filedWith.length).toBeGreaterThan(0);
  });

  it("the filing announcement's tag follows the contest's basis; a next contest points at the serving term", () => {
    const core = worldIn(drawn.key);
    const api = coreAPI(core) as CoreAPI;
    const table = (name: string) =>
      api.moduleState(ELECTIONS_MODULE_ID).table(name);
    const contests = table("contests").rows() as unknown as ContestRow[];
    const emitted: { source: { tag: string }; kind: string }[] = [];
    const spy = Object.create(api, {
      emit: { value: (e: (typeof emitted)[number]) => emitted.push(e) },
    }) as CoreAPI;
    const adult = [...core.people.values()]
      .filter(
        (p) =>
          Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 40,
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    let checked = 0;
    for (const contest of contests) {
      for (const person of adult) {
        const result = fileCandidacy(spy, {
          personId: person.id,
          contestId: contest.id,
          platform: [],
          party: null,
        });
        if (result.status === "refused") continue;
        const event = emitted[emitted.length - 1]!;
        expect(event.kind).toBe("candidate-filed");
        expect(event.source.tag, `${contest.id} ${contest.basis}`).toBe(
          contest.basis === "read" ? "SOURCED" : "ESTIMATED",
        );
        checked += 1;
        break;
      }
    }
    expect(
      checked,
      JSON.stringify(
        contests.map((c) => [c.id, c.filingOpens, c.filingDeadline]),
      ),
    ).toBeGreaterThan(0);

    // Index by election date for the voting code.
    const byDate = contestsOnDate(api, contests[0]!.electionDate);
    expect(byDate.map((c) => c.id)).toContain(contests[0]!.id);

    // A holder leaves; the appointee or winner serving is the incumbent.
    const offices = api.moduleState(OFFICES_MODULE_ID);
    const target = contests.find((c) => {
      const term = offices
        .table("terms")
        .query("bySeatStatus", [c.seatId, "serving"])[0];
      return !!term && c.level !== "federal";
    });
    if (target) {
      const before = target.incumbentTermId;
      vacateSeat(api, target.seatId, "resignation");
      const serving = offices
        .table("terms")
        .query("bySeatStatus", [target.seatId, "serving"])[0] as
        { id: string } | undefined;
      const synced = syncIncumbent(api, target);
      if (serving) {
        expect(synced.incumbentTermId).toBe(serving.id);
        expect(incumbentOf(api, target.id)?.id).toBe(serving.id);
        expect(serving.id).not.toBe(before);
      }
    }
  });

  it("a tie is settled the way the state's law says, a lot kept as a record", () => {
    const states = tieRules.states as Record<
      string,
      Record<string, { method: string }>
    >;
    const lotState = Object.keys(states)
      .sort()
      .find((k) => states[k]!.localTie?.method === "lot")!;
    const core = worldIn(placeInState(lotState));
    const api = coreAPI(core) as CoreAPI;
    const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
    const contest = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).find(
      (c) => c.family === "municipalOffice" || c.family === "countyOffice",
    )!;
    const people = [...core.people.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    const tied = [people[0]!.id, people[1]!.id];
    for (const id of tied)
      filings.put({
        id: `filing:${contest.id}:${id}`,
        contestId: contest.id,
        personId: id,
        filedOn: START,
        filedWith: "test",
        platform: [],
        party: null,
        status: "on-ballot",
      } as unknown as FilingRow as never);
    let second = 0;
    const winner = breakElectionTie(api, contest, tied, () => {
      second += 1;
    });
    expect(second).toBe(0);
    expect(tied).toContain(winner);
    // The same tie draws the same lot, and the lot is kept.
    expect(breakElectionTie(api, contest, [...tied].reverse(), () => {})).toBe(
      winner,
    );
    const row = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("ties")
      .get(`tie:${contest.id}`) as unknown as {
      method: string;
      citation: string;
      slips: Record<string, string>;
    };
    expect(row.method).toBe("lot");
    expect(row.citation.length).toBeGreaterThan(0);
    expect(Object.keys(row.slips).sort()).toEqual([...tied].sort());
  });

  it("a second election follows where the law says new election", () => {
    const states = tieRules.states as Record<
      string,
      Record<string, { method: string }>
    >;
    const state = Object.keys(states)
      .sort()
      .find((k) => states[k]!.localTie?.method === "new-election")!;
    const core = worldIn(placeInState(state));
    const api = coreAPI(core) as CoreAPI;
    const contest = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).find(
      (c) => c.family === "municipalOffice" || c.family === "countyOffice",
    )!;
    let second = 0;
    const winner = breakElectionTie(api, contest, ["a", "b"], () => {
      second += 1;
    });
    expect(winner).toBeNull();
    expect(second).toBe(1);
  });

  it("a race-size tie rule reads the statute's own line where the data names one", () => {
    const states = tieRules.states as Record<
      string,
      Record<
        string,
        {
          method: string;
          smallRace?: { method: string; atOrBelowVotes?: number };
        }
      >
    >;
    const state = Object.keys(states)
      .sort()
      .find((k) => states[k]!.generalElectionTie?.smallRace?.atOrBelowVotes)!;
    const rule = states[state]!.generalElectionTie!;
    const line = rule.smallRace!.atOrBelowVotes!;
    const api = coreAPI(worldIn(placeInState(state))) as CoreAPI;
    const local = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    )[0]!;
    const methodAt = (votes: number) => {
      const contest = {
        ...local,
        id: `${local.id}:size-${votes}`,
        family: "federalOffice",
      } as unknown as ContestRow;
      breakElectionTie(api, contest, ["a", "b"], () => {}, votes);
      return (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("ties")
          .get(`tie:${contest.id}`) as unknown as { method: string }
      ).method;
    };
    expect(methodAt(line), state).toBe(rule.smallRace!.method);
    expect(methodAt(line + 1), state).toBe(rule.method);
  });

  it("felony disenfranchisement is the state's own share; no named person is barred without a record", () => {
    const core = worldIn(drawn.key);
    const api = coreAPI(core) as CoreAPI;
    const own = (felony.states as Record<string, number>)[drawn.state];
    expect(felonyDisenfranchisedShare(api)).toBe(own ?? felony.nationalShare);
    expect(barredFromVoting(api, [...core.people.keys()][0]!)).toBe(false);
  });

  it("the states with no one recall threshold are listed in data, with why", () => {
    for (const [usps, row] of Object.entries(
      recallUnresolved.states as Record<
        string,
        { why: string; citation: string }
      >,
    )) {
      expect(row.why.length).toBeGreaterThan(0);
      expect(row.citation.length).toBeGreaterThan(0);
      expect(municipalRulePackFor(usps)?.recallPetitionThreshold.kind).toBe(
        "unknown",
      );
    }
  });
});
