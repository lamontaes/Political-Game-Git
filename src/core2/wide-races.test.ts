import { buildBenchWorld } from "../bench/world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { coreAPI } from "./state";
import { standingPool, raceScope } from "./candidate-pool";
import {
  checkEligibility,
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "./modules/elections";
import {
  OFFICES_MODULE_ID,
  unfilledTerm,
  type TermRow,
} from "./modules/offices";
import {
  fileStandingCandidates,
  holdElection,
  resolveEmptyRace,
  VOTING_MODULE_ID,
} from "./modules/voting";
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "office-federal");
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
});
