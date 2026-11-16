import { buildBenchWorld } from "../bench/world";
import { describe, expect, it } from "vitest";
import { coreAPI } from "./state";
import { holdoverRule } from "./office-holdover";
import { standingPool, raceScope } from "./candidate-pool";
import {
  ballot,
  checkEligibility,
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "./modules/elections";
import {
  isOutsideOffice,
  OFFICES_MODULE_ID,
  unfilledTerm,
  type TermRow,
} from "./modules/offices";
import { officialOf } from "./modules/officials";
import {
  fileStandingCandidates,
  holdElection,
  resolveEmptyRace,
  VOTING_MODULE_ID,
} from "./modules/voting";
// Pinned (Nov 16). Before, the test drew its seed at run time from
// GOLDEN_PATH_SEED or randomBytes and drew up to twelve places from it until
// one had a House and a Senate race in the 2026 cycle, so a red came and went
// with the draw. Henlopen Acres, Delaware is the first draw at seed pin-wr-0
// and has both. Three cases fail here as they did at every place drawn
// (Parksley, Virginia and Fort Meade, Maryland among them): the national pool,
// the stand-in and the empty-race edge fixture, item
// tests-wide-races-three-cases-red-on-train (Needs cause).
// Limit: the whole file runs in 31 s alone and 33 s beside group-quarters
// (Nov 16, Train 800ae520), nearly all of it building the world at load;
// each case takes under 3 s, well inside the default 30 s.
const seed = "pin-wr-0";
const place = {
  key: "1033900",
  name: "Henlopen Acres, Delaware",
  state: "US-DE",
};
const world = buildBenchWorld(seed, "2026-01-20", {
  twoLevel: true,
  placeKey: place.key,
});

const api = coreAPI(world.core);
const elections = api.moduleState(ELECTIONS_MODULE_ID);
const contests = elections.table("contests").rows() as unknown as ContestRow[];
const president = contests.find((c) => c.officeId === "office:US:president")!;
describe("wide candidates and unfilled terms", () => {
  it("national standing includes real people beyond the played state", () => {
    const pool = standingPool(api, raceScope(api, president));
    const states = new Set(
      pool
        .map((p) => world.core.people.get(p.personId)?.placeId)
        .filter(Boolean),
    );
    expect(states.size, JSON.stringify({ seed, place })).toBeGreaterThan(1);
    const outside = pool.find(
      (p) =>
        world.core.people.get(p.personId)?.placeId?.startsWith("US-") &&
        world.core.people.get(p.personId)?.placeId !== place.state,
    )!;
    expect(
      checkEligibility(api, outside.personId, president.id, null).find(
        (c) => c.rule === "residency",
      )?.met,
    ).toBe(true);
  });
  it("a national pool holds every place's governor and statewide officers, filled in from their terms", () => {
    const where = JSON.stringify({ seed, place });
    const pool = new Map(
      standingPool(api, raceScope(api, president)).map(
        (p) => [p.personId, p] as const,
      ),
    );
    const offices = api.moduleState(OFFICES_MODULE_ID);
    const outside = (
      offices
        .table("terms")
        .query("byStatus", ["serving"]) as unknown as TermRow[]
    ).flatMap((term) => {
      const office = offices.table("offices").get(term.officeId) as unknown as
        | {
            kind: string;
            level: string;
            jurisdiction: string;
            elected: boolean;
          }
        | undefined;
      if (!office?.elected || !isOutsideOffice(api, office)) return [];
      const seat = offices.table("seats").get(term.seatId) as unknown as {
        district: string | null;
      };
      return [{ term, office, statewide: seat.district === null }];
    });
    const statewide = outside.filter((o) => o.statewide);
    // Every other place's chief executive, and the officers elected with it.
    expect(
      statewide.filter((o) => o.office.kind === "governor").length,
      where,
    ).toBeGreaterThanOrEqual(50);
    for (const { term } of statewide) {
      expect(term.personId, `${where}: ${term.id}`).toBe(`official:${term.id}`);
      const member = pool.get(term.personId!);
      expect(member?.roles, `${where}: ${term.id}`).toContain("officeholder");
      expect(member?.reach, `${where}: ${term.id}`).toBeGreaterThan(0);
      // The person matches their term: home in the office's place, its party.
      const person = world.core.people.get(term.personId!)!;
      expect(person.placeId, `${where}: ${term.id}`).toBe(
        term.identity.homeState,
      );
      expect(person.givenName, `${where}: ${term.id}`).toBe(
        term.identity.givenName,
      );
      expect(
        officialOf(api, term.personId!)?.party,
        `${where}: ${term.id}`,
      ).toBe(term.party);
    }
    // A holder with no party on record (an office elected without party
    // labels, a seat the research leaves unread) keeps none as a person.
    expect(
      statewide.filter((o) => o.term.party === null).length,
      where,
    ).toBeGreaterThan(0);
    // Filled in, they have no standing in the town's own state's races.
    const house = contests.find((c) => c.family === "usHouse")!;
    const statePool = new Set(
      standingPool(api, raceScope(api, house)).map((p) => p.personId),
    );
    expect(
      statewide
        .filter((o) => statePool.has(o.term.personId!))
        .map((o) => o.term.id),
      where,
    ).toEqual([]);
    // Another place's legislators stay named on their terms
    // (SG-GOV-outside-legislators-national-pool).
    const legislators = outside.filter((o) => !o.statewide);
    expect(legislators.length, where).toBeGreaterThan(5_000);
    expect(
      legislators.filter((o) => o.term.personId).map((o) => o.term.id),
      where,
    ).toEqual([]);
  });
  it("the stand-in cannot add candidates to a wide race owned by candidacy", () => {
    const before = elections
      .table("filings")
      .rows()
      .map((r) => r.id);
    fileStandingCandidates(api, president.id);
    expect(
      elections
        .table("filings")
        .rows()
        .map((r) => r.id),
    ).toEqual(before);
  });
  it("edge fixture: a vacant new congressional term uses its new end date and is idempotent", () => {
    const contest = contests.find((c) => c.family === "usHouse")!;
    const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
    const previous = terms.query("bySeatStatus", [
      contest.seatId,
      "serving",
    ])[0] as unknown as TermRow;
    terms.put({ ...previous, status: "ended", endDate: world.core.date });
    const vacancy = unfilledTerm(
      api,
      contest.seatId,
      "fixture:empty-result",
      "2029-01-03",
    )!;
    expect(vacancy.cause).toBe("fixture:empty-result");
    expect(vacancy.status).toBe("awaiting-election");
    const special = (
      elections.table("contests").rows() as unknown as ContestRow[]
    ).find((c) => c.special?.vacancyId === vacancy.id);
    expect(special?.special?.termEnd).toBe("2029-01-03");
    expect(
      unfilledTerm(api, contest.seatId, "fixture:empty-result", "2029-01-03"),
    ).toEqual(vacancy);
  });
  it("edge fixture: no winner does not remove a senator before the term boundary", () => {
    const contest = contests.find((c) => c.officeId.includes("us-senate"))!;
    const empty = { ...contest, id: `fixture:empty:${contest.id}` };
    elections.table("contests").put(empty);
    const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
    const previous = terms.query("bySeatStatus", [
      contest.seatId,
      "serving",
    ])[0] as unknown as TermRow;
    expect(holdElection(api, empty.id).winnerId).toBeNull();
    resolveEmptyRace(api, empty.id);
    expect(terms.get(previous.id)?.status).toBe("serving");
    const row = api
      .moduleState(VOTING_MODULE_ID)
      .table("emptyRaces")
      .get(`empty:${empty.id}`)!;
    world.core.date = String(row.due);
    resolveEmptyRace(api, empty.id);
    expect(terms.get(previous.id)?.status).toBe("ended");
    expect(
      api.moduleState(VOTING_MODULE_ID).table("emptyRaces").get(row.id)
        ?.vacancyId,
    ).toBeTruthy();
  });
  it("edge fixture: one name on the ballot wins unopposed with whole vote totals", () => {
    // A race whose serving incumbent has a filing (candidacy files them in
    // play), then all but one withdraw. The state and county races go first; a
    // place whose incumbents are refused for them takes any other race that
    // obtains a filing, so the check holds in every drawn place.
    const rank = (row: ContestRow) =>
      row.family === "stateLegislative" || row.family === "countyOffice"
        ? 0
        : 1;
    let contest: ContestRow | undefined;
    for (const c of [...contests].sort((a, b) => rank(a) - rank(b))) {
      const term = c.incumbentTermId
        ? (api
            .moduleState(OFFICES_MODULE_ID)
            .table("terms")
            .get(c.incumbentTermId) as unknown as TermRow | undefined)
        : undefined;
      // The fixture's own filing row, as the filing office would hold it.
      if (term?.status === "serving" && term.personId)
        elections.table("filings").put({
          id: `filing:${c.id}:${term.personId}`,
          contestId: c.id,
          personId: term.personId,
          filedOn: api.state.date,
          filedWith: "fixture",
          platform: [],
          party: null,
          status: "on-ballot",
        } as unknown as never);
      if (ballot(api, c.id).length) {
        contest = c;
        break;
      }
    }
    expect(contest, JSON.stringify({ seed, place })).toBeDefined();
    const filings = ballot(api, contest!.id);
    for (const filing of filings.slice(1))
      elections
        .table("filings")
        .put({ ...filing, status: "withdrawn" } as unknown as never);
    const result = holdElection(api, contest!.id);
    expect(result.winnerId, JSON.stringify({ seed, place })).toBe(
      filings[0]!.personId,
    );
    for (const n of Object.values(result.totals))
      expect(Number.isInteger(n)).toBe(true);
  });
  it("edge fixture: an empty state or local race schedules its estimated holdover with a source the calendar accepts", () => {
    const contest = contests.find((c) => c.family === "usHouse")!;
    // The same contest as a local race: the rule it reads is the place's own or the family default.
    const empty = {
      ...contest,
      id: `fixture:empty-state:${contest.id}`,
      level: "state",
      family: "municipalOffice" as const,
    };
    elections.table("contests").put(empty);
    expect(() => holdElection(api, empty.id)).not.toThrow();
    const row = api
      .moduleState(VOTING_MODULE_ID)
      .table("emptyRaces")
      .get(`empty:${empty.id}`)!;
    expect(row.method).toBe(
      holdoverRule(place.state, "municipalOffice").rule === "holds-over"
        ? "holdover"
        : "vacancy",
    );
  });
});
