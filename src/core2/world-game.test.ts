/** The whole economy through newGame, the path /play and saves use, with history before the start. */
import { describe, expect, it } from "vitest";
import { advanceCore } from "./life";
import { ownedHomes } from "./modules/housing";
import { worldGameOptions } from "./modules/world";
import { coreAPI } from "./state";
import { preStartHistory } from "./pre-start";
import { newGame } from "./saves";
import { drawPlace } from "../../tests/golden-path/place";
import { daysAfterStart } from "./tooling/test-days";

const PRE_START_FROM = "2019-01-01";

describe("a new game with the world economy", () => {
  it("opens with the central bank, the town bank and homes, records the nation's months before the start, and runs a month with every dollar balanced", () => {
    const place = drawPlace("world-game", "world-game");
    const game = newGame(
      {
        place: { seed: place.seed, key: place.key },
        twoLevel: true,
        preStart: { from: PRE_START_FROM },
      },
      worldGameOptions(),
    );
    const core = game.core;
    expect(core.modules.has("macro")).toBe(true);
    expect(
      [...core.organizations.values()].some((row) => row.kind === "bank"),
    ).toBe(true);
    // Homes are modeled everywhere, the island areas included (estimated where no ACS table covers them).
    expect(core.placeMetadata.housingState).toBeDefined();
    const months = preStartHistory(core, { kind: "economy.conditions" });
    // One record per month, from the month the history was asked to begin
    // through the last month that starts before the game's start date.
    let expected = 0;
    for (
      let month = PRE_START_FROM;
      month < core.startedAt;
      month = `${Number(month.slice(0, 4)) + (month.slice(5, 7) === "12" ? 1 : 0)}-${String((Number(month.slice(5, 7)) % 12) + 1).padStart(2, "0")}-01`
    )
      expected += 1;
    expect(months.length).toBe(expected);
    expect(
      preStartHistory(core, { kind: "economy.rate-decision" }).length,
    ).toBeGreaterThan(0);
    const cash = () =>
      [...core.people.values(), ...core.organizations.values()].reduce(
        (n, row) => n + row.liquidMinor,
        0,
      );
    const opening = cash();
    advanceCore(core, daysAfterStart(31));
    expect(ownedHomes(coreAPI(core)).length).toBeGreaterThan(0);
    const kinds = new Set(
      coreAPI(core)
        .moduleState("housing")
        .table("dwellings")
        .rows()
        .map((row) => row.kind),
    );
    expect(kinds.has("house")).toBe(true);
    let outside = 0;
    for (const row of core.cashJournal.externalFlowsByOwner.values())
      outside += row.netMinor;
    expect(cash()).toBe(opening - outside);
  }, 300_000);
});
