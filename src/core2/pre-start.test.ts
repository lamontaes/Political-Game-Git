import { describe, expect, it } from "vitest";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import { createLifeCore } from "./life";
import { PEOPLE_MODULE_ID } from "./modules/people";
import {
  coarseSteps,
  preStartHistory,
  preStartWindow,
  runPreStart,
  type PreStartModule,
} from "./pre-start";

describe("history before the start", () => {
  it("runs passes economy first, then governments, with records dated before day one", () => {
    const seen: string[] = [];
    const government: PreStartModule = {
      id: "fixture-budgets",
      preStart: {
        phase: "government",
        run(_api, window, history) {
          // Governments see the economy's coarse path.
          const prices = history.read({ kind: "economy.prices" });
          seen.push(`government saw ${prices.length} price months`);
          history.record({
            id: "budget:prior-year",
            date: window.through,
            kind: "budget.adopted",
            placeId: "place",
            facts: { lastPriceIndex: prices.at(-1)!.facts.index! },
            publicRecord: true,
            source: piecesSource,
          });
        },
      },
    };
    const economy: PreStartModule = {
      id: "fixture-macro",
      preStart: {
        phase: "economy",
        run(_api, window, history) {
          seen.push("economy");
          coarseSteps(window).forEach((date, index) =>
            history.record({
              id: `prices:${date}`,
              date,
              kind: "economy.prices",
              facts: { index: 100 + index },
              publicRecord: true,
              source: piecesSource,
            }),
          );
        },
      },
    };
    // Installed government-first: the phase order still runs the economy first.
    const core = createLifeCore(piecesInput(), {
      modules: [government, economy],
    });
    const window = preStartWindow(core, "2024-01-15", "quarter");
    expect(runPreStart(core, window)).toEqual([
      "fixture-macro",
      PEOPLE_MODULE_ID,
      "fixture-budgets",
    ]);
    expect(seen[0]).toBe("economy");
    const months = coarseSteps(window);
    expect(months[0]).toBe("2024-01-15");
    expect(months.every((date) => date < core.date)).toBe(true);
    expect(seen[1]).toBe(`government saw ${months.length} price months`);
    const all = preStartHistory(core);
    expect(all.every((row) => row.date < core.date)).toBe(true);
    expect(preStartHistory(core, { kind: "budget.adopted" })[0]).toMatchObject({
      moduleId: "fixture-budgets",
      facts: { lastPriceIndex: 100 + months.length - 1 },
    });
    expect(() => runPreStart(core, window)).toThrow(/already/);
  });

  it("refuses a record dated on or after the start", () => {
    const core = createLifeCore(piecesInput(), {
      modules: [
        {
          id: "fixture-late",
          preStart: {
            phase: "people",
            run(api, _window, history) {
              history.record({
                id: "late",
                date: api.state.date,
                kind: "person.job-start",
                facts: {},
                publicRecord: false,
                source: piecesSource,
              });
            },
          },
        } as PreStartModule,
      ],
    });
    expect(() => runPreStart(core, preStartWindow(core, "2025-01-01"))).toThrow(
      /inside the pre-start run/,
    );
  });
});
