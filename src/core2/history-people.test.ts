import { describe, expect, it } from "vitest";
import { buildDeepPast } from "./deep-past";
import {
  buildRecentLifeHistory,
  recentLifeHistoryModule,
} from "./history-people";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import { createCore, coreAPI } from "./state";
import { runPreStartHistory } from "./history-run";

describe("supplied recent-life builders", () => {
  it("fills recent birth and schooling without overwriting earlier or supplied facts", () => {
    const input = piecesInput();
    const supplied = {
      id: "supplied:move",
      date: "2023-05-14",
      kind: "residence:move",
      summary: "Supplied move",
      source: piecesSource,
      facts: { placeId: "place" },
    };
    input.people = [
      { ...input.people[0]!, birthDate: "2017-02-12", pastFacts: [supplied] },
    ];
    const older = buildDeepPast(input);
    const recent = buildRecentLifeHistory(older);
    expect(recent.people[0]!.pastFacts).toContainEqual(supplied);
    for (const fact of older.people[0]!.pastFacts ?? [])
      expect(recent.people[0]!.pastFacts).toContainEqual(fact);
    const core = createCore(recent, {
      modules: [recentLifeHistoryModule(recent)],
    });
    runPreStartHistory(core);
    const table = coreAPI(core).moduleState("history-people").table("events");
    expect(
      table
        .query("byPerson", ["actor"])
        .some((row) => row.factId === supplied.id),
    ).toBe(true);
    expect(
      table
        .rows()
        .every(
          (row) =>
            String(row.date) >= "2021-01-01" && String(row.date) < "2026-01-01",
        ),
    ).toBe(true);
    expect(core.actCounters.size).toBe(0);
    expect(buildRecentLifeHistory(recent).people[0]!.pastFacts).toEqual(
      recent.people[0]!.pastFacts,
    );
  });

  it("records children born during the coarse window and never backdates experiences before birth", () => {
    const input = piecesInput();
    input.people = [
      { ...input.people[0]!, birthDate: "2024-02-29", pastFacts: [] },
    ];
    const recent = buildRecentLifeHistory(buildDeepPast(input));
    expect(
      recent.people[0]!.pastFacts?.find((fact) => fact.kind === "birth-date")
        ?.date,
    ).toBe("2024-02-29");
    const core = createCore(recent, {
      modules: [recentLifeHistoryModule(recent)],
    });
    runPreStartHistory(core);
    expect(
      coreAPI(core).moduleState("history-people").table("events").rows(),
    ).toHaveLength(1);
  });
});
