/**
 * Each world's public budgets (owner, Oct 27: "realistic not real... it goes
 * for every statistic unless it is in law"). One place drawn from all 56, two
 * played worlds from two seeds: every government's opening budget line
 * differs from the published base and from the other world's.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { lawChain } from "./modules/laws";
import {
  BUDGETS_MODULE_ID,
  governments,
  publishedBudgetFor,
  type BudgetRow,
} from "./modules/budgets";
import { coreAPI } from "./state";

const seed = process.env.BUDGETS_WORLD_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "budgets-world");
const where = `${place.name} (${place.key}), seed ${seed}`;

describe(`each world's opening budgets (${where})`, () => {
  const build = (worldSeed: string) => {
    setBookkeeping(false);
    return coreAPI(
      buildBenchWorld(worldSeed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      }).core,
    );
  };
  const a = build(`${seed}:a`),
    b = build(`${seed}:b`);
  const budgets = (api: ReturnType<typeof coreAPI>) =>
    new Map(
      (
        api
          .moduleState(BUDGETS_MODULE_ID)
          .table("budgets")
          .rows() as unknown as BudgetRow[]
      ).map((row) => [row.id, row]),
    );
  it("opens every line off the published base and off the other world's", () => {
    const ba = budgets(a),
      bb = budgets(b);
    const govs = new Map(governments(a).map((g) => [g.id, g]));
    let lines = 0;
    for (const [id, row] of ba) {
      const gov = govs.get(row.governmentId)!;
      const real = publishedBudgetFor(
        gov,
        lawChain(a).stateKey,
        row.fiscalYear,
        row.adoptedOn,
        row.adoptedBy,
      );
      for (const side of ["revenueMinor", "spendingMinor"] as const)
        for (const [line, value] of Object.entries(row[side])) {
          if (!real[side][line]) continue;
          lines += 1;
          expect(value, `${where} ${id} ${line}`).not.toBe(real[side][line]);
          expect(value, `${where} ${id} ${line}`).not.toBe(
            bb.get(id)?.[side][line],
          );
        }
    }
    expect(lines, where).toBeGreaterThan(20);
    process.stdout.write(
      `BUDGETS ${where}: ${lines} lines in ${ba.size} budgets, e.g. ${[...ba.keys()][0]}\n`,
    );
  });
});
