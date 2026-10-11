import { describe, expect, it } from "vitest";
import { createCore, coreAPI } from "./state";
import { piecesInput, piecesSource as source } from "./core-pieces-fixture";
import { censusVoterSpreads } from "./tooling/voter-spreads";
import type { VoterGroup } from "./voter-groups";
const row: VoterGroup = {
  id: "group",
  placeId: "place",
  ageBand: "18 to 24 years",
  lean: -0.2,
  turnout: 0.4,
  size: 100,
  asOf: "2026-01-01",
  source,
  sourceRecordIds: ["views:record", "participation:record"],
};
describe("recorded voter groups", () => {
  it("stores immutable rows and updates both place indexes", () => {
    const groups = coreAPI(createCore(piecesInput())).voterGroups(),
      input = structuredClone(row);
    groups.put(input);
    input.sourceRecordIds = ["changed"];
    expect(groups.get(row.id)).toEqual(row);
    expect(Object.isFrozen(groups.get(row.id)!.sourceRecordIds)).toBe(true);
    groups.put({ ...row, placeId: "other", ageBand: "older" });
    expect(groups.atPlace("place")).toEqual([]);
    expect(groups.atPlace("other", row.ageBand)).toEqual([]);
    expect(groups.atPlace("other", "older")).toHaveLength(1);
    expect(groups.remove(row.id)).toBe(true);
    expect(groups.remove(row.id)).toBe(false);
    expect(groups.atPlace("other")).toEqual([]);
  });
  it("weights lean and participation by population without creating individual ballots", () => {
    const core = createCore(piecesInput()),
      groups = coreAPI(core).voterGroups();
    groups.put(row);
    groups.put({ ...row, id: "larger", size: 300, lean: 0.6, turnout: 0.8 });
    expect(groups.summarize("place")).toEqual({
      groupCount: 2,
      size: 400,
      participatingSize: 280,
      turnout: 0.7,
      lean: 0.4,
    });
    expect(core.people.size).toBe(1);
    expect(core.durableLog.size).toBe(0);
    expect(groups.summarize("missing").turnout).toBeNull();
  });
  it("reports outside and missing spreads without drawing or rewriting a group", () => {
    const groups = coreAPI(createCore(piecesInput())).voterGroups();
    groups.put(row);
    const before = groups.get(row.id);
    const spread = {
      id: "observed",
      placeId: "place",
      asOf: row.asOf,
      source,
      turnout: [0.5, 0.7] as const,
      lean: [-0.3, -0.1] as const,
      size: [90, 110] as const,
    };
    expect(groups.check(spread).comparisons.map((r) => r.status)).toEqual([
      "outside",
      "within",
      "within",
    ]);
    expect(groups.get(row.id)).toBe(before);
    expect(
      groups
        .check({ ...spread, placeId: "missing" })
        .comparisons.every((r) => r.status === "missing"),
    ).toBe(true);
  });
  it("compares causal records against actual CPS turnout spreads across places", () => {
    const groups = coreAPI(createCore(piecesInput())).voterGroups();
    // Geography literals identify developer research examples, never simulation branches.
    const spreads = [
      ...censusVoterSpreads("research:a", "ALABAMA"),
      ...censusVoterSpreads("research:b", "ALASKA"),
    ];
    expect(spreads).toHaveLength(10);
    expect(spreads[0]!.turnout![0]).toBeCloseTo(0.344);
    expect(spreads[0]!.turnout![1]).toBeCloseTo(0.488);
    groups.put({ ...row, placeId: "research:a", turnout: 0.4 });
    expect(groups.check(spreads[0]!).comparisons[0]!.status).toBe("within");
    groups.put({ ...row, placeId: "research:a", turnout: 0.9 });
    expect(groups.check(spreads[0]!).comparisons[0]!.status).toBe("outside");
    expect(groups.get(row.id)!.turnout).toBe(0.9);
    expect(censusVoterSpreads("uncovered", "NOT COVERED")).toEqual([]);
  });
  it("rejects invalid writes atomically and preserves the existing row", () => {
    const groups = coreAPI(createCore(piecesInput())).voterGroups();
    groups.put(row);
    const invalid = [
      { lean: NaN },
      { lean: 1.01 },
      { lean: -1.01 },
      { turnout: -0.1 },
      { turnout: 1.1 },
      { size: -1 },
      { size: 1.5 },
      { size: Infinity },
      { asOf: "2026-02-30" },
      { asOf: "2027-01-01" },
      { sourceRecordIds: [] },
      { placeId: "" },
    ];
    for (const change of invalid)
      expect(() => groups.put({ ...row, ...change })).toThrow();
    expect(groups.get(row.id)).toEqual(row);
    const spread = { id: "bad", placeId: "place", asOf: row.asOf, source };
    expect(() => groups.check(spread)).toThrow(/bounds/);
    expect(() => groups.check({ ...spread, turnout: [0.4, 0.6], source: { ...source, tag: "ESTIMATED", estimatedFrom: "Unmeasured target." } })).toThrow(/sourced reference/);
    expect(() => groups.check({ ...spread, turnout: [0.8, 0.2] })).toThrow();
    expect(() => groups.check({ ...spread, lean: [-2, 0] })).toThrow();
  });
  it("accepts explicit opening rows and preserves empty groups as distinct from missing data", () => {
    const core = createCore({
      ...piecesInput(),
      voterGroups: [{ ...row, size: 0 }],
    });
    expect(coreAPI(core).voterGroups().summarize("place")).toEqual({
      groupCount: 1,
      size: 0,
      participatingSize: 0,
      turnout: null,
      lean: null,
    });
    expect(
      coreAPI(createCore(piecesInput())).voterGroups().atPlace("place"),
    ).toEqual([]);
  });
});
