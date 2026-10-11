import { describe, expect, it } from "vitest";
import {
  historyIntervals,
  orderedHistoryModules,
  PRE_START_VERSION,
  type HistoryModule,
} from "./history-contract";
import { createCore, coreAPI, registerModule } from "./state";
import { runPreStartHistory } from "./history-run";
import { piecesInput } from "./core-pieces-fixture";
import { makeIsoDate } from "../simulation/dates";

function module(
  id: string,
  phase: "economy" | "people" | "governments",
  tier: "monthly" | "quarterly" = "monthly",
  after: readonly string[] = [],
): HistoryModule {
  return {
    id,
    state: {
      schemaVersion: 1,
      tables: { history: { indexes: { byDate: { fields: ["date"] } } } },
    },
    preStart: {
      version: PRE_START_VERSION,
      phase,
      tier,
      after,
      step(api, interval) {
        api
          .moduleState(id)
          .table("history")
          .put({
            id: `${id}:${interval.fromInclusive}`,
            date: interval.fromInclusive,
            through: interval.throughExclusive,
          });
      },
    },
  };
}

describe("versioned pre-start module contract", () => {
  it("covers a mid-month opening and leap day exactly once, on civil month boundaries", () => {
    const intervals = historyIntervals("2024-02-29", "2024-04-15", "monthly");
    expect(intervals).toEqual([
      { fromInclusive: "2024-02-29", throughExclusive: "2024-03-01" },
      { fromInclusive: "2024-03-01", throughExclusive: "2024-04-01" },
      { fromInclusive: "2024-04-01", throughExclusive: "2024-04-15" },
    ]);
    expect(historyIntervals("2025-02-14", "2025-07-02", "quarterly")).toEqual([
      { fromInclusive: "2025-02-14", throughExclusive: "2025-04-01" },
      { fromInclusive: "2025-04-01", throughExclusive: "2025-07-01" },
      { fromInclusive: "2025-07-01", throughExclusive: "2025-07-02" },
    ]);
    expect(historyIntervals("2026-01-01", "2026-01-01", "monthly")).toEqual([]);
    expect(() =>
      historyIntervals("2026-01-02", "2026-01-01", "monthly"),
    ).toThrow("reversed");
    expect(() =>
      historyIntervals("2025-02-29", "2026-01-01", "monthly"),
    ).toThrow();
  });

  it("runs complete economy passes before people then governments, with prior results visible", () => {
    const macro = module("macro", "economy");
    const regional = module("regional", "economy", "quarterly", ["macro"]);
    const people = module("people", "people");
    const government = module("government", "governments");
    const order: string[] = [];
    for (const producer of [macro, regional, people, government]) {
      const pass = producer.preStart!;
      const step = pass.step;
      producer.preStart = {
        ...pass,
        step(api, interval) {
          order.push(producer.id);
          if (producer.id !== "macro")
            expect(api.moduleState("macro").table("history").size).toBe(60);
          if (producer.id === "government")
            expect(api.moduleState("people").table("history").size).toBe(60);
          expect(api.state.date).toBe("2026-01-01");
          step(api, interval);
        },
      };
    }
    const core = createCore(piecesInput());
    for (const producer of [government, regional, people, macro])
      registerModule(core, producer);
    const receipt = runPreStartHistory(core);
    expect(receipt.passes.map((row) => [row.moduleId, row.steps])).toEqual([
      ["macro", 60],
      ["regional", 20],
      ["people", 60],
      ["government", 60],
    ]);
    expect(order.slice(0, 60).every((id) => id === "macro")).toBe(true);
    expect(
      coreAPI(core)
        .moduleState("regional")
        .table("history")
        .query("byDate", ["2025-10-01"])[0]?.through,
    ).toBe("2026-01-01");
    expect(core.date).toBe(core.startedAt);
    expect(core.actCounters.size).toBe(0);
    expect(() => runPreStartHistory(core)).toThrow("already attempted");
  });

  it("rejects all invalid contracts before any pass writes", () => {
    const good = module("first", "economy");
    const missing = module("missing", "people", "monthly", ["absent"]);
    const cyclicA = module("a", "people", "monthly", ["b"]);
    const cyclicB = module("b", "people", "monthly", ["a"]);
    expect(() => orderedHistoryModules([good, missing])).toThrow("dependency");
    expect(() => orderedHistoryModules([cyclicA, cyclicB])).toThrow("Cyclic");
    expect(() => orderedHistoryModules([good, good])).toThrow("Duplicate");
    expect(() =>
      orderedHistoryModules([
        module("early", "economy", "monthly", ["later"]),
        module("later", "people"),
      ]),
    ).toThrow("dependency");
    const core = createCore(piecesInput(), { modules: [good, missing] });
    expect(() => runPreStartHistory(core)).toThrow("dependency");
    expect(coreAPI(core).moduleState("first").table("history").size).toBe(0);
  });

  it("retains a failed pass for diagnosis and refuses partial replay", () => {
    const broken = module("broken", "economy");
    broken.preStart = {
      ...broken.preStart!,
      step(api, interval) {
        api
          .moduleState("broken")
          .table("history")
          .put({ id: "diagnosis", date: interval.fromInclusive });
        throw new Error("producer failed");
      },
    };
    const core = createCore(piecesInput(), { modules: [broken] });
    expect(() => runPreStartHistory(core)).toThrow("producer failed");
    expect(
      coreAPI(core).moduleState("broken").table("history").get("diagnosis"),
    ).toBeDefined();
    expect(() => runPreStartHistory(core)).toThrow("already attempted");
    expect(core.date).toBe("2026-01-01");
  });

  it("detects a pass that advances the live clock", () => {
    const bad = module("bad", "economy");
    const core = createCore(piecesInput());
    bad.preStart = {
      ...bad.preStart!,
      step() {
        core.date = makeIsoDate("2026-01-02");
      },
    };
    registerModule(core, bad);
    expect(() => runPreStartHistory(core)).toThrow("advanced");
    expect(() => runPreStartHistory(core)).toThrow("already attempted");
  });
});
