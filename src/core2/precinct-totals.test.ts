import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { advanceCore } from "./life";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { VOTING_MODULE_ID, type ResultRow } from "./modules/voting";
import { coreAPI } from "./state";

// The count saves the town's votes by precinct, so a later read can name a
// part of town (pool item director-after-race-turned-precinct-more-cases). Pinned: Bountiful, Utah (15 precincts; its
// county board seats are up in Nov 2026), found by drawing "probe:3"
// for step12 once; place and seed in every message.
const PIN = { draw: "probe:3", purpose: "step12" } as const;

it("the count saves its votes by precinct, and the precincts add up to the count", () => {
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
