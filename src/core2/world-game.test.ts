/** The whole economy through newGame, the path /play and saves use, with history before the start. */
import { describe, expect, it } from "vitest";
import { advanceCore } from "./life";
import { worldGameOptions } from "./modules/world";
import { preStartHistory } from "./pre-start";
import { newGame } from "./saves";
import { drawPlace } from "../../tests/golden-path/place";

describe("a new game with the world economy", () => {
  it("opens with the central bank, the town bank and homes, records the nation's months before the start, and runs a month with every dollar balanced", () => {
    const place = drawPlace("world-game", "world-game");
    const game = newGame(
      {
        place: { seed: place.seed, key: place.key },
        twoLevel: true,
        preStart: { from: "2019-01-01" },
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
    expect(months.length).toBe(24);
    expect(
      preStartHistory(core, { kind: "economy.rate-decision" }).length,
    ).toBeGreaterThan(0);
    const cash = () =>
      [...core.people.values(), ...core.organizations.values()].reduce(
        (n, row) => n + row.liquidMinor,
        0,
      );
    const opening = cash();
    advanceCore(core, "2021-02-01");
    let outside = 0;
    for (const row of core.cashJournal.externalFlowsByOwner.values())
      outside += row.netMinor;
    expect(cash()).toBe(opening - outside);
  }, 300_000);
});
