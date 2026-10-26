/**
 * An election nobody ran in resolves by the place's own law for the office
 * (data/offices/holdover.json): the holder serves on, or the seat is vacant
 * and the vacancy rule runs, which for an empty special election means the
 * next special. Each result leaves a record with its reason. A place is drawn
 * from all 56; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { coreAPI } from "./state";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import {
  OFFICES_MODULE_ID,
  unfilledTerm,
  type TermRow,
} from "./modules/offices";
import { holdoverRule } from "./office-holdover";
import {
  holdElection,
  resolveEmptyRace,
  VOTING_MODULE_ID,
} from "./modules/voting";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "empty-race");
const world = buildBenchWorld(seed, "2026-01-20", {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(world.core);
const contests = () =>
  api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[];
const emptyRow = (id: string) =>
  api.moduleState(VOTING_MODULE_ID).table("emptyRaces").get(`empty:${id}`)!;
const where = JSON.stringify({ seed, place: place.key });
const house = contests().find((c) => c.family === "usHouse");

describe("an election nobody ran in", () => {
  it("follows the place's law for the office family: holds over or goes vacant, with the reason", () => {
    expect(house, where).toBeDefined();
    for (const family of ["municipalOffice", "stateLegislative"] as const) {
      const empty = {
        ...house!,
        id: `fixture:empty:${family}:${house!.id}`,
        level: "state",
        family,
      };
      api.moduleState(ELECTIONS_MODULE_ID).table("contests").put(empty);
      expect(holdElection(api, empty.id).winnerId, where).toBeNull();
      const rule = holdoverRule(place.state, family);
      const row = emptyRow(empty.id);
      expect(row.method, `${where} ${family}`).toBe(
        rule.rule === "holds-over" ? "holdover" : "vacancy",
      );
      expect(row.rule, where).toBe(rule.rule);
      expect(row.ruleBasis, where).toBe(rule.basis);
      expect(String(row.source).length, where).toBeGreaterThan(10);
    }
  });

  it("an empty special election runs the vacancy rule again, dated from the day it resolved", () => {
    const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
    const serving = terms.query("bySeatStatus", [
      house!.seatId,
      "serving",
    ])[0] as unknown as TermRow;
    terms.put({ ...serving, status: "ended", endDate: world.core.date });
    const vacancy = unfilledTerm(
      api,
      house!.seatId,
      "fixture:empty-special",
      "2029-01-03",
    )!;
    const first = contests().find((c) => c.special?.vacancyId === vacancy.id)!;
    expect(first, where).toBeDefined();
    // The count is on election day.
    world.core.date = first.electionDate;
    expect(holdElection(api, first.id).winnerId, where).toBeNull();
    const row = emptyRow(first.id);
    expect(row.method, where).toBe("repeat-special");
    world.core.date = [world.core.date, String(row.due)].sort().at(-1)!;
    resolveEmptyRace(api, first.id);
    const done = emptyRow(first.id);
    expect(done.status, where).toBe("resolved");
    expect(done.vacancyId, where).toBe(vacancy.id);
    const next = contests().find(
      (c) => c.special?.vacancyId === vacancy.id && c.id !== first.id,
    );
    expect(next, where).toBeDefined();
    expect(next!.electionDate > world.core.date, where).toBe(true);
    expect(done.nextSpecialOn, where).toBe(next!.electionDate);
    // The vacancy is still waiting on its election.
    expect(
      (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("vacancies")
          .get(vacancy.id) as unknown as { status: string }
      ).status,
      where,
    ).toBe("awaiting-election");
  });
});
