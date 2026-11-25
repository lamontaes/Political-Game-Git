// @vitest-environment node
/**
 * The law checker raises a budget line in the budget of a government that may
 * pass it: a line only Congress passes (the federal outlays) in the federal
 * budget, a town's line in the lowest government of the chain that keeps one.
 * Before, a federal line was raised in the town's own budget, and the matrix
 * graded the federal law on a town treasury paying a line it never keeps
 * (crew line #9747, item 8a). A drawn place; nothing in it is chosen.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { budgetsOf, governments } from "../../src/core2/modules/budgets";
import { coreAPI } from "../../src/core2/state";
import { allLaws } from "./catalog";
import { changeBudget, drawLawPlace, levelsFor } from "./check";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const drawn = drawLawPlace(replay);

it(`a budget line is raised in the budget of a government that may pass it: ${drawn.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(drawn.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: drawn.key,
    });
    const api = coreAPI(world.core);
    const govs = governments(api);
    const federal = govs.find((g) => g.level === "federal")!;
    expect(federal).toBeDefined();
    const lines = allLaws().filter((l) => l.kind === "budget-line");
    const federalOnly = lines.filter(
      (l) =>
        l.catalog?.levels.length === 1 && l.catalog.levels[0] === "federal",
    );
    // The federal outlays the catalog lets only Congress move.
    expect(federalOnly.length).toBeGreaterThanOrEqual(11);
    const seen: string[] = [];
    for (const law of lines) {
      const line = law.key.slice("budget-line:".length);
      const at = levelsFor(api, law)[0];
      const gov = govs.find((g) => g.level === at);
      if (!gov) continue;
      const before = [...budgetsOf(api, gov.id)].sort(
        (a, b) => b.fiscalYear - a.fiscalYear,
      )[0]!;
      const change = changeBudget(
        api,
        law,
        `budget-line-level-${line}`,
        new Set(),
      );
      // The government whose budget moved is the one that may pass the line.
      expect(change.how.startsWith(`${gov.id} ${line} `)).toBe(true);
      expect(change.lines?.[0]?.governmentId).toBe(gov.id);
      const after = [...budgetsOf(api, gov.id)].sort(
        (a, b) => b.fiscalYear - a.fiscalYear,
      )[0]!;
      expect(after.spendingMinor[line]!).toBeGreaterThan(
        before.spendingMinor[line] ?? 0,
      );
      change.undo();
      seen.push(`${law.key}@${gov.id}`);
    }
    for (const law of federalOnly)
      expect(seen).toContain(`${law.key}@${federal.id}`);
    console.log(
      JSON.stringify({
        place: drawn.name,
        placeKey: drawn.key,
        replay,
        worldSeed: drawn.seed,
        federal: federal.id,
        cases: seen,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 120_000);
