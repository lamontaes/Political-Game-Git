import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { residentsRuntime } from "./modules/residents";
import { loadGame, newGame, runCommand, saveGame } from "./saves";
import type { CoreModule, CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-saves");

const digest = (core: CoreState) => {
  const hash = createHash("sha256");
  hash.update(core.date);
  for (const [id, row] of core.people) hash.update(`${id}:${row.liquidMinor};`);
  for (const [id, row] of core.organizations)
    hash.update(`${id}:${row.liquidMinor};`);
  hash.update(String(core.cashJournal.nextSequence));
  return hash.digest("hex");
};

describe(`saves in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("loads to the same world after commands and a JSON round trip", () => {
    const recipe = {
      place: { seed: place.seed, key: place.key },
      twoLevel: true,
      settings: { population: 1500 },
    };
    // A new game runs history from 2000 by default (owner ruling, M1-14).
    const windows: string[] = [];
    const history: CoreModule = {
      id: "fixture-history-window",
      preStart: {
        phase: "economy",
        run: (_api, window) =>
          void windows.push(`${window.from}/${window.step}`),
      },
    } as CoreModule;
    const game = newGame(recipe, { modules: () => [history] });
    expect(windows).toEqual(["2000-01-01/quarter"]);
    runCommand(game, "advance", { through: "2021-01-20" });
    const counted = [...residentsRuntime(game.core)!.households.values()].find(
      (row) => row.people.length,
    )!;
    runCommand(game, "fill-in", { personId: counted.people[0]!.id });
    runCommand(game, "advance", { through: "2021-02-15" });
    const save = JSON.parse(JSON.stringify(saveGame(game)));
    const loaded = loadGame(save);
    expect(loaded.skipped).toEqual([]);
    expect(loaded.core.date).toBe(game.core.date);
    expect(digest(loaded.core)).toBe(digest(game.core));
    expect(loaded.commands.filter((row) => row.kind !== "advance")).toEqual(
      game.commands.filter((row) => row.kind !== "advance"),
    );
  }, 300_000);

  it("skips a command this version no longer knows and keeps loading", () => {
    const recipe = {
      place: { seed: place.seed, key: place.key },
      twoLevel: true,
      settings: { population: 1500 },
    };
    const game = newGame(recipe);
    runCommand(game, "advance", { through: "2021-01-10" });
    const save = saveGame(game);
    const loaded = loadGame({
      ...save,
      commands: [
        ...save.commands,
        { date: save.savedAt, kind: "retired.command", payload: {} },
      ],
    });
    expect(loaded.skipped.map((row) => row.command.kind)).toEqual([
      "retired.command",
    ]);
    expect(
      loadGame({ ...save, coreApiVersion: "core2-api-v1" }).upgradedFrom,
    ).toBe("core2-api-v1");
    expect(digest(loaded.core)).toBe(digest(game.core));
  }, 300_000);

  it("loads from a snapshot of the world and replays only the commands after it", () => {
    const recipe = {
      place: { seed: place.seed, key: place.key },
      twoLevel: true,
      settings: { population: 1500 },
      preStart: false as const,
    };
    const game = newGame(recipe);
    runCommand(game, "advance", { through: "2021-01-20" });
    const counted = [...residentsRuntime(game.core)!.households.values()].find(
      (row) => row.people.length,
    )!;
    runCommand(game, "fill-in", { personId: counted.people[0]!.id });
    runCommand(game, "advance", { through: "2021-02-15" });
    const save = JSON.parse(JSON.stringify(saveGame(game))) as ReturnType<
      typeof saveGame
    >;
    expect(save.snapshot?.commandCount).toBe(game.commands.length);
    // A command given after the snapshot replays on top of it.
    const later = {
      ...save,
      commands: [
        ...save.commands,
        {
          date: save.savedAt,
          kind: "advance",
          payload: { through: "2021-02-20" },
        },
      ],
      savedAt: "2021-02-20",
    } as typeof save;
    const loaded = loadGame(later);
    expect(loaded.skipped).toEqual([]);
    expect(loaded.commands.length).toBe(game.commands.length + 1);
    runCommand(game, "advance", { through: "2021-02-20" });
    expect(digest(loaded.core)).toBe(digest(game.core));
    runCommand(game, "advance", { through: "2021-03-20" });
    runCommand(loaded, "advance", { through: "2021-03-20" });
    expect(digest(loaded.core)).toBe(digest(game.core));
    // Under another version the snapshot is set aside and every command replays.
    const replayed = loadGame({ ...save, coreApiVersion: "core2-api-v1" });
    expect(replayed.core.date).toBe(save.savedAt);
  }, 600_000);
});
