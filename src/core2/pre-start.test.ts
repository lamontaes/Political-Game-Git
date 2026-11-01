import { describe, expect, it } from "vitest";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import { createLifeCore } from "./life";
import { PEOPLE_MODULE_ID } from "./modules/people";
import { SCHOOL_MODULE_ID } from "./modules/school";
import {
  coarseSteps,
  preStartHistory,
  preStartWindow,
  recordPreStartLater,
  runPreStart,
  type HistoryRecord,
  type PreStartModule,
} from "./pre-start";
import { defaultPreStart, preStartFromYear } from "./saves";
import { restoreWorld, snapshotWorld, type WorldSnapshot } from "./snapshot";
import type { PersonId } from "./types";

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
      SCHOOL_MODULE_ID,
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

  it("starts a world with no player at its youngest adult's birth year", () => {
    const core = createLifeCore(piecesInput());
    const adults = [...core.people.values()].filter(
      (person) =>
        Number(core.date.slice(0, 4)) - Number(person.birthDate.slice(0, 4)) >=
        18,
    );
    const youngest = adults
      .map((person) => person.birthDate)
      .sort()
      .at(-1)!;
    expect(preStartFromYear(core)).toBe(Number(youngest.slice(0, 4)));
    expect(defaultPreStart(core)).toEqual({
      from: `${youngest.slice(0, 4)}-01-01`,
      step: "quarter",
    });
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

  it("writes rows for people filled in later where the old sort put them, through a refused row and a restore", () => {
    const actor = "actor" as PersonId;
    const row = (
      id: string,
      date: string,
      personIds?: PersonId[],
    ): Omit<HistoryRecord, "moduleId"> => ({
      id,
      date: date as HistoryRecord["date"],
      kind: "fixture.later",
      ...(personIds ? { personIds } : {}),
      facts: {},
      publicRecord: false,
      source: piecesSource,
    });
    const fixture: PreStartModule = {
      id: "fixture-run",
      preStart: {
        phase: "people",
        run(_api, _window, history) {
          // Ids a plain string sort orders differently from the history's.
          for (const id of ["run-b", "run-B", "run_a", "run-a", "run-10"])
            history.record({ ...row(id, "2023-03-01", [actor]) });
          history.record(row("run-economy", "2022-06-01"));
        },
      },
    };
    const input = piecesInput();
    const core = createLifeCore(input, { modules: [fixture] });
    runPreStart(core, preStartWindow(core, "2022-01-01", "quarter"));
    const saved = JSON.stringify(snapshotWorld(core));
    // The old write, by hand: append, then sort the whole history.
    const order = (a: { date: string; id: string }, b: typeof a) =>
      a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
    let expected = preStartHistory(core).map(({ id, date }) => ({ id, date }));
    const write = (rows: Omit<HistoryRecord, "moduleId">[]) => {
      recordPreStartLater(core, "fixture-later", rows);
      expected = [...expected, ...rows].sort(order);
    };
    const ids = () => preStartHistory(core).map((each) => each.id);
    // The first write sorts the history; the ones after it insert.
    write([row("later-1", "2023-03-01", [actor])]);
    write([
      row("later-B", "2023-03-01", [actor, actor]),
      row("later-a", "2022-01-01"),
      row("later-b", "2023-03-01", [actor]),
      row("later_c", "2025-12-31", [actor]),
      row("later-2", "2023-03-01"),
    ]);
    write([row("later-0", "2022-01-01", [actor])]);
    expect(ids()).toEqual(expected.map((each) => each.id));
    const scan = (filter: { kind?: string }) =>
      preStartHistory(core, filter).filter((each) =>
        each.personIds?.includes(actor),
      );
    expect(preStartHistory(core, { personId: actor })).toEqual(scan({}));
    expect(
      preStartHistory(core, { kind: "fixture.later", personId: actor }),
    ).toEqual(scan({ kind: "fixture.later" }));
    // A refused row leaves the rows before it appended, unsorted, as before.
    const before = ids();
    expect(() =>
      recordPreStartLater(core, "fixture-later", [
        row("later-z", "2022-02-01", [actor]),
        row("later-y", "2022-02-01"),
        row("later-1", "2024-01-01"),
      ]),
    ).toThrow("History record id missing or reused: later-1");
    expect(ids()).toEqual([...before, "later-z", "later-y"]);
    expect(() =>
      recordPreStartLater(core, "fixture-later", [
        row("later-x", "2026-01-01"),
      ]),
    ).toThrow("History must be dated inside the pre-start run");
    expect(() =>
      recordPreStartLater(core, "fixture-later", [
        row("later-w", "2024-01-01", ["absent" as PersonId]),
      ]),
    ).toThrow("History names an absent person: absent");
    expect(ids()).toEqual([...before, "later-z", "later-y"]);
    expected = [
      ...expected,
      { id: "later-z", date: "2022-02-01" },
      { id: "later-y", date: "2022-02-01" },
    ];
    write([row("later-v", "2024-06-01", [actor])]);
    expect(ids()).toEqual(expected.map((each) => each.id));
    expect(preStartHistory(core, { personId: actor })).toEqual(scan({}));
    // A restored history is written the same way.
    const loaded = createLifeCore(input, { modules: [fixture] });
    restoreWorld(loaded, JSON.parse(saved) as WorldSnapshot);
    for (const each of [core, loaded])
      for (const rows of [
        [row("after-2", "2024-06-01", [actor])],
        [row("after-1", "2024-06-01", [actor]), row("after-0", "2022-03-01")],
      ])
        recordPreStartLater(each, "fixture-later", rows);
    const afters = (world: typeof core) =>
      preStartHistory(world)
        .filter((each) => each.id.startsWith("after-"))
        .map((each) => each.id);
    expect(afters(loaded)).toEqual(["after-0", "after-1", "after-2"]);
    expect(afters(core)).toEqual(afters(loaded));
    expect(preStartHistory(loaded, { personId: actor })).toEqual(
      preStartHistory(loaded).filter((each) => each.personIds?.includes(actor)),
    );
  });
});
