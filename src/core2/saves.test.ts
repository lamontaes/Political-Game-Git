import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { residentsRuntime } from "./modules/residents";
import { loadGame, newGame, runCommand, saveGame } from "./saves";
import type { CoreModule, CoreState } from "./types";
import { gameStartDate } from "./game-start";
import { addDays } from "./kernel/dates";

/** A date some days after the game's start. */
const day = (days: number) => addDays(gameStartDate(), days);

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

/**
 * Walk a played world and its restored copy side by side (tables by key, lists
 * by index, plain records by field). Returns how many records were frozen in
 * the played world and had changed since the opening (a producer rewrote them),
 * how many of those the restore left unfrozen, and the first few such paths.
 */
function sealGaps(
  opening: unknown,
  played: unknown,
  restored: unknown,
): { changedFrozen: number; unfrozen: number; paths: string[] } {
  const result = { changedFrozen: 0, unfrozen: 0, paths: [] as string[] };
  const seen = new WeakSet<object>();
  const shallowSame = (a: object, b: object) => {
    const ka = Object.keys(a),
      kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((key) => {
      const x = (a as Record<string, unknown>)[key],
        y = (b as Record<string, unknown>)[key];
      return typeof x === "object" || typeof y === "object" ? true : x === y;
    });
  };
  const plain = (value: unknown): value is Record<string, unknown> =>
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Map) &&
    !(value instanceof Set) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value));
  const walk = (o: unknown, p: unknown, r: unknown, path: string) => {
    if (!p || typeof p !== "object" || !r || typeof r !== "object") return;
    if (seen.has(p)) return;
    seen.add(p);
    if (p instanceof Map && r instanceof Map) {
      for (const [key, value] of p)
        if (typeof key === "string" || typeof key === "number")
          walk(
            o instanceof Map ? o.get(key) : undefined,
            value,
            r.get(key),
            `${path}[${String(key)}]`,
          );
    } else if (Array.isArray(p) && Array.isArray(r)) {
      p.forEach((value, i) =>
        walk(Array.isArray(o) ? o[i] : undefined, value, r[i], `${path}[${i}]`),
      );
    } else if (plain(p) && plain(r)) {
      if (
        Object.isFrozen(p) &&
        plain(o) &&
        Object.isFrozen(o) &&
        !shallowSame(o, p)
      ) {
        result.changedFrozen += 1;
        if (!Object.isFrozen(r)) {
          result.unfrozen += 1;
          if (result.paths.length < 5) result.paths.push(path);
        }
      }
      for (const key of Object.keys(p))
        walk(plain(o) ? o[key] : undefined, p[key], r[key], `${path}.${key}`);
    }
  };
  walk(opening, played, restored, "$");
  return result;
}

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
    runCommand(game, "advance", { through: day(19) });
    const counted = [...residentsRuntime(game.core)!.households.values()].find(
      (row) => row.people.length,
    )!;
    runCommand(game, "fill-in", { personId: counted.people[0]!.id });
    runCommand(game, "advance", { through: day(45) });
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
    runCommand(game, "advance", { through: day(9) });
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
    runCommand(game, "advance", { through: day(19) });
    const counted = [...residentsRuntime(game.core)!.households.values()].find(
      (row) => row.people.length,
    )!;
    runCommand(game, "fill-in", { personId: counted.people[0]!.id });
    runCommand(game, "advance", { through: day(45) });
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
          payload: { through: day(50) },
        },
      ],
      savedAt: day(50),
    } as typeof save;
    const loaded = loadGame(later);
    expect(loaded.skipped).toEqual([]);
    expect(loaded.commands.length).toBe(game.commands.length + 1);
    runCommand(game, "advance", { through: day(50) });
    expect(digest(loaded.core)).toBe(digest(game.core));
    runCommand(game, "advance", { through: day(78) });
    runCommand(loaded, "advance", { through: day(78) });
    expect(digest(loaded.core)).toBe(digest(game.core));
    // Under another version the snapshot is set aside and every command replays.
    const replayed = loadGame({ ...save, coreApiVersion: "core2-api-v1" });
    expect(replayed.core.date).toBe(save.savedAt);
  }, 600_000);

  it("restores every frozen record a producer changed since the opening as frozen", () => {
    const recipe = {
      place: { seed: place.seed, key: place.key },
      twoLevel: true,
      settings: { population: 1500 },
      preStart: false as const,
    };
    const opening = newGame(recipe);
    const game = newGame(recipe);
    runCommand(game, "advance", { through: day(45) });
    const save = JSON.parse(JSON.stringify(saveGame(game))) as ReturnType<
      typeof saveGame
    >;
    expect(save.snapshot).toBeDefined();
    const loaded = loadGame(save);
    expect(loaded.skipped).toEqual([]);
    const gaps = sealGaps(opening.core, game.core, loaded.core);
    // Producers did rewrite frozen records in 45 days, so the check has
    // something to check, and every one of them comes back frozen.
    expect(
      gaps.changedFrozen,
      `${place.name} (${place.key}), seed ${place.seed}: frozen records changed since the opening`,
    ).toBeGreaterThan(0);
    expect(
      gaps.paths,
      `${gaps.unfrozen} of ${gaps.changedFrozen} changed frozen records came back unfrozen`,
    ).toEqual([]);
  }, 600_000);
});
