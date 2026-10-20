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
    // A rule written in days: Texas's 78th day.
    expect(municipalFilingDeadline("US-TX", "2025-05-03")?.date).toBe(
      "2025-02-14",
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
    // California: the Monday after January 1 (a January 1 that is a Monday gives January 8).
    expect(termStartAfter(governor("US-CA"), "2026-11-03")).toBe("2027-01-04");
    expect(termStartAfter(governor("US-CA"), "2028-11-07")).toBe("2029-01-08");
    // Colorado: second Tuesday; Illinois and Indiana: second Monday; New Jersey: third Tuesday.
    expect(termStartAfter(governor("US-CO"), "2026-11-03")).toBe("2027-01-12");
    expect(termStartAfter(governor("US-IL"), "2026-11-03")).toBe("2027-01-11");
    expect(termStartAfter(governor("US-IN"), "2028-11-07")).toBe("2029-01-08");
    expect(termStartAfter(governor("US-NJ"), "2025-11-04")).toBe("2026-01-20");
    // Ohio and Oklahoma: second Monday; Pennsylvania: third Tuesday; Maryland: third Wednesday; Wisconsin: first Monday.
    expect(termStartAfter(governor("US-OH"), "2026-11-03")).toBe("2027-01-11");
    expect(termStartAfter(governor("US-OK"), "2026-11-03")).toBe("2027-01-11");
    expect(termStartAfter(governor("US-PA"), "2026-11-03")).toBe("2027-01-19");
    expect(termStartAfter(governor("US-MD"), "2026-11-03")).toBe("2027-01-20");
    expect(termStartAfter(governor("US-WI"), "2026-11-03")).toBe("2027-01-04");
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
