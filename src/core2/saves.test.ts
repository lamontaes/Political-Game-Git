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

/**
 * The whole played world against the restored one, with no depth limit and
 * cycles tracked: every object, list, Map and Set of the played world must
 * exist in the restored one as the same kind, and one frozen in play must be
 * frozen after the restore. Frozen records the opening lacks are counted.
 */
function restoredFrozenGaps(
  opening: unknown,
  played: unknown,
  restored: unknown,
): {
  visited: number;
  frozenCreated: number;
  unfrozen: string[];
  missing: string[];
} {
  const result = {
    visited: 0,
    frozenCreated: 0,
    unfrozen: [] as string[],
    missing: [] as string[],
  };
  const NOT_COMPARABLE = Symbol("not comparable");
  const kind = (value: object) =>
    value instanceof Map
      ? "map"
      : value instanceof Set
        ? "set"
        : Array.isArray(value)
          ? "list"
          : "object";
  const seen = new Set<object>();
  const stack: [unknown, object, unknown, string][] = [
    [opening, played as object, restored, "core"],
  ];
  while (stack.length) {
    const [o, p, r, path] = stack.pop()!;
    if (seen.has(p)) continue;
    seen.add(p);
    result.visited += 1;
    if (!r || typeof r !== "object" || kind(r) !== kind(p)) {
      result.missing.push(path);
      continue;
    }
    if (Object.isFrozen(p)) {
      if (o === undefined) result.frozenCreated += 1;
      if (!Object.isFrozen(r)) result.unfrozen.push(path);
    }
    const child = (po: unknown, pv: unknown, rv: unknown, at: string) => {
      // Engine definitions are rebuilt from the recipe, not saved, and the
      // journal's cash writers install on first use (life.ts), so a restored
      // world has them only once they run.
      if (at === "core.modules") return;
      if (pv && typeof pv === "object") stack.push([po, pv, rv, at]);
    };
    const comparable = !!o && typeof o === "object";
    if (p instanceof Map)
      for (const [key, value] of p)
        child(
          o === NOT_COMPARABLE
            ? NOT_COMPARABLE
            : o instanceof Map
              ? o.get(key)
              : undefined,
          value,
          (r as Map<unknown, unknown>).get(key),
          `${path}[${String(key)}]`,
        );
    else if (p instanceof Set) {
      const back = [...(r as Set<unknown>)];
      [...p].forEach((value, i) =>
        child(NOT_COMPARABLE, value, back[i], `${path}{${i}}`),
      );
    } else
      for (const key of Object.keys(p))
        child(
          o === NOT_COMPARABLE
            ? NOT_COMPARABLE
            : comparable
              ? (o as Record<string, unknown>)[key]
              : undefined,
          (p as Record<string, unknown>)[key],
          (r as Record<string, unknown>)[key],
          `${path}.${key}`,
        );
  }
  return result;
}

describe(`saves in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("loads to the same world after commands and a JSON round trip", () => {
    const recipe = {
      place: { seed: place.seed, key: place.key },
      twoLevel: true,
      settings: { population: 1500 },
    };
    // A new game runs history from the player's birth year (owner, Oct 28, 2026).
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
    const player = game.core.people.get(game.core.playerId!)!;
    expect(windows).toEqual([`${player.birthDate.slice(0, 4)}-01-01/quarter`]);
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
    // Every record of the played world, however deep, comes back as an
    // object of the same kind, frozen when it was frozen. Records made since
    // the opening (pay ledgers, earned periods) have nothing to compare with
    // in the opening, so they are counted and required to exist.
    const all = restoredFrozenGaps(opening.core, game.core, loaded.core);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    expect(
      all.missing,
      `${where}: ${all.missing.length} records of the played world are missing or another kind after the restore (of ${all.visited} visited)`,
    ).toEqual([]);
    expect(
      all.unfrozen,
      `${where}: ${all.unfrozen.length} frozen records came back unfrozen (of ${all.visited} visited)`,
    ).toEqual([]);
    expect(
      all.frozenCreated,
      `${where}: frozen records made since the opening`,
    ).toBeGreaterThan(0);
    // The named case: a pay ledger made since the opening is in the restored
    // world and frozen.
    const opened = opening.core.work.payrollLedgerByCommitment;
    const madeSince = [...game.core.work.payrollLedgerByCommitment].find(
      ([id, ledger]) => !opened.has(id) && Object.isFrozen(ledger),
    );
    expect(
      madeSince,
      `${where}: a frozen pay ledger made since the opening`,
    ).toBeDefined();
    const back = loaded.core.work.payrollLedgerByCommitment.get(madeSince![0]);
    expect(
      back,
      `${where}: pay ledger ${madeSince![0]} restored`,
    ).toBeDefined();
    expect(
      Object.isFrozen(back),
      `${where}: pay ledger ${madeSince![0]} frozen`,
    ).toBe(true);
  }, 600_000);
});
