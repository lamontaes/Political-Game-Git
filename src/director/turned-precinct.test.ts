import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "../core2/modules/elections";
import { VOTING_MODULE_ID, type ResultRow } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import { precinctShift } from "./race-turnout-facts";

// The count saves the town's votes by precinct, and a later read names the
// part of town that turned. Pinned: Bountiful, Utah (15 precincts; its
// county board seats are up in Nov 2026), found by drawing "probe:3"
// for step12 once; place and seed in every message.
const PIN = { draw: "probe:3", purpose: "step12" } as const;

it("precincts add up to the count, and the part of town that turned is named from them", () => {
  const place = drawPlace(PIN.draw, PIN.purpose);
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, "2026-10-27", {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const contests = () =>
    (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).filter((c) => c.electionDate === "2026-11-03");
  const results = api.moduleState(VOTING_MODULE_ID).table("results");
  const resultOf = (id: string) =>
    results.get(`result:${id}`) as unknown as ResultRow | undefined;
  advanceCore(core, "2026-11-10");
  const counted = contests()
    .map((c) => ({ c, r: resultOf(c.id) }))
    .filter((x) => x.r?.precinctTotals);
  expect(counted.length, `${where}: no count with precincts`).toBeGreaterThan(
    0,
  );
  for (const { c, r } of counted) {
    const rows = Object.values(r!.precinctTotals!);
    expect(rows.length, `${where} ${c.id}`).toBeGreaterThan(1);
    for (const id of Object.keys(r!.namedVotes)) {
      const sum = rows.reduce((n, row) => n + (row[id] ?? 0), 0);
      expect(sum, `${where} ${c.id} ${id}`).toBe(
        (r!.namedVotes[id] ?? 0) + (r!.countedVotes[id] ?? 0),
      );
    }
  }
}, 170_000);

it("the precinct that turned is the one whose share moved most, and which way", () => {
  const earlier = {
    "1": { a: 50, b: 50 },
    "2": { a: 60, b: 40 },
    "3": { a: 40, b: 60 },
  };
  const now = {
    "1": { a: 45, b: 55 },
    "2": { a: 30, b: 70 },
    "3": { a: 45, b: 55 },
  };
  expect(precinctShift(now, earlier, ["a"], ["a"])).toEqual({
    precinct: "2",
    delta: expect.closeTo(-0.3, 5),
  });
  // A first race: the party's earlier candidate stands in for them.
  expect(precinctShift(now, earlier, ["a"], ["b"])?.precinct).toBe("3");
  expect(precinctShift(now, now, ["a"], ["a"])).toBeNull();
  expect(precinctShift(now, earlier, ["a"], [])).toBeNull();
});
